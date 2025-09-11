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

    // Commit DB work first
    $db->commit();

    // ====================== EMAIL: To QMS, CC Assignee (clean + section-aware) =======================
    try {
        require_once __DIR__ . '/../../send-email.php';

        // Helper: sanitize list (skip null/empty/'-' and invalids; lowercase; unique)
        $cleanList = function(array $arr): array {
            $out = [];
            foreach ($arr as $e) {
                $e = strtolower(trim((string)$e));
                if ($e === '' || $e === '-' || !filter_var($e, FILTER_VALIDATE_EMAIL)) continue;
                $out[$e] = true;
            }
            return array_keys($out);
        };

        // 1) Fetch assignee department/section for CC and display
        $assigneeDept = ''; $assigneeSection = '';
        if ($aSel = $db->prepare("SELECT assignee, section FROM rcpa_request WHERE id = ? LIMIT 1")) {
            $aSel->bind_param('i', $id);
            if ($aSel->execute()) {
                $aSel->bind_result($assigneeDept, $assigneeSection);
                $aSel->fetch();
            }
            $aSel->close();
        }
        $assigneeDept = trim((string)$assigneeDept);
        $assigneeSection = trim((string)$assigneeSection);

        // 2) Build To: all QMS department users (cleaned)
        $toRecipients = [];
        if ($qmsStmt = $db->prepare("SELECT TRIM(email) AS email FROM system_users WHERE TRIM(department) = 'QMS' AND email IS NOT NULL AND TRIM(email) <> ''")) {
            if ($qmsStmt->execute()) {
                $qmsStmt->bind_result($qmsEmail);
                while ($qmsStmt->fetch()) { $toRecipients[] = $qmsEmail; }
            }
            $qmsStmt->close();
        }
        $toRecipients = $cleanList($toRecipients);

        // 3) Build CC: assignee users (respect section when present; cleaned)
        $ccRecipients = [];
        if ($assigneeDept !== '') {
            if ($assigneeSection !== '') {
                $ccSql = "SELECT TRIM(email) AS email
                            FROM system_users
                           WHERE TRIM(department) = ?
                             AND TRIM(section)    = ?
                             AND email IS NOT NULL
                             AND TRIM(email) <> ''";
                $ccStmt = $db->prepare($ccSql);
                if ($ccStmt) $ccStmt->bind_param('ss', $assigneeDept, $assigneeSection);
            } else {
                $ccSql = "SELECT TRIM(email) AS email
                            FROM system_users
                           WHERE TRIM(department) = ?
                             AND email IS NOT NULL
                             AND TRIM(email) <> ''";
                $ccStmt = $db->prepare($ccSql);
                if ($ccStmt) $ccStmt->bind_param('s', $assigneeDept);
            }
            if (isset($ccStmt) && $ccStmt && $ccStmt->execute()) {
                $ccStmt->bind_result($ccEmail);
                while ($ccStmt->fetch()) { $ccRecipients[] = $ccEmail; }
                $ccStmt->close();
            }
        }
        $ccRecipients = $cleanList($ccRecipients);

        // 4) Ensure no overlap between To and CC
        if (!empty($toRecipients)) {
            $ccRecipients = array_values(array_diff($ccRecipients, $toRecipients));
        }

        if (!empty($toRecipients)) {
            // Display name: "Department - Section" (if section exists)
            $deptDisplay = $assigneeDept . ($assigneeSection !== '' ? ' - ' . $assigneeSection : '');

            // Subject (ASCII hyphen to avoid encoding issues)
            $subject = sprintf('RCPA #%d assigned to %s - status: %s', (int)$id, $deptDisplay, $newStatus);

            // Fixed portal link
            $portalUrl = 'http://rti10517/qdportal/login.php';

            // Safe strings
            $rcpaNo        = (int)$id;
            $deptDispSafe  = htmlspecialchars($deptDisplay, ENT_QUOTES, 'UTF-8');
            $statusSafe    = htmlspecialchars($newStatus, ENT_QUOTES, 'UTF-8');
            $portalUrlSafe = htmlspecialchars($portalUrl, ENT_QUOTES, 'UTF-8');

            // --- FIXES: strong preheader hiding + correct line-height ---
            $htmlBody = '
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>RCPA Notification</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="margin:0; padding:0; background:#f3f4f6; font-family: Arial, Helvetica, sans-serif; color:#111827;">
  <div style="display:none!important; visibility:hidden; mso-hide:all; font-size:1px; line-height:1px; max-height:0; max-width:0; opacity:0; overflow:hidden;">
    RCPA #'.$rcpaNo.' '.$statusSafe.' for '.$deptDispSafe.'
  </div>

  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f3f4f6; padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px; background:#ffffff; border-radius:10px; overflow:hidden; box-shadow:0 1px 3px rgba(0,0,0,.08);">
          <tr>
            <td style="padding:20px 24px; background:#111827; color:#ffffff;">
              <div style="font-size:16px; letter-spacing:.4px;">QD Portal</div>
              <div style="font-size:22px; font-weight:bold; margin-top:4px;">RCPA Notification</div>
            </td>
          </tr>

          <tr>
            <td style="padding:20px 24px 8px 24px;">
              <div style="font-size:18px; font-weight:bold; color:#111827; margin-bottom:8px;">
                RCPA #'.$rcpaNo.'
              </div>
              <span style="display:inline-block; font-size:12px; font-weight:600; padding:6px 10px; border-radius:999px; background:#eef2ff; color:#3730a3; border:1px solid #c7d2fe;">
                '.$statusSafe.'
              </span>
            </td>
          </tr>

          <tr>
            <td style="padding:8px 24px 0 24px; color:#374151; font-size:14px; line-height:1.6; mso-line-height-rule:exactly;">
              <p style="margin:0 0 10px 0;">Good day,</p>
              <p style="margin:0 0 10px 0;">The Assignee Supervisor/Manager has <strong>approved the Assignee reply as VALID</strong> for RCPA <strong>#'.$rcpaNo.'</strong>.</p>
              <p style="margin:0;">The request is now in status <strong>'.$statusSafe.'</strong>.</p>
            </td>
          </tr>

          <tr>
            <td style="padding:16px 24px 8px 24px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;">
                <tr>
                  <td style="width:42%; padding:10px 12px; background:#f9fafb; border:1px solid #e5e7eb; font-size:13px; color:#6b7280;">Assignee</td>
                  <td style="padding:10px 12px; border:1px solid #e5e7eb; font-size:13px; color:#111827;"><strong>'.$deptDispSafe.'</strong></td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:20px 24px 8px 24px;" align="left">
              <a href="'.$portalUrlSafe.'" target="_blank"
                 style="background:#2563eb; color:#ffffff; text-decoration:none; padding:12px 18px; border-radius:6px; display:inline-block; font-size:14px; font-weight:600;">
                Open QD Portal
              </a>
            </td>
          </tr>

          <tr>
            <td style="padding:6px 24px 0 24px; color:#6b7280; font-size:12px;">
              If the button doesn\'t work, copy and paste this link into your browser:<br>
              <a href="'.$portalUrlSafe.'" target="_blank" style="color:#2563eb; text-decoration:underline;">'.$portalUrlSafe.'</a>
            </td>
          </tr>

          <tr>
            <td style="padding:24px; color:#9ca3af; font-size:12px;">
              This is an automated message from the QD Portal. Please do not reply to this email.
            </td>
          </tr>
        </table>

        <div style="height:12px; line-height:12px;">&nbsp;</div>
      </td>
    </tr>
  </table>
</body>
</html>';

            // Plain text alternative
            $altBody  = "RCPA #$rcpaNo - $newStatus\n";
            $altBody .= "Assignee: " . html_entity_decode($deptDispSafe, ENT_QUOTES, 'UTF-8') . "\n";
            $altBody .= "Open QD Portal: $portalUrl\n";

            // Fire email: To = QMS (cleaned), CC = Assignee dept/section (cleaned)
            sendEmailNotification($toRecipients, $subject, $htmlBody, $altBody, $ccRecipients);
        }
    } catch (Throwable $mailErr) {
        error_log('VALID email notify error (id ' . (int)$id . '): ' . $mailErr->getMessage());
        // Do not block success response
    }
    // ==================== END EMAIL ====================

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
