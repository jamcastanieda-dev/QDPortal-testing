<?php
include 'connection.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {

    if (empty($_POST['inspection-no'])) {
        echo json_encode(['status' => 'error', 'message' => 'Session error: Inspection number not set.']);
        exit;
    }

    $inspection_no                  = $_POST['inspection-no'];

    // Trim & fetch POST values
    $quantity                       = trim($_POST['view-detail-quantity']           ?? '');
    $scope                          = trim($_POST['view-detail-scope']              ?? '');
    $inspection_type                = trim($_POST['view-inspection-type']           ?? '');
    $location_of_item               = trim($_POST['view-incoming-location-of-item'] ?? '');
    $type_of_incoming_inspection    = $_POST['view-incoming-options']               ?? 'none';
    $vendor                         = trim($_POST['view-vendor']                    ?? 'none');
    $po                             = trim($_POST['view-po']                        ?? 'none');
    $dr                             = trim($_POST['view-dr']                        ?? 'none');

    // Validate required fields
    if (empty($quantity) || empty($scope) || empty($inspection_type) || empty($location_of_item)) {
        echo json_encode(['status' => 'error', 'message' => 'All required fields are missing.']);
        exit;
    }

    // Prepare UPDATE statement
    $stmt = $conn->prepare("
        UPDATE inspection_incoming_outgoing
        SET
            type_of_inspection            = ?,
            type_of_incoming_inspection   = ?,
            quantity                      = ?,
            scope                         = ?,
            vendor                        = ?,
            po_no                         = ?,
            dr_no                         = ?,
            location_of_item              = ?
        WHERE
            inspection_no                 = ?
    ");

    if (! $stmt) {
        echo json_encode(['status' => 'error', 'message' => 'Prepare failed: ' . $conn->error]);
        exit;
    }

    // Bind parameters (8 strings + 1 integer)
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

    // Execute and handle result
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
