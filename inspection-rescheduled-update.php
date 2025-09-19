<?php
include 'connection.php';

$rescheduled_by = '';
if (isset($_COOKIE['user'])) {
    $user = json_decode($_COOKIE['user'], true);
    $rescheduled_by = $user['name'] ?? '';
}

$date_time = $_POST['date_time'] ?? '';
$inspection_no = $_POST['inspection_no'] ?? '';

// Validation
if (empty($rescheduled_by) || empty($date_time) || empty($inspection_no)) {
    echo json_encode(["success" => false, "error" => "Missing required fields"]);
    exit;
}

// Insert into inspection_reschedule
$stmt = $conn->prepare("INSERT INTO inspection_reschedule (rescheduled_by, date_time, inspection_no) VALUES (?, ?, ?)");
$stmt->bind_param("sss", $rescheduled_by, $date_time, $inspection_no);

if ($stmt->execute()) {
    // Now update inspection_request status
    $updateStmt = $conn->prepare("UPDATE inspection_request SET status = 'RESCHEDULED' WHERE inspection_no = ?");
    $updateStmt->bind_param("s", $inspection_no);

    if ($updateStmt->execute()) {
        echo json_encode(["success" => true, "message" => "Rescheduled and status updated successfully."]);
    } else {
        echo json_encode(["success" => false, "error" => "Insert succeeded, but failed to update status: " . $updateStmt->error]);
    }

    $updateStmt->close();
} else {
    echo json_encode(["success" => false, "error" => "Insert failed: " . $stmt->error]);
}

$stmt->close();
$conn->close();
