<?php
// Connect to your database (update credentials as needed)
include 'connection.php';

// REQUESTED count
$res1 = $conn->query("SELECT COUNT(*) as cnt FROM inspection_request WHERE status='REQUESTED'");
$row1 = $res1->fetch_assoc();
$requested = $row1['cnt'];

// PE CALIBRATION count
$res2 = $conn->query("SELECT COUNT(*) as cnt FROM inspection_request WHERE status='PE CALIBRATION'");
$row2 = $res2->fetch_assoc();
$pe_calibration = $row2['cnt'];

echo json_encode([
    'requested' => intval($requested),
    'pe_calibration' => intval($pe_calibration)
]);
?>
