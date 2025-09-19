<?php
include 'connection.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {

    $inspection_no = $_POST['inspection_no'] ?? '';

    if (empty($inspection_no)) {
        echo json_encode(['status' => 'error', 'message' => 'Inspection number not set.']);
        exit;
    }

    // For Incoming & Outgoing Inspection
    $quantity          = $_POST['detail-quantity']          ?? '';
    $scope             = $_POST['detail-scope']             ?? '';
    $inspection_type   = $_POST['inspection-type']          ?? '';
    $location_of_item  = $_POST['incoming-location-of-item']?? '';

    // For Incoming Inspection Only
    $type_of_incoming_inspection = $_POST['incoming-options'] ?? 'none';
    $vendor   = $_POST['vendor'] ?? 'none';
    $po       = $_POST['po']     ?? 'none';
    $dr       = $_POST['dr']     ?? 'none';

    // Validation
    if (empty($quantity) || empty($scope) || empty($inspection_type) || empty($location_of_item)) {
        echo json_encode(['status' => 'error', 'message' => 'All required fields are missing.']);
        exit;
    }

    // Prepare SQL Statement
    $stmt = $conn->prepare("INSERT INTO incoming_outgoing_inspection
    (type_of_inspection, type_of_incoming_inspection, quantity, scope, vendor, po_no, dr_no, location_of_item, inspection_no)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");

    // Bind Data to SQL
    $stmt->bind_param(
        'ssssssssi', 
        $inspection_type, 
        $type_of_incoming_inspection, 
        $quantity, 
        $scope, 
        $vendor, 
        $po, 
        $dr, 
        $location_of_item, 
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
