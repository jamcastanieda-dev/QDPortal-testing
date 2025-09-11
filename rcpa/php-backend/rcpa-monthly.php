<?php
// ../php-backend/rcpa-monthly.php
header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../../connection.php';

/** Locate mysqli connection */
$db = null;
if (isset($conn) && $conn instanceof mysqli)       $db = $conn;
elseif (isset($mysqli) && $mysqli instanceof mysqli) $db = $mysqli;
elseif (isset($db) && $db instanceof mysqli)         { /* already $db */ }
else { http_response_code(500); echo json_encode(['error'=>'Database connection not found.']); exit; }

$year = isset($_GET['year']) ? (int)$_GET['year'] : (int)date('Y');
if ($year < 1970 || $year > 2100) {
  http_response_code(400);
  echo json_encode(['error'=>'Invalid year parameter.']);
  exit;
}
$site = isset($_GET['site']) ? strtoupper(trim($_GET['site'])) : null;

// result container
$monthly = array_fill(0, 12, 0);

// Base (count from rcpa_request)
$sql  = "SELECT MONTH(DATE(rr.date_request)) AS m, COUNT(*) AS c
         FROM rcpa_request rr ";
$join = "";
$where = " WHERE rr.date_request IS NOT NULL AND YEAR(DATE(rr.date_request)) = ? ";

// Site filter by ORIGINATOR via system_users (name match)
// Only include rows whose originator_name matches a user and matches site rule
if ($site === 'SSD') {
  $join .= " INNER JOIN system_users su
               ON LOWER(TRIM(rr.originator_name)) = LOWER(TRIM(su.employee_name)) ";
  $where .= " AND UPPER(TRIM(su.department)) = 'SSD' ";
} elseif ($site === 'RTI') {
  $join .= " INNER JOIN system_users su
               ON LOWER(TRIM(rr.originator_name)) = LOWER(TRIM(su.employee_name)) ";
  $where .= " AND UPPER(TRIM(su.department)) <> 'SSD' ";
}

$sql = $sql . $join . $where . " GROUP BY m ORDER BY m ";

if (!$stmt = $db->prepare($sql)) { http_response_code(500); echo json_encode(['error'=>'Failed to prepare statement.']); exit; }
$stmt->bind_param('i', $year);
if (!$stmt->execute()) { http_response_code(500); echo json_encode(['error'=>'Failed to execute query.']); exit; }

$res = $stmt->get_result();
while ($row = $res->fetch_assoc()) {
  $idx = (int)$row['m'] - 1;
  if ($idx >= 0 && $idx < 12) $monthly[$idx] = (int)$row['c'];
}
$stmt->close();

$months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
echo json_encode([
  'year'    => $year,
  'site'    => $site,
  'months'  => $months,
  'monthly' => $monthly,
  'total'   => array_sum($monthly)
], JSON_UNESCAPED_UNICODE);
