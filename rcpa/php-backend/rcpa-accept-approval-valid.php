<?php
// rcpa-accept-approval-valid.php
header('Content-Type: application/json');
require_once '../../connection.php';

date_default_timezone_set('Asia/Manila'); // ensure consistent "today"

// Require logged-in user (for history + signature)
if (!isset($_COOKIE['user'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Not logged in']);
    exit;
}
$user = json_decode($_COOKIE['user'], true);
if (!$user || !is_array($user)) {
    http_response_code(401);
    echo json_encode(['error' => 'Invalid user cookie']);
    exit;
}
$user_name = $user['name'] ?? 'Unknown User';

$db = isset($mysqli) && $mysqli instanceof mysqli ? $mysqli
    : (isset($conn) && $conn instanceof mysqli ? $conn : null);
if (!$db) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'DB connection not found']);
    exit;
}
$db->set_charset('utf8mb4');

$id = isset($_POST['id']) ? (int)$_POST['id'] : 0; // rcpa_request.id
if ($id <= 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Missing or invalid id']);
    exit;
}

/** Helper: compute working days between (reply_received + 1 day) .. endDate (inclusive),
 *  skipping Sundays and any dates in $nonWorking (assoc set 'Y-m-d' => true)
 */
function working_days_between(?string $startYmd, string $endYmd, array $nonWorking): int {
    if (!$startYmd) return 0;
    $startTs = strtotime($startYmd);
    $endTs   = strtotime($endYmd);
    if ($startTs === false || $endTs === false || $endTs < $startTs) return 0;

    // begin counting the day AFTER reply_received
    $cur = new DateTime(date('Y-m-d', strtotime('+1 day', $startTs)), new DateTimeZone('Asia/Manila'));
    $end = new DateTime(date('Y-m-d', $endTs), new DateTimeZone('Asia/Manila'));

    $count = 0;
    while ($cur <= $end) {
        $ymd = $cur->format('Y-m-d');
        $isSunday = ($cur->format('w') === '0'); // Sunday=0
        if (!$isSunday && !isset($nonWorking[$ymd])) $count++;
        $cur->modify('+1 day');
    }
    return $count;
}

