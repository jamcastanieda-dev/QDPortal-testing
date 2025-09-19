<?php
include 'connection.php';

// Count all rows in inspection_rejected_notification
$sql = "SELECT COUNT(*) AS requested_count FROM inspection_rejected_notification";
if ($result = $conn->query($sql)) {
    $row   = $result->fetch_assoc();
    $count = (int)$row['requested_count'];
    echo json_encode(['count' => $count]);
    $result->free();
} else {
    http_response_code(500);
    echo json_encode(['error' => 'Query error']);
}

$conn->close();
?>
