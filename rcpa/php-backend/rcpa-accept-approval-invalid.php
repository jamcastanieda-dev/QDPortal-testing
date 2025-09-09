<?php
// rcpa-accept-approval-invalid.php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

date_default_timezone_set('Asia/Manila');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  http_response_code(405);
  echo json_encode(['error' => 'Method Not Allowed'], JSON_UNESCAPED_UNICODE);
  exit;
}

$user = json_decode($_COOKIE['user'] ?? 'null', true);
if (!$user || !is_array($user)) {
  http_response_code(401);
  echo json_encode(['error' => 'Invalid user cookie']);
  exit;
}
$user_name = $user['name'] ?? 'Unknown User';

require_once __DIR__ . '/../../connection.php';

function json_ok(array $extra = []): void {
  echo json_encode(array_merge(['success' => true], $extra), JSON_UNESCAPED_UNICODE);
  exit;
}
function json_err(string $msg, int $code = 500): void {
  http_response_code($code);
  echo json_encode(['success' => false, 'error' => $msg], JSON_UNESCAPED_UNICODE);
  exit;
}

$id = filter_input(INPUT_POST, 'id', FILTER_VALIDATE_INT);
if (!$id) json_err('Missing or invalid id', 400);

if (!isset($conn) || !($conn instanceof mysqli)) json_err('No mysqli connection found ($conn).', 500);
if (method_exists($conn, 'set_charset')) { @$conn->set_charset('utf8mb4'); }

/** Compute working days from (reply_received + 1 day) .. $today (inclusive),
 *  skipping Sundays and any dates in $nonWorking (assoc: 'Y-m-d' => true).
 */
