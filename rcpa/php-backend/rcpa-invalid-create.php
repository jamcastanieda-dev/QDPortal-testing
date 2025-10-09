<?php
// rcpa-not-valid-create.php
header('Content-Type: application/json');
require_once '../../connection.php';
date_default_timezone_set('Asia/Manila');

// Require a logged-in user so we can write to history
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
$current_user = $user;
$user_name = $current_user['name'] ?? 'Unknown User';

$db = isset($mysqli) && $mysqli instanceof mysqli ? $mysqli
  : (isset($conn) && $conn instanceof mysqli ? $conn : null);
if (!$db) {
  http_response_code(500);
  echo json_encode(['success' => false, 'error' => 'DB connection not found']);
  exit;
}
$db->set_charset('utf8mb4');

// Inputs
$rcpa_no = isset($_POST['rcpa_no']) ? (int)$_POST['rcpa_no'] : 0;
$reason  = trim($_POST['reason_non_valid'] ?? '');

if ($rcpa_no <= 0) {
  http_response_code(400);
  echo json_encode(['success' => false, 'error' => 'Missing rcpa_no']);
  exit;
}
if ($reason === '') {
  http_response_code(400);
  echo json_encode(['success' => false, 'error' => 'Missing reason_non_valid']);
  exit;
}

// ===== uploads: keep original names, per-submission folder =====
$baseDir   = __DIR__ . '/../uploads-not-valid-attachment';
$batchDir  = 'notvalid_' . date('Ymd_His'); // e.g., notvalid_20250819_152501
$targetDir = $baseDir . '/' . $batchDir;
$appRoot = rtrim(dirname(dirname($_SERVER['SCRIPT_NAME'])), '/\\');
$publicBase = $appRoot . '/uploads-not-valid-attachment/' . $batchDir;  // root-relative

if (!is_dir($baseDir)) {
  @mkdir($baseDir, 0775, true);
}
if (!is_dir($targetDir)) {
  @mkdir($targetDir, 0775, true);
}

$saved = [];
$existingFiles = []; // To hold any existing files for the `rcpa_no`

// Fetch current attachments if any exist
$sql = "SELECT attachment FROM rcpa_not_valid WHERE rcpa_no = ?";
$stmt = $db->prepare($sql);
$stmt->bind_param('i', $rcpa_no);
$stmt->execute();
$stmt->bind_result($existingAttachments);
if ($stmt->fetch()) {
  $existingFiles = json_decode($existingAttachments, true);
}
$stmt->close();

// If there are existing files, delete them from the directory
foreach ($existingFiles as $file) {
  $filePath = __DIR__ . '/../' . $file['url'];
  if (file_exists($filePath)) {
    unlink($filePath); // Delete the existing file
  }
}

// After deleting files, check if the folder is empty and delete it
if (empty(scandir($targetDir))) {
  rmdir($targetDir); // Remove the empty folder
}

if (!empty($_FILES['attachments']) && is_array($_FILES['attachments']['name'])) {
  $count = count($_FILES['attachments']['name']);
  for ($i = 0; $i < $count; $i++) {
    if ($_FILES['attachments']['error'][$i] !== UPLOAD_ERR_OK) continue;

    $origName = $_FILES['attachments']['name'][$i];
    $tmp      = $_FILES['attachments']['tmp_name'][$i];
    $size     = (int)$_FILES['attachments']['size'][$i];

    $nameOnly = basename($origName);
    $ext = strtolower(pathinfo($nameOnly, PATHINFO_EXTENSION));
    $allowed = ['pdf', 'png', 'jpg', 'jpeg', 'webp', 'heic', 'doc', 'docx', 'xls', 'xlsx', 'txt', 'sql'];
    if (!in_array($ext, $allowed, true)) continue;

    // Collision-safe: add "(n)" before extension if needed
    $finalName = $nameOnly;
    $dest = $targetDir . '/' . $finalName;
    if (file_exists($dest)) {
      $base = pathinfo($nameOnly, PATHINFO_FILENAME);
      $k = 1;
      do {
        $candidate = $base . ' (' . $k . ')' . ($ext ? '.' . $ext : '');
        $dest = $targetDir . '/' . $candidate;
        $finalName = $candidate;
        $k++;
      } while (file_exists($dest));
    }

    if (move_uploaded_file($tmp, $dest)) {
      $saved[] = [
        'name' => $nameOnly,
        'url'  => $publicBase . '/' . $finalName,
        'size' => $size
      ];
    }
  }
}
$attachment_json = json_encode($saved, JSON_UNESCAPED_SLASHES);

