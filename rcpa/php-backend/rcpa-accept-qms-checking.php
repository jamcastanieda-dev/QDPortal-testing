<?php
// php-backend/rcpa-accept-qms-checking.php
header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../../connection.php'; // mysqli connection -> $conn
date_default_timezone_set('Asia/Manila');

$user = json_decode($_COOKIE['user'] ?? 'null', true);
if (!$user || !is_array($user)) {
  header('Location: ../../login.php');
  exit;
}
$current_user = $user;
$user_name = $current_user['name'] ?? '';

$id = $_POST['id'] ?? null;
if ($id === null || !ctype_digit((string)$id)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Missing or invalid id']);
    exit;
}

$status = 'ASSIGNEE PENDING';

try {
    if (!isset($conn) || !($conn instanceof mysqli)) {
        throw new Exception('Database connection not available as $conn');
    }
    $conn->set_charset('utf8mb4');

    // 1) Update status and set reply_received ONLY if it is currently NULL
    $stmt = $conn->prepare('
        UPDATE rcpa_request
        SET status = ?,
            reply_received = IFNULL(reply_received, CURDATE())
        WHERE id = ?
    ');
    if (!$stmt) throw new Exception('Prepare failed: ' . $conn->error);
    $stmt->bind_param('si', $status, $id);
    if (!$stmt->execute()) throw new Exception('Execute failed: ' . $stmt->error);
    if ($stmt->affected_rows === 0) {
        $stmt->close();
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'RCPA request not found or unchanged']);
        exit;
    }
    $stmt->close();

    // 2) Fetch the effective reply_received, reply_due_date, and close_due_date
    $sel = $conn->prepare('SELECT reply_received, reply_due_date, close_due_date FROM rcpa_request WHERE id = ? LIMIT 1');
    if (!$sel) throw new Exception('Select prepare failed: ' . $conn->error);
    $sel->bind_param('i', $id);
    if (!$sel->execute()) throw new Exception('Select execute failed: ' . $sel->error);
    $sel->bind_result($reply_received, $reply_due_date, $close_due_date);
    if (!$sel->fetch()) {
        $sel->close();
        throw new Exception('RCPA request not found after update');
    }
    $sel->close();

    // ---- Load non-working dates once (used by both due-date computations) ----
    $non_working = [];
    if ($resNW = $conn->query("SELECT `date` FROM rcpa_not_working_calendar")) {
        while ($rw = $resNW->fetch_assoc()) {
            $d = date('Y-m-d', strtotime($rw['date']));
            $non_working[$d] = true;
        }
        $resNW->free();
    }

    // Helper to add N working days (skip Sundays and non-working dates)
    $addWorkingDays = function (string $startYmd, int $days, DateTimeZone $tz, array $nonWorking): string {
        $dt = new DateTime($startYmd, $tz);
        $count = 0;
        while ($count < $days) {
            $dt->modify('+1 day');
            $ymd = $dt->format('Y-m-d');
            $isSunday = ($dt->format('w') === '0'); // Sunday = 0
            if ($isSunday) continue;
            if (isset($nonWorking[$ymd])) continue;
            $count++;
        }
        return $dt->format('Y-m-d');
    };

    $tz = new DateTimeZone('Asia/Manila');

    // 3) Compute & persist reply_due_date if still NULL (keep your original behavior)
    if ($reply_due_date === null && $reply_received) {
        $reply_received_ymd = date('Y-m-d', strtotime($reply_received));
        $computed_reply_due = $addWorkingDays($reply_received_ymd, 5, $tz, $non_working);

        $upd = $conn->prepare('
            UPDATE rcpa_request
            SET reply_due_date = COALESCE(reply_due_date, ?)
            WHERE id = ?
        ');
        if (!$upd) throw new Exception('Due-date update prepare failed: ' . $conn->error);
        $upd->bind_param('si', $computed_reply_due, $id);
        if (!$upd->execute()) throw new Exception('Due-date update execute failed: ' . $upd->error);
        $upd->close();

        // Use the effective value for the next step
        $reply_due_date = $computed_reply_due;
    }

    // 4) NEW: Compute & persist close_due_date (30 working days after reply_due_date), only if reply_due_date exists and close_due_date is NULL
    if ($reply_due_date !== null && $close_due_date === null) {
        $reply_due_ymd = date('Y-m-d', strtotime($reply_due_date));

        // 30 working days after reply_due_date, skipping Sundays and non-working dates
        $computed_close_due = $addWorkingDays($reply_due_ymd, 30, $tz, $non_working);

        $updClose = $conn->prepare('
            UPDATE rcpa_request
            SET close_due_date = COALESCE(close_due_date, ?)
            WHERE id = ?
        ');
        if (!$updClose) throw new Exception('Close due-date update prepare failed: ' . $conn->error);
        $updClose->bind_param('si', $computed_close_due, $id);
        if (!$updClose->execute()) throw new Exception('Close due-date update execute failed: ' . $updClose->error);
        $updClose->close();
    }

    // 5) History
    $historySql = "
        INSERT INTO rcpa_request_history (rcpa_no, name, date_time, activity)
        VALUES (?, ?, CURRENT_TIMESTAMP, ?)
    ";
    $historyStmt = $conn->prepare($historySql);
    if (!$historyStmt) throw new Exception('History insert prepare failed: ' . $conn->error);
    $activityText = "RCPA has been checked by QMS/QA";
    $historyStmt->bind_param('iss', $id, $user_name, $activityText);
    if (!$historyStmt->execute()) throw new Exception('History insert execute failed: ' . $historyStmt->error);
    $historyStmt->close();

    echo json_encode(['success' => true, 'id' => (int)$id, 'status' => $status]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
