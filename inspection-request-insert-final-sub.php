<?php
session_start();
include 'connection.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {

    if (!isset($_POST['inspection-no'])) {
        echo json_encode(['status' => 'error', 'message' => 'Session error: Inspection number not set.']);
        exit;
    }

    // Input & Textarea Values
    $quantity = $_POST['quantity'] ?? '';
    $scope = $_POST['scope'] ?? '';
    $location_of_item = $_POST['location-of-item'] ?? '';
    $inspection_no =  $_POST['inspection-no'];

    // Check for empty values
    if (empty($quantity) || empty($scope) || empty($location_of_item)) {
        echo json_encode(['status' => 'error', 'message' => 'All fields are required.']);
        exit;
    }

    // Checkboxes Values
    $type_of_inspection = $_POST['inspection'] ?? 'none';
    $final_inspection = $_POST['coverage'] ?? 'none';
    $testing = isset($_POST['testing']) && $_POST['testing'] === 'testing' ? 'testing' : 'none';
    $type_of_testing = $_POST['type-of-testing'] ?? 'none';

    // Prepare and execute SQL query
    $stmt = $conn->prepare("INSERT INTO inspection_final_sub
    (type_of_inspection, final_inspection, quantity, testing, type_of_testing, scope, location_of_item, inspection_no) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)");

    $stmt->bind_param('sssssssi', 
    $type_of_inspection, $final_inspection, $quantity, $testing, $type_of_testing, $scope, 
    $location_of_item, $inspection_no);

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
