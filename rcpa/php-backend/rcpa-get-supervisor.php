<?php
// ../php-backend/rcpa-get-supervisor.php
header('Content-Type: text/html; charset=utf-8');

require_once '../../connection.php'; // should create $conn (mysqli)
if (!isset($conn) || !($conn instanceof mysqli)) {
  http_response_code(500);
  exit;
}

$conn->set_charset('utf8mb4');

/* --- Identify current user from cookie (same scheme as the page) --- */
$currentName = null;
if (isset($_COOKIE['user'])) {
  $cookie = json_decode($_COOKIE['user'], true);
  if (is_array($cookie) && isset($cookie['name'])) {
    $currentName = $cookie['name'];
  }
}
if (!$currentName) {
  // Not logged in / malformed cookie
  http_response_code(401);
  exit;
}

/* --- Get current user's role from DB (don’t trust cookie for role) --- */
$currentRole = null;
if ($stmt = $conn->prepare("SELECT LOWER(role) AS role FROM system_users WHERE employee_name = ? LIMIT 1")) {
  $stmt->bind_param('s', $currentName);
  if ($stmt->execute()) {
    $stmt->bind_result($roleVal);
    if ($stmt->fetch()) {
      $currentRole = $roleVal; // e.g., 'manager', 'supervisor', 'others'
    }
  }
  $stmt->close();
}

/* --- Decide which roles are allowed in the dropdown --- */
$allowedRoles = ($currentRole === 'supervisor')
  ? ['manager']                // supervisors can only pick managers
  : ['manager', 'supervisor']; // others (or unknown) can pick both

/* --- Build and run the appropriate query --- */
$forSelect = isset($_GET['format']) && $_GET['format'] === 'select';

if (count($allowedRoles) === 1) {
  $sql = "SELECT DISTINCT employee_name
          FROM system_users
          WHERE LOWER(role) = ?
          ORDER BY employee_name ASC";
  $stmt2 = $conn->prepare($sql);
  if (!$stmt2) { http_response_code(500); exit; }
  $stmt2->bind_param('s', $allowedRoles[0]);
} else {
  $sql = "SELECT DISTINCT employee_name
          FROM system_users
          WHERE LOWER(role) IN (?, ?)
          ORDER BY employee_name ASC";
  $stmt2 = $conn->prepare($sql);
  if (!$stmt2) { http_response_code(500); exit; }
  $stmt2->bind_param('ss', $allowedRoles[0], $allowedRoles[1]);
}

if (!$stmt2->execute()) {
  http_response_code(500);
  $stmt2->close();
  exit;
}

$res = $stmt2->get_result();
while ($row = $res->fetch_assoc()) {
  // ⛔ skip the current user (case/space-insensitive)
  if (strcasecmp(trim($row['employee_name']), trim($currentName)) === 0) {
    continue;
  }

  $name = htmlspecialchars($row['employee_name'], ENT_QUOTES, 'UTF-8');
  if ($forSelect) {
    echo "<option value=\"{$name}\">{$name}</option>\n";
  } else {
    echo "<option value=\"{$name}\"></option>\n";
  }
}
$stmt2->close();

