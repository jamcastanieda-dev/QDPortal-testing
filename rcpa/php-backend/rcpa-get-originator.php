<?php
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
date_default_timezone_set('Asia/Manila');

if (!isset($_COOKIE['user'])) {
  http_response_code(401);
  echo json_encode(['ok' => false, 'error' => 'Unauthorized']);
  exit;
}
$user = json_decode($_COOKIE['user'], true);
if (!$user || !isset($user['name'])) {
  http_response_code(401);
  echo json_encode(['ok' => false, 'error' => 'Unauthorized']);
  exit;
}

$name = $user['name'];

require_once '../../connection.php';
if (!$conn) {
  http_response_code(500);
  echo json_encode(['ok' => false, 'error' => 'DB connection failed']);
  exit;
}

mysqli_set_charset($conn, 'utf8mb4');

$department = null;
$role = null;

$sql = "SELECT department, LOWER(role) AS role
        FROM system_users
        WHERE employee_name = ?
        LIMIT 1";
if ($stmt = mysqli_prepare($conn, $sql)) {
  mysqli_stmt_bind_param($stmt, "s", $name);
  mysqli_stmt_execute($stmt);
  mysqli_stmt_bind_result($stmt, $department, $role);
  mysqli_stmt_fetch($stmt);
  mysqli_stmt_close($stmt);
}
mysqli_close($conn);

echo json_encode([
  'ok'         => true,
  'name'       => $name,
  'department' => $department ?? '',
  'role'       => $role ?? '',                 // ← add this
  'date'       => date('Y-m-d\TH:i:s'),        // ISO for <input type="datetime-local">
  'server_now' => round(microtime(true) * 1000)
]);
