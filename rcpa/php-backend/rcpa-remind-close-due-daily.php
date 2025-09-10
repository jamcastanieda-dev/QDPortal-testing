<?php
// php-backend/rcpa-remind-close-due-daily.php
// Runs daily and emails assignee groups when close_due_date is exactly 7 days, 1 day, 14 days, 21 days, or 28 days away.

declare(strict_types=1);
date_default_timezone_set('Asia/Manila');

require_once __DIR__ . '/../../connection.php';
$db = (isset($mysqli) && $mysqli instanceof mysqli) ? $mysqli
   : ((isset($conn) && $conn instanceof mysqli) ? $conn : null);
if (!$db) { echo "DB connection not found\n"; exit(1); }
@$db->set_charset('utf8mb4');

require_once __DIR__ . '/../../send-email.php';

$sent = 0; $skipped = 0;

/* ---------------------------------------------------
   Load QMS CC list once (department = 'QMS')
--------------------------------------------------- */
$qmsEmails = [];
if ($qs = $db->prepare("SELECT email FROM system_users WHERE department = ? AND email IS NOT NULL AND email <> ''")) {
  $qms = 'QMS';
  if ($qs->bind_param('s', $qms) && $qs->execute()) {
    $qs->bind_result($em);
    while ($qs->fetch()) {
      $em = trim((string)$em);
      if ($em !== '') $qmsEmails[] = $em;
    }
  }
  $qs->close();
}
$qmsEmails = array_values(array_unique(array_filter($qmsEmails)));

/* ---------------------------------------------------
   Pull all rows due in 7, 1, 14, 21, or 28 days based on `close_due_date`
--------------------------------------------------- */
$sql = "
  SELECT
      id,
      assignee,
      section,
      close_due_date,
      DATEDIFF(close_due_date, CURDATE()) AS days_left
  FROM rcpa_request
  WHERE close_due_date IS NOT NULL
    AND close_date IS NULL
    AND DATEDIFF(close_due_date, CURDATE()) IN (7, 1, 14, 21, 28)
    AND status IN ('ASSIGNEE PENDING', 'VALIDATION REPLY', 'IN-VALIDATION REPLY')
  ORDER BY id
";


$rows = [];
if (!($st = $db->prepare($sql))) { echo "Prepare failed: ".$db->error."\n"; exit(1); }
if (!$st->execute()) { $e = $st->error; $st->close(); echo "Execute failed: $e\n"; exit(1); }

/* BUFFER the whole result set before issuing other queries */
$st->store_result();
$st->bind_result($id, $dept, $section, $due, $days_left);
while ($st->fetch()) {
  $rows[] = [
    'id'        => (int)$id,
    'dept'      => (string)$dept,
    'section'   => (string)$section,
    'due'       => (string)$due,
    'days_left' => (int)$days_left,
  ];
}
$st->free_result();
$st->close();

