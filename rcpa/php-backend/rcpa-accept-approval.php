<?php
// php-backend/rcpa-accept.php
header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../../connection.php'; // mysqli connection -> $conn

$user = json_decode($_COOKIE['user'], true);
if (!$user || !is_array($user)) {
  header('Location: ../../login.php');
  exit;
}
$current_user = $user;
$user_name = $current_user['name'];

$id = $_POST['id'] ?? null;
if ($id === null || !ctype_digit((string)$id)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Missing or invalid id']);
    exit;
}

$status = 'QMS CHECKING';

try {
    if (!isset($conn) || !($conn instanceof mysqli)) {
        throw new Exception('Database connection not available as $conn');
    }
    $conn->set_charset('utf8mb4');

    $stmt = $conn->prepare('UPDATE rcpa_request SET status = ? WHERE id = ?');
    if (!$stmt) throw new Exception('Prepare failed: ' . $conn->error);

    $stmt->bind_param('si', $status, $id);
    if (!$stmt->execute()) throw new Exception('Execute failed: ' . $stmt->error);

    if ($stmt->affected_rows < 0) {
        throw new Exception('Update failed');
    }

    $stmt->close();

    // ✅ Insert into rcpa_request_history
    $historySql = "INSERT INTO rcpa_request_history (rcpa_no, name, date_time, activity)
                   VALUES (?, ?, CURRENT_TIMESTAMP, ?)";
    $historyStmt = $conn->prepare($historySql);
    if (!$historyStmt) throw new Exception('History insert prepare failed: ' . $conn->error);

    $activityText = "RCPA has been approved";
    $historyStmt->bind_param('iss', $id, $user_name, $activityText);

    if (!$historyStmt->execute()) {
        throw new Exception('History insert execute failed: ' . $historyStmt->error);
    }

    $historyStmt->close();

    echo json_encode(['success' => true, 'id' => (int)$id, 'status' => $status]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
