<?php
include 'connection.php';
header('Content-Type: application/json');

// Require inspection-no
if (!isset($_POST['inspection-no'])) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'inspection-no is required.']);
    exit;
}
$inspection_no = (int)$_POST['inspection-no'];

// Inputs
$wbs         = $_POST['wbs']        ?? '';
$description = $_POST['desc']       ?? '';
$quantity    = $_POST['quantity']   ?? ''; // 👈 new

// Validation
if ($wbs === '') {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'WBS cannot be empty.']);
    exit;
}

// Optional numeric check (keep or remove as needed)
// if ($quantity !== '' && !preg_match('/^\d+(\.\d+)?$/', $quantity)) {
//     http_response_code(400);
//     echo json_encode(['status'=>'error','message'=>'Quantity must be numeric.']);
//     exit;
// }

// Insert with quantity
$sql = "INSERT INTO inspection_incoming_wbs (wbs, description, quantity, inspection_no)
        VALUES (?, ?, ?, ?)";
$stmt = $conn->prepare($sql);
if (!$stmt) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Prepare failed: '.$conn->error]);
    exit;
}

$stmt->bind_param("sssi", $wbs, $description, $quantity, $inspection_no);

if ($stmt->execute()) {
    echo json_encode(['status' => 'success', 'message' => 'Record inserted successfully.']);
} else {
    echo json_encode(['status' => 'error', 'message' => 'Insert failed: '.$stmt->error]);
}

$stmt->close();
$conn->close();
