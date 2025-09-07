<?php
// Returns only <option> rows for departments (no placeholder, no employees)
// For <select id="assigneeSelect">
header('Content-Type: text/html; charset=utf-8');

require_once '../../connection.php';

/** Grab an existing mysqli handle from connection.php, or build one */
$mysqli = null;
if (isset($mysqli) && $mysqli instanceof mysqli) {
    // connection.php already created $mysqli
} elseif (isset($conn) && $conn instanceof mysqli) {
    $mysqli = $conn; // many codebases name it $conn
} elseif (isset($host, $user, $pass, $db)) {
    $mysqli = @new mysqli($host, $user, $pass, $db);
} elseif (isset($servername, $username, $password, $dbname)) {
    $mysqli = @new mysqli($servername, $username, $password, $dbname);
}

if (!$mysqli || $mysqli->connect_errno) {
    http_response_code(500);
    echo "<!-- DB connect error: ".($mysqli ? $mysqli->connect_error : 'no mysqli credentials found')." -->";
    exit;
}

$mysqli->set_charset('utf8mb4');

function esc($s){ return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8'); }

/* ---- Departments (distinct) ---- */
$sqlDept = "
  SELECT DISTINCT department
  FROM system_users
  WHERE department IS NOT NULL AND department <> ''
  ORDER BY department ASC
";
if ($res = $mysqli->query($sqlDept)) {
    while ($row = $res->fetch_assoc()) {
        $dept = $row['department'];
        echo '<option value="' . esc($dept) . '" data-type="department">'
           . esc($dept)
           . "</option>\n";
    }
    $res->free();
} else {
    http_response_code(500);
    echo "<!-- dept query error: {$mysqli->error} -->";
    exit;
}