/* ---------------------------------------------------
   Process each row (idempotent per day & offset)
--------------------------------------------------- */
foreach ($rows as $r) {
  $id        = $r['id'];
  $dept      = trim($r['dept']);
  $section   = trim($r['section']);
  $due       = $r['due'];
  $daysLeft  = (int)$r['days_left'];

  // Build the activity/labels per offset (for idempotency & email copy)
  $label = ($daysLeft === 1) ? '1 day' : ($daysLeft . ' days');
  $activityStr = 'Reminder: Close due in ' . $label; // e.g., "Reminder: Close due in 7 days"

  // Avoid resending the SAME reminder today
  $already = false;
  if ($h = $db->prepare("SELECT 1 FROM rcpa_request_history WHERE rcpa_no=? AND activity=? AND DATE(date_time)=CURDATE() LIMIT 1")) {
    $h->bind_param('is', $id, $activityStr);
    if ($h->execute()) {
      $h->store_result();
      $already = $h->num_rows > 0;
    }
    $h->close();
  }
  if ($already) { $skipped++; continue; }

  // Build recipients (assignee dept + optional section)
  $to = [];
  if ($dept !== '') {
    if ($section !== '') {
      $q = $db->prepare("SELECT email FROM system_users WHERE department=? AND section=? AND email IS NOT NULL AND email<>''");
      if ($q) {
        $q->bind_param('ss', $dept, $section);
        if ($q->execute()) {
          $q->bind_result($em);
          while ($q->fetch()) {
            $em = trim((string)$em);
            if ($em !== '') $to[] = $em;
          }
        }
        $q->close();
      }
    } else {
      $q = $db->prepare("SELECT email FROM system_users WHERE department=? AND email IS NOT NULL AND email<>''");
      if ($q) {
        $q->bind_param('s', $dept);
        if ($q->execute()) {
          $q->bind_result($em);
          while ($q->fetch()) {
            $em = trim((string)$em);
            if ($em !== '') $to[] = $em;
          }
        }
        $q->close();
      }
    }
  }
  $to = array_values(array_unique(array_filter($to)));
  if (!$to) { $skipped++; continue; }

  // CC: all QMS, but avoid duplicates with "To"
  $cc = array_values(array_diff($qmsEmails, $to));

  // Compose email
  $deptDisplay  = $dept . ($section !== '' ? ' - ' . $section : '');
  $subject      = sprintf('RCPA #%d - %s left to close (%s)', (int)$id, $label, $deptDisplay);
  $portalUrl    = 'http://rti10517/qdportal/login.php';
  $closeDueTxt  = date('F j, Y', strtotime($due));

  $deptDispSafe = htmlspecialchars($deptDisplay, ENT_QUOTES, 'UTF-8');
  $portalUrlSafe= htmlspecialchars($portalUrl, ENT_QUOTES, 'UTF-8');
  $closeDueSafe = htmlspecialchars($closeDueTxt, ENT_QUOTES, 'UTF-8');

  $htmlBody = '
<!doctype html><html lang="en"><head><meta charset="utf-8"></head>
<body style="font-family:Arial,Helvetica,sans-serif; color:#111827;">
  <p>Good day,</p>
  <p>This is a friendly reminder that the closing for <strong>RCPA #'.(int)$id.'</strong> is due in <strong>'.$label.'</strong>.</p>
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse; font-size:14px;">
    <tr><td style="padding:6px 10px; background:#f9fafb; border:1px solid #e5e7eb;">Assignee</td><td style="padding:6px 10px; border:1px solid #e5e7eb;"><strong>'.$deptDispSafe.'</strong></td></tr>
    <tr><td style="padding:6px 10px; background:#f9fafb; border:1px solid #e5e7eb;">Close Due Date</td><td style="padding:6px 10px; border:1px solid #e5e7eb;">'.$closeDueSafe.'</td></tr>
  </table>
  <p style="margin-top:14px;">
    <a href="'.$portalUrlSafe.'" target="_blank" style="background:#2563eb; color:#fff; text-decoration:none; padding:10px 16px; border-radius:6px; display:inline-block;">
      Open QD Portal
    </a>
  </p>
  <p style="color:#6b7280; font-size:12px;">This is an automated reminder from the QD Portal.</p>
</body></html>';

  $altBody = "Reminder: RCPA #$id close due in $label\n"
            ."Assignee: $deptDisplay\n"
            ."Close Due Date: $closeDueTxt\n"
            ."Open QD Portal: $portalUrl\n";

  // Send with CC to QMS
  sendEmailNotification($to, $subject, $htmlBody, $altBody, $cc);

  // Log history with the specific offset (so each offset is tracked separately)
  if ($ih = $db->prepare("INSERT INTO rcpa_request_history (rcpa_no, name, date_time, activity) VALUES (?, 'System', CURRENT_TIMESTAMP, ?)")) {
    $ih->bind_param('is', $id, $activityStr);
    $ih->execute();
    $ih->close();
  }

  $sent++;
}

$out = "Sent: $sent; Skipped: $skipped\n";
echo $out;
exit(0);