try {
    $db->begin_transaction();

    // 1) Lock/Read the row fields we need
    $conf = $reply_received = $reply_date = null;
    if (!($sel = $db->prepare("SELECT conformance, reply_received, reply_date FROM rcpa_request WHERE id=? FOR UPDATE"))) {
        throw new Exception('Prepare failed for select');
    }
    $sel->bind_param('i', $id);
    if (!$sel->execute()) {
        $err = $sel->error; $sel->close();
        throw new Exception($err ?: 'Execute failed for select');
    }
    $sel->bind_result($conf, $reply_received, $reply_date);
    if (!$sel->fetch()) {
        $sel->close();
        throw new Exception('No matching rcpa_request row found');
    }
    $sel->close();

    // Normalize conformance
    $norm = strtolower(trim(preg_replace('/[\s_-]+/', ' ', (string)$conf)));
    $is_nc  = ($norm === 'non conformance' || $norm === 'non-conformance' || $norm === 'nonconformance' || $norm === 'nc');
    $is_pnc = ($norm === 'potential non conformance' || $norm === 'potential non-conformance' || $norm === 'pnc' || strpos($norm, 'potential') !== false);

    // 2) Update status and set reply_date only if NULL
    $newStatus = 'VALIDATION REPLY';
    $upd = $db->prepare("
        UPDATE rcpa_request
        SET status = ?,
            reply_date = COALESCE(reply_date, CURDATE())
        WHERE id = ?
    ");
    if (!$upd) throw new Exception('Prepare failed for status update');
    $upd->bind_param('si', $newStatus, $id);
    if (!$upd->execute()) {
        $err = $upd->error; $upd->close();
        throw new Exception($err ?: 'Execute failed for status update');
    }
    $upd->close();

    // 3) If no_days_reply is NULL, compute it from reply_received → today (working days)
    $todayYmd = date('Y-m-d');
    $nonWorking = [];
    if ($resNW = $db->query("SELECT `date` FROM rcpa_not_working_calendar")) {
        while ($rw = $resNW->fetch_assoc()) {
            $d = date('Y-m-d', strtotime($rw['date']));
            $nonWorking[$d] = true;
        }
        $resNW->free();
    }

    // Re-read minimal fields to check current no_days_reply (locked row already updated)
    $rr = $rd = $ndr = null;
    if ($chk = $db->prepare("SELECT reply_received, reply_date, no_days_reply FROM rcpa_request WHERE id=? FOR UPDATE")) {
        $chk->bind_param('i', $id);
        $chk->execute();
        $chk->bind_result($rr, $rd, $ndr);
        $chk->fetch();
        $chk->close();
    }

    $computedDays = null;
    if ($ndr === null) {
        $computedDays = working_days_between($rr ? date('Y-m-d', strtotime($rr)) : null, $todayYmd, $nonWorking);
        if ($upd2 = $db->prepare("UPDATE rcpa_request SET no_days_reply = ? WHERE id = ? AND no_days_reply IS NULL")) {
            $upd2->bind_param('ii', $computedDays, $id);
            $upd2->execute();
            $upd2->close();
        }
    }

    // 3.1) Set hit_reply if NULL based on no_days_reply (<=5 => 'hit', >5 => 'missed')
    // Determine the effective number of days (freshly computed or existing)
    $effectiveDays = ($ndr === null) ? $computedDays : (int)$ndr;
    if ($effectiveDays !== null) {
        $hitVal = ($effectiveDays <= 5) ? 'hit' : 'missed';
        if ($updHit = $db->prepare("UPDATE rcpa_request SET hit_reply = COALESCE(hit_reply, ?) WHERE id = ?")) {
            $updHit->bind_param('si', $hitVal, $id);
            $updHit->execute();
            $updHit->close();
        }
    }

    // 4) Stamp supervisor in the correct validity table (only one)
    $updated_nc = 0; $updated_pnc = 0;
    if ($is_nc && !$is_pnc) {
        if ($stmt = $db->prepare("
            UPDATE rcpa_valid_non_conformance
            SET assignee_supervisor_name = ?, assignee_supervisor_date = CURDATE()
            WHERE rcpa_no = ?
        ")) {
            $stmt->bind_param('si', $user_name, $id);
            $stmt->execute();
            $updated_nc = $stmt->affected_rows;
            $stmt->close();
        }
    } elseif ($is_pnc && !$is_nc) {
        if ($stmt = $db->prepare("
            UPDATE rcpa_valid_potential_conformance
            SET assignee_supervisor_name = ?, assignee_supervisor_date = CURDATE()
            WHERE rcpa_no = ?
        ")) {
            $stmt->bind_param('si', $user_name, $id);
            $stmt->execute();
            $updated_pnc = $stmt->affected_rows;
            $stmt->close();
        }
    }

    // 5) History
    if ($db->query("SHOW TABLES LIKE 'rcpa_request_history'")->num_rows > 0) {
        $rcpa_no_str = (string)$id;
        $activity = 'The Assignee Supervisor/Manager approved the Assignee reply as VALID';
        if ($hist = $db->prepare("INSERT INTO rcpa_request_history (rcpa_no, name, activity) VALUES (?,?,?)")) {
            $hist->bind_param('sss', $rcpa_no_str, $user_name, $activity);
            $hist->execute();
            $hist->close();
        }
    }

    $db->commit();
    echo json_encode([
        'success' => true,
        'updated_nc' => $updated_nc,
        'updated_pnc' => $updated_pnc,
        'conformance' => $conf
    ]);
} catch (Throwable $e) {
    $db->rollback();
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
