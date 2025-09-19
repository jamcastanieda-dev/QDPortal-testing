<?php
session_start();
include 'connection.php';

$remarks = $_POST['remarks'] ?? '';
$remarks_by = '';
if (isset($_COOKIE['user'])) {
    $user = json_decode($_COOKIE['user'], true);
    $remarks_by = $user['name'] ?? '';
}

$current_time = $_POST['current-time'] ?? '';
$inspection_no = $_POST['inspection_no'] ?? '';

header('Content-Type: application/json');

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    echo json_encode([
        'success' => false,
        'message' => 'Missing parameters'
    ]);
    exit;
}

if (empty($remarks_by)) {
    echo json_encode([
        'success' => false,
        'message' => 'User not logged in or session expired'
    ]);
    exit;
}

$remarks = mysqli_real_escape_string($conn, $remarks);
$remarks_by = mysqli_real_escape_string($conn, $remarks_by);
$current_time = mysqli_real_escape_string($conn, $current_time);
$inspection_no = mysqli_real_escape_string($conn, $inspection_no);

$query = "INSERT INTO inspection_remarks (
        remarks,
        remarks_by,
        date_time,
        inspection_no
    ) VALUES (
        '$remarks',
        '$remarks_by',
        '$current_time',
        '$inspection_no'
    )
";

if (mysqli_query($conn, $query)) {
    require_once __DIR__ . '/pusher.php';

    $payload = [
        'inspection_no' => $inspection_no,
        'remarks' => $remarks,
        'remarks_by' => $remarks_by,
        'timestamp' => time()
    ];

    try {
        $pusher->trigger('inspection-channel', 'remark-added', $payload);
    } catch (\Pusher\PusherException $e) {
        error_log("Pusher error [remark-added]: " . $e->getMessage());
    }
    echo json_encode(['success' => true]);
} else {
    echo json_encode([
        'success' => false,
        'message' => mysqli_error($conn)
    ]);
}
mysqli_close($conn);
