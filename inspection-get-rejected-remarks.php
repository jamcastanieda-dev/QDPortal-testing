<?php
include 'connection.php'; // your DB connection file

$inspection_no = $_POST['inspection_no'];

$sql = "SELECT * FROM inspection_reject WHERE inspection_no = ?";
$stmt = $conn->prepare($sql);
$stmt->bind_param("s", $inspection_no);
$stmt->execute();
$result = $stmt->get_result();

if ($row = $result->fetch_assoc()) {
    echo json_encode(['remarks' => $row['remarks']]);
} else {
    echo json_encode(['remarks' => null]);
}
