<?php
// php-backend/rcpa-remind-close-due-daily.php
// Runs daily and emails assignee groups when close_due_date is exactly
// 4, 3, 2, 1 weeks, 2 days, 1 day away, or today (28, 21, 14, 7, 2, 1, 0 days).
// Emails regardless of status EXCEPT when status is "CLOSED (VALID)" or "CLOSED (INVALID)".
// Displays "Description of Findings" from rcpa_request.remarks (instead of Conformance/details).
// RECIPIENTS:
//   TO = supervisors in assignee dept/section + assignee_name (if present);
//   if NO supervisors exist -> everyone in dept/section EXCEPT role 'manager' + assignee_name (if present).
//   Additionally, include the dept/section manager in TO when due is TODAY or IN 1 DAY.
//   CC = QMS (deduped).

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
@$db->query("SET time_zone = '+08:00'"); // keep MySQL date math in sync

require_once __DIR__ . '/../../send-email.php';

$sent = 0;
$skipped = 0;

/* ---------------------------------------------------
   Helpers
--------------------------------------------------- */
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
function cleanEmails(array $arr): array
{
  $out = [];
  foreach ($arr as $e) {
    $e = strtolower(trim((string)$e));
    if ($e === '' || $e === '-' || !filter_var($e, FILTER_VALIDATE_EMAIL)) continue;
    $out[$e] = true;
  }
  return array_keys($out);
}

/* ---------------------------------------------------
   Load QMS CC list once (department = 'QMS')
--------------------------------------------------- */
$qmsEmails = [];
if ($qs = $db->prepare("SELECT TRIM(email) FROM system_users WHERE TRIM(department) = 'QMS' AND email IS NOT NULL AND TRIM(email) <> ''")) {
  if ($qs->execute()) {
    $qs->bind_result($em);
    while ($qs->fetch()) {
      $qmsEmails[] = $em;
    }
  }
  $qs->close();
}
$qmsEmails = cleanEmails($qmsEmails);

/* ---------------------------------------------------
   Pull rows due at the specified offsets based on close_due_date.
   (Also select r.assignee_name for recipient logic.)
   NOTE: We no longer pull/join the detail tables; we're showing Remarks only.
--------------------------------------------------- */
$sql = "
  SELECT
      r.id,
      r.assignee,
      r.section,
      r.status,
      r.remarks,
      r.assignee_name,
      r.close_due_date,
      DATEDIFF(r.close_due_date, CURDATE()) AS days_left
  FROM rcpa_request r
  WHERE r.close_due_date IS NOT NULL
    AND r.close_date IS NULL
    AND DATEDIFF(r.close_due_date, CURDATE()) IN (28, 21, 14, 7, 2, 1, 0)
    AND r.status NOT IN ('CLOSED (VALID)', 'CLOSED (INVALID)')
  ORDER BY r.id
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

