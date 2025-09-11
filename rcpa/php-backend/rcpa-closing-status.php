<?php
// ../php-backend/rcpa-closing-status.php
header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../../connection.php';

/** Locate mysqli */
$db = null;
if (isset($conn) && $conn instanceof mysqli)       $db = $conn;
elseif (isset($mysqli) && $mysqli instanceof mysqli) $db = $mysqli;
elseif (isset($db) && $db instanceof mysqli)         { /* already $db */ }
else { http_response_code(500); echo json_encode(['error'=>'Database connection not found.']); exit; }

/** Detect column name */
$col = 'hit_close';
$check = $db->query("SHOW COLUMNS FROM rcpa_request LIKE 'hit_closing'");
if ($check && $check->num_rows > 0) $col = 'hit_closing';

$year = isset($_GET['year']) ? (int)$_GET['year'] : null;
$site = isset($_GET['site']) ? strtoupper(trim($_GET['site'])) : null;

$whereYear = '';
$params = [];
$types  = '';

if ($year) {
  if ($year < 1970 || $year > 2100) { http_response_code(400); echo json_encode(['error'=>'Invalid year parameter.']); exit; }
  $whereYear = " AND YEAR(DATE(rr.date_request)) = ? ";
  $types .= 'i';
  $params[] = $year;
}

// Count only from rcpa_request; site filter via ORIGINATOR match to system_users
$sql  = "SELECT
           SUM(CASE WHEN LOWER(TRIM(rr.$col)) = 'hit'    THEN 1 ELSE 0 END) AS hit_count,
           SUM(CASE WHEN LOWER(TRIM(rr.$col)) = 'missed' THEN 1 ELSE 0 END) AS missed_count,
           SUM(CASE WHEN (rr.$col IS NULL OR TRIM(rr.$col) = '') THEN 1 ELSE 0 END) AS ongoing_count
         FROM rcpa_request rr ";
$join = "";
$where = " WHERE rr.date_request IS NOT NULL " . $whereYear;

if ($site === 'SSD') {
  $join .= " INNER JOIN system_users su
               ON LOWER(TRIM(rr.originator_name)) = LOWER(TRIM(su.employee_name)) ";
  $where .= " AND UPPER(TRIM(su.department)) = 'SSD' ";
} elseif ($site === 'RTI') {
  $join .= " INNER JOIN system_users su
               ON LOWER(TRIM(rr.originator_name)) = LOWER(TRIM(su.employee_name)) ";
  $where .= " AND UPPER(TRIM(su.department)) <> 'SSD' ";
}

$sql = $sql . $join . $where;

$stmt = $db->prepare($sql);
if (!$stmt) { http_response_code(500); echo json_encode(['error'=>'Failed to prepare statement.']); exit; }
if ($types) $stmt->bind_param($types, ...$params);
if (!$stmt->execute()) { http_response_code(500); echo json_encode(['error'=>'Failed to execute query.']); exit; }

$res = $stmt->get_result()->fetch_assoc();
$stmt->close();

$hit     = (int)($res['hit_count'] ?? 0);
$missed  = (int)($res['missed_count'] ?? 0);
$ongoing = (int)($res['ongoing_count'] ?? 0);

echo json_encode([
  'labels' => ['Hit', 'Missed', 'On-going closing'],
  'series' => [$hit, $missed, $ongoing],
  'total'  => $hit + $missed + $ongoing,
  'year'   => $year,
  'site'   => $site
], JSON_UNESCAPED_UNICODE);
