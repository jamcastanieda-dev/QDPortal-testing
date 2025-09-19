<?php
require 'connection.php'; // <-- Use your DB connection

header('Content-Type: application/json');

if (!isset($_POST['inspection_no'])) {
    echo json_encode([]);
    exit;
}

$inspection_no = $_POST['inspection_no'];

// Get the status from the inspection_request table
$statusSql = "SELECT status FROM inspection_request WHERE inspection_no = ?";
$stmt = $conn->prepare($statusSql);
$stmt->bind_param("i", $inspection_no);
$stmt->execute();
$statusResult = $stmt->get_result();

if ($statusResult && $statusResult->num_rows > 0) {
    $row = $statusResult->fetch_assoc();
    $status = strtoupper($row['status']);

    // Check for both PASSED and FAILED in status (case-insensitive)
    if (strpos($status, 'PASSED') !== false && strpos($status, 'FAILED') !== false) {
        // Get all needed fields
        $attSql = "SELECT completed_attachments, document_no, completed_by, acknowledged_by FROM inspection_completed_attachments WHERE inspection_no = ?";
        $stmt2 = $conn->prepare($attSql);
        $stmt2->bind_param("i", $inspection_no);
        $stmt2->execute();
        $attResult = $stmt2->get_result();

        $attachments = [];
        while ($attRow = $attResult->fetch_assoc()) {
            $attachments[] = $attRow;
        }
        echo json_encode($attachments);
        exit;
    }
}

// If not found or status does not match, return empty
echo json_encode([]);
exit;
?>
