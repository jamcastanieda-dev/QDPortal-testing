<?php
include 'connection.php';
header('Content-Type: application/json');

$inspection_no = $_POST['inspection-no'];
$wbs         = trim($_POST['view-wbs']  ?? '');
$description = trim($_POST['view-desc'] ?? '');


// 3) Prepare & execute INSERT
$sql  = "INSERT INTO inspection_incoming_wbs (wbs, description, inspection_no)
         VALUES (?, ?, ?)";
$stmt = $conn->prepare($sql);

$stmt->bind_param("ssi", $wbs, $description, $inspection_no);

if ($stmt->execute()) {
    echo json_encode([
        'status'   =>  'success',
        'message' => 'Record inserted successfully.'
    ]);
} else {
    echo json_encode([
        'status'   =>  'error',
        'message' => 'Record inserted failed.'
    ]);
}

$stmt->close();
$conn->close();
exit;
