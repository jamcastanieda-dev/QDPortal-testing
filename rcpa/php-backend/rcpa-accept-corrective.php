<?php
// php-backend/rcpa-accept-corrective.php
declare(strict_types=1);
header('Content-Type: application/json');
date_default_timezone_set('Asia/Manila');

// --- Auth (same pattern as your other endpoints) ---
$user = json_decode($_COOKIE['user'] ?? 'null', true);
if (!$user || !is_array($user)) {
  http_response_code(401);
  echo json_encode(['success' => false, 'error' => 'Unauthorized']);
  exit;
}
$user_name = $user['name'] ?? 'Unknown';

// Make mysqli throw exceptions so we can catch + rollback cleanly
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

$mysqli = null;
$inTxn  = false;

try {
  if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
  }

  // === Inputs ===
  $rcpa_no = isset($_POST['rcpa_no']) ? (int)$_POST['rcpa_no'] : 0;
  $remarks = trim($_POST['corrective_action_remarks'] ?? '');

  if ($rcpa_no <= 0 || $remarks === '') {
    http_response_code(422);
    echo json_encode(['success' => false, 'error' => 'Missing required fields']);
    exit;
  }

  // === DB connect via your shared connection file ===
  require_once __DIR__ . '/../../connection.php';
  // Normalize to $mysqli
  if (isset($mysqli) && $mysqli instanceof mysqli) {
    // ok
  } elseif (isset($conn) && $conn instanceof mysqli) {
    $mysqli = $conn;
  } else {
    throw new RuntimeException('Database connection not found from ../../connection.php');
  }
  $mysqli->set_charset('utf8mb4');

  // === Handle attachments ===
  $savedFiles = [];

  // Build timestamped folder using Asia/Manila
  $tz = new DateTimeZone('Asia/Manila');
  $now = new DateTime('now', $tz);
  $folderName = $now->format('Y-m-d_H-i-s');

  // Base directory: ../uploads-corrective-attachment/<timestamp-folder>/
  $baseDir = __DIR__ . '/../uploads-corrective-attachment';
  $targetDir = $baseDir . '/' . $folderName;

  // Ensure directories exist
  if (!is_dir($baseDir) && !@mkdir($baseDir, 0775, true)) {
    throw new RuntimeException('Failed to create base upload directory');
  }
  if (!is_dir($targetDir) && !@mkdir($targetDir, 0775, true)) {
    throw new RuntimeException('Failed to create timestamped upload directory');
  }

  if (!empty($_FILES['attachments']) && is_array($_FILES['attachments']['name'])) {
    $count = count($_FILES['attachments']['name']);
    for ($i = 0; $i < $count; $i++) {
      if ((int)$_FILES['attachments']['error'][$i] !== UPLOAD_ERR_OK) continue;

      $origName = $_FILES['attachments']['name'][$i];
      $tmpPath  = $_FILES['attachments']['tmp_name'][$i];
      $size     = (int)$_FILES['attachments']['size'][$i];

      $ext      = pathinfo($origName, PATHINFO_EXTENSION);
      $safeBase = preg_replace('/[^A-Za-z0-9_.-]/', '_', pathinfo($origName, PATHINFO_FILENAME));
      $fileName = $safeBase . '_' . $now->format('Ymd_His') . '_' . bin2hex(random_bytes(4)) . ($ext ? ('.'.$ext) : '');
      $destPath = $targetDir . '/' . $fileName;

      if (!move_uploaded_file($tmpPath, $destPath)) continue;

      // Public/relative URL (adjust if your app serves uploads differently)
      $url = '../uploads-corrective-attachment/' . rawurlencode($folderName) . '/' . rawurlencode($fileName);

      $savedFiles[] = [
        'name'   => $origName,
        'url'    => $url,
        'size'   => $size,
        'folder' => $folderName
      ];
    }
  }

  $attachmentsJson = json_encode($savedFiles, JSON_UNESCAPED_SLASHES);

  // === Transaction: insert reply + update status + insert history ===
  $mysqli->begin_transaction();
  $inTxn = true;

  $stmt = $mysqli->prepare("
    INSERT INTO rcpa_corrective_evidence
      (rcpa_no, remarks, attachment)
    VALUES
      (?, ?, ?)
  ");
  $stmt->bind_param('iss', $rcpa_no, $remarks, $attachmentsJson);
  $stmt->execute();
  $stmt->close();

  // 2) Update status on rcpa_request
  $stmt2 = $mysqli->prepare("
    UPDATE rcpa_request
       SET status = 'FOR CLOSING APPROVAL'
     WHERE id = ?
     LIMIT 1
  ");
  $stmt2->bind_param('i', $rcpa_no);
  $stmt2->execute();
  $stmt2->close();

  // 3) Insert history row
  $activity = 'The Assignee request approval for corrective action evidence';
  $stmt3 = $mysqli->prepare("
    INSERT INTO rcpa_request_history (rcpa_no, name, activity)
    VALUES (?, ?, ?)
  ");
  $rcpaNoStr = (string)$rcpa_no; // rcpa_request_history.rcpa_no is VARCHAR(50)
  $stmt3->bind_param('sss', $rcpaNoStr, $user_name, $activity);
  $stmt3->execute();
  $stmt3->close();

  $mysqli->commit();
  $inTxn = false;

  echo json_encode(['success' => true]);
} catch (Throwable $e) {
  if ($mysqli && $inTxn) {
    $mysqli->rollback();
  }
  http_response_code(500);
  echo json_encode(['success' => false, 'error' => $e->getMessage()]);
} finally {
  if ($mysqli) $mysqli->close();
}
