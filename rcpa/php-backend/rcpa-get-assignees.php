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
function norm($s){
  $s = trim((string)$s);
  // treat junk placeholders as empty
  if ($s === '-' || $s === '--' || strtoupper($s) === 'NULL') $s = '';
  return $s;
}

/*
 * Build a map of departments → sections.
 * If a department has any non-empty section, we will NOT output the bare department.
 */
$sql = "
  SELECT
    TRIM(department) AS dept,
    TRIM(COALESCE(section, '')) AS sect
  FROM system_users
  WHERE department IS NOT NULL AND TRIM(department) <> ''
";
$res = $mysqli->query($sql);
if (!$res) {
  http_response_code(500);
  echo "<!-- query error: {$mysqli->error} -->";
  exit;
}

$map = []; // dept => ['sections' => set(array), 'has_section' => bool, 'has_dept_only' => bool]
while ($row = $res->fetch_assoc()) {
  $dept = norm($row['dept']);
  if ($dept === '') continue;

  $sect = norm($row['sect']);
  if (!isset($map[$dept])) $map[$dept] = ['sections' => [], 'has_section' => false];

  if ($sect !== '') {
    $map[$dept]['has_section'] = true;
    $map[$dept]['sections'][$sect] = true; // set semantics
  } else {
    // bare department row; keep note but we will only output it if no sections exist
    if (!isset($map[$dept]['has_dept_only'])) $map[$dept]['has_dept_only'] = true;
  }
}
$res->free();

/* Output:
 * - If dept has sections → output each "Dept - Section" (unique, sorted)
 * - Else → output single "Dept"
 */
ksort($map, SORT_NATURAL | SORT_FLAG_CASE);
foreach ($map as $dept => $info) {
  if (!empty($info['has_section'])) {
    $sections = array_keys($info['sections']);
    natcasesort($sections);
    foreach ($sections as $sect) {
      $label = $dept . ' - ' . $sect;
      echo '<option value="' . esc($label) . '" data-type="department" data-dept="' . esc($dept) . '" data-sect="' . esc($sect) . '">'
         . esc($label)
         . "</option>\n";
    }
  } else {
    // no sections at all → output bare department
    $label = $dept;
    echo '<option value="' . esc($label) . '" data-type="department" data-dept="' . esc($dept) . '" data-sect="">'
       . esc($label)
       . "</option>\n";
  }
}
