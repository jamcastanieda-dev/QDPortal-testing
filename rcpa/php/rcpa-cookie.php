<?php
// --- COOKIE-ONLY LOGIN: No session needed ---
// rcpa-cookie.php

// Prevent caching
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Cache-Control: post-check=0, pre-check=0', false);
header('Pragma: no-cache');
header('Expires: Thu, 01 Jan 1970 00:00:00 GMT');

// 1) Check if user is logged in and set $current_user FIRST
if (!isset($_COOKIE['user'])) {
    header('Location: ../../login.php');
    exit;
}
$user = json_decode($_COOKIE['user'], true);
if (!$user || !is_array($user)) {
    header('Location: ../../login.php');
    exit;
}
$current_user = $user; // <- now safe to use

// 2) Get a mysqli handle from your connection file
require '../../connection.php'; // this should define a mysqli connection

// Normalize to $mysqli whatever your connection file uses
if (!isset($mysqli) || !($mysqli instanceof mysqli)) {
    if (isset($conn) && $conn instanceof mysqli) {
        $mysqli = $conn;
    } elseif (isset($link) && $link instanceof mysqli) {
        $mysqli = $link;
    } else {
        // Optional fallback (replace with your real creds or remove this block)
        $mysqli = @new mysqli('localhost', 'DB_USER', 'DB_PASS', 'DB_NAME');
    }
}

// Final guard: fail clearly if we still don't have a mysqli handle
if (!$mysqli || $mysqli->connect_errno) {
    http_response_code(500);
    exit('Database connection not available.');
}

// 3) Lookup role, department, section, employee_privilege
$role = '';
$department = '';
$section = '';
$employee_privilege = '';
$user_name = trim($current_user['name'] ?? '');
if ($user_name !== '') {
    $sql = "SELECT role, department, section, employee_privilege
            FROM system_users
            WHERE LOWER(TRIM(employee_name)) = LOWER(TRIM(?))
            LIMIT 1";
    if ($stmt = $mysqli->prepare($sql)) {
        $stmt->bind_param('s', $user_name);
        $stmt->execute();
        $stmt->bind_result($db_role, $db_department, $db_section, $db_priv);
        if ($stmt->fetch()) {
            $role = (string)$db_role;
            $department = (string)$db_department;
            $section = (string)$db_section;
            $employee_privilege = (string)$db_priv;
        }
        $stmt->close();
    }
}


// 4) Compute visibility flags
$can_see_rcpa_approval = in_array(strtolower($role), ['manager', 'supervisor'], true);

// ---- Who can use the action-container? (QA/QMS only — keep this for other pages) ----
$dept_norm = strtolower(trim($department));
$rcpa_can_actions = in_array($dept_norm, ['qms', 'qa'], true);

// Decide if the user may see QMS-related buttons
$rcpa_show_qms = ($dept_norm === 'qms') || ($dept_norm === 'qa' && $can_see_rcpa_approval);

// 5) Expose to JS before any page scripts run
echo '<script>
  window.RCPA_CAN_ACTIONS = ' . ($rcpa_can_actions ? 'true' : 'false') . ';
  window.RCPA_IS_APPROVER = ' . ($can_see_rcpa_approval ? 'true' : 'false') . ';
  window.RCPA_DEPARTMENT = ' . json_encode($department, JSON_HEX_TAG|JSON_HEX_APOS|JSON_HEX_QUOT|JSON_HEX_AMP) . ';
  window.RCPA_SECTION = ' . json_encode($section, JSON_HEX_TAG|JSON_HEX_APOS|JSON_HEX_QUOT|JSON_HEX_AMP) . ';
  window.RCPA_SHOW_QMS = ' . ($rcpa_show_qms ? 'true' : 'false') . ';
  window.RCPA_ROLE = ' . json_encode($role, JSON_HEX_TAG|JSON_HEX_APOS|JSON_HEX_QUOT|JSON_HEX_AMP) . ';
  window.RCPA_PRIVILEGE = ' . json_encode($employee_privilege, JSON_HEX_TAG|JSON_HEX_APOS|JSON_HEX_QUOT|JSON_HEX_AMP) . ';
</script>';

include "../../navigation-bar.html";
include "../../inspection-table.html";
date_default_timezone_set("Asia/Manila");
?>
