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

  // 3) Compute & persist reply_due_date if still NULL
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

    $reply_due_date = $computed_reply_due;
  }

  // 4) Compute & persist close_due_date (30 working days after reply_due_date)
  if ($reply_due_date !== null && $close_due_date === null) {
    $reply_due_ymd = date('Y-m-d', strtotime($reply_due_date));

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

    $close_due_date = $computed_close_due;
  }

  // 5) History
  $historySql = "
        INSERT INTO rcpa_request_history (rcpa_no, name, date_time, activity)
        VALUES (?, ?, CURRENT_TIMESTAMP, ?)
    ";
  $historyStmt = $conn->prepare($historySql);
  if (!$historyStmt) throw new Exception('History insert prepare failed: ' . $conn->error);
  $activityText = "RCPA has been checked by QMS";
  $historyStmt->bind_param('iss', $id, $user_name, $activityText);
  if (!$historyStmt->execute()) throw new Exception('History insert execute failed: ' . $historyStmt->error);
  $historyStmt->close();

  // === Email notification to assignees (ignore junk emails; non-blocking) ===
  try {
    require_once __DIR__ . '/../../send-email.php';

    // ---- helper: fetch & clean emails for a dept[/section] ----
    $getEmailsByDeptSection = function (mysqli $db, string $dept, ?string $section = null): array {
      $emails = [];

      if ($section !== null && $section !== '') {
        $sql = "SELECT TRIM(email) AS email
                          FROM system_users
                         WHERE TRIM(department) = ?
                           AND TRIM(section)    = ?
                           AND email IS NOT NULL
                           AND TRIM(email) <> ''";
        $stmt = $db->prepare($sql);
        if ($stmt) $stmt->bind_param('ss', $dept, $section);
      } else {
        $sql = "SELECT TRIM(email) AS email
                          FROM system_users
                         WHERE TRIM(department) = ?
                           AND email IS NOT NULL
                           AND TRIM(email) <> ''";
        $stmt = $db->prepare($sql);
        if ($stmt) $stmt->bind_param('s', $dept);
      }

      if (isset($stmt) && $stmt && $stmt->execute()) {
        $stmt->bind_result($email);
        while ($stmt->fetch()) {
          $e = trim((string)$email);
          // drop placeholders & invalids
          if ($e === '' || $e === '-' || !filter_var($e, FILTER_VALIDATE_EMAIL)) continue;
          $emails[] = strtolower($e);
        }
        $stmt->close();
      }
      return array_values(array_unique($emails));
    };

    // Fetch assignee department/section from this RCPA
    $assigneeDept = '';
    $assigneeSection = '';
    if ($asSel = $conn->prepare('SELECT assignee, section FROM rcpa_request WHERE id = ? LIMIT 1')) {
      $asSel->bind_param('i', $id);
      if ($asSel->execute()) {
        $asSel->bind_result($assigneeDept, $assigneeSection);
        $asSel->fetch();
      }
      $asSel->close();
    }
    $assigneeDept    = trim((string)$assigneeDept);
    $assigneeSection = trim((string)$assigneeSection);

    // TO: all matching assignee emails (dept + section when present)
    $toRecipients = [];
    if ($assigneeDept !== '') {
      $toRecipients = $getEmailsByDeptSection($conn, $assigneeDept, $assigneeSection !== '' ? $assigneeSection : null);
    }

    // CC: all QMS users (cleaned)
    $ccRecipients = [];
    if ($qmsStmt = $conn->prepare("SELECT TRIM(email) AS email FROM system_users WHERE TRIM(department) = 'QMS' AND email IS NOT NULL AND TRIM(email) <> ''")) {
      if ($qmsStmt->execute()) {
        $qmsStmt->bind_result($ccEmail);
        while ($qmsStmt->fetch()) {
          $e = trim((string)$ccEmail);
          if ($e === '' || $e === '-' || !filter_var($e, FILTER_VALIDATE_EMAIL)) continue;
          $ccRecipients[] = strtolower($e);
        }
      }
      $qmsStmt->close();
    }
    $ccRecipients = array_values(array_unique($ccRecipients));

    // Avoid overlap between To and CC
    if (!empty($toRecipients)) {
      $ccRecipients = array_values(array_diff($ccRecipients, $toRecipients));
    }

    if (!empty($toRecipients)) {
      // Subject & dates
      $deptDisplay      = $assigneeDept . ($assigneeSection !== '' ? ' - ' . $assigneeSection : '');
      $subject          = sprintf('RCPA #%d assigned to %s - status: ASSIGNEE PENDING', (int)$id, $deptDisplay);
      $replyDueFmt      = $reply_due_date ? date('F j, Y', strtotime($reply_due_date)) : '—';
      $closeDueFmt      = $close_due_date ? date('F j, Y', strtotime($close_due_date)) : '—';

      // Fixed portal link (per request)
      $portalUrl = 'http://rti10517/qdportal/login.php';

      // Safe strings for HTML
      $rcpaNo        = (int)$id;
      $deptDispSafe  = htmlspecialchars($deptDisplay, ENT_QUOTES, 'UTF-8');
      $replyDueSafe  = htmlspecialchars($replyDueFmt, ENT_QUOTES, 'UTF-8');
      $closeDueSafe  = htmlspecialchars($closeDueFmt, ENT_QUOTES, 'UTF-8');
      $statusTxtSafe = htmlspecialchars($status, ENT_QUOTES, 'UTF-8');
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
    RCPA #' . $rcpaNo . ' is now ' . $statusTxtSafe . '. Reply due ' . $replyDueSafe . '.
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
                RCPA #' . $rcpaNo . '
              </div>
              <span style="display:inline-block; font-size:12px; font-weight:600; padding:6px 10px; border-radius:999px; background:#ecfdf5; color:#065f46; border:1px solid #a7f3d0;">
                ' . $statusTxtSafe . '
              </span>
            </td>
          </tr>

          <tr>
            <td style="padding:8px 24px 0 24px; color:#374151; font-size:14px; line-height:1.6;">
              Good day,<br>
              The RCPA request <strong>#' . $rcpaNo . '</strong> has been approved by <strong>QMS</strong> and is now in status <strong>' . $statusTxtSafe . '</strong>.
              <div style="margin-top:10px;">
                <strong>For the assignee&rsquo;s supervisor/manager:</strong> please designate a person to respond to this RCPA.
              </div>
            </td>
          </tr>

          <tr>
            <td style="padding:16px 24px 8px 24px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;">
                <tr>
                  <td style="width:42%; padding:10px 12px; background:#f9fafb; border:1px solid #e5e7eb; font-size:13px; color:#6b7280;">Assignee</td>
                  <td style="padding:10px 12px; border:1px solid #e5e7eb; font-size:13px; color:#111827;"><strong>' . $deptDispSafe . '</strong></td>
                </tr>
                <tr>
                  <td style="width:42%; padding:10px 12px; background:#f9fafb; border:1px solid #e5e7eb; font-size:13px; color:#6b7280;">Reply Due Date</td>
                  <td style="padding:10px 12px; border:1px solid #e5e7eb; font-size:13px; color:#111827;">' . $replyDueSafe . '</td>
                </tr>
                <tr>
                  <td style="width:42%; padding:10px 12px; background:#f9fafb; border:1px solid #e5e7eb; font-size:13px; color:#6b7280;">Close Due Date</td>
                  <td style="padding:10px 12px; border:1px solid #e5e7eb; font-size:13px; color:#111827;">' . $closeDueSafe . '</td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:20px 24px 8px 24px;" align="left">
              <a href="' . $portalUrlSafe . '" target="_blank"
                 style="background:#2563eb; color:#ffffff; text-decoration:none; padding:12px 18px; border-radius:6px; display:inline-block; font-size:14px; font-weight:600;">
                Open QD Portal
              </a>
            </td>
          </tr>

          <tr>
            <td style="padding:6px 24px 0 24px; color:#6b7280; font-size:12px;">
              If the button doesn\'t work, copy and paste this link into your browser:<br>
              <a href="' . $portalUrlSafe . '" target="_blank" style="color:#2563eb; text-decoration:underline;">' . $portalUrlSafe . '</a>
            </td>
          </tr>

          <tr>
            <td style="padding:24px; color:#9ca3af; font-size:12px;">
              This is an automated message from the QD Portal. Please do not reply to this email.
              <br>If you believe you received this in error, contact QMS or the system administrator.
            </td>
          </tr>
        </table>

        <div style="height:12px; line-height:12px;">&nbsp;</div>
      </td>
    </tr>
  </table>
</body>
</html>';

      // Plain-text alternative
      $altBody  = "RCPA #$rcpaNo is now $status\n";
      $altBody .= "Assignee: " . html_entity_decode($deptDispSafe, ENT_QUOTES, 'UTF-8') . "\n";
      $altBody .= "Reply Due Date: " . html_entity_decode($replyDueSafe, ENT_QUOTES, 'UTF-8') . "\n";
      $altBody .= "Close Due Date: " . html_entity_decode($closeDueSafe, ENT_QUOTES, 'UTF-8') . "\n";
      $altBody .= "Assignee's supervisor/manager: please designate a person to respond to this RCPA.\n";
      $altBody .= "Open QD Portal: $portalUrl\n";

      // Send (TO: Assignee dept/section; CC: QMS)
      sendEmailNotification($toRecipients, $subject, $htmlBody, $altBody, $ccRecipients);
    }
  } catch (Throwable $mailErr) {
    // Never block the main flow because of email issues; log only.
    error_log('RCPA email notify error (id ' . (int)$id . '): ' . $mailErr->getMessage());
  }

  echo json_encode(['success' => true, 'id' => (int)$id, 'status' => $status]);
} catch (Throwable $e) {
  http_response_code(500);
  echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
