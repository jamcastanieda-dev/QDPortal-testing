<?php
include 'connection.php';

$inspection_no = $_POST['inspection_no'];
$date_time = $_POST['date_time'];

$stmt = $conn->prepare("SELECT remarks FROM inspection_remarks WHERE inspection_no = ? AND date_time = ?");
$stmt->bind_param("ss", $inspection_no, $date_time);
$stmt->execute();
$result = $stmt->get_result();
if ($row = $result->fetch_assoc()) {
    echo json_encode(['success' => true, 'remarks' => $row['remarks']]);
} else {
    echo json_encode(['success' => false, 'error' => 'No remarks found.']);
}
$stmt->close();
$conn->close();
?>