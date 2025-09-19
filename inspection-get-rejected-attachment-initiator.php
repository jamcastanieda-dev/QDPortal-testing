<?php
include 'connection.php';

$inspection_no = $_POST['inspection_no'];

$sql = "SELECT attachment FROM inspection_rejected_attachments WHERE inspection_no = ?";
$stmt = $conn->prepare($sql);
$stmt->bind_param("s", $inspection_no);
$stmt->execute();
$result = $stmt->get_result();

$attachments = [];
while ($row = $result->fetch_assoc()) {
    $attachments[] = $row;
}

echo json_encode($attachments);
