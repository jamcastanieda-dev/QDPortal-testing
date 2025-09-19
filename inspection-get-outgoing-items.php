<?php
header('Content-Type: application/json');
require 'connection.php'; // adjust to your connection file

if (!isset($_POST['inspection_no'])) {
    echo json_encode([]);
    exit;
}

$inspection_no = intval($_POST['inspection_no']);

$sql = "SELECT item, quantity 
        FROM inspection_outgoing_item 
        WHERE inspection_no = ?";
$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $inspection_no);
$stmt->execute();
$result = $stmt->get_result();

$items = [];
while ($row = $result->fetch_assoc()) {
    $items[] = $row;
}

echo json_encode($items);
?>
