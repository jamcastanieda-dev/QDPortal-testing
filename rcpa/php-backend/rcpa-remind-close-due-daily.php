<?php
// php-backend/rcpa-remind-close-due-daily.php
// Runs daily and emails assignee groups when close_due_date is exactly
// 4, 3, 2, 1 weeks, 2 days, 1 day away, or today (28, 21, 14, 7, 2, 1, 0 days).
// Emails regardless of status EXCEPT when status is "CLOSED (VALID)" or "CLOSED (IN-VALID)".
// NEW: Includes conformance details (Non-conformance / Potential Non-conformance)
//      only for the statuses listed by the user (see $detailStatuses).

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
   Pull rows due at the specified offsets based on close_due_date.
   Join BOTH detail tables (left join). We'll decide which to display later.
--------------------------------------------------- */
$sql = "
  SELECT
      r.id,
      r.assignee,
      r.section,
      r.status,
      r.conformance,
      r.close_due_date,
      DATEDIFF(r.close_due_date, CURDATE()) AS days_left,

      -- Non-conformance fields
      vn.root_cause                    AS vn_root_cause,
      vn.correction                    AS vn_correction,
      vn.correction_target_date        AS vn_correction_target_date,
      vn.correction_date_completed     AS vn_correction_date_completed,
      vn.corrective                    AS vn_corrective,
      vn.corrective_target_date        AS vn_corrective_target_date,
      vn.corrective_date_completed     AS vn_corrective_date_completed,

      -- Potential Non-conformance fields
      vp.root_cause                    AS vp_root_cause,
      vp.preventive_action             AS vp_preventive_action,
      vp.preventive_target_date        AS vp_preventive_target_date,
      vp.preventive_date_completed     AS vp_preventive_date_completed

  FROM rcpa_request r
  LEFT JOIN rcpa_valid_non_conformance vn
         ON vn.rcpa_no = r.id
  LEFT JOIN rcpa_valid_potential_conformance vp
         ON vp.rcpa_no = r.id
  WHERE r.close_due_date IS NOT NULL
    AND r.close_date IS NULL
    AND DATEDIFF(r.close_due_date, CURDATE()) IN (28, 21, 14, 7, 2, 1, 0)
    AND r.status NOT IN ('CLOSED (VALID)', 'CLOSED (IN-VALID)')
  ORDER BY r.id
";

$rows = [];
if (!($st = $db->prepare($sql))) { echo "Prepare failed: ".$db->error."\n"; exit(1); }
if (!$st->execute()) { $e = $st->error; $st->close(); echo "Execute failed: $e\n"; exit(1); }

/* BUFFER the whole result set before issuing other queries */
$st->store_result();
$st->bind_result(
  $id, $dept, $section, $status, $conformance, $due, $days_left,
  $vn_root_cause, $vn_correction, $vn_correction_target_date, $vn_correction_date_completed,
  $vn_corrective, $vn_corrective_target_date, $vn_corrective_date_completed,
  $vp_root_cause, $vp_preventive_action, $vp_preventive_target_date, $vp_preventive_date_completed
);
while ($st->fetch()) {
  $rows[] = [
    'id'        => (int)$id,
    'dept'      => (string)$dept,
    'section'   => (string)$section,
    'status'    => (string)$status,
    'conf'      => (string)$conformance,
    'due'       => (string)$due,
    'days_left' => (int)$days_left,

    'vn_root_cause'                => $vn_root_cause,
    'vn_correction'                => $vn_correction,
    'vn_correction_target_date'    => $vn_correction_target_date,
    'vn_correction_date_completed' => $vn_correction_date_completed,
    'vn_corrective'                => $vn_corrective,
    'vn_corrective_target_date'    => $vn_corrective_target_date,
    'vn_corrective_date_completed' => $vn_corrective_date_completed,

    'vp_root_cause'                => $vp_root_cause,
    'vp_preventive_action'         => $vp_preventive_action,
    'vp_preventive_target_date'    => $vp_preventive_target_date,
    'vp_preventive_date_completed' => $vp_preventive_date_completed,
  ];
}
$st->free_result();
$st->close();

/* ---------------------------------------------------
   Helpers
--------------------------------------------------- */
function h(?string $s): string {
  return htmlspecialchars(trim((string)$s), ENT_QUOTES, 'UTF-8');
}
function fmtDate(?string $d): string {
  if (!$d) return '';
  $ts = strtotime($d);
  return $ts ? date('F j, Y', $ts) : '';
}

/* ---------------------------------------------------
   Process each row (idempotent per day & offset)
--------------------------------------------------- */
$detailStatuses = [
  'VALID APPROVAL',
  'VALIDATION REPLY',
  'REPLY CHECKING - ORIGINATOR',
  'FOR CLOSING',
  'FOR CLOSING APPROVAL',
  'EVIDENCE CHECKING',
  'EVIDENCE CHECKING - ORIGINATOR',
  'EVIDENCE APPROVAL',
];

