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

  // Read JSON body or POST
  $raw = file_get_contents('php://input');
  $body = json_decode($raw ?: 'null', true);
  $id = (int)($body['id'] ?? $_POST['id'] ?? 0);
  if ($id <= 0) { http_response_code(400); echo json_encode(['ok'=>false,'error'=>'Missing or invalid id']); exit; }

  // Verify record belongs to this originator
  $stmt = $conn->prepare("SELECT id, status FROM rcpa_request WHERE id=? AND TRIM(originator_name)=TRIM(?)");
  if (!$stmt) throw new Exception('Prepare failed: '.$conn->error);
  $stmt->bind_param('is', $id, $currentName);
  $stmt->execute();
  $row = $stmt->get_result()->fetch_assoc();
  $stmt->close();
  if (!$row) { http_response_code(404); echo json_encode(['ok'=>false,'error'=>'Record not found']); exit; }

  $target = 'EVIDENCE APPROVAL';

  $conn->begin_transaction();

  // Update status (idempotent)
  $upd = $conn->prepare("UPDATE rcpa_request SET status=? WHERE id=?");
  if (!$upd) throw new Exception('Prepare failed: '.$conn->error);
  $upd->bind_param('si', $target, $id);
  $upd->execute();
  $upd->close();

  // History
  $activity = 'Originator approved the corrective evidence';
  $ins = $conn->prepare("INSERT INTO rcpa_request_history (rcpa_no, name, activity) VALUES (?, ?, ?)");
  if (!$ins) throw new Exception('Prepare failed: '.$conn->error);
  $rcpa_no = (string)$id;
  $ins->bind_param('sss', $rcpa_no, $currentName, $activity);
  $ins->execute();
  $ins->close();

  $conn->commit();

  echo json_encode(['ok'=>true, 'status'=>$target]);
} catch (Throwable $e) {
  if (isset($conn) && $conn instanceof mysqli) { $conn->rollback(); }
  http_response_code(400);
  echo json_encode(['ok'=>false,'error'=>$e->getMessage()]);
}
