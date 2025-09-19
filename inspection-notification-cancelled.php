<?php
include 'connection.php';

$sql = "SELECT COUNT(*) AS cancelled_count FROM inspection_cancelled_notification";
if ($result = $conn->query($sql)) {
    $row   = $result->fetch_assoc();
    $count = (int)$row['cancelled_count'];
    echo json_encode(['count' => $count]);
    $result->free();
} else {
    http_response_code(500);
    echo json_encode(['error' => 'Query error']);
}

$conn->close();
?>