// ===== DB work: INSERT or UPDATE based on rcpa_no =====
try {
  mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
  $db->begin_transaction();

  if ($existingAttachments) {
    // Update the existing record
    $sql = "UPDATE rcpa_not_valid SET reason_non_valid = ?, attachment = ?, assignee_name = ? WHERE rcpa_no = ?";
    $stmt = $db->prepare($sql);
    $stmt->bind_param('sssi', $reason, $attachment_json, $user_name, $rcpa_no);
    $stmt->execute();
    $stmt->close();
  } else {
    // Insert a new record
    $sql = "INSERT INTO rcpa_not_valid (rcpa_no, reason_non_valid, attachment, assignee_name) VALUES (?,?,?,?)";
    $stmt = $db->prepare($sql);
    $stmt->bind_param('isss', $rcpa_no, $reason, $attachment_json, $user_name);
    $stmt->execute();
    $insert_id = $db->insert_id;
    $stmt->close();
  }

  // 2) Verify/lock the rcpa_request row, then update status if needed
  $newStatus = 'INVALID APPROVAL';

  $sel = $db->prepare("SELECT status FROM rcpa_request WHERE id=? FOR UPDATE");
  $sel->bind_param('i', $rcpa_no);
  $sel->execute();
  $sel->bind_result($currentStatus);
  $hasRow = $sel->fetch();
  $sel->close();

  if (!$hasRow) {
    $db->rollback();
    http_response_code(404);
    echo json_encode([
      'success' => false,
      'error'   => 'rcpa_request not found for given rcpa_no',
      'rcpa_no' => $rcpa_no
    ]);
    exit;
  }

  if ($currentStatus !== $newStatus) {
    $upd = $db->prepare("UPDATE rcpa_request SET status=? WHERE id=?");
    $upd->bind_param('si', $newStatus, $rcpa_no);
    $upd->execute();
    $upd->close();
  }

  // 3) Insert into rcpa_request_history
  $activity = 'The Assignee confirmed that the RCPA is not valid';
  $rcpa_no_str = (string)$rcpa_no;

  $hist = $db->prepare("INSERT INTO rcpa_request_history (rcpa_no, name, activity) VALUES (?,?,?)");
  $hist->bind_param('sss', $rcpa_no_str, $user_name, $activity);
  $hist->execute();
  $history_id = $db->insert_id;
  $hist->close();

  // 4) Commit the transaction
  // ✅ existing NOT-VALID transaction just committed successfully
  $db->commit();

  // ============================================================
  // AUTO-ACCEPT (INVALIDATION REPLY) IF CURRENT USER IS SUPERVISOR/MANAGER
  // ============================================================
  try {
    // 1) Look up current user's role by employee_name
    $role = null;
    if ($rstmt = $db->prepare("SELECT LOWER(TRIM(role)) FROM system_users WHERE UPPER(TRIM(employee_name)) = UPPER(TRIM(?)) LIMIT 1")) {
      $rstmt->bind_param('s', $user_name);
      if ($rstmt->execute()) {
        $rstmt->bind_result($role);
        $rstmt->fetch();
      }
      $rstmt->close();
    }

    if (in_array($role, ['supervisor', 'manager'], true)) {
      date_default_timezone_set('Asia/Manila');

      // Helper: working days (Sun + non-working calendar excluded)
      $working_days_between = function (?string $reply_received_ymd, string $today_ymd, array $nonWorking): int {
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
      };

      // 2) Mirror rcpa-accept-approval-invalid.php in its own transaction
      $db->begin_transaction();

      // 2.1 Lock + read row
      $reply_received = $reply_date = $no_days_reply = null;
      if (!($sel = $db->prepare("SELECT reply_received, reply_date, no_days_reply FROM rcpa_request WHERE id = ? FOR UPDATE"))) {
        throw new Exception('Prepare failed (select rcpa_request)');
      }
      $sel->bind_param('i', $rcpa_no);
      if (!$sel->execute()) {
        $e = $sel->error;
        $sel->close();
        throw new Exception('Execute failed (select rcpa_request): ' . $e);
      }
      $sel->bind_result($reply_received, $reply_date, $no_days_reply);
      if (!$sel->fetch()) {
        $sel->close();
        $db->rollback();
        throw new Exception('rcpa_request not found.');
      }
      $sel->close();

      // 2.2 Status -> INVALIDATION REPLY, set reply_date if NULL
      $newStatus = 'INVALIDATION REPLY';
      if (!($upd = $db->prepare("UPDATE rcpa_request SET status=?, reply_date=COALESCE(reply_date, CURDATE()) WHERE id=?"))) {
        throw new Exception('Prepare failed (update rcpa_request)');
      }
      $upd->bind_param('si', $newStatus, $rcpa_no);
      if (!$upd->execute()) {
        $e = $upd->error;
        $upd->close();
        throw new Exception('Execute failed (update rcpa_request): ' . $e);
      }
      $upd->close();

      // 2.3 Compute no_days_reply if NULL + derive hit_reply
      $todayYmd = date('Y-m-d');
      $nonWorking = [];
      if ($resNW = $db->query("SELECT `date` FROM rcpa_not_working_calendar")) {
        while ($rw = $resNW->fetch_assoc()) {
          $nonWorking[date('Y-m-d', strtotime($rw['date']))] = true;
        }
        $resNW->free();
      }

      $computed = null;
      if ($no_days_reply === null) {
        $rrYmd = $reply_received ? date('Y-m-d', strtotime($reply_received)) : null;
        $computed = $working_days_between($rrYmd, $todayYmd, $nonWorking);

        if ($updDays = $db->prepare("UPDATE rcpa_request SET no_days_reply=? WHERE id=? AND no_days_reply IS NULL")) {
          $updDays->bind_param('ii', $computed, $rcpa_no);
          $updDays->execute();
          $updDays->close();
        }
      }

      $effectiveDays = ($no_days_reply === null) ? $computed : (int)$no_days_reply;
      if ($effectiveDays !== null) {
        $hitVal = ($effectiveDays <= 5) ? 'hit' : 'missed';
        if ($updHit = $db->prepare("UPDATE rcpa_request SET hit_reply = COALESCE(hit_reply, ?) WHERE id = ?")) {
          $updHit->bind_param('si', $hitVal, $rcpa_no);
          $updHit->execute();
          $updHit->close();
        }
      }

      // 2.4 Stamp supervisor/manager on rcpa_not_valid
      if ($stmtNV = $db->prepare("
          UPDATE rcpa_not_valid
             SET assignee_supervisor_name = ?, assignee_supervisor_date = CURDATE()
           WHERE rcpa_no = ?")) {
        $stmtNV->bind_param('si', $user_name, $rcpa_no);
        $stmtNV->execute();
        $stmtNV->close();
      }

      // 2.5 History
      if ($db->query("SHOW TABLES LIKE 'rcpa_request_history'")->num_rows > 0) {
        $rcpa_no_str = (string)$rcpa_no;
        $activity = 'The Assignee Supervisor/Manager approved the Assignee reply as INVALID';
        if ($hist2 = $db->prepare("INSERT INTO rcpa_request_history (rcpa_no, name, activity) VALUES (?,?,?)")) {
          $hist2->bind_param('sss', $rcpa_no_str, $user_name, $activity);
          $hist2->execute();
          $hist2->close();
        }
      }

      // Commit DB changes before attempting email
      $db->commit();

      // 3) Email notification (same pattern as accept-approval-invalid) + fallback recipients
      try {
        require_once __DIR__ . '/../../send-email.php';

        // helper to clean/dedupe emails
        $cleanList = function (array $arr): array {
          $out = [];
          foreach ($arr as $e) {
            $e = strtolower(trim((string)$e));
            if ($e === '' || $e === '-' || !filter_var($e, FILTER_VALIDATE_EMAIL)) continue;
            $out[$e] = true;
          }
          return array_keys($out);
        };

        // pull assignee department/section/name (for email context)
        $assigneeDept = '';
        $assigneeSection = '';
        $assigneeName = '';
        if ($aSel = $db->prepare("SELECT assignee, section, COALESCE(assignee_name,'') FROM rcpa_request WHERE id = ? LIMIT 1")) {
          $aSel->bind_param('i', $rcpa_no);
          if ($aSel->execute()) {
            $aSel->bind_result($assigneeDept, $assigneeSection, $assigneeName);
            $aSel->fetch();
          }
          $aSel->close();
        }
        $assigneeDept    = trim((string)$assigneeDept);
        $assigneeSection = trim((string)$assigneeSection);
        $assigneeName    = trim((string)$assigneeName);

        // To: all QMS
        $toRecipients = [];
        if ($qmsStmt = $db->prepare("SELECT TRIM(email) FROM system_users WHERE TRIM(department)='QMS' AND email IS NOT NULL AND TRIM(email)<>''")) {
          if ($qmsStmt->execute()) {
            $qmsStmt->bind_result($qmsEmail);
            while ($qmsStmt->fetch()) $toRecipients[] = $qmsEmail;
          }
          $qmsStmt->close();
        }
        $toRecipients = $cleanList($toRecipients);

        // CC: supervisors in assignee dept/section
        $ccSupers = [];
        if ($assigneeDept !== '') {
          if ($assigneeSection !== '') {
            $sqlSup = "SELECT TRIM(email) FROM system_users
                       WHERE TRIM(department)=? AND TRIM(section)=?
                         AND LOWER(TRIM(role))='supervisor'
                         AND email IS NOT NULL AND TRIM(email)<>''";
            if ($stS = $db->prepare($sqlSup)) {
              $stS->bind_param('ss', $assigneeDept, $assigneeSection);
              if ($stS->execute()) {
                $stS->bind_result($em);
                while ($stS->fetch()) $ccSupers[] = $em;
              }
              $stS->close();
            }
          } else {
            $sqlSup = "SELECT TRIM(email) FROM system_users
                       WHERE TRIM(department)=? AND (section IS NULL OR TRIM(section)='')
                         AND LOWER(TRIM(role))='supervisor'
                         AND email IS NOT NULL AND TRIM(email)<>''";
            if ($stS = $db->prepare($sqlSup)) {
              $stS->bind_param('s', $assigneeDept);
              if ($stS->execute()) {
                $stS->bind_result($em);
                while ($stS->fetch()) $ccSupers[] = $em;
              }
              $stS->close();
            }
          }
        }

        // CC: the specific assignee (if resolvable)
        $ccAssignee = [];
        if ($assigneeName !== '' && $assigneeDept !== '') {
          if ($assigneeSection !== '') {
            $sqlAss = "SELECT TRIM(email) FROM system_users
                       WHERE UPPER(TRIM(employee_name))=UPPER(TRIM(?))
                         AND UPPER(TRIM(department))   =UPPER(TRIM(?))
                         AND LOWER(TRIM(section))      =LOWER(TRIM(?))
                         AND email IS NOT NULL AND TRIM(email)<>'' LIMIT 1";
            if ($stA = $db->prepare($sqlAss)) {
              $stA->bind_param('sss', $assigneeName, $assigneeDept, $assigneeSection);
              if ($stA->execute()) {
                $stA->bind_result($aEmail);
                if ($stA->fetch()) $ccAssignee[] = $aEmail;
              }
              $stA->close();
            }
          } else {
            $sqlAss = "SELECT TRIM(email) FROM system_users
                       WHERE UPPER(TRIM(employee_name))=UPPER(TRIM(?))
                         AND UPPER(TRIM(department))   =UPPER(TRIM(?))
                         AND (section IS NULL OR TRIM(section)='')
                         AND email IS NOT NULL AND TRIM(email)<>'' LIMIT 1";
            if ($stA = $db->prepare($sqlAss)) {
              $stA->bind_param('ss', $assigneeName, $assigneeDept);
              if ($stA->execute()) {
                $stA->bind_result($aEmail);
                if ($stA->fetch()) $ccAssignee[] = $aEmail;
              }
              $stA->close();
            }
          }
        }

        // CC base list
        $ccList = array_merge($ccSupers, $ccAssignee);

        // FALLBACK: if NO supervisors, CC everyone in dept/section EXCEPT role = 'manager'
        if (empty($ccSupers) && $assigneeDept !== '') {
          if ($assigneeSection !== '') {
            $sqlNm = "SELECT TRIM(email)
                       FROM system_users
                      WHERE TRIM(department)=?
                        AND TRIM(section)=?
                        AND LOWER(TRIM(role)) <> 'manager'
                        AND email IS NOT NULL
                        AND TRIM(email) <> ''";
            if ($stNm = $db->prepare($sqlNm)) {
              $stNm->bind_param('ss', $assigneeDept, $assigneeSection);
              if ($stNm->execute()) {
                $stNm->bind_result($em);
                while ($stNm->fetch()) $ccList[] = $em;
              }
              $stNm->close();
            }
          } else {
            $sqlNm = "SELECT TRIM(email)
                       FROM system_users
                      WHERE TRIM(department)=?
                        AND (section IS NULL OR TRIM(section) = '')
                        AND LOWER(TRIM(role)) <> 'manager'
                        AND email IS NOT NULL
                        AND TRIM(email) <> ''";
            if ($stNm = $db->prepare($sqlNm)) {
              $stNm->bind_param('s', $assigneeDept);
              if ($stNm->execute()) {
                $stNm->bind_result($em);
                while ($stNm->fetch()) $ccList[] = $em;
              }
              $stNm->close();
            }
          }
        }

        $ccRecipients = $cleanList($ccList);
        if (!empty($toRecipients)) {
          $ccRecipients = array_values(array_diff($ccRecipients, $toRecipients));
        }

        if (!empty($toRecipients)) {
          $deptDisplay = $assigneeDept . ($assigneeSection !== '' ? ' - ' . $assigneeSection : '');
          $subject = sprintf('RCPA #%d assigned to %s - status: %s', (int)$rcpa_no, $deptDisplay, $newStatus);
          $portalUrl = 'http://rti10517/qdportal/login.php';

          $rcpaNo        = (int)$rcpa_no;
          $deptDispSafe  = htmlspecialchars($deptDisplay, ENT_QUOTES, 'UTF-8');
          $statusSafe    = htmlspecialchars($newStatus, ENT_QUOTES, 'UTF-8');
          $portalUrlSafe = htmlspecialchars($portalUrl, ENT_QUOTES, 'UTF-8');

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
    RCPA #' . $rcpaNo . ' ' . $statusSafe . ' for ' . $deptDispSafe . '
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
              <span style="display:inline-block; font-size:12px; font-weight:600; padding:6px 10px; border-radius:999px; background:#fef3c7; color:#92400e; border:1px solid #fde68a;">
                ' . $statusSafe . '
              </span>
            </td>
          </tr>

          <tr>
            <td style="padding:8px 24px 0 24px; color:#374151; font-size:14px; line-height:1.6;">
              Good day,<br>
              The Assignee Supervisor/Manager has <strong>approved the Assignee reply as INVALID</strong> for RCPA <strong>#' . $rcpaNo . '</strong>.<br>
              The request is now in status <strong>' . $statusSafe . '</strong>.
            </td>
          </tr>

          <tr>
            <td style="padding:16px 24px 8px 24px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;">
                <tr>
                  <td style="width:42%; padding:10px 12px; background:#f9fafb; border:1px solid #e5e7eb; font-size:13px; color:#6b7280;">Assignee</td>
                  <td style="padding:10px 12px; border:1px solid #e5e7eb; font-size:13px; color:#111827;"><strong>' . $deptDispSafe . '</strong></td>
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
            </td>
          </tr>
        </table>

        <div style="height:12px; line-height:12px;">&nbsp;</div>
      </td>
    </tr>
  </table>
</body>
</html>';

          $altBody  = "RCPA #$rcpaNo - $newStatus\n";
          $altBody .= "Assignee: " . html_entity_decode($deptDispSafe, ENT_QUOTES, 'UTF-8') . "\n";
          $altBody .= "Open QD Portal: $portalUrl\n";

          sendEmailNotification($toRecipients, $subject, $htmlBody, $altBody, $ccRecipients);
        }
      } catch (Throwable $mailErr) {
        error_log('AUTO-INVALID email notify error (id ' . (int)$rcpa_no . '): ' . $mailErr->getMessage());
      }
    }
  } catch (Throwable $autoErr) {
    // Never block the original save if auto-accept fails
    error_log('AUTO-INVALIDATE error (id ' . (int)$rcpa_no . '): ' . $autoErr->getMessage());
  }

  // ⬇️ keep your original JSON response below
  echo json_encode([
    'success' => true,
    'id' => isset($insert_id) ? $insert_id : null,
    'folder' => $batchDir,
    'files' => $saved,
    'rcpa_request' => [
      'id'     => $rcpa_no,
      'status' => $newStatus ?? 'INVALID APPROVAL' // after auto-accept this becomes INVALIDATION REPLY
    ],
    'history' => [
      'id'       => $history_id,
      'rcpa_no'  => $rcpa_no_str,
      'name'     => $user_name,
      'activity' => $activity
    ]
  ]);
  exit;

  echo json_encode([
    'success' => true,
    'id'      => isset($insert_id) ? $insert_id : null,
    'folder'  => $batchDir,
    'files'   => $saved,
    'rcpa_request' => [
      'id'     => $rcpa_no,
      'status' => $newStatus
    ],
    'history' => [
      'id'       => $history_id,
      'rcpa_no'  => $rcpa_no_str,
      'name'     => $user_name,
      'activity' => $activity
    ]
  ]);
} catch (Throwable $e) {
  try {
    $db->rollback();
  } catch (Throwable $ignored) {
  }
  http_response_code(500);
  echo json_encode(['success' => false, 'error' => 'Server error: ' . $e->getMessage()]);
  exit;
}
