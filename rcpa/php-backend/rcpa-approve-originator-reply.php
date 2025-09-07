<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

try {
  require_once '../../connection.php';
  if (!isset($conn) || !($conn instanceof mysqli)) throw new Exception('MySQLi connection unavailable.');
  mysqli_set_charset($conn, 'utf8mb4');

  // Auth via cookie
  if (!isset($_COOKIE['user'])) { http_response_code(401); echo json_encode(['ok'=>false,'error'=>'Unauthorized']); exit; }
  $cookieUser = json_decode($_COOKIE['user'], true);
  if (!$cookieUser || empty($cookieUser['name'])) { http_response_code(401); echo json_encode(['ok'=>false,'error'=>'Unauthorized']); exit; }
  $currentName = preg_replace('/\s+/u', ' ', trim((string)$cookieUser['name']));

  // Input (JSON)
  $raw = file_get_contents('php://input') ?: '{}';
  $payload = json_decode($raw, true);
  $id = (int)($payload['id'] ?? 0);
  if ($id <= 0) { http_response_code(400); echo json_encode(['ok'=>false,'error'=>'Missing or invalid id']); exit; }

  // Verify record belongs to originator
  $stmt = $conn->prepare("SELECT id, status FROM rcpa_request WHERE id=? AND TRIM(originator_name)=TRIM(?)");
  $stmt->bind_param('is', $id, $currentName);
  $stmt->execute();
  $res = $stmt->get_result();
  $row = $res->fetch_assoc();
  $stmt->close();
  if (!$row) { http_response_code(404); echo json_encode(['ok'=>false,'error'=>'Record not found']); exit; }

  $newStatus = 'FOR CLOSING';

  $conn->begin_transaction();

  // Update status
  $u = $conn->prepare("UPDATE rcpa_request SET status=? WHERE id=? AND TRIM(originator_name)=TRIM(?)");
  $u->bind_param('sis', $newStatus, $id, $currentName);
  $u->execute();
  if ($u->affected_rows < 1) { $conn->rollback(); throw new Exception('Update failed.'); }
  $u->close();

  // Insert history
  $activity = 'The Originator approved the valid reply';
  $h = $conn->prepare("INSERT INTO rcpa_request_history (rcpa_no, name, activity) VALUES (?, ?, ?)");
  $rcpaNo = (string)$id;
  $h->bind_param('sss', $rcpaNo, $currentName, $activity);
  $h->execute();
  $h->close();

  $conn->commit();

  echo json_encode(['ok'=>true, 'status'=>$newStatus]);
} catch (Throwable $e) {
  if (isset($conn) && $conn instanceof mysqli) { $conn->rollback(); }
  http_response_code(400);
  echo json_encode(['ok'=>false,'error'=>$e->getMessage()]);
}
