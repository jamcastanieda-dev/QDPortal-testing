<?php
include 'connection.php';

// Check if the inspection_no is provided via POST request
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['inspection-no'])) {
    $inspectionNo = $_POST['inspection-no'];

    // Prepare the SQL query to update the status to 'PENDING'
    $sql = "UPDATE inspection_request SET approval = 'FOR FAILURE' WHERE inspection_no = ?";

    // Prepare and bind the statement
    if ($stmt = $conn->prepare($sql)) {
        $stmt->bind_param("i", $inspectionNo);  // 'i' means integer type for inspection_no

        // Execute the query
        if ($stmt->execute()) {
            echo json_encode(['success' => true, 'message' => 'Status updated successfully']);
        } else {
            echo json_encode(['success' => false, 'message' => 'Failed to update status']);
        }

        $stmt->close();
    } else {
        echo json_encode(['success' => false, 'message' => 'Failed to prepare SQL statement']);
    }

    $conn->close();
} else {
    echo json_encode(['success' => false, 'message' => 'Invalid request']);
}
