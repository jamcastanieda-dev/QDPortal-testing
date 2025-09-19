<?php
include 'connection.php';

$inspection_no = $_POST['inspection_no'] ?? null;

if (!$inspection_no) {
    echo json_encode(['status' => 'failed', 'message' => 'No inspection_no provided']);
    exit;
}

$stmt = $conn->prepare("DELETE FROM inspection_failed_notification WHERE inspection_no = ?");
$stmt->bind_param("i", $inspection_no);
if ($stmt->execute()) {
    echo json_encode(['status' => 'success']);
} else {
    echo json_encode(['status' => 'failed', 'message' => 'Deletion failed']);
}
$stmt->close();
$conn->close();
?>
