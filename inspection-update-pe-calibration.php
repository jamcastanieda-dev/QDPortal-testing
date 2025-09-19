<?php
require 'connection.php'; // adjust as needed

date_default_timezone_set('Asia/Manila');

$inspection_no = $_POST['inspection_no'];
// $username = $_POST['username']; // Get current user if available
$username = '';
if (isset($_COOKIE['user'])) {
    $user = json_decode($_COOKIE['user'], true);
    $username = $user['name'] ?? '';
}


if (!$inspection_no) {
    echo json_encode(['status' => 'error', 'message' => 'Invalid inspection number']);
    exit;
}

// Update status
$update = $conn->prepare("UPDATE inspection_request SET status = 'PE CALIBRATION' WHERE inspection_no = ?");
$update->bind_param('i', $inspection_no);
if ($update->execute()) {
    // Insert history into both tables
    $activity = "The item has been endorsed to PE-calibration";
    $datetime = date("d-m-Y | h:i A");

    // Insert into inspection_history
    $insert1 = $conn->prepare("INSERT INTO inspection_history (inspection_no, name, date_time, activity) VALUES (?, ?, ?, ?)");
    $insert1->bind_param('isss', $inspection_no, $username, $datetime, $activity);
    $insert1->execute();

    // Insert into inspection_history_qa
    $insert2 = $conn->prepare("INSERT INTO inspection_history_qa (inspection_no, name, date_time, activity) VALUES (?, ?, ?, ?)");
    $insert2->bind_param('isss', $inspection_no, $username, $datetime, $activity);
    $insert2->execute();

    echo json_encode(['status' => 'success']);
} else {
    echo json_encode(['status' => 'error', 'message' => 'Update failed']);
}
?>
