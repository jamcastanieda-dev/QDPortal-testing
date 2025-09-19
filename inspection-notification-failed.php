<?php
include 'connection.php';

$sql = "SELECT COUNT(*) AS failed_count FROM inspection_failed_notification";
if ($result = $conn->query($sql)) {
    $row   = $result->fetch_assoc();
    $count = (int)$row['failed_count'];
    echo json_encode(['count' => $count]);
    $result->free();
} else {
    http_response_code(500);
    echo json_encode(['error' => 'Query error']);
}

$conn->close();
?>