function working_days_between(?string $reply_received_ymd, string $today_ymd, array $nonWorking): int {
  if (!$reply_received_ymd) return 0;
  $startTs = strtotime($reply_received_ymd);
  $endTs   = strtotime($today_ymd);
  if ($startTs === false || $endTs === false || $endTs < $startTs) return 0;

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
  if (method_exists($conn, 'begin_transaction')) $conn->begin_transaction();

  // Lock the row and get fields we need
  $reply_received = $reply_date = $no_days_reply = null;
  $sel = $conn->prepare("SELECT reply_received, reply_date, no_days_reply FROM rcpa_request WHERE id = ? FOR UPDATE");
  if (!$sel) throw new RuntimeException('DB prepare failed (select rcpa_request): ' . $conn->error);
  $sel->bind_param('i', $id);
  if (!$sel->execute()) { $e = $sel->error; $sel->close(); throw new RuntimeException('DB execute failed (select rcpa_request): '.$e); }
  $sel->bind_result($reply_received, $reply_date, $no_days_reply);
  if (!$sel->fetch()) { $sel->close(); if (method_exists($conn, 'rollback')) $conn->rollback(); json_err('Record not found.', 404); }
  $sel->close();

  // 1) Update status + set reply_date only if NULL
  $newStatus = 'IN-VALIDATION REPLY';
  $sql = "UPDATE rcpa_request
             SET status = ?,
                 reply_date = COALESCE(reply_date, CURDATE())
           WHERE id = ?
           LIMIT 1";
  $stmt = $conn->prepare($sql);
  if (!$stmt) throw new RuntimeException('DB prepare failed (rcpa_request): ' . $conn->error);
  $stmt->bind_param('si', $newStatus, $id);
  if (!$stmt->execute()) { $e = $stmt->error; $stmt->close(); throw new RuntimeException('DB execute failed (rcpa_request): '.$e); }
  $stmt->close();

  // 2) If no_days_reply is NULL, compute from reply_received → today (working days)
  $computed = null;
  if ($no_days_reply === null) {
    // Load non-working calendar
    $nonWorking = [];
    if ($resNW = $conn->query("SELECT `date` FROM rcpa_not_working_calendar")) {
      while ($rw = $resNW->fetch_assoc()) {
        $d = date('Y-m-d', strtotime($rw['date']));
        $nonWorking[$d] = true;
      }
      $resNW->free();
    }

    $todayYmd = date('Y-m-d');
    $rrYmd = $reply_received ? date('Y-m-d', strtotime($reply_received)) : null;
    $computed = working_days_between($rrYmd, $todayYmd, $nonWorking);

    // Only set when still NULL
    $updDays = $conn->prepare("UPDATE rcpa_request SET no_days_reply = ? WHERE id = ? AND no_days_reply IS NULL");
    if (!$updDays) throw new RuntimeException('DB prepare failed (update no_days_reply): ' . $conn->error);
    $updDays->bind_param('ii', $computed, $id);
    if (!$updDays->execute()) { $e = $updDays->error; $updDays->close(); throw new RuntimeException('DB execute failed (update no_days_reply): '.$e); }
    $updDays->close();
  }

  // 2.1) Set hit_reply if NULL based on no_days_reply (<=5 => 'hit', >5 => 'missed')
  $effectiveDays = ($no_days_reply === null) ? $computed : (int)$no_days_reply;
  if ($effectiveDays !== null) {
    $hitVal = ($effectiveDays <= 5) ? 'hit' : 'missed';
    $updHit = $conn->prepare("UPDATE rcpa_request SET hit_reply = COALESCE(hit_reply, ?) WHERE id = ?");
    if (!$updHit) throw new RuntimeException('DB prepare failed (update hit_reply): ' . $conn->error);
    $updHit->bind_param('si', $hitVal, $id);
    if (!$updHit->execute()) { $e = $updHit->error; $updHit->close(); throw new RuntimeException('DB execute failed (update hit_reply): '.$e); }
    $updHit->close();
  }

  // 3) Upsert rcpa_not_valid (rcpa_no = rcpa_request.id)
  $sel = $conn->prepare("SELECT id FROM rcpa_not_valid WHERE rcpa_no = ? LIMIT 1");
  if (!$sel) throw new RuntimeException('DB prepare failed (select rcpa_not_valid): ' . $conn->error);
  $sel->bind_param('i', $id);
  if (!$sel->execute()) { $e = $sel->error; $sel->close(); throw new RuntimeException('DB execute failed (select rcpa_not_valid): '.$e); }
  $sel->store_result();
  $exists = $sel->num_rows > 0;
  $sel->free_result();
  $sel->close();

  if ($exists) {
    $upd = $conn->prepare("
      UPDATE rcpa_not_valid
         SET assignee_supervisor_name = ?,
             assignee_supervisor_date = CURDATE()
       WHERE rcpa_no = ?
       LIMIT 1
    ");
    if (!$upd) throw new RuntimeException('DB prepare failed (update rcpa_not_valid): ' . $conn->error);
    $upd->bind_param('si', $user_name, $id);
    if (!$upd->execute()) { $e = $upd->error; $upd->close(); throw new RuntimeException('DB execute failed (update rcpa_not_valid): '.$e); }
    $upd->close();
  } else {
    // If rcpa_not_valid.id is AUTO_INCREMENT, remove it from the INSERT
    $ins = $conn->prepare("
      INSERT INTO rcpa_not_valid
        (id, rcpa_no, assignee_supervisor_name, assignee_supervisor_date)
      VALUES (?,  ?,      ?,                       CURDATE())
    ");
    if (!$ins) throw new RuntimeException('DB prepare failed (insert rcpa_not_valid): ' . $conn->error);
    $ins->bind_param('iis', $id, $id, $user_name);
    if (!$ins->execute()) { $e = $ins->error; $ins->close(); throw new RuntimeException('DB execute failed (insert rcpa_not_valid): '.$e); }
    $ins->close();
  }

  // 4) Insert history
  $activity = 'The Assignee Supervisor/Manager approved the Assignee reply as IN-VALID';
  $rcpa_no_str = (string)$id;
  $hist = $conn->prepare("INSERT INTO rcpa_request_history (rcpa_no, name, activity) VALUES (?, ?, ?)");
  if (!$hist) throw new RuntimeException('DB prepare failed (insert rcpa_request_history): ' . $conn->error);
  $hist->bind_param('sss', $rcpa_no_str, $user_name, $activity);
  if (!$hist->execute()) { $e = $hist->error; $hist->close(); throw new RuntimeException('DB execute failed (insert rcpa_request_history): '.$e); }
  $hist->close();

  if (method_exists($conn, 'commit')) $conn->commit();

  // ====================== EMAIL: To QMS, CC Assignee =======================
  try {
    require_once __DIR__ . '/../../send-email.php';

    // Fetch assignee department/section for CC and display
    $assigneeDept = ''; $assigneeSection = '';
    if ($aSel = $conn->prepare("SELECT assignee, section FROM rcpa_request WHERE id = ? LIMIT 1")) {
      $aSel->bind_param('i', $id);
      if ($aSel->execute()) {
        $aSel->bind_result($assigneeDept, $assigneeSection);
        $aSel->fetch();
      }
      $aSel->close();
    }
    $assigneeDept = trim((string)$assigneeDept);
    $assigneeSection = trim((string)$assigneeSection);

    // To: all QMS emails
    $toRecipients = [];
    if ($qmsStmt = $conn->prepare("SELECT email FROM system_users WHERE department = 'QMS' AND email IS NOT NULL AND email <> ''")) {
      if ($qmsStmt->execute()) {
        $qmsStmt->bind_result($qmsEmail);
        while ($qmsStmt->fetch()) {
          $qmsEmail = trim((string)$qmsEmail);
          if ($qmsEmail !== '') $toRecipients[] = $qmsEmail;
        }
      }
      $qmsStmt->close();
    }

    // CC: assignee department (respect section if present)
    $ccRecipients = [];
    if ($assigneeDept !== '') {
      if ($assigneeSection !== '') {
        $ccSql = "SELECT email FROM system_users WHERE department = ? AND section = ? AND email IS NOT NULL AND email <> ''";
        $ccStmt = $conn->prepare($ccSql);
        if ($ccStmt) $ccStmt->bind_param('ss', $assigneeDept, $assigneeSection);
      } else {
        $ccSql = "SELECT email FROM system_users WHERE department = ? AND email IS NOT NULL AND email <> ''";
        $ccStmt = $conn->prepare($ccSql);
        if ($ccStmt) $ccStmt->bind_param('s', $assigneeDept);
      }
      if (isset($ccStmt) && $ccStmt && $ccStmt->execute()) {
        $ccStmt->bind_result($ccEmail);
        while ($ccStmt->fetch()) {
          $ccEmail = trim((string)$ccEmail);
          if ($ccEmail !== '') $ccRecipients[] = $ccEmail;
        }
        $ccStmt->close();
      }
    }

    // De-dup & avoid overlap
    $toRecipients = array_values(array_unique(array_filter($toRecipients)));
    $ccRecipients = array_values(array_unique(array_filter($ccRecipients)));
    $ccRecipients = array_values(array_diff($ccRecipients, $toRecipients));

    if (!empty($toRecipients)) {
      // Display "Department - Section" when section exists
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

      // HTML body
      $htmlBody = '
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>RCPA Notification</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="margin:0; padding:0; background:#f3f4f6; font-family: Arial, Helvetica, sans-serif; color:#111827;">
  <div style="display:none; overflow:hidden; line-height:1px; opacity:0; max-height:0; max-width:0;">
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
              <span style="display:inline-block; font-size:12px; font-weight:600; padding:6px 10px; border-radius:999px; background:#fef3c7; color:#92400e; border:1px solid #fde68a;">
                '.$statusSafe.'
              </span>
            </td>
          </tr>

          <tr>
            <td style="padding:8px 24px 0 24px; color:#374151; font-size:14px; line-height:1.6;">
              Good day,<br>
              The Assignee Supervisor/Manager has <strong>approved the Assignee reply as IN-VALID</strong> for RCPA <strong>#'.$rcpaNo.'</strong>.<br>
              The request is now in status <strong>'.$statusSafe.'</strong>.
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

      // Send: To = QMS, CC = Assignee
      sendEmailNotification($toRecipients, $subject, $htmlBody, $altBody, $ccRecipients);
    }
  } catch (Throwable $mailErr) {
    error_log('INVALID email notify error (id ' . (int)$id . '): ' . $mailErr->getMessage());
    // Do not block success
  }
  // ==================== END EMAIL ====================

  json_ok();
} catch (Throwable $e) {
  if (method_exists($conn, 'rollback')) { @$conn->rollback(); }
  json_err($e->getMessage(), 500);
}
