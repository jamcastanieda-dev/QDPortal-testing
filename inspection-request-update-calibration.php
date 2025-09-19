<?php
session_start();
include 'connection.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {

    if (!isset($_POST['inspection-no'])) {
        echo json_encode(['status' => 'error', 'message' => 'Session error: Inspection number not set.']);
        exit;
    }

    // Input & Textarea Values
    $equipment_no        = $_POST['view-equipment-no'];
    $location_of_item    = $_POST['view-calibration-location-of-item'];
    $inspection_no       = $_POST['inspection-no'];

    // Check for empty values
    if (empty($equipment_no) || empty($location_of_item)) {
        echo json_encode(['status' => 'error', 'message' => 'All fields are required.']);
        exit;
    }

    // Prepare and execute SQL UPDATE query
    $stmt = $conn->prepare("
        UPDATE inspection_calibration
        SET equipment_no      = ?,
            location_of_item  = ?
        WHERE inspection_no   = ?
    ");

    $stmt->bind_param(
        'ssi',
        $equipment_no,
        $location_of_item,
        $inspection_no
    );

    if ($stmt->execute()) {
        echo json_encode(['status' => 'success', 'message' => 'Data updated successfully']);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Error updating data: ' . $stmt->error]);
    }

    $stmt->close();
    $conn->close();
} else {
    echo json_encode(['status' => 'error', 'message' => 'Invalid request method.']);
}
