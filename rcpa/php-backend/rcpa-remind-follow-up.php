<?php
// php-backend/rcpa_remind_follow_up.php
// Sends a follow-up reminder when target_date is exactly 7 days away.
// Recipients: all users where system_users.department = 'QMS'.
// Email contains: RCPA # (rcpa_no), Remarks, Target Date.
// Idempotent per (row, day) via rcpa_request_history.

declare(strict_types=1);
date_default_timezone_set('Asia/Manila');

require_once __DIR__ . '/../../connection.php';
$db = (isset($mysqli) && $mysqli instanceof mysqli) ? $mysqli
  : ((isset($conn) && $conn instanceof mysqli) ? $conn : null);
if (!$db) {
  echo "DB connection not found\n";
  exit(1);
}
@$db->set_charset('utf8mb4');

/* Ensure MySQL session timezone matches PHP (Asia/Manila, UTC+08:00) */
@$db->query("SET time_zone = '+08:00'");

require_once __DIR__ . '/../../send-email.php';

$sent = 0;
$skipped = 0;

/* -------------------------------
   Helpers
-------------------------------- */
function h(?string $s): string
{
  return htmlspecialchars(trim((string)$s), ENT_QUOTES, 'UTF-8');
}
function fmtDate(?string $d): string
{
  if (!$d) return '';
  $ts = strtotime($d);
  return $ts ? date('F j, Y', $ts) : '';
}

/* -------------------------------
   Load all QMS recipients once
-------------------------------- */
$qmsEmails = [];
if ($qs = $db->prepare("SELECT email FROM system_users WHERE department = ? AND email IS NOT NULL AND email <> ''")) {
  $dept = 'QMS';
  if ($qs->bind_param('s', $dept) && $qs->execute()) {
    $qs->bind_result($em);
    while ($qs->fetch()) {
      $em = trim((string)$em);
      if ($em !== '') $qmsEmails[] = $em;
    }
  }
  $qs->close();
}
$qmsEmails = array_values(array_unique(array_filter($qmsEmails)));
if (!$qmsEmails) {
  echo "No QMS recipients found. Exiting.\n";
  exit(0);
}

/* -------------------------------
   Select follow-ups due in 7 days
-------------------------------- */
$sql = "
  SELECT id, rcpa_no, target_date, remarks
  FROM rcpa_follow_up_remarks
  WHERE target_date IS NOT NULL
    AND DATEDIFF(target_date, CURDATE()) = 7
  ORDER BY rcpa_no, id
";
$rows = [];

if (!($st = $db->prepare($sql))) {
  echo "Prepare failed: " . $db->error . "\n";
  exit(1);
}
if (!$st->execute()) {
  $e = $st->error;
  $st->close();
  echo "Execute failed: $e\n";
  exit(1);
}
$st->bind_result($rowId, $rcpaNo, $targetDate, $remarks);
while ($st->fetch()) {
  $rows[] = [
    'row_id'      => (int)$rowId,
    'rcpa_no'     => (int)$rcpaNo,
    'target_date' => (string)$targetDate,
    'remarks'     => (string)$remarks,
  ];
}
$st->close();

if (!$rows) {
  echo "No follow-up targets due in 7 days today.\n";
  exit(0);
}

