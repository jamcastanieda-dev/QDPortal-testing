<?php
include 'connection.php';

// Validate request method
if ($_SERVER['REQUEST_METHOD'] === 'POST') {

    // Cookie Variable
    $employee_name = '';
    if (isset($_COOKIE['user'])) {
        $user = json_decode($_COOKIE['user'], true);
        $employee_name = $user['name'] ?? '';
    }

    // Get form data safely
    $wbs         = $_POST['wbs']         ?? 'N/A';
    $description = $_POST['description'] ?? '';
    $request     = $_POST['request']     ?? '';
    $remarks     = $_POST['remarks']     ?? '';
    $requestor   = $_POST['requestor']   ?? '';
    $date_time   = $_POST['current-time']?? '';
    $status      = 'REQUESTED';

    // Validation
    if ($request != 'Calibration') {
        if (empty($wbs) || empty($description) || empty($request) || empty($remarks)) {
            echo json_encode(['status' => 'error', 'message' => 'All fields are required.']);
            exit();
        }
    }

    // Prepare SQL Statement
    $stmt = $conn->prepare("INSERT INTO inspection_request
        (wbs, description, request, status, remarks, requestor, date_time) 
        VALUES (?, ?, ?, ?, ?, ?, ?)");

    // Bind Data to SQL
    $stmt->bind_param(
        'sssssss', 
        $wbs, 
        $description, 
        $request, 
        $status, 
        $remarks, 
        $requestor, 
        $date_time);

    if (mysqli_stmt_execute($stmt)) {
        // Get the last inserted ID (inspection_no)
        $inspection_no = mysqli_insert_id($conn);

        // Return success response with data
        echo json_encode([
            'status' => 'success',
            'message' => 'Inspection request submitted successfully!',
            'data' => [
                'inspection_no' => $inspection_no,
                'wbs'           => $wbs,
                'description'   => $description,
                'request'       => $request,
                'status'        => $status,
                'remarks'       => $remarks,
                'requestor'     => $requestor,
                'date_time'     => $date_time
            ]
        ]);
    } else {
        // Return detailed error message
        echo json_encode(['status' => 'error', 'message' => 'Database error: ' . $stmt->error]);
    }

    $stmt->close();
    $conn->close();
} else {
    echo json_encode(['status' => 'error', 'message' => 'Invalid request method.']);
}
