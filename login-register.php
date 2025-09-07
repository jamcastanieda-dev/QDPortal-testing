<?php
header('Content-Type: application/json');
require_once 'connection.php';
session_set_cookie_params(3 * 24 * 60 * 60);
session_start();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'Invalid request method.']);
    exit;
}

// Grab and trim all registration fields
$employee_id = trim($_POST['employee-id'] ?? '');
$password    =            $_POST['password']    ?? '';
$full_name   = trim($_POST['full-name']    ?? '');
$department  = trim($_POST['department']    ?? '');

// Validate
if (empty($employee_id) || empty($password) || empty($full_name) || empty($department)) {
    echo json_encode(['success' => false, 'message' => 'Please fill in all fields.']);
    exit;
}

// 1) Ensure the employee_id isn’t already taken
$sql  = "SELECT employee_id FROM system_users WHERE employee_id = ?";
$stmt = $conn->prepare($sql);
$stmt->bind_param('s', $employee_id);
$stmt->execute();
$stmt->store_result();
if ($stmt->num_rows > 0) {
    echo json_encode(['success' => false, 'message' => 'Employee ID already registered.']);
    exit;
}

// 2) Insert new user (plain‐text password, privilege = Initiator)
$privilege = 'Initiator';
$sql        = "
  INSERT INTO system_users
    (employee_id, employee_name, employee_password, employee_privilege, department)
  VALUES
    (?,           ?,             ?,                 ?,                  ?)
";
$stmt = $conn->prepare($sql);
$stmt->bind_param(
    'sssss',
    $employee_id,
    $full_name,
    $password,
    $privilege,
    $department
);

if ($stmt->execute()) {
    echo json_encode([
      'success'  => true,
      'message'  => 'Registration successful! Please log in.',
      'redirect' => 'login.php'
    ]);
} else {
    echo json_encode([
      'success' => false,
      'message' => 'Registration failed: ' . $stmt->error
    ]);
}
