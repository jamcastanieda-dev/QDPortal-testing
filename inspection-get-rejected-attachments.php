<?php
// get-rejected-attachments.php
require 'connection.php'; // Assumes this sets up $conn (MySQLi connection)

$inspectionNo = $_POST['inspection_no'] ?? null;

if (!$inspectionNo) {
    echo json_encode([
        'status' => 'error',
        'message' => 'Missing inspection number'
    ]);
    exit;
}

$sql = "SELECT attachment FROM inspection_rejected_attachments WHERE inspection_no = ?";
$stmt = mysqli_prepare($conn, $sql);

if (!$stmt) {
    echo json_encode([
        'status' => 'error',
        'message' => 'Query preparation failed'
    ]);
    exit;
}

mysqli_stmt_bind_param($stmt, 'i', $inspectionNo);
mysqli_stmt_execute($stmt);
$result = mysqli_stmt_get_result($stmt);

$attachments = [];
while ($row = mysqli_fetch_assoc($result)) {
    $attachments[] = $row;
}

echo json_encode([
    'status' => 'success',
    'attachments' => $attachments
]);

mysqli_stmt_close($stmt);
mysqli_close($conn);