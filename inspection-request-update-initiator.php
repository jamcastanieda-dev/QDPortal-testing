<?php
include 'connection.php';

// Validate request method
if ($_SERVER['REQUEST_METHOD'] === 'POST') {

    // Ensure we know which request to update
    if (!isset($_POST['inspection-no'])) {
        echo json_encode(['status' => 'error', 'message' => 'Session error: Inspection number not set.']);
        exit;
    }
    $inspection_no = $_POST['inspection-no'];

    // Session Variable
    $employee_name = '';
    if (isset($_COOKIE['user'])) {
        $user = json_decode($_COOKIE['user'], true);
        $employee_name = $user['name'] ?? '';
    }


    // Determine incoming vs other form fields
    if (isset($_POST['view-inspection-type']) && $_POST['view-inspection-type'] === 'incoming') {
        $wbs         = $_POST['view-wbs-1'] ?? '';
        $description = $_POST['view-desc-1'] ?? '';
    } else {
        $wbs         = $_POST['view-wbs'] ?? 'N/A';
        $description = $_POST['view-description'] ?? '';
    }

    $company    = $_POST['view-company']    ?? '';
    $request    = $_POST['view-request']    ?? '';
    $remarks    = $_POST['view-remarks']    ?? '';
    $requestor  = $_POST['view-requestor']  ?? '';
    $date_time  = $_POST['current-time'] ?? '';
    $status     = 'REQUESTED';
    $approval   = 'NONE';

    // Validation (skip WBS/description check if Calibration request)
    if ($request !== 'Calibration') {
        if (empty($wbs) || empty($description) || empty($request) || empty($remarks)) {
            echo json_encode(['status' => 'error', 'message' => 'All fields are required.']);
            exit();
        }
    }

    // Prepare UPDATE statement
    $stmt = $conn->prepare("
        UPDATE inspection_request
        SET
            company     = ?,
            wbs         = ?,
            description = ?,
            request     = ?,
            status      = ?,
            remarks     = ?,
            requestor   = ?,
            date_time   = ?,
            approval    = ?
        WHERE
            inspection_no = ?
    ");

    $stmt->bind_param(
        'sssssssssi',
        $company,
        $wbs,
        $description,
        $request,
        $status,
        $remarks,
        $requestor,
        $date_time,
        $approval,
        $inspection_no
    );

    if ($stmt->execute()) {
        echo json_encode([
            'status'  => 'success',
            'message' => 'Inspection request updated successfully!',
            'data'    => [
                'inspection_no' => $inspection_no,
                'company'       => $company,
                'wbs'           => $wbs,
                'description'   => $description,
                'request'       => $request,
                'status'        => $status,
                'remarks'       => $remarks,
                'requestor'     => $requestor,
                'date_time'     => $date_time,
                'approval'      => $approval
            ]
        ]);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Database error: ' . $stmt->error]);
    }

    $stmt->close();
    $conn->close();
} else {
    echo json_encode(['status' => 'error', 'message' => 'Invalid request method.']);
}
