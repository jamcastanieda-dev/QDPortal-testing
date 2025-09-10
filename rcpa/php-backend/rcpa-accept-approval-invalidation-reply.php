<?php
// php-backend/rcpa-accept-approval-invalidation-reply.php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
date_default_timezone_set('Asia/Manila');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  http_response_code(405);
  echo json_encode(['success' => false, 'error' => 'Method Not Allowed']);
  exit;
}

require_once __DIR__ . '/../../connection.php'; // provides $conn (mysqli)

// --- Auth (from cookie) ---
$user = json_decode($_COOKIE['user'] ?? 'null', true);
if (!$user || !is_array($user)) {
  http_response_code(401);
  echo json_encode(['success' => false, 'error' => 'Unauthorized']);
  exit;
}
$user_name = $user['name'] ?? 'Unknown';

// --- Input ---
$id = $_POST['id'] ?? null;
if ($id === null || !ctype_digit((string)$id)) {
  http_response_code(400);
  echo json_encode(['success' => false, 'error' => 'Missing or invalid id']);
  exit;
}
$remarks = trim((string)($_POST['remarks'] ?? ''));

$status   = 'IN-VALID APPROVAL - ORIGINATOR';
$logType  = 'Approved by QA Manager in in-validation reply approval';

// -------- Upload handling (optional attachments) --------
$stamp        = date('Ymd-His');
$projectRoot  = realpath(__DIR__ . '/..');                 // .../rcpa/php-backend/..
$relPath      = "uploads-rcpa-approve/$stamp/";            // <— updated folder
$diskBase     = rtrim($projectRoot, '/\\') . DIRECTORY_SEPARATOR . $relPath;
// Adjust if your web base differs
$webBase      = "/qdportal-testing/rcpa/" . $relPath;

$filesJson = [];

try {
  if (!isset($conn) || !($conn instanceof mysqli)) {
    throw new Exception('Database connection not available as $conn');
  }
  @$conn->set_charset('utf8mb4');

  // Save files (if any) BEFORE DB tx
  if (isset($_FILES['attachments']) && is_array($_FILES['attachments']['name'])) {
    if (!is_dir($diskBase)) {
      if (!@mkdir($diskBase, 0775, true) && !is_dir($diskBase)) {
        throw new RuntimeException("Failed to create upload dir: $diskBase");
      }
    }

    $names = $_FILES['attachments']['name'];
    $tmps  = $_FILES['attachments']['tmp_name'];
    $errs  = $_FILES['attachments']['error'];
    $sizes = $_FILES['attachments']['size'];

    $count = count($names);
    for ($i = 0; $i < $count; $i++) {
      $name = $names[$i];
      if ($name === '' || $name === null) continue;
      $err  = (int)($errs[$i] ?? UPLOAD_ERR_OK);
      if ($err !== UPLOAD_ERR_OK) continue;

      $tmp  = $tmps[$i];
      $size = (int)$sizes[$i];

      // Sanitize filename
      $baseName = preg_replace('/[^\w\-. ]+/', '_', $name);
      if ($baseName === '') $baseName = 'file';

      // Ensure unique filename
      $destPath = $diskBase . $baseName;
      $n = 1;
      while (file_exists($destPath)) {
        $pi  = pathinfo($baseName);
        $try = $pi['filename'] . "($n)" . (isset($pi['extension']) ? '.' . $pi['extension'] : '');
        $destPath = $diskBase . $try;
        $n++;
      }

      if (!@move_uploaded_file($tmp, $destPath)) {
        if (!@rename($tmp, $destPath)) {
          throw new RuntimeException("Failed to store uploaded file: $name");
        }
      }

      $publicName = basename($destPath);
      $url = $webBase . rawurlencode($publicName);

      $filesJson[] = [
        'name'  => $publicName,
        'url'   => $url,
        'size'  => $size >= 0 ? $size : null,
        'bytes' => $size >= 0 ? $size : null,
      ];
    }
  }

  $attachmentJson = !empty($filesJson) ? json_encode($filesJson, JSON_UNESCAPED_SLASHES) : null;

  // -------- DB transaction --------
  if (!$conn->begin_transaction()) {
    throw new Exception('Could not start transaction: ' . $conn->error);
  }

  // 0) Ensure record exists and get current status
  $currStatus = null;
  $chk = $conn->prepare('SELECT status FROM rcpa_request WHERE id = ? LIMIT 1');
  if (!$chk) throw new Exception('Prepare failed (select): ' . $conn->error);
  $chk->bind_param('i', $id);
  if (!$chk->execute()) { $err = $chk->error ?: 'Execute failed (select)'; $chk->close(); throw new Exception($err); }
  $res = $chk->get_result();
  if ($res && $res->num_rows > 0) {
    $row = $res->fetch_assoc();
    $currStatus = $row['status'] ?? null;
  }
  $chk->close();

  if ($currStatus === null) {
    $conn->rollback();
    http_response_code(404);
    echo json_encode(['success' => false, 'error' => 'Record not found']);
    exit;
  }

  $alreadyApproved = ($currStatus === $status);

  // 1) Update status only if different
  if (!$alreadyApproved) {
    $stmt = $conn->prepare('UPDATE rcpa_request SET status = ? WHERE id = ?');
    if (!$stmt) throw new Exception('Prepare failed (update): ' . $conn->error);
    $stmt->bind_param('si', $status, $id);
    if (!$stmt->execute()) { $err = $stmt->error ?: 'Execute failed (update)'; $stmt->close(); throw new Exception($err); }
    $stmt->close();
  }

  // 2) Insert approval remarks row (use rcpa_approve_remarks; rcpa_no is VARCHAR)
  $stmt2 = $conn->prepare('
    INSERT INTO rcpa_approve_remarks (rcpa_no, type, remarks, attachment, created_at)
    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
  ');
  if (!$stmt2) throw new Exception('Prepare failed (remarks): ' . $conn->error);
  $remarksParam    = ($remarks !== '') ? $remarks : null;  // allow NULL
  $attachmentParam = $attachmentJson;                      // can be NULL
  $rcpaNoParam     = (string)$id;                          // rcpa_no is VARCHAR(64)
  $stmt2->bind_param('ssss', $rcpaNoParam, $logType, $remarksParam, $attachmentParam);
  if (!$stmt2->execute()) { $err = $stmt2->error ?: 'Execute failed (remarks)'; $stmt2->close(); throw new Exception($err); }
  $remarksId = $stmt2->insert_id;
  $stmt2->close();

  // 3) History entry
  $activity = 'The in-validation reply approval by QA/QMS Team was approved by QA/QMS Supervisor/Manager';
  $historySql = 'INSERT INTO rcpa_request_history (rcpa_no, name, date_time, activity) VALUES (?, ?, CURRENT_TIMESTAMP, ?)';
  $h = $conn->prepare($historySql);
  if (!$h) throw new Exception('Prepare failed (history): ' . $conn->error);
  $h->bind_param('iss', $id, $user_name, $activity);
  if (!$h->execute()) { $err = $h->error ?: 'Execute failed (history)'; $h->close(); throw new Exception($err); }
  $h->close();

  if (!$conn->commit()) {
    throw new Exception('Commit failed: ' . $conn->error);
  }

  echo json_encode([
    'success'      => true,
    'id'           => (int)$id,
    'status'       => $status,
    'already'      => $alreadyApproved,
    'remarks_id'   => (int)$remarksId,
    'attachments'  => $filesJson,
    'type'         => $logType
  ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
} catch (Throwable $e) {
  if (isset($conn) && $conn instanceof mysqli) {
    $conn->rollback();
  }
  http_response_code(500);
  echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
