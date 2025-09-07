<?php
session_start();
include 'connection.php';


// Query to get the department by employee name
$sql = "SELECT department FROM system_users WHERE employee_name = ?";
$stmt = $conn->prepare($sql);
$stmt->bind_param("s", $_SESSION['user']['name']);
$stmt->execute();
$result = $stmt->get_result();
$row = $result->fetch_assoc();

if ($row) {
    echo json_encode(["status" => "success", "department" => $row['department']]);
} else {
    echo json_encode(["status" => "error", "message" => "Department not found"]);
}

$stmt->close();
$conn->close();
?>
