<?php
include 'connection.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {

    if (!isset($_POST['inspection-no'])) {
        echo json_encode(['status' => 'error', 'message' => 'Session error: Inspection number not set.']);
        exit;
    }

    // Input & Textarea Values (sanitized)
    $quantity          = trim($_POST['view-quantity'] ?? '');
    $scope             = trim($_POST['view-scope'] ?? '');
    $location_of_item  = trim($_POST['view-location-of-item'] ?? '');
    $inspection_no     = $_POST['inspection-no'];

    // Validate required fields
    if (empty($quantity) || empty($scope) || empty($location_of_item)) {
        echo json_encode(['status' => 'error', 'message' => 'All fields are required.']);
        exit;
    }

    // Checkbox / Select Values
    $type_of_inspection = $_POST['view-inspection']       ?? 'none';
    $final_inspection   = $_POST['view-coverage']         ?? 'none';
    $testing            = (isset($_POST['view-testing']) && $_POST['view-testing']==='testing')
                          ? 'testing' : 'none';
    $type_of_testing    = $_POST['view-type-of-testing']  ?? 'none';

    // Prepare UPDATE statement
    $stmt = $conn->prepare("
        UPDATE inspection_final_sub
        SET
            type_of_inspection = ?,
            final_inspection   = ?,
            quantity           = ?,
            testing            = ?,
            type_of_testing    = ?,
            scope              = ?,
            location_of_item   = ?
        WHERE
            inspection_no      = ?
    ");

    if (! $stmt) {
        echo json_encode(['status' => 'error', 'message' => 'Prepare failed: ' . $conn->error]);
        exit;
    }

    $stmt->bind_param(
        'sssssssi',
        $type_of_inspection,
        $final_inspection,
        $quantity,
        $testing,
        $type_of_testing,
        $scope,
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
