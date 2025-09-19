<?php
include 'connection.php';

$inspection_no = $_POST['inspection_no'];

$stmt = $conn->prepare("SELECT remarks, remarks_by FROM inspection_reject WHERE inspection_no = ?");
$stmt->bind_param("s", $inspection_no);
$stmt->execute();
$result = $stmt->get_result();
if ($row = $result->fetch_assoc()) {
    echo json_encode(['status' => 'success', 'reject' => $row]);
} else {
    echo json_encode(['status' => 'failed', 'error' => 'No remarks found.']);
}
$stmt->close();
$conn->close();
?>