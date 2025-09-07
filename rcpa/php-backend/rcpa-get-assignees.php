<?php
// rcpa-get-assignees.php
header('Content-Type: text/html; charset=utf-8');

require_once '../../connection.php';

/** Get mysqli handle ($mysqli or $conn)… */
$mysqli = null;
if (isset($mysqli) && $mysqli instanceof mysqli) {
} elseif (isset($conn) && $conn instanceof mysqli) {
  $mysqli = $conn;
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

/*
 * Distinct (department, section) list
 * Keep rows where department is non-empty; section may be empty.
 */
$sql = "
  SELECT DISTINCT
    TRIM(department) AS dept,
    TRIM(section)    AS sect
  FROM system_users
  WHERE department IS NOT NULL AND TRIM(department) <> ''
  ORDER BY dept ASC, sect ASC
";

if ($res = $mysqli->query($sql)) {
  while ($row = $res->fetch_assoc()) {
    $dept = (string)$row['dept'];
    $sect = (string)$row['sect'];
    $label = $dept . ( $sect !== '' ? (' - ' . $sect) : '' );

    // value = label; include data attributes for convenience
    echo '<option value="' . esc($label) . '" data-type="department" data-dept="' . esc($dept) . '" data-sect="' . esc($sect) . '">'
       . esc($label)
       . "</option>\n";
  }
  $res->free();
} else {
  http_response_code(500);
  echo "<!-- query error: {$mysqli->error} -->";
  exit;
}
