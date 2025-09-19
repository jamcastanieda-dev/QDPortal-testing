<?php
include 'connection.php';

$inspectionNo = isset($_POST['inspection-no'])
    ? trim($_POST['inspection-no'])
    : null;

if (empty($inspectionNo)) {
    http_response_code(400);
    echo json_encode(['error' => 'Inspection no is required.']);
    exit;
}

// 3) Prepare the DELETE statement
$stmt = $conn->prepare(
    "DELETE 
       FROM inspection_completed_notification 
      WHERE inspection_no = ?"
);
if (! $stmt) {
    http_response_code(500);
    echo json_encode(['error' => 'Prepare failed: ' . $conn->error]);
    exit;
}

// 4) Bind & execute
$stmt->bind_param('s', $inspectionNo);
$stmt->execute();

// 5) Check affected rows
if ($stmt->affected_rows > 0) {
    // Successfully deleted
    echo json_encode(['status' => 'success', 'notification' => 'Inspection request has been viewed.']);
} else {
    // No such inspection_no existed
    echo json_encode(['status' => 'error', 'notification' => 'Inspection request already been viewed.']);
}

// 6) Clean up
$stmt->close();
$conn->close();
