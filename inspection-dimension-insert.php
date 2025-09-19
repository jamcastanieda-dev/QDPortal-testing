<?php
include 'connection.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {

    // Get inspection_no from POST, not session!
    $inspection_no = $_POST['inspection_no'] ?? '';

    if (empty($inspection_no)) {
        echo json_encode(['status' => 'error', 'message' => 'Inspection number not set.']);
        exit;
    }

    // Input & Textarea Values
    $notification      = $_POST['dimension-notification']      ?? '';
    $part_name         = $_POST['dimension-part-name']         ?? '';
    $part_no           = $_POST['dimension-part-no']           ?? '';
    $location_of_item  = $_POST['dimension-location-of-item']  ?? '';

    // Check for empty values
    if (empty($notification) || empty($part_name) || empty($part_no)) {
        echo json_encode(['status' => 'error', 'message' => 'All fields are required.']);
        exit;
    }

    // Checkboxes Values
    $type_of_inspection = $_POST['inspection-dimension'] ?? '';

    // Prepare and execute SQL query
    $stmt = $conn->prepare("INSERT INTO dimensional_inspection 
        (type_of_inspection, notification, part_name, part_no, location_of_item, inspection_no) 
        VALUES (?, ?, ?, ?, ?, ?)");

    $stmt->bind_param(
        'sssssi',
        $type_of_inspection,
        $notification,
        $part_name,
        $part_no,
        $location_of_item,
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
