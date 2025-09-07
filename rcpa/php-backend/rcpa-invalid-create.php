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
  $newStatus = 'IN-VALID APPROVAL';

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
  $db->commit();

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
?>
