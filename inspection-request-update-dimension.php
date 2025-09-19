<?php
include 'connection.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {

    if (!isset($_POST['inspection-no'])) {
        echo json_encode(['status' => 'error', 'message' => 'Session error: Inspection number not set.']);
        exit;
    }

    // Input & Textarea Values
    $notification        = trim($_POST['view-dimension-notification']);
    $part_name           = trim($_POST['view-dimension-part-name']);
    $part_no             = trim($_POST['view-dimension-part-no']);
    $location_of_item    = trim($_POST['view-dimension-location-of-item']);
    $type_of_inspection  = $_POST['view-inspection-dimension'];    // checkbox or select
    $inspection_no       = $_POST['inspection-no'];

    // Validate required fields
    if (empty($notification) || empty($part_name) || empty($part_no)) {
        echo json_encode(['status' => 'error', 'message' => 'All fields are required.']);
        exit;
    }

    // Prepare UPDATE statement
    $stmt = $conn->prepare("
        UPDATE inspection_dimensional
        SET
            type_of_inspection   = ?,
            notification         = ?,
            part_name            = ?,
            part_no              = ?,
            location_of_item     = ?
        WHERE
            inspection_no        = ?
    ");

    if ( ! $stmt) {
        echo json_encode(['status' => 'error', 'message' => 'Prepare failed: ' . $conn->error]);
        exit;
    }

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
        echo json_encode(['status' => 'success', 'message' => 'Record updated successfully.']);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Error updating data: ' . $stmt->error]);
    }

    $stmt->close();
    $conn->close();

} else {
    echo json_encode(['status' => 'error', 'message' => 'Invalid request method.']);
}
