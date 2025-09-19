<?php
include 'connection.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {

    // Make sure we know which inspection to update
    if (!isset($_POST['inspection-no'])) {
        echo json_encode(['status' => 'error', 'message' => 'Session error: Inspection number not set.']);
        exit;
    }
    $inspection_no = $_POST['inspection-no'];

    // Gather inputs
    $notification      = $_POST['view-material-notification']      ?? '';
    $part_name         = $_POST['view-material-part-name']         ?? '';
    $part_no           = $_POST['view-material-part-no']           ?? '';
    $location_of_item  = $_POST['view-material-location-of-item']  ?? '';

    // Validation
    if (empty($notification) || empty($part_name) || empty($part_no) || empty($location_of_item)) {
        echo json_encode(['status' => 'error', 'message' => 'All fields are required.']);
        exit;
    }

    // Checkboxes (with defaults)
    $type_of_inspection = $_POST['view-inspection-material']  ?? '';
    $xrf                = $_POST['view-xrf']                  ?? 'none';
    $hardness_test      = $_POST['view-hardness']             ?? 'none';
    $type_of_grinding   = $_POST['view-grindingOption']       ?? 'none';

    // Prepare UPDATE statement
    $stmt = $conn->prepare("
        UPDATE inspection_material_analysis
        SET
            type_of_inspection  = ?,
            xrf                 = ?,
            hardness_test       = ?,
            type_of_grinding    = ?,
            notification        = ?,
            part_name           = ?,
            part_no             = ?,
            location_of_item    = ?
        WHERE
            inspection_no       = ?
    ");

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
        $inspection_no
    );

    // Execute and respond
    if ($stmt->execute()) {
        echo json_encode(['status' => 'success', 'message' => 'Material analysis updated successfully']);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Error updating data: ' . $stmt->error]);
    }

    $stmt->close();
    $conn->close();

} else {
    echo json_encode(['status' => 'error', 'message' => 'Invalid request method.']);
}
