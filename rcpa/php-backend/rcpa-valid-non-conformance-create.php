<?php
// rcpa-valid-non-conformance-create.php
header('Content-Type: application/json');
require_once '../../connection.php';

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
$user_name = $current_user['name'];

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
$root_cause = trim($_POST['root_cause'] ?? '');
$correction = trim($_POST['correction'] ?? '');
$correction_target_date = $_POST['correction_target_date'] ?? null;
$correction_date_completed = $_POST['correction_date_completed'] ?? null;
$corrective = trim($_POST['corrective'] ?? '');
$corrective_target_date = $_POST['corrective_target_date'] ?? null;
$corrective_date_completed = $_POST['corrective_date_completed'] ?? null;

if ($rcpa_no <= 0) {
  http_response_code(400);
  echo json_encode(['success' => false, 'error' => 'Missing rcpa_no']);
  exit;
}
if ($root_cause === '') {
  http_response_code(400);
  echo json_encode(['success' => false, 'error' => 'Missing root_cause']);
  exit;
}

$correction_target_date = $correction_target_date === '' ? null : $correction_target_date;
$correction_date_completed = $correction_date_completed === '' ? null : $correction_date_completed;
$corrective_target_date = $corrective_target_date === '' ? null : $corrective_target_date;
$corrective_date_completed = $corrective_date_completed === '' ? null : $corrective_date_completed;

// ===== handle uploads =====
$baseDir   = __DIR__ . '/../uploads-valid-attachment';
$batchDir  = 'valid_' . date('Ymd_His');
$targetDir = $baseDir . '/' . $batchDir;
$appRoot = rtrim(dirname(dirname($_SERVER['SCRIPT_NAME'])), '/\\');
$publicBase = $appRoot . '/uploads-valid-attachment/' . $batchDir;

if (!is_dir($baseDir)) {
  @mkdir($baseDir, 0775, true);
}
if (!is_dir($targetDir)) {
  @mkdir($targetDir, 0775, true);
}

$saved = [];
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

