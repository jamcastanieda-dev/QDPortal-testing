<?php
// php-backend/rcpa-history.php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../../connection.php'; // mysqli -> $conn

// (Optional) protect like your other endpoints:
$user = json_decode($_COOKIE['user'] ?? 'null', true);
if (!$user || !is_array($user)) {
  http_response_code(401);
  echo json_encode(['ok' => false, 'error' => 'Unauthorized']);
  exit;
}

$id = $_GET['id'] ?? null;
if ($id === null || !ctype_digit((string)$id)) {
  http_response_code(400);
  echo json_encode(['ok' => false, 'error' => 'Missing or invalid id']);
  exit;
}

try {
  if (!isset($conn) || !($conn instanceof mysqli)) {
    throw new Exception('Database connection not available as $conn');
  }
  $conn->set_charset('utf8mb4');

  $sql = "SELECT id, rcpa_no, name, date_time, activity
          FROM rcpa_request_history
          WHERE rcpa_no = ?
          ORDER BY date_time DESC, id DESC";

  $stmt = $conn->prepare($sql);
  if (!$stmt) throw new Exception('Prepare failed: ' . $conn->error);

  $rcpaNo = (string)$id; // rcpa_no is VARCHAR(50)
  $stmt->bind_param('s', $rcpaNo);

  if (!$stmt->execute()) throw new Exception('Execute failed: ' . $stmt->error);

  $res = $stmt->get_result();
  $rows = [];
  while ($row = $res->fetch_assoc()) {
    $rows[] = [
      'id'        => (int)$row['id'],
      'rcpa_no'   => $row['rcpa_no'],
      'name'      => $row['name'],
      'date_time' => $row['date_time'],
      'activity'  => $row['activity'],
    ];
  }
  $stmt->close();

  echo json_encode(['ok' => true, 'rcpa_no' => $rcpaNo, 'rows' => $rows]);
} catch (Throwable $e) {
  http_response_code(500);
  echo json_encode(['ok' => false, 'error' => $e->getMessage()]);
}
