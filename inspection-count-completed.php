<?php
header('Content-Type: application/json; charset=utf-8');
ini_set('display_errors', 0);
error_reporting(E_ALL & ~E_NOTICE & ~E_WARNING);
include 'connection.php';

// — 3) Execute the COUNT query
$sql = "
    SELECT COUNT(*) AS requested_count
    FROM inspection_request
    WHERE status = 'COMPLETED' AND approval = 'COMPLETION APPROVED' OR status = 'PASSED' AND approval = 'COMPLETION APPROVED'
";
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