foreach ($rows as $r) {
  $id        = $r['id'];
  $dept      = trim($r['dept']);
  $section   = trim($r['section']);
  $status    = trim($r['status']);
  $conf      = trim($r['conf']);
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

  // Compose email (card layout, with conditional conformance details)
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
  $confSafe     = h($conf);
  $closeDueSafe = h($closeDueTxt);

  // Build additional details ONLY when status is in $detailStatuses
  $extraHtmlRows = '';
  $extraText = '';
  if (in_array($status, $detailStatuses, true)) {
    if ($conf === 'Non-conformance') {
      $rowsMap = [
        'Root Cause'                 => h($r['vn_root_cause'] ?? ''),
        'Correction'                 => h($r['vn_correction'] ?? ''),
        'Correction Target Date'     => h(fmtDate($r['vn_correction_target_date'] ?? null)),
        'Correction Date Completed'  => h(fmtDate($r['vn_correction_date_completed'] ?? null)),
        'Corrective Action'          => h($r['vn_corrective'] ?? ''),
        'Corrective Target Date'     => h(fmtDate($r['vn_corrective_target_date'] ?? null)),
        'Corrective Date Completed'  => h(fmtDate($r['vn_corrective_date_completed'] ?? null)),
      ];
    } elseif ($conf === 'Potential Non-conformance') {
      $rowsMap = [
        'Root Cause'                 => h($r['vp_root_cause'] ?? ''),
        'Preventive Action'          => h($r['vp_preventive_action'] ?? ''),
        'Preventive Target Date'     => h(fmtDate($r['vp_preventive_target_date'] ?? null)),
        'Preventive Date Completed'  => h(fmtDate($r['vp_preventive_date_completed'] ?? null)),
      ];
    } else {
      $rowsMap = [];
    }

    foreach ($rowsMap as $labelKey => $val) {
      if ($val !== '') {
        $extraHtmlRows .=
          '<tr>'
          .'<td style="padding:6px 10px; background:#f9fafb; border:1px solid #e5e7eb;">'.h($labelKey).'</td>'
          .'<td style="padding:6px 10px; border:1px solid #e5e7eb;">'.$val.'</td>'
          .'</tr>';
        $extraText .= $labelKey.': '.html_entity_decode($val, ENT_QUOTES, 'UTF-8')."\n";
      }
    }

    if ($extraHtmlRows !== '') {
      $extraHtmlRows =
        '<tr><td colspan="2" style="padding:8px 10px; background:#eef2ff; border:1px solid #e5e7eb;"><strong>Details ('.h($conf).')</strong></td></tr>'
        .$extraHtmlRows;
    }
  }

  // Accent colors by urgency (badge only). Keep button in the same blue.
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
  $buttonColor = '#2563eb';

  // Badge text (e.g., "Close due today" or "Close due in 2 weeks")
  $badgeText = ($daysLeft === 0) ? 'Close due today' : ('Close due in ' . $label);

  // Preheader
  $preheader = 'RCPA #'.(int)$id.' • '.$badgeText.' • Close due: '.$closeDueTxt;

  $htmlBody = '
<!doctype html><html lang="en"><head><meta charset="utf-8"></head>
<body style="margin:0; padding:0; background:#f3f4f6; font-family:Arial,Helvetica,sans-serif; color:#111827;">
  <!-- Preheader (hidden) -->
  <div style="display:none; overflow:hidden; line-height:1px; opacity:0; max-height:0; max-width:0;">
    '.h($preheader).'
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
                    <span style="display:inline-block; padding:6px 10px; font-size:12px; font-weight:bold; color:'.$accentDark.'; background:'.$accentLight.'; border:1px solid '.$accent.'; border-radius:999px;">
                      '.h($badgeText).'
                    </span>
                  </td>
                </tr>
                <tr>
                  <td colspan="2" style="padding-top:6px; font-size:13px; color:#6b7280;">
                    RCPA #'.(int)$id.'
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
                This is a friendly reminder that the closing for <strong>RCPA #'.(int)$id.'</strong> is
                '.($daysLeft === 0 ? 'due <strong>today</strong>.' : 'due in <strong>'.h($label).'</strong>.').'
              </p>

              <!-- Key facts table -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse; font-size:14px;">
                <tr>
                  <td style="width:180px; padding:10px; background:#f9fafb; border:1px solid #e5e7eb;">Assignee</td>
                  <td style="padding:10px; border:1px solid #e5e7eb;"><strong>'.$deptDispSafe.'</strong></td>
                </tr>
                <tr>
                  <td style="padding:10px; background:#f9fafb; border:1px solid #e5e7eb;">Status</td>
                  <td style="padding:10px; border:1px solid #e5e7eb;">'.$statusSafe.'</td>
                </tr>
                <tr>
                  <td style="padding:10px; background:#f9fafb; border:1px solid #e5e7eb;">Conformance</td>
                  <td style="padding:10px; border:1px solid #e5e7eb;">'.$confSafe.'</td>
                </tr>
                <tr>
                  <td style="padding:10px; background:#f9fafb; border:1px solid #e5e7eb;">Close Due Date</td>
                  <td style="padding:10px; border:1px solid #e5e7eb;">'.$closeDueSafe.'</td>
                </tr>
                '.$extraHtmlRows.'
              </table>

              <!-- CTA -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="left" style="margin-top:18px;">
                <tr>
                  <td>
                    <a href="'.$taskUrlSafe.'" target="_blank"
                       style="background:'.$buttonColor.'; color:#ffffff; text-decoration:none; padding:12px 18px; border-radius:6px; font-size:14px; display:inline-block;">
                      Open QD Portal
                    </a>
                  </td>
                </tr>
              </table>

              <div style="clear:both;"></div>

              <!-- Fallback Link (clickable) -->
              <p style="margin:14px 0 0 0; font-size:12px; color:#6b7280;">
                If the button doesn\'t work, use this link:<br>
                <a href="'.$taskUrlSafe.'" target="_blank" style="color:#2563eb; text-decoration:underline;">'.$taskUrlText.'</a>
              </p>

              <!-- Note -->
              <p style="margin:12px 0 0 0; font-size:12px; color:#6b7280;">
                You are receiving this because you are part of the assignee group for the department/section above.
                QMS is automatically CC\'d.
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
    ."Status: $status\n"
    ."Conformance: $conf\n"
    ."Close Due Date: $closeDueTxt\n";

  if ($extraText !== '') {
    $altBody .= "Details ($conf):\n$extraText";
  }

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