/* BUFFER the whole result set before issuing other queries */
$st->store_result();
$st->bind_result(
  $id,
  $dept,
  $section,
  $status,
  $remarks,
  $assignee_name,
  $due,
  $days_left
);
while ($st->fetch()) {
  $rows[] = [
    'id'            => (int)$id,
    'dept'          => (string)$dept,
    'section'       => (string)$section,
    'status'        => (string)$status,
    'remarks'       => (string)$remarks,
    'assignee_name' => (string)$assignee_name,
    'due'           => (string)$due,
    'days_left'     => (int)$days_left,
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
  $status    = trim($r['status']);
  $remarks   = trim($r['remarks'] ?? '');
  $assigneeName = trim($r['assignee_name'] ?? '');
  $due       = $r['due'];
  $daysLeft  = (int)$r['days_left'];

  // Build the label (for email copy) and activity (for idempotency)
  if ($daysLeft === 0) {
    $label = 'today';
    $activityStr = 'Reminder: Close due today';
  } elseif ($daysLeft < 7) {
    $label = ($daysLeft === 1) ? '1 day' : ($daysLeft . ' days');
    $activityStr = 'Reminder: Close due in ' . $label;
  } else {
    $weeks = intdiv($daysLeft, 7);
    $label = ($weeks === 1) ? '1 week' : ($weeks . ' weeks');
    $activityStr = 'Reminder: Close due in ' . $label;
  }

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
  if ($already) {
    $skipped++;
    continue;
  }

  /* -------------------------------------------
     Build recipients:
     Primary plan:
       TO = supervisors in assignee dept/section + the assignee_name (if present)
     Fallback plan (if NO supervisors found):
       TO = everyone in dept/section EXCEPT role 'manager' + the assignee_name (if present)
     Additionally: include MANAGER(S) when due is today or in 1 day (<=1).
     CC = QMS (deduped against TO)
  ------------------------------------------- */
  $to = [];
  $supervisorEmails = [];

  // Fetch supervisors by dept/section
  if ($dept !== '') {
    if ($section !== '') {
      $q = $db->prepare("
        SELECT TRIM(email)
          FROM system_users
         WHERE TRIM(department) = ?
           AND TRIM(section)    = ?
           AND LOWER(TRIM(role)) = 'supervisor'
           AND email IS NOT NULL
           AND TRIM(email) <> ''
      ");
      if ($q) {
        $q->bind_param('ss', $dept, $section);
        if ($q->execute()) {
          $q->bind_result($em);
          while ($q->fetch()) {
            $supervisorEmails[] = $em;
          }
        }
        $q->close();
      }
    } else {
      $q = $db->prepare("
  SELECT TRIM(email)
    FROM system_users
   WHERE TRIM(department) = ?
     AND LOWER(TRIM(role)) = 'supervisor'
     AND email IS NOT NULL
     AND TRIM(email) <> ''
");
      if ($q) {
        $q->bind_param('s', $dept);
        if ($q->execute()) {
          $q->bind_result($em);
          while ($q->fetch()) {
            $supervisorEmails[] = $em;
          }
        }
        $q->close();
      }
    }
  }

  // Start TO with supervisors (may be empty)
  $to = $supervisorEmails;

  // Add the specific assignee_name (if present and matched in system_users)
  $assigneeEmail = null;
  if ($assigneeName !== '' && $dept !== '') {
    if ($section !== '') {
      $qa = $db->prepare("
        SELECT TRIM(email)
          FROM system_users
         WHERE UPPER(TRIM(employee_name)) = UPPER(TRIM(?))
           AND UPPER(TRIM(department))    = UPPER(TRIM(?))
           AND LOWER(TRIM(section))       = LOWER(TRIM(?))
           AND email IS NOT NULL
           AND TRIM(email) <> ''
         LIMIT 1
      ");
      if ($qa) {
        $qa->bind_param('sss', $assigneeName, $dept, $section);
        if ($qa->execute()) {
          $qa->bind_result($aem);
          if ($qa->fetch()) $assigneeEmail = $aem;
        }
        $qa->close();
      }
    } else {
      $qa = $db->prepare("
  SELECT TRIM(email)
    FROM system_users
   WHERE UPPER(TRIM(employee_name)) = UPPER(TRIM(?))
     AND UPPER(TRIM(department))    = UPPER(TRIM(?))
     AND email IS NOT NULL
     AND TRIM(email) <> ''
   LIMIT 1
");
      if ($qa) {
        $qa->bind_param('ss', $assigneeName, $dept);
        if ($qa->execute()) {
          $qa->bind_result($aem);
          if ($qa->fetch()) $assigneeEmail = $aem;
        }
        $qa->close();
      }
    }
  }
  if ($assigneeEmail) {
    $to[] = $assigneeEmail;
  }

  // --- Managers: include ONLY when close due is today (0) or in 1 day (1)
  if ($daysLeft <= 1 && $dept !== '') {
    $managerEmails = [];
    if ($section !== '') {
      $qm = $db->prepare("
        SELECT TRIM(email)
          FROM system_users
         WHERE TRIM(department) = ?
           AND TRIM(section)    = ?
           AND LOWER(TRIM(role)) = 'manager'
           AND email IS NOT NULL
           AND TRIM(email) <> ''
      ");
      if ($qm) {
        $qm->bind_param('ss', $dept, $section);
        if ($qm->execute()) {
          $qm->bind_result($em);
          while ($qm->fetch()) {
            $managerEmails[] = $em;
          }
        }
        $qm->close();
      }
    } else {
      $qm = $db->prepare("
  SELECT TRIM(email)
    FROM system_users
   WHERE TRIM(department) = ?
     AND LOWER(TRIM(role)) = 'manager'
     AND email IS NOT NULL
     AND TRIM(email) <> ''
");
      if ($qm) {
        $qm->bind_param('s', $dept);
        if ($qm->execute()) {
          $qm->bind_result($em);
          while ($qm->fetch()) {
            $managerEmails[] = $em;
          }
        }
        $qm->close();
      }
    }
    foreach ($managerEmails as $em) {
      $to[] = $em;
    } // deduped later
  }

  // Fallback: if NO supervisors found, include everyone in dept/section EXCEPT 'manager'
  if (empty($supervisorEmails) && $dept !== '') {
    if ($section !== '') {
      $qnm = $db->prepare("
        SELECT TRIM(email)
          FROM system_users
         WHERE TRIM(department) = ?
           AND TRIM(section)    = ?
           AND LOWER(TRIM(role)) <> 'manager'
           AND email IS NOT NULL
           AND TRIM(email) <> ''
      ");
      if ($qnm) {
        $qnm->bind_param('ss', $dept, $section);
        if ($qnm->execute()) {
          $qnm->bind_result($em);
          while ($qnm->fetch()) {
            $to[] = $em;
          }
        }
        $qnm->close();
      }
    } else {
      $qnm = $db->prepare("
  SELECT TRIM(email)
    FROM system_users
   WHERE TRIM(department) = ?
     AND LOWER(TRIM(role)) <> 'manager'
     AND email IS NOT NULL
     AND TRIM(email) <> ''
");
      if ($qnm) {
        $qnm->bind_param('s', $dept);
        if ($qnm->execute()) {
          $qnm->bind_result($em);
          while ($qnm->fetch()) {
            $to[] = $em;
          }
        }
        $qnm->close();
      }
    }
  }

  // Cleanup and validate recipient list
  $to = cleanEmails($to);
  if (!$to) {
    $skipped++;
    continue;
  }

  // CC: all QMS, but avoid duplicates with "To"
  $cc = array_values(array_diff($qmsEmails, $to));

  // Compose email (card layout)
  $deptDisplay   = $dept . ($section !== '' ? ' - ' . $section : '');
  $subject       = ($daysLeft === 0)
    ? sprintf('RCPA #%d - Close due today (%s)', (int)$id, $deptDisplay)
    : sprintf('RCPA #%d - %s left to close (%s)', (int)$id, $label, $deptDisplay);

  // Use the task page link (clickable) + fallback
  $taskUrl        = 'http://rti10517/qdportal/rcpa/php/rcpa-task.php';
  $taskUrlDisplay = 'rti10517/qdportal/rcpa/php/rcpa-task.php';
  $closeDueTxt    = date('F j, Y', strtotime($due));

  $deptDispSafe = h($deptDisplay);
  $taskUrlSafe  = h($taskUrl);
  $taskUrlText  = h($taskUrlDisplay);
  $statusSafe   = h($status);
  $remarksSafe  = h($remarks);
  $remarksHtml  = ($remarksSafe !== '') ? $remarksSafe : '-';
  $closeDueSafe = h($closeDueTxt);

  // Accent colors by urgency (badge only). Keep button blue.
  if ($daysLeft === 0) {
    $accent      = '#dc2626'; // red
    $accentLight = '#fee2e2';
    $accentDark  = '#991b1b';
  } elseif ($daysLeft <= 2) {
    $accent      = '#f59e0b'; // amber
    $accentLight = '#fef3c7';
    $accentDark  = '#92400e';
  } else {
    $accent      = '#2563eb'; // blue
    $accentLight = '#dbeafe';
    $accentDark  = '#1e40af';
  }

  // Badge text (e.g., "Close due today" or "Close due in 2 weeks")
  $badgeText = ($daysLeft === 0) ? 'Close due today' : ('Close due in ' . $label);

  // Preheader
  $preheader = 'RCPA #' . (int)$id . ' - ' . $badgeText . ' - Close due: ' . $closeDueTxt;

  // Note text: include manager mention for urgent (<=1 day)
  $noteHtml = ($daysLeft <= 1)
    ? 'You are receiving this because you are the <strong>supervisor</strong> for the assignee department/section,
                the <strong>assigned respondent</strong>, a <strong>member</strong> of the assignee department/section (when no supervisor exists), or the <strong>manager</strong> of the assignee department/section (urgent reminders). QMS is automatically CC\'d.'
    : 'You are receiving this because you are the <strong>supervisor</strong> for the assignee department/section,
                the <strong>assigned respondent</strong>, or a <strong>member</strong> of the assignee department/section (when no supervisor exists). QMS is automatically CC\'d.';

  $htmlBody = '
<!doctype html><html lang="en"><head><meta charset="utf-8"></head>
<body style="margin:0; padding:0; background:#f3f4f6; font-family:Arial,Helvetica,sans-serif; color:#111827;">
  <!-- Preheader (hidden) -->
  <div style="display:none; overflow:hidden; line-height:1px; opacity:0; max-height:0; max-width:0;">
    ' . h($preheader) . '
  </div>

  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f3f4f6; padding:24px 12px;">
    <tr>
      <td align="center">
        <!-- Card -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:640px; background:#ffffff; border:1px solid #e5e7eb; border-radius:8px;">
          <!-- Header -->
          <tr>
            <td style="padding:18px 20px; border-bottom:1px solid #e5e7eb;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="font-size:16px; font-weight:bold; color:#111827;">
                    RCPA Close Reminder
                  </td>
                  <td align="right">
                    <span style="display:inline-block; padding:6px 10px; font-size:12px; font-weight:bold; color:' . $accentDark . '; background:' . $accentLight . '; border:1px solid ' . $accent . '; border-radius:999px;">
                      ' . h($badgeText) . '
                    </span>
                  </td>
                </tr>
                <tr>
                  <td colspan="2" style="padding-top:6px; font-size:13px; color:#6b7280;">
                    RCPA #' . (int)$id . '
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:20px;">
              <p style="margin:0 0 12px 0; font-size:14px;">Good day,</p>
              <p style="margin:0 0 18px 0; font-size:14px;">
                This is a friendly reminder that the closing for <strong>RCPA #' . (int)$id . '</strong> is
                ' . ($daysLeft === 0 ? 'due <strong>today</strong>.' : 'due in <strong>' . h($label) . '</strong>.') . '
              </p>

              <!-- Key facts table -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse; font-size:14px;">
                <tr>
                  <td style="width:180px; padding:10px; background:#f9fafb; border:1px solid #e5e7eb;">Assignee</td>
                  <td style="padding:10px; border:1px solid #e5e7eb;"><strong>' . $deptDispSafe . '</strong></td>
                </tr>
                <tr>
                  <td style="padding:10px; background:#f9fafb; border:1px solid #e5e7eb;">Status</td>
                  <td style="padding:10px; border:1px solid #e5e7eb;">' . $statusSafe . '</td>
                </tr>
                <tr>
                  <td style="padding:10px; background:#f9fafb; border:1px solid #e5e7eb;">Description of Findings</td>
                  <td style="padding:10px; border:1px solid #e5e7eb;">' . $remarksHtml . '</td>
                </tr>
                <tr>
                  <td style="padding:10px; background:#f9fafb; border:1px solid #e5e7eb;">Close Due Date</td>
                  <td style="padding:10px; border:1px solid #e5e7eb;">' . $closeDueSafe . '</td>
                </tr>
              </table>

              <!-- CTA -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="left" style="margin-top:18px;">
                <tr>
                  <td>
                    <a href="' . $taskUrlSafe . '" target="_blank"
                       style="background:#2563eb; color:#ffffff; text-decoration:none; padding:12px 18px; border-radius:6px; font-size:14px; display:inline-block;">
                      Open QD Portal
                    </a>
                  </td>
                </tr>
              </table>

              <div style="clear:both;"></div>

              <!-- Fallback Link (clickable) -->
              <p style="margin:14px 0 0 0; font-size:12px; color:#6b7280;">
                If the button doesn\'t work, use this link:<br>
                <a href="' . $taskUrlSafe . '" target="_blank" style="color:#2563eb; text-decoration:underline;">' . $taskUrlText . '</a>
              </p>

              <!-- Note -->
              <p style="margin:12px 0 0 0; font-size:12px; color:#6b7280;">
                ' . $noteHtml . '
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:12px 20px; border-top:1px solid #e5e7eb; background:#fafafa; font-size:12px; color:#6b7280;">
              This is an automated reminder from the QD Portal.
            </td>
          </tr>
        </table>
        <!-- /Card -->
      </td>
    </tr>
  </table>
</body></html>';

  $altBody = ($daysLeft === 0)
    ? "RCPA #$id - Close due today\n"
    : "RCPA #$id - Close due in $label\n";

  $altBody .=
    "Assignee: $deptDisplay\n"
    . "Status: $status\n"
    . "Description of Findings: " . ($remarks !== '' ? $remarks : '-') . "\n"
    . "Close Due Date: $closeDueTxt\n";

  $altBody .= "Open QD Portal: $taskUrl\n";
  $altBody .= "If the button doesn't work: $taskUrl\n";

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
