<?php
session_start();
include 'connection.php';
header('Content-Type: application/json; charset=utf-8');

$inspection_no = $_POST['inspection_no'] ?? null;
if ($inspection_no === null) {
    http_response_code(400);
    echo json_encode([
        'status'  => 'error',
        'message' => 'Missing inspection_no'
    ]);
    exit;
}

$stmt = $conn->prepare(
    "SELECT 
         wbs, 
         description, 
         quantity,        -- 👈 add this
         status,
         pwf_pass,
         pwf_fail,
         passed_qty,
         failed_qty
       FROM inspection_incoming_wbs 
      WHERE inspection_no = ?"
);
$stmt->bind_param("i", $inspection_no);
$stmt->execute();

// Fetch all rows
$result = $stmt->get_result();
$rows = [];
while ($row = $result->fetch_assoc()) {
    // ensure integer casting
    $row['pwf_pass'] = (int)$row['pwf_pass'];
    $row['pwf_fail'] = (int)$row['pwf_fail'];
    $row['passed_qty'] = (int)$row['passed_qty'];
    $row['failed_qty'] = (int)$row['failed_qty'];
    $rows[] = $row;
}

// Return JSON
echo json_encode([
    'status'   => 'success',
    'incoming' => $rows
]);

$stmt->close();
$conn->close();
