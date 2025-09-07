<?php
// rcpa-valid-potential-conformance-create.php
header('Content-Type: application/json');
require_once '../../connection.php';

// require a logged-in user so we can write to history
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
if (!$db) { http_response_code(500); echo json_encode(['success'=>false,'error'=>'DB connection not found']); exit; }
$db->set_charset('utf8mb4');

// Inputs
$rcpa_no = isset($_POST['rcpa_no']) ? (int)$_POST['rcpa_no'] : 0;
$root_cause = trim($_POST['root_cause'] ?? '');
$preventive_action = trim($_POST['preventive_action'] ?? '');
$preventive_target_date = $_POST['preventive_target_date'] ?? null;
$preventive_date_completed = $_POST['preventive_date_completed'] ?? null;

if ($rcpa_no <= 0) { http_response_code(400); echo json_encode(['success'=>false,'error'=>'Missing rcpa_no']); exit; }
if ($root_cause === '') { http_response_code(400); echo json_encode(['success'=>false,'error'=>'Missing root_cause']); exit; }
if ($preventive_action === '') { http_response_code(400); echo json_encode(['success'=>false,'error'=>'Missing preventive_action']); exit; }

$preventive_target_date = $preventive_target_date === '' ? null : $preventive_target_date;
$preventive_date_completed = $preventive_date_completed === '' ? null : $preventive_date_completed;

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
    $allowed = ['pdf','png','jpg','jpeg','webp','heic','doc','docx','xls','xlsx','txt'];
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

  // 1) DELETE any existing PNC for this rcpa_no
  $del = $db->prepare("DELETE FROM rcpa_valid_potential_conformance WHERE rcpa_no = ?");
  if (!$del) { throw new Exception('Prepare failed (delete)'); }
  $del->bind_param('i', $rcpa_no);
  if (!$del->execute()) {
    $err = $del->error;
    $del->close();
    throw new Exception($err ?: 'Execute failed (delete)');
  }
  $del->close();

  // 2) INSERT new PNC
  $sql = "INSERT INTO rcpa_valid_potential_conformance
          (rcpa_no, root_cause, preventive_action, preventive_target_date, preventive_date_completed, assignee_name, attachment)
          VALUES (?,?,?,?,?,?,?)";
  $stmt = $db->prepare($sql);
  if (!$stmt) { throw new Exception('Prepare failed (insert)'); }

  $stmt->bind_param(
    'issssss',
    $rcpa_no,
    $root_cause,
    $preventive_action,
    $preventive_target_date,
    $preventive_date_completed,
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
