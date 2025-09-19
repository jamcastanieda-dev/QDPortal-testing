<?php
session_start();
include 'connection.php';

$employee_name = '';
if (isset($_COOKIE['user'])) {
    $user = json_decode($_COOKIE['user'], true);
    $employee_name = $user['name'] ?? '';
}


$query = "SELECT inspection_no, wbs, description, request, status FROM inspection_request ORDER BY inspection_no ASC";
$result = $conn->query($query);

if ($result) {
    $inspections = [];
    while ($row = $result->fetch_assoc()) {
        $inspections[] = $row;
    }
    echo json_encode(['status' => 'success', 'inspections' => $inspections]);
} else {
    echo json_encode(['status' => 'error', 'message' => 'Failed to fetch data']);
}

$conn->close();