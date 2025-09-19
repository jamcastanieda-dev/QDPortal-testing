<?php
// inspection-get-dimensional-attachments.php

require 'connection.php'; // include your database connection

$inspection_no = $_POST['inspection_no'];

$sql = "SELECT attachment FROM inspection_material_attachments WHERE inspection_no = ?";
$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $inspection_no);
$stmt->execute();
$result = $stmt->get_result();

$attachments = [];
while ($row = $result->fetch_assoc()) {
    $attachments[] = $row;
}

echo json_encode($attachments);
?>