/* -------------------------------
   Process each row
-------------------------------- */
foreach ($rows as $r) {
  $rowId      = $r['row_id'];
  $rcpaNo     = $r['rcpa_no'];
  $targetDate = $r['target_date'];
  $remarks    = $r['remarks'];

  // Stable idempotency activity (per row)
  $activityKey = 'FOLLOW_UP_REMINDER_D7_ROW_' . $rowId;

  // Skip if already sent today
  $already = false;
  if ($h = $db->prepare("SELECT 1 FROM rcpa_request_history WHERE rcpa_no=? AND activity=? AND DATE(date_time)=CURDATE() LIMIT 1")) {
    $h->bind_param('is', $rcpaNo, $activityKey);
    if ($h->execute()) {
      $h->store_result();
      $already = $h->num_rows > 0;
    }
    $h->close();
  }
  if ($already) {
    $skipped++;
    continue;
  }

  // Compose email
  $targetDateTxt = fmtDate($targetDate);
  $subject = sprintf('RCPA #%d - Follow-up target in 7 days (%s)', $rcpaNo, $targetDateTxt);

  $taskUrl        = 'http://rti10517/qdportal/rcpa/php/rcpa-task.php';
  $taskUrlSafe    = h($taskUrl);
  $taskUrlText    = h('rti10517/qdportal/rcpa/php/rcpa-task.php');

  $remarksSafe    = nl2br(h($remarks));
  $remarksPlain   = trim((string)$remarks);

  $htmlBody = '
<!doctype html><html lang="en"><head><meta charset="utf-8"></head>
<body style="margin:0; padding:0; background:#f3f4f6; font-family:Arial,Helvetica,sans-serif; color:#111827;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f3f4f6; padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:640px; background:#ffffff; border:1px solid #e5e7eb; border-radius:8px;">
          <tr>
            <td style="padding:18px 20px; border-bottom:1px solid #e5e7eb;">
              <table role="presentation" width="100%"><tr>
                <td style="font-size:16px; font-weight:bold;">RCPA Follow-up Reminder</td>
                <td align="right">
                  <span style="display:inline-block; padding:6px 10px; font-size:12px; font-weight:bold; color:#92400e; background:#fef3c7; border:1px solid #f59e0b; border-radius:999px;">
                    Target in 7 days
                  </span>
                </td>
              </tr></table>
              <div style="margin-top:6px; font-size:13px; color:#6b7280;">RCPA #' . (int)$rcpaNo . '</div>
            </td>
          </tr>

          <tr><td style="padding:20px;">
            <p style="margin:0 0 14px 0; font-size:14px;">
              This is a reminder that the follow-up <strong>target date</strong> for <strong>RCPA #' . (int)$rcpaNo . '</strong> is
              <strong>' . h($targetDateTxt) . '</strong> (7 days from today).
            </p>

            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse; font-size:14px; margin-top:8px;">
              <tr>
                <td style="width:180px; padding:10px; background:#f9fafb; border:1px solid #e5e7eb;">RCPA #</td>
                <td style="padding:10px; border:1px solid #e5e7eb;"><strong>' . (int)$rcpaNo . '</strong></td>
              </tr>
              <tr>
                <td style="padding:10px; background:#f9fafb; border:1px solid #e5e7eb;">Target Date</td>
                <td style="padding:10px; border:1px solid #e5e7eb;">' . h($targetDateTxt) . '</td>
              </tr>
              <tr>
                <td style="padding:10px; background:#f9fafb; border:1px solid #e5e7eb;">Remarks</td>
                <td style="padding:10px; border:1px solid #e5e7eb;">' . ($remarksSafe !== '' ? $remarksSafe : '<em>No remarks provided</em>') . '</td>
              </tr>
            </table>

            <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="left" style="margin-top:18px;">
              <tr><td>
                <a href="' . $taskUrlSafe . '" target="_blank"
                   style="background:#2563eb; color:#ffffff; text-decoration:none; padding:12px 18px; border-radius:6px; font-size:14px; display:inline-block;">
                  Open QD Portal
                </a>
              </td></tr>
            </table>

            <div style="clear:both;"></div>

            <p style="margin:14px 0 0 0; font-size:12px; color:#6b7280;">
              If the button doesn\'t work, use this link:<br>
              <a href="' . $taskUrlSafe . '" target="_blank" style="color:#2563eb; text-decoration:underline;">' . $taskUrlText . '</a>
            </p>
          </td></tr>

          <tr>
            <td style="padding:12px 20px; border-top:1px solid #e5e7eb; background:#fafafa; font-size:12px; color:#6b7280;">
              Sent to QMS recipients. This is an automated reminder from the QD Portal.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body></html>';

  $altBody  = "RCPA #$rcpaNo - Follow-up target in 7 days ($targetDateTxt)\n";
  $altBody .= "Target Date: $targetDateTxt\n";
  $altBody .= "Remarks: " . ($remarksPlain !== '' ? $remarksPlain : 'No remarks provided') . "\n";
  $altBody .= "Open QD Portal: $taskUrl\n";

  // Send email to all QMS (no CC)
  $ok = sendEmailNotification($qmsEmails, $subject, $htmlBody, $altBody, []);

  // Record history only on success
  if ($ok && ($ih = $db->prepare("INSERT INTO rcpa_request_history (rcpa_no, name, date_time, activity) VALUES (?, 'System', CURRENT_TIMESTAMP, ?)"))) {
    $ih->bind_param('is', $rcpaNo, $activityKey);
    $ih->execute();
    $ih->close();
  }

  $ok ? $sent++ : $skipped++;
}

echo "Sent: $sent; Skipped: $skipped\n";
exit(0);
