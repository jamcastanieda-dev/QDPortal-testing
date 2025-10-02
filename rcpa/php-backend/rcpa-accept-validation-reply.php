<?php
// php-backend/rcpa-accept-validation-reply.php
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

// --- Auth (from cookie like other endpoints) ---
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

$status = 'REPLY CHECKING - ORIGINATOR';

try {
  if (!isset($conn) || !($conn instanceof mysqli)) {
    throw new Exception('Database connection not available as $conn');
  }
  @$conn->set_charset('utf8mb4');

  if (!$conn->begin_transaction()) {
    throw new Exception('Could not start transaction: ' . $conn->error);
  }

  // 1) Update main record status
  $stmt = $conn->prepare('UPDATE rcpa_request SET status = ? WHERE id = ?');
  if (!$stmt) throw new Exception('Prepare failed: ' . $conn->error);
  $stmt->bind_param('si', $status, $id);
  if (!$stmt->execute()) {
    $err = $stmt->error ?: 'Execute failed';
    $stmt->close();
    throw new Exception($err);
  }
  $affected = $stmt->affected_rows;
  $stmt->close();

  if ($affected < 1) {
    // Either not found or status already set — treat as not found to be explicit
    $conn->rollback();
    http_response_code(404);
    echo json_encode(['success' => false, 'error' => 'Record not found or unchanged']);
    exit;
  }

  // 2) History entry
  $activity = 'The valid reply by Assignee was approved by QMS';
  $historySql = 'INSERT INTO rcpa_request_history (rcpa_no, name, date_time, activity)
                 VALUES (?, ?, CURRENT_TIMESTAMP, ?)';
  $h = $conn->prepare($historySql);
  if (!$h) throw new Exception('Prepare failed (history): ' . $conn->error);
  $h->bind_param('iss', $id, $user_name, $activity);
  if (!$h->execute()) {
    $err = $h->error ?: 'Execute failed (history)';
    $h->close();
    throw new Exception($err);
  }
  $h->close();

  if (!$conn->commit()) {
    throw new Exception('Commit failed: ' . $conn->error);
  }

  echo json_encode([
    'success' => true,
    'id'      => (int)$id,
    'status'  => $status
  ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
} catch (Throwable $e) {
  if (isset($conn) && $conn instanceof mysqli) {
    $conn->rollback();
  }
  http_response_code(500);
  echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
