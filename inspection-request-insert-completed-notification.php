<?php
session_start();
include 'connection.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {

    if (!isset($_POST['inspection-no']) || empty($_POST['inspection-no'])) {
        echo json_encode(['status' => 'error', 'message' => 'Session error: Inspection number not set.']);
        exit;
    }

    $inspection_no = $_POST['inspection-no'];

    // Prepare SQL Statement
    $stmt = $conn->prepare("INSERT INTO inspection_completed_notification
    (inspection_no)
    VALUES (?)");

    // Bind Data to SQL
    $stmt->bind_param(
        'i',
        $inspection_no
    );

    // Execute and Provide Feedback
    if ($stmt->execute()) {
        echo json_encode(['status' => 'success', 'message' => 'Data inserted successfully']);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Error inserting data: ' . $stmt->error]);
    }

    // Clean up
    $stmt->close();
    $conn->close();
} else {
    echo json_encode(['status' => 'error', 'message' => 'Invalid request method.']);
}