// ===== DB operations (transaction) =====
try {
  $db->begin_transaction();

  // 1) DELETE any existing NC for this rcpa_no
  $del = $db->prepare("DELETE FROM rcpa_valid_non_conformance WHERE rcpa_no = ?");
  if (!$del) {
    throw new Exception('Prepare failed (delete)');
  }
  $del->bind_param('i', $rcpa_no);
  if (!$del->execute()) {
    $err = $del->error;
    $del->close();
    throw new Exception($err ?: 'Execute failed (delete)');
  }
  $del->close();

  // 2) INSERT new NC
  $sql = "INSERT INTO rcpa_valid_non_conformance
          (rcpa_no, root_cause, correction, correction_target_date, correction_date_completed,
           corrective, corrective_target_date, corrective_date_completed, assignee_name, attachment)
          VALUES (?,?,?,?,?,?,?,?,?,?)";
  $stmt = $db->prepare($sql);
  if (!$stmt) {
    throw new Exception('Prepare failed (insert)');
  }

  $stmt->bind_param(
    'isssssssss',
    $rcpa_no,
    $root_cause,
    $correction,
    $correction_target_date,
    $correction_date_completed,
    $corrective,
    $corrective_target_date,
    $corrective_date_completed,
    $user_name,
    $attachment_json
  );

  if (!$stmt->execute()) {
    $err = $stmt->error;
    $stmt->close();
    throw new Exception($err ?: 'Execute failed (insert)');
  }
  $insert_id = $db->insert_id;
  $stmt->close();

  // 3) UPDATE rcpa_request status
  $statusVal = 'VALID APPROVAL';
  $up = $db->prepare("UPDATE rcpa_request SET status=? WHERE id=?");
  if (!$up) {
    throw new Exception('Prepare failed (status update)');
  }
  $up->bind_param('si', $statusVal, $rcpa_no);
  if (!$up->execute() || $up->affected_rows < 1) {
    $err = $up->error;
    $up->close();
    throw new Exception($err ?: 'Execute failed (status update)');
  }
  $up->close();

  // 4) INSERT history
  $rcpa_no_str = (string)$rcpa_no;
  $activity = "The Assignee confirmed that the RCPA is valid.";
  $hist = $db->prepare("INSERT INTO rcpa_request_history (rcpa_no, name, activity) VALUES (?,?,?)");
  if (!$hist) {
    throw new Exception('Prepare failed (history insert)');
  }
  $hist->bind_param('sss', $rcpa_no_str, $user_name, $activity);
  if (!$hist->execute()) {
    $err = $hist->error;
    $hist->close();
    throw new Exception($err ?: 'Execute failed (history insert)');
  }
  $history_id = $db->insert_id;
  $hist->close();

  $db->commit();

  // ============================================================
  // AUTO-ACCEPT (VALIDATION REPLY) IF CURRENT USER IS A SUPERVISOR/MANAGER
  // ============================================================
  try {
    // 1) Look up the current user's role
    $role = null;
    if ($rstmt = $db->prepare("SELECT LOWER(TRIM(role)) FROM system_users WHERE UPPER(TRIM(employee_name)) = UPPER(TRIM(?)) LIMIT 1")) {
      $rstmt->bind_param('s', $user_name);
      if ($rstmt->execute()) {
        $rstmt->bind_result($role);
        $rstmt->fetch();
      }
      $rstmt->close();
    }

    // Proceed only if role is supervisor/manager
    if (in_array($role, ['supervisor', 'manager'], true)) {
      date_default_timezone_set('Asia/Manila');

      // Helper copied from rcpa-accept-approval-valid.php
      $working_days_between = function (?string $startYmd, string $endYmd, array $nonWorking): int {
        if (!$startYmd) return 0;
        $startTs = strtotime($startYmd);
        $endTs   = strtotime($endYmd);
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

      // Wrap the accept operation in its own transaction
      $db->begin_transaction();

      // Lock and read the row we need
      $conf = $reply_received = $reply_date = null;
      if (!($sel = $db->prepare("SELECT conformance, reply_received, reply_date FROM rcpa_request WHERE id=? FOR UPDATE"))) {
        throw new Exception('Prepare failed for select (auto-accept)');
      }
      $sel->bind_param('i', $rcpa_no);
      if (!$sel->execute()) {
        $err = $sel->error;
        $sel->close();
        throw new Exception($err ?: 'Execute failed for select (auto-accept)');
      }
      $sel->bind_result($conf, $reply_received, $reply_date);
      if (!$sel->fetch()) {
        $sel->close();
        throw new Exception('No matching rcpa_request row found (auto-accept)');
      }
      $sel->close();

      // Normalize conformance
      $norm = strtolower(trim(preg_replace('/[\s_-]+/', ' ', (string)$conf)));
      $is_nc  = ($norm === 'non conformance' || $norm === 'non-conformance' || $norm === 'nonconformance' || $norm === 'nc');
      $is_pnc = ($norm === 'potential non conformance' || $norm === 'potential non-conformance' || $norm === 'pnc' || strpos($norm, 'potential') !== false);

      // Update status and set reply_date only if NULL
      $newStatus = 'VALIDATION REPLY';
      if (!($upd = $db->prepare("
          UPDATE rcpa_request
             SET status = ?,
                 reply_date = COALESCE(reply_date, CURDATE())
           WHERE id = ?"))) {
        throw new Exception('Prepare failed for status update (auto-accept)');
      }
      $upd->bind_param('si', $newStatus, $rcpa_no);
      if (!$upd->execute()) {
        $err = $upd->error;
        $upd->close();
        throw new Exception($err ?: 'Execute failed for status update (auto-accept)');
      }
      $upd->close();

      // Compute no_days_reply if NULL, and set hit_reply
      $todayYmd = date('Y-m-d');
      $nonWorking = [];
      if ($resNW = $db->query("SELECT `date` FROM rcpa_not_working_calendar")) {
        while ($rw = $resNW->fetch_assoc()) {
          $d = date('Y-m-d', strtotime($rw['date']));
          $nonWorking[$d] = true;
        }
        $resNW->free();
      }

      $rr = $rd = $ndr = null;
      if ($chk = $db->prepare("SELECT reply_received, reply_date, no_days_reply FROM rcpa_request WHERE id=? FOR UPDATE")) {
        $chk->bind_param('i', $rcpa_no);
        $chk->execute();
        $chk->bind_result($rr, $rd, $ndr);
        $chk->fetch();
        $chk->close();
      }

      $computedDays = null;
      if ($ndr === null) {
        $computedDays = $working_days_between($rr ? date('Y-m-d', strtotime($rr)) : null, $todayYmd, $nonWorking);
        if ($upd2 = $db->prepare("UPDATE rcpa_request SET no_days_reply = ? WHERE id = ? AND no_days_reply IS NULL")) {
          $upd2->bind_param('ii', $computedDays, $rcpa_no);
          $upd2->execute();
          $upd2->close();
        }
      }

      $effectiveDays = ($ndr === null) ? $computedDays : (int)$ndr;
      if ($effectiveDays !== null) {
        $hitVal = ($effectiveDays <= 5) ? 'hit' : 'missed';
        if ($updHit = $db->prepare("UPDATE rcpa_request SET hit_reply = COALESCE(hit_reply, ?) WHERE id = ?")) {
          $updHit->bind_param('si', $hitVal, $rcpa_no);
          $updHit->execute();
          $updHit->close();
        }
      }

      // Stamp supervisor/manager in the proper validity table
      $updated_nc = 0;
      $updated_pnc = 0;
      if ($is_nc && !$is_pnc) {
        if ($stmt = $db->prepare("
            UPDATE rcpa_valid_non_conformance
               SET assignee_supervisor_name = ?, assignee_supervisor_date = CURDATE()
             WHERE rcpa_no = ?")) {
          $stmt->bind_param('si', $user_name, $rcpa_no);
          $stmt->execute();
          $updated_nc = $stmt->affected_rows;
          $stmt->close();
        }
      } elseif ($is_pnc && !$is_nc) {
        if ($stmt = $db->prepare("
            UPDATE rcpa_valid_potential_conformance
               SET assignee_supervisor_name = ?, assignee_supervisor_date = CURDATE()
             WHERE rcpa_no = ?")) {
          $stmt->bind_param('si', $user_name, $rcpa_no);
          $stmt->execute();
          $updated_pnc = $stmt->affected_rows;
          $stmt->close();
        }
      }

      // History
      if ($db->query("SHOW TABLES LIKE 'rcpa_request_history'")->num_rows > 0) {
        $rcpa_no_str = (string)$rcpa_no;
        $activity = 'The Assignee Supervisor/Manager approved the Assignee reply as VALID';
        if ($hist = $db->prepare("INSERT INTO rcpa_request_history (rcpa_no, name, activity) VALUES (?,?,?)")) {
          $hist->bind_param('sss', $rcpa_no_str, $user_name, $activity);
          $hist->execute();
          $hist->close();
        }
      }

      // Commit DB changes before sending email
      $db->commit();

      // =========================
      // Email notifications
      // =========================
      try {
        require_once __DIR__ . '/../../send-email.php';

        $cleanList = function (array $arr): array {
          $out = [];
          foreach ($arr as $e) {
            $e = strtolower(trim((string)$e));
            if ($e === '' || $e === '-' || !filter_var($e, FILTER_VALIDATE_EMAIL)) continue;
            $out[$e] = true;
          }
          return array_keys($out);
        };

        // Fetch assignee dept/section/name for email context
        $assigneeDept = '';
        $assigneeSection = '';
        $assigneeNameEmailLookup = '';
        if ($aSel = $db->prepare("SELECT assignee, section, COALESCE(assignee_name, '') FROM rcpa_request WHERE id = ? LIMIT 1")) {
          $aSel->bind_param('i', $rcpa_no);
          if ($aSel->execute()) {
            $aSel->bind_result($assigneeDept, $assigneeSection, $assigneeNameEmailLookup);
            $aSel->fetch();
          }
          $aSel->close();
        }
        $assigneeDept    = trim((string)$assigneeDept);
        $assigneeSection = trim((string)$assigneeSection);
        $assigneeNameEmailLookup = trim((string)$assigneeNameEmailLookup);

        // To: QMS
        $toRecipients = [];
        if ($qmsStmt = $db->prepare("SELECT TRIM(email) AS email FROM system_users WHERE TRIM(department) = 'QMS' AND email IS NOT NULL AND TRIM(email) <> ''")) {
          if ($qmsStmt->execute()) {
            $qmsStmt->bind_result($qmsEmail);
            while ($qmsStmt->fetch()) {
              $toRecipients[] = $qmsEmail;
            }
          }
          $qmsStmt->close();
        }
        $toRecipients = $cleanList($toRecipients);

        // CC: prefer supervisors; if none, fallback to everyone EXCEPT 'manager'
        $ccList = [];

        // 1) supervisors
        $supervisorEmails = [];
        if ($assigneeDept !== '') {
          if ($assigneeSection !== '') {
            $sqlSup = "SELECT TRIM(email)
                         FROM system_users
                        WHERE TRIM(department) = ?
                          AND TRIM(section)    = ?
                          AND LOWER(TRIM(role)) = 'supervisor'
                          AND email IS NOT NULL
                          AND TRIM(email) <> ''";
            if ($stS = $db->prepare($sqlSup)) {
              $stS->bind_param('ss', $assigneeDept, $assigneeSection);
              if ($stS->execute()) {
                $stS->bind_result($em);
                while ($stS->fetch()) $supervisorEmails[] = $em;
              }
              $stS->close();
            }
          } else {
            $sqlSup = "SELECT TRIM(email)
                         FROM system_users
                        WHERE TRIM(department) = ?
                          AND (section IS NULL OR TRIM(section) = '')
                          AND LOWER(TRIM(role)) = 'supervisor'
                          AND email IS NOT NULL
                          AND TRIM(email) <> ''";
            if ($stS = $db->prepare($sqlSup)) {
              $stS->bind_param('s', $assigneeDept);
              if ($stS->execute()) {
                $stS->bind_result($em);
                while ($stS->fetch()) $supervisorEmails[] = $em;
              }
              $stS->close();
            }
          }
        }
        $ccList = $supervisorEmails;

        // 2) include the specific assignee (if resolvable)
        $assigneeEmail = null;
        if ($assigneeNameEmailLookup !== '' && $assigneeDept !== '') {
          if ($assigneeSection !== '') {
            $sqlAss = "SELECT TRIM(email)
                         FROM system_users
                        WHERE UPPER(TRIM(employee_name)) = UPPER(TRIM(?))
                          AND UPPER(TRIM(department))    = UPPER(TRIM(?))
                          AND LOWER(TRIM(section))       = LOWER(TRIM(?))
                          AND email IS NOT NULL
                          AND TRIM(email) <> ''
                        LIMIT 1";
            if ($stA = $db->prepare($sqlAss)) {
              $stA->bind_param('sss', $assigneeNameEmailLookup, $assigneeDept, $assigneeSection);
              if ($stA->execute()) { $stA->bind_result($aEmail); if ($stA->fetch()) $assigneeEmail = $aEmail; }
              $stA->close();
            }
          } else {
            $sqlAss = "SELECT TRIM(email)
                         FROM system_users
                        WHERE UPPER(TRIM(employee_name)) = UPPER(TRIM(?))
                          AND UPPER(TRIM(department))    = UPPER(TRIM(?))
                          AND (section IS NULL OR TRIM(section) = '')
                          AND email IS NOT NULL
                          AND TRIM(email) <> ''
                        LIMIT 1";
            if ($stA = $db->prepare($sqlAss)) {
              $stA->bind_param('ss', $assigneeNameEmailLookup, $assigneeDept);
              if ($stA->execute()) { $stA->bind_result($aEmail); if ($stA->fetch()) $assigneeEmail = $aEmail; }
              $stA->close();
            }
          }
        }
        if ($assigneeEmail) { $ccList[] = $assigneeEmail; }

        // 3) Fallback if no supervisors: add everyone in dept/section EXCEPT 'manager'
        if (empty($supervisorEmails) && $assigneeDept !== '') {
          if ($assigneeSection !== '') {
            $sqlNm = "SELECT TRIM(email)
                        FROM system_users
                       WHERE TRIM(department) = ?
                         AND TRIM(section)    = ?
                         AND LOWER(TRIM(role)) <> 'manager'
                         AND email IS NOT NULL
                         AND TRIM(email) <> ''";
            if ($stNm = $db->prepare($sqlNm)) {
              $stNm->bind_param('ss', $assigneeDept, $assigneeSection);
              if ($stNm->execute()) { $stNm->bind_result($em); while ($stNm->fetch()) $ccList[] = $em; }
              $stNm->close();
            }
          } else {
            $sqlNm = "SELECT TRIM(email)
                        FROM system_users
                       WHERE TRIM(department) = ?
                         AND (section IS NULL OR TRIM(section) = '')
                         AND LOWER(TRIM(role)) <> 'manager'
                         AND email IS NOT NULL
                         AND TRIM(email) <> ''";
            if ($stNm = $db->prepare($sqlNm)) {
              $stNm->bind_param('s', $assigneeDept);
              if ($stNm->execute()) { $stNm->bind_result($em); while ($stNm->fetch()) $ccList[] = $em; }
              $stNm->close();
            }
          }
        }

        // Clean and dedupe
        $ccRecipients = $cleanList($ccList);
        if (!empty($toRecipients)) {
          $ccRecipients = array_values(array_diff($ccRecipients, $toRecipients)); // prevent overlap with "To"
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

          $altBody  = "RCPA #$rcpaNo - $newStatus\n";
          $altBody .= "Assignee: " . html_entity_decode($deptDispSafe, ENT_QUOTES, 'UTF-8') . "\n";
          $altBody .= "Open QD Portal: $portalUrl\n";

          sendEmailNotification($toRecipients, $subject, $htmlBody, $altBody, $ccRecipients);
        }
      } catch (Throwable $mailErr) {
        error_log('AUTO-VALID email notify error (id ' . (int)$rcpa_no . '): ' . $mailErr->getMessage());
      }
      // ===== end auto-accept email =====
    }
  } catch (Throwable $autoErr) {
    // DO NOT fail the original response if auto-accept fails; just log it.
    error_log('AUTO-ACCEPT error (id ' . (int)$rcpa_no . '): ' . $autoErr->getMessage());
  }

  // Return success JSON
  echo json_encode([
    'success' => true,
    'id' => $insert_id,
    'history_id' => $history_id,
    'folder' => $batchDir,
    'files' => $saved
  ]);
  exit;

} catch (Throwable $e) {
  $db->rollback();
  http_response_code(400);
  echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
