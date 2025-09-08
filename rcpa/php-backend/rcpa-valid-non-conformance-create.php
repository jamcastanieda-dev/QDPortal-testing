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
if (!$db) { http_response_code(500); echo json_encode(['success'=>false,'error'=>'DB connection not found']); exit; }
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

if ($rcpa_no <= 0) { http_response_code(400); echo json_encode(['success'=>false,'error'=>'Missing rcpa_no']); exit; }
if ($root_cause === '') { http_response_code(400); echo json_encode(['success'=>false,'error'=>'Missing root_cause']); exit; }

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

if (!is_dir($baseDir))   { @mkdir($baseDir, 0775, true); }
if (!is_dir($targetDir)) { @mkdir($targetDir, 0775, true); }

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
    $allowed = ['pdf','png','jpg','jpeg','webp','heic','doc','docx','xls','xlsx','txt', 'sql'];
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
  if (!$del) { throw new Exception('Prepare failed (delete)'); }
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
  if (!$stmt) { throw new Exception('Prepare failed (insert)'); }

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
  if (!$up) { throw new Exception('Prepare failed (status update)'); }
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
  if (!$hist) { throw new Exception('Prepare failed (history insert)'); }
  $hist->bind_param('sss', $rcpa_no_str, $user_name, $activity);
  if (!$hist->execute()) {
    $err = $hist->error;
    $hist->close();
    throw new Exception($err ?: 'Execute failed (history insert)');
  }
  $history_id = $db->insert_id;
  $hist->close();

  $db->commit();

  echo json_encode([
    'success' => true,
    'id' => $insert_id,
    'history_id' => $history_id,
    'folder' => $batchDir,
    'files' => $saved
  ]);
} catch (Throwable $e) {
  $db->rollback();
  http_response_code(400);
  echo json_encode(['success'=>false,'error'=>$e->getMessage()]);
}
