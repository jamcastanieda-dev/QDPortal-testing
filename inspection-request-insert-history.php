<?php
session_start();
include 'connection.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {

    $inspection_no =  $_POST['inspection-no'];
    $name = '';
    if (isset($_COOKIE['user'])) {
        $user = json_decode($_COOKIE['user'], true);
        $name = $user['name'] ?? '';
    }

    $date_time = $_POST['current-time'];
    $activity = $_POST['activity'];

    // Prepare and execute SQL query
    $stmt = $conn->prepare("INSERT INTO inspection_history
    (name, date_time, activity, inspection_no) 
    VALUES (?, ?, ?, ?)");

    $stmt->bind_param(
        'sssi',
        $name,
        $date_time,
        $activity,
        $inspection_no
    );

    if ($stmt->execute()) {
        echo json_encode(['status' => 'success', 'message' => 'Data inserted successfully']);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Error inserting data: ' . $stmt->error]);
    }

    $stmt->close();
    $conn->close();
} else {
    echo json_encode(['status' => 'error', 'message' => 'Invalid request method.']);
}
