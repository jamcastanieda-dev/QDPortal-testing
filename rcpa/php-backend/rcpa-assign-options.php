<?php
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
date_default_timezone_set('Asia/Manila');

if (!isset($_COOKIE['user'])) {
  http_response_code(401);
  echo json_encode(['error' => 'Not logged in']);
  exit;
}
$user = json_decode($_COOKIE['user'], true);
if (!$user || !is_array($user)) {
  http_response_code(401);
  echo json_encode(['error' => 'Invalid user cookie']);
  exit;
}
$current_user = $user;
$user_name = trim((string)($current_user['name'] ?? ''));

require '../../connection.php';
if (!isset($mysqli) || !($mysqli instanceof mysqli)) {
  if (isset($conn) && $conn instanceof mysqli)      $mysqli = $conn;
  elseif (isset($link) && $link instanceof mysqli)  $mysqli = $link;
  else                                              $mysqli = @new mysqli('localhost', 'DB_USER', 'DB_PASS', 'DB_NAME');
}
if (!$mysqli || $mysqli->connect_errno) {
  http_response_code(500);
  echo json_encode(['error' => 'Database connection not available']);
  exit;
}
$mysqli->set_charset('utf8mb4');

$dept = '';
$user_section = '';
$user_role = '';
if ($user_name !== '') {
  $sql = "SELECT department, section, role
          FROM system_users
          WHERE LOWER(TRIM(employee_name)) = LOWER(TRIM(?))
          LIMIT 1";
  if ($st = $mysqli->prepare($sql)) {
    $st->bind_param('s', $user_name);
    $st->execute();
    $st->bind_result($d, $s, $r);
    if ($st->fetch()) {
      $dept = (string)$d;
      $user_section = (string)$s;
      $user_role = (string)$r;
    }
    $st->close();
  }
}
$role_norm = strtolower(trim($user_role));
$norm = fn($x) => strtolower(trim((string)$x));

$id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
if ($id <= 0) {
  http_response_code(400);
  echo json_encode(['error' => 'Missing/invalid id']);
  exit;
}

$sqlRow = "SELECT id, assignee, section, assignee_name FROM rcpa_request WHERE id = ? LIMIT 1";
$st = $mysqli->prepare($sqlRow);
$st->bind_param('i', $id);
$st->execute();
$row = $st->get_result()->fetch_assoc();
$st->close();
if (!$row) {
  http_response_code(404);
  echo json_encode(['error' => 'RCPA not found']);
  exit;
}

$rcpa_dept = (string)($row['assignee'] ?? '');
$rcpa_sect = trim((string)($row['section'] ?? ''));
$current_assignee_name = trim((string)($row['assignee_name'] ?? ''));

/* Permission checks:
   - Only manager/supervisor can assign
   - Department must match
   - If the row has a section, it must match user's section; if row has no section, dept match is enough
*/
if ($role_norm !== 'manager' && $role_norm !== 'supervisor') {
  http_response_code(403);
  echo json_encode(['error' => 'Not allowed']);
  exit;
}
if ($norm($rcpa_dept) !== $norm($dept)) {
  http_response_code(403);
  echo json_encode(['error' => 'Not allowed (department mismatch)']);
  exit;
}
if ($rcpa_sect !== '' && $norm($rcpa_sect) !== $norm($user_section)) {
  http_response_code(403);
  echo json_encode(['error' => 'Not allowed (section mismatch)']);
  exit;
}

/* Fetch employees that match row's dept/section,
   EXCLUDING roles 'manager' and 'supervisor' from options */
if ($rcpa_sect === '') {
  $sqlUsers = "SELECT employee_name FROM system_users
               WHERE UPPER(TRIM(department)) = UPPER(TRIM(?))
                 AND (section IS NULL OR TRIM(section) = '')
                 AND (role IS NULL OR TRIM(role) = '' OR UPPER(TRIM(role)) NOT IN ('MANAGER','SUPERVISOR'))
               ORDER BY employee_name";
  $st = $mysqli->prepare($sqlUsers);
  $st->bind_param('s', $rcpa_dept);
} else {
  $sqlUsers = "SELECT employee_name FROM system_users
               WHERE UPPER(TRIM(department)) = UPPER(TRIM(?))
                 AND LOWER(TRIM(section)) = LOWER(TRIM(?))
                 AND (role IS NULL OR TRIM(role) = '' OR UPPER(TRIM(role)) NOT IN ('MANAGER','SUPERVISOR'))
               ORDER BY employee_name";
  $st = $mysqli->prepare($sqlUsers);
  $st->bind_param('ss', $rcpa_dept, $rcpa_sect);
}
$st->execute();
$res = $st->get_result();

$opts = [];
while ($u = $res->fetch_assoc()) {
  $n = trim((string)($u['employee_name'] ?? ''));
  if ($n === '') continue;
  // Exclude current assignee from options (case-insensitive)
  if ($current_assignee_name !== '' && $norm($n) === $norm($current_assignee_name)) continue;
  $opts[] = $n;
}
$st->close();

echo json_encode([
  'options' => $opts,
  'current_assignee_name' => (string)$current_assignee_name
], JSON_UNESCAPED_UNICODE);
