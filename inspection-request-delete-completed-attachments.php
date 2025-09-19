<?php
include 'connection.php';

// 2) Get your parameters
$inspection_no   = $_POST['inspection-no']   ?? null;

if ($inspection_no === null) {
    exit();
}

// 3) Prepare and bind
$stmt = $conn->prepare("
    DELETE FROM inspection_completed_attachments
    WHERE inspection_no   = ?
");
$stmt->bind_param("i", $inspection_no);

// 4) Execute and check
if ($stmt->execute()) {
    echo json_encode(['status' => 'success','message' => 'File deleted.']);
} else {
    echo json_encode(['status' =>  'error', 'message' => 'Could not delete file.']);
}

$stmt->close();
$conn->close();
