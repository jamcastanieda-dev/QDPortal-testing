<?php
include 'connection.php';

// — 3) Execute the COUNT query
$sql = "
    SELECT COUNT(*) AS requested_count
    FROM inspection_request
    WHERE approval = 'FOR COMPLETION' OR approval = 'FOR RESCHEDULE' OR approval = 'FOR FAILURE'
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
