<?php
session_start();
// Database connection
include 'connection.php'; 

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $inspection_no = $_POST['inspection_no'];

    if (empty($inspection_no)) {
        echo json_encode(['status' => 'error', 'message' => 'Inspection number is required']);
        exit();
    }

    $stmt = $conn->prepare("SELECT failed_attachments, document_no, failed_by FROM inspection_failed_attachments WHERE inspection_no = ?");
    $stmt->bind_param("s", $inspection_no);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows > 0) {
        $files = [];
        while ($row = $result->fetch_assoc()) {
            $files[] = $row['failed_attachments'];
            $document_no = $row['document_no'];
            $failed_by = $row['failed_by'];
        }
        echo json_encode(['status' => 'success', 'files' => $files, 'document_no' => $document_no, 'failed_by' => $failed_by]);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'No attachments found for this Inspection number']);
    }

    $stmt->close();
    $conn->close();
}
?>
