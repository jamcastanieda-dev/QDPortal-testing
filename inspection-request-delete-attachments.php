<?php
include 'connection.php';

// 2) Get your parameters
$inspection_no   = $_POST['inspection-no']   ?? null;
$inspection_file = $_POST['file-name'] ?? null;

if ($inspection_no === null || $inspection_file === null) {
    exit();
}

// 3) Prepare and bind
$stmt = $conn->prepare("
    DELETE FROM inspection_attachments
    WHERE inspection_no   = ?
      AND inspection_file = ?
");
$stmt->bind_param("is", $inspection_no, $inspection_file);

// 4) Execute and check
if ($stmt->execute()) {
    echo json_encode(['status' => 'success','message' => 'File deleted.']);
} else {
    echo json_encode(['status' =>  'error', 'message' => 'Could not delete file.']);
}

$stmt->close();
$conn->close();
