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

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    // Check if critical session variable is set
    if (empty($remarks_by)) {
        echo json_encode(['success' => false, 'message' => 'User not logged in or session expired']);
        exit;
    }
    
    $remarks = mysqli_real_escape_string($conn, $remarks);
    $remarks_by = mysqli_real_escape_string($conn, $remarks_by);
    $current_time = mysqli_real_escape_string($conn, $current_time);
    $inspection_no = mysqli_real_escape_string($conn, $inspection_no);

    $query = "INSERT INTO inspection_remarks (remarks, remarks_by, date_time, inspection_no) 
              VALUES ('$remarks', '$remarks_by', '$current_time', '$inspection_no')";

    if (mysqli_query($conn, $query)) {
        echo json_encode(['success' => true]);
    } else {
        echo json_encode(['success' => false, 'message' => mysqli_error($conn)]);
    }
} else {
    echo json_encode(['success' => false, 'message' => 'Missing parameters']);
}

mysqli_close($conn);
?>
