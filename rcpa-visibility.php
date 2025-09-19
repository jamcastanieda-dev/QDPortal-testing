<?php
// rcpa-visibility.php
// Purpose: compute $can_see_rcpa_approval (Manager/Supervisor only) without redirects

// Guard: we expect $current_user['name'] to be set by the including page
if (!isset($current_user) || empty($current_user['name'])) {
    // If not available, fail closed (no approval)
    $can_see_rcpa_approval = false;
    return;
}

// Get DB handle
require_once __DIR__ . '/connection.php'; // adjust if your connection file is elsewhere

// Normalize to $mysqli
if (!isset($mysqli) || !($mysqli instanceof mysqli)) {
    if (isset($conn) && $conn instanceof mysqli) {
        $mysqli = $conn;
    } elseif (isset($link) && $link instanceof mysqli) {
        $mysqli = $link;
    } else {
        $mysqli = @new mysqli('localhost', 'DB_USER', 'DB_PASS', 'DB_NAME'); // optional fallback
    }
}
if (!$mysqli || $mysqli->connect_errno) {
    // Fail closed on DB issue
    $can_see_rcpa_approval = false;
    return;
}

// Lookup role by employee_name
$role = '';
$user_name = trim($current_user['name']);
$sql = "SELECT role FROM system_users WHERE LOWER(TRIM(employee_name)) = LOWER(TRIM(?)) LIMIT 1";
if ($stmt = $mysqli->prepare($sql)) {
    $stmt->bind_param('s', $user_name);
    $stmt->execute();
    $stmt->bind_result($db_role);
    if ($stmt->fetch()) {
        $role = (string)$db_role;
    }
    $stmt->close();
}

// Expose flag (Manager/Supervisor only)
$can_see_rcpa_approval = in_array(strtolower($role), ['manager', 'supervisor'], true);

// (Optional) expose to JS if you need it on the front end:
echo '<script>
  window.RCPA_IS_APPROVER = ' . ($can_see_rcpa_approval ? 'true' : 'false') . ';
</script>';
