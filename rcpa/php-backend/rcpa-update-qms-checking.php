<?php
// php-backend/rcpa-update-qms-checking.php
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
date_default_timezone_set('Asia/Manila');

/* ---------------------------
   Auth: get $current_user
--------------------------- */
if (!isset($_COOKIE['user'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Not logged in']);
    exit;
}
$user = json_decode($_COOKIE['user'], true);
if (!$user || !is_array($user)) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Invalid user cookie']);
    exit;
}
$current_user = $user;

/* ---------------------------
   Inputs
--------------------------- */
$id = (int)($_POST['id'] ?? 0);
$remarks = isset($_POST['remarks']) ? trim((string)$_POST['remarks']) : '';
$system_applicable_std_violated = isset($_POST['system_applicable_std_violated']) ? trim((string)$_POST['system_applicable_std_violated']) : '';
$standard_clause_number = isset($_POST['standard_clause_number']) ? trim((string)$_POST['standard_clause_number']) : '';

if ($id <= 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Missing or invalid id']);
    exit;
}

/* Match schema: remarks is VARCHAR(255).
   If you need more, change column type to TEXT. */
if (mb_strlen($remarks) > 255) {
    $remarks = mb_substr($remarks, 0, 255);
}

/* ---------------------------
   DB connection
--------------------------- */
require '../../connection.php'; // must define $mysqli, $conn, or $link

if (!isset($mysqli) || !($mysqli instanceof mysqli)) {
    if (isset($conn) && $conn instanceof mysqli)      $mysqli = $conn;
    elseif (isset($link) && $link instanceof mysqli)  $mysqli = $link;
    else                                              $mysqli = @new mysqli('localhost', 'DB_USER', 'DB_PASS', 'DB_NAME');
}
if (!$mysqli || $mysqli->connect_errno) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database connection not available']);
    exit;
}
$mysqli->set_charset('utf8mb4');

/* ---------------------------
   Update
--------------------------- */
$sql = "UPDATE rcpa_request
        SET remarks = ?, system_applicable_std_violated = ?, standard_clause_number = ?
        WHERE id = ?
        LIMIT 1";

if (!($stmt = $mysqli->prepare($sql))) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Failed to prepare update']);
    exit;
}

$stmt->bind_param('sssi', $remarks, $system_applicable_std_violated, $standard_clause_number, $id);
$ok = $stmt->execute();
if (!$ok) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Failed to execute update']);
    $stmt->close();
    exit;
}
$affected = $stmt->affected_rows;
$stmt->close();

/* Even if nothing changed (affected_rows===0), consider it success */
echo json_encode([
    'success' => true,
    'id' => $id,
    'updated' => (int)$affected,
    'remarks' => $remarks,
    'system_applicable_std_violated' => $system_applicable_std_violated,
    'standard_clause_number' => $standard_clause_number,
]);
