<?php
include 'connection.php';

// Check if the inspection_no is provided via POST request
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['inspection_no'])) {
    $inspectionNo = $_POST['inspection_no'];

    // 1) Fetch the current status AND request for this inspection_no
    $sqlSelect = "SELECT status, request FROM inspection_request WHERE inspection_no = ?";
    $previousStatus = null;
    $requestType = null;
    if ($stmtSelect = $conn->prepare($sqlSelect)) {
        $stmtSelect->bind_param("i", $inspectionNo);
        $stmtSelect->execute();
        $stmtSelect->bind_result($previousStatus, $requestType);
        $stmtSelect->fetch();
        $stmtSelect->close();
    } else {
        echo json_encode([
            'success' => false,
            'message' => 'Failed to prepare SELECT statement'
        ]);
        $conn->close();
        exit;
    }

    // 2) Now update the status & approval
    $sqlUpdate = "
        UPDATE inspection_request
        SET status   = 'PENDING',
            approval = 'NONE'
        WHERE inspection_no = ?
    ";

    if ($stmtUpdate = $conn->prepare($sqlUpdate)) {
        $stmtUpdate->bind_param("i", $inspectionNo);

        if ($stmtUpdate->execute()) {
            echo json_encode([
                'success'         => true,
                'message'         => 'Status updated successfully',
                'status'          => $previousStatus,
                'request'         => $requestType   // <-- add this line!
            ]);
        } else {
            echo json_encode([
                'success'         => false,
                'message'         => 'Failed to update status',
                'status'          => $previousStatus,
                'request'         => $requestType
            ]);
        }

        $stmtUpdate->close();
    } else {
        echo json_encode([
            'success'         => false,
            'message'         => 'Failed to prepare UPDATE statement',
            'status'          => $previousStatus,
            'request'         => $requestType
        ]);
    }

    $conn->close();
    exit;
}

// If request is invalid
echo json_encode([
    'success' => false,
    'message' => 'Invalid request'
]);
