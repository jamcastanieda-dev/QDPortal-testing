<?php
// login-register.php
header('Content-Type: application/json');
require_once 'connection.php';
session_set_cookie_params(3 * 24 * 60 * 60);
session_start();
 
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'Invalid request method.']);
    exit;
}
 
// Grab and trim all registration fields
$employee_id = trim($_POST['employee-id']       ?? '');
$password    =        ($_POST['password']       ?? '');
$confirm     =        ($_POST['confirm-password'] ?? ''); // confirm password (Register only)
$full_name   = trim($_POST['full-name']         ?? '');
$department  = trim($_POST['department']        ?? '');
$email       = trim($_POST['email']             ?? '');
 
// NEW: Section + Role
$section_in  = trim($_POST['section']           ?? '');
$role_in     = trim($_POST['role']              ?? '');
 
// Validate required fields
if (empty($employee_id) || empty($password) || empty($full_name) || empty($department) || empty($email)) {
    echo json_encode(['success' => false, 'message' => 'Please fill in all fields.']);
    exit;
}
 
// Confirm password is required for registration and must match
if ($confirm === '') {
    echo json_encode(['success' => false, 'message' => 'Please confirm your password.']);
    exit;
}
if ($password !== $confirm) {
    echo json_encode(['success' => false, 'message' => 'Passwords do not match.']);
    exit;
}
 
// Email format
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    echo json_encode(['success' => false, 'message' => 'Please enter a valid email address.']);
    exit;
}
 
// Departments that require a Section (case-insensitive)
$section_required_depts = ['SSD','PPIC','TSD','EF','PVD','A & C','MAINTENANCE','PE'];
$dept_uc = strtoupper($department);
 
if (in_array($dept_uc, $section_required_depts, true) && $section_in === '') {
    echo json_encode(['success' => false, 'message' => 'Please select a Section for the chosen department.']);
    exit;
}
 
// Role is required in our UI; enforce it here too
if ($role_in === '') {
    echo json_encode(['success' => false, 'message' => 'Please select a Role.']);
    exit;
}
 
// Normalize role: manager/supervisor → lowercase; others → 'others'
$role_lc = strtolower($role_in);
$role    = in_array($role_lc, ['manager','supervisor'], true) ? $role_lc : 'others';
 
// 1) Ensure the employee_id or email isn’t already taken
$sql  = "SELECT employee_id FROM system_users WHERE employee_id = ? OR email = ?";
$stmt = $conn->prepare($sql);
if (!$stmt) {
    echo json_encode(['success' => false, 'message' => 'Prepare failed: ' . $conn->error]);
    exit;
}
$stmt->bind_param('ss', $employee_id, $email);
$stmt->execute();
$stmt->store_result();
if ($stmt->num_rows > 0) {
    echo json_encode(['success' => false, 'message' => 'Employee ID or Email already registered.']);
    $stmt->close();
    exit;
}
$stmt->close();
 
// 2) Insert new user
$privilege = 'Initiator';
 
// Keep section when department requires it; else store NULL using NULLIF
$section_param = in_array($dept_uc, $section_required_depts, true) ? $section_in : '';
 
$sql = "
  INSERT INTO system_users
    (employee_id, employee_name, email, employee_password, employee_privilege, department, section, role)
  VALUES
    (?,           ?,             ?,     ?,                 ?,                  ?,          NULLIF(?, ''), ?)
";
$stmt = $conn->prepare($sql);
if (!$stmt) {
    echo json_encode(['success' => false, 'message' => 'Prepare failed: ' . $conn->error]);
    exit;
}
$stmt->bind_param(
    'ssssssss',
    $employee_id,
    $full_name,
    $email,
    $password,     // NOTE: Currently plaintext to match existing login logic
    $privilege,
    $department,
    $section_param, // becomes NULL if ''
    $role
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
$stmt->close();