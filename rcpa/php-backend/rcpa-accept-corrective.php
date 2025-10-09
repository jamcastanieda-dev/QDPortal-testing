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
  $autoApproved = false;
$finalStatus  = 'FOR CLOSING APPROVAL';


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

  // === Resolve role (from cookie or system_users) ===
  // Prefer cookie-provided role if available; otherwise look up via your schema (employee_id/email/employee_name)
  $user_role = strtolower(trim((string)($user['role'] ?? '')));
  if ($user_role === '') {
    $role = null;

    // 1) Try employee_id (cookie may have employee_id or id)
    $empId = null;
    if (isset($user['employee_id']) && ctype_digit((string)$user['employee_id'])) {
      $empId = (int)$user['employee_id'];
    } elseif (isset($user['id']) && ctype_digit((string)$user['id'])) {
      $empId = (int)$user['id'];
    }
    if ($empId !== null) {
      $stmtR = $mysqli->prepare("SELECT role FROM system_users WHERE employee_id = ? LIMIT 1");
      $stmtR->bind_param('i', $empId);
      $stmtR->execute();
      $stmtR->bind_result($role);
      if ($stmtR->fetch()) {
        $user_role = strtolower((string)$role);
      }
      $stmtR->close();
    }

    // 2) Fallback: email
    if ($user_role === '' && !empty($user['email'])) {
      $stmtR = $mysqli->prepare("SELECT role FROM system_users WHERE email = ? LIMIT 1");
      $stmtR->bind_param('s', $user['email']);
      $stmtR->execute();
      $stmtR->bind_result($role);
      if ($stmtR->fetch()) {
        $user_role = strtolower((string)$role);
      }
      $stmtR->close();
    }

    // 3) Fallback: employee_name (NOT "name")
    $nameCandidate = $user['employee_name'] ?? ($user['name'] ?? null);
    if ($user_role === '' && !empty($nameCandidate)) {
      $stmtR = $mysqli->prepare("SELECT role FROM system_users WHERE employee_name = ? LIMIT 1");
      $stmtR->bind_param('s', $nameCandidate);
      $stmtR->execute();
      $stmtR->bind_result($role);
      if ($stmtR->fetch()) {
        $user_role = strtolower((string)$role);
      }
      $stmtR->close();
    }
  }

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

  // === AUTO-APPROVE WHEN ROLE IS MANAGER OR SUPERVISOR ===
  if (in_array($user_role, ['manager', 'supervisor'], true)) {
    // 3a) Read conformance for this request (and lock row) — mirror approval endpoint
    $conf = null;
    $sel = $mysqli->prepare("SELECT conformance FROM rcpa_request WHERE id = ? FOR UPDATE");
    $sel->bind_param('i', $rcpa_no);
    $sel->execute();
    $sel->bind_result($conf);
    if (!$sel->fetch()) {
      $sel->close();
      throw new RuntimeException('No matching rcpa_request row found during auto-approval');
    }
    $sel->close();

    // 3b) Update status to EVIDENCE CHECKING
    $newStatus = 'EVIDENCE CHECKING';
    $upd = $mysqli->prepare("
        UPDATE rcpa_request
           SET status = ?
         WHERE id = ?
         LIMIT 1
    ");
    $upd->bind_param('si', $newStatus, $rcpa_no);
    $upd->execute();
    if ($upd->affected_rows < 1) {
      $upd->close();
      throw new RuntimeException('Auto-approval update failed: no row updated');
    }
    $upd->close();
    $autoApproved = true;
$finalStatus  = $newStatus; // 'EVIDENCE CHECKING'


    // 3c) History entry mirroring rcpa-accept-approval-corrective.php
    if ($mysqli->query("SHOW TABLES LIKE 'rcpa_request_history'")->num_rows > 0) {
      $activity2 = 'The Assignee Supervisor/Manager approved the Assignee corrective action evidence approval';
      $hist = $mysqli->prepare("
        INSERT INTO rcpa_request_history (rcpa_no, name, activity)
        VALUES (?, ?, ?)
      ");
      $hist->bind_param('sss', $rcpaNoStr, $user_name, $activity2);
      $hist->execute();
      $hist->close();
    }
  }

  $mysqli->commit();
  $inTxn = false;

  echo json_encode([
  'success'      => true,
  'status'       => $finalStatus,
  'autoApproved' => $autoApproved
]);

  
} catch (Throwable $e) {
  if ($mysqli && $inTxn) {
    $mysqli->rollback();
  }
  http_response_code(500);
  echo json_encode(['success' => false, 'error' => $e->getMessage()]);
} finally {
  if ($mysqli) $mysqli->close();
}
