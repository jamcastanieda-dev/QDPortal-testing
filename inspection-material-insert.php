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
    $notification      = $_POST['material-notification']    ?? '';
    $part_name         = $_POST['material-part-name']       ?? '';
    $part_no           = $_POST['material-part-no']         ?? '';
    $location_of_item  = $_POST['material-location-of-item']?? '';

    // Check for empty values
    if (empty($notification) || empty($part_name) || empty($part_no) || empty($location_of_item)) {
        echo json_encode(['status' => 'error', 'message' => 'All fields are required.']);
        exit;
    }

    // Checkboxes Values
    $type_of_inspection = $_POST['inspection-material'] ?? '';
    $xrf                = $_POST['xrf']              ?? 'none';
    $hardness_test      = $_POST['hardness']         ?? 'none';
    $type_of_grinding   = $_POST['grindingOption']   ?? 'none';

    // Prepare and execute SQL query
    $stmt = $conn->prepare("INSERT INTO material_analysis
        (type_of_inspection, xrf, hardness_test, type_of_grinding, notification, part_name, part_no, location_of_item, inspection_no) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
    $stmt->bind_param(
        'ssssssssi', 
        $type_of_inspection, 
        $xrf, 
        $hardness_test, 
        $type_of_grinding, 
        $notification, 
        $part_name, 
        $part_no, 
        $location_of_item, 
        $inspection_no);

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
