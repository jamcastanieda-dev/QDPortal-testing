<?php
// ../php-backend/rcpa-assignee-by-dept.php
header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../../connection.php';

/* Locate mysqli connection */
$db = null;
if (isset($conn) && $conn instanceof mysqli)       $db = $conn;
elseif (isset($mysqli) && $mysqli instanceof mysqli) $db = $mysqli;
elseif (isset($db) && $db instanceof mysqli)         $db = $db;

if (!$db) {
  http_response_code(500);
  echo json_encode(['error' => 'Database connection not found.']);
  exit;
}

/* Optional year filter */
$year = isset($_GET['year']) ? (int)$_GET['year'] : null;
if ($year !== null && ($year < 1970 || $year > 2100)) {
  http_response_code(400);
  echo json_encode(['error' => 'Invalid year parameter.']);
  exit;
}

/**
 * Build SQL:
 *  - Get DISTINCT non-empty departments from system_users
 *  - LEFT JOIN rcpa_request on assignee == department (trimmed)
 *  - Optional filter by YEAR(date_request)
 *  - Keep departments with zero matches
 */
$sql = "
  SELECT su.department AS dept,
         COUNT(rr.id)  AS cnt
  FROM (
    SELECT DISTINCT TRIM(department) AS department
    FROM system_users
    WHERE department IS NOT NULL AND TRIM(department) <> ''
  ) AS su
  LEFT JOIN rcpa_request rr
    ON TRIM(rr.assignee) = su.department
";

$params = [];
$types  = '';

if ($year !== null) {
  $sql .= " AND rr.date_request IS NOT NULL AND YEAR(DATE(rr.date_request)) = ? ";
  $types .= 'i';
  $params[] = $year;
}

$sql .= "
  GROUP BY su.department
  ORDER BY cnt DESC, dept ASC
";

$stmt = $db->prepare($sql);
if (!$stmt) {
  http_response_code(500);
  echo json_encode(['error' => 'Failed to prepare statement.']);
  exit;
}

if ($types) $stmt->bind_param($types, ...$params);

if (!$stmt->execute()) {
  http_response_code(500);
  echo json_encode(['error' => 'Failed to execute query.']);
  exit;
}

$res = $stmt->get_result();
$data = [];
$labels = [];
$total = 0;
$max = 0;

while ($row = $res->fetch_assoc()) {
  $dept = (string)$row['dept'];
  $cnt  = (int)$row['cnt'];
  $labels[] = $dept;
  $data[] = ['x' => $dept, 'y' => $cnt];
  $total += $cnt;
  if ($cnt > $max) $max = $cnt;
}
$stmt->close();

echo json_encode([
  'year'   => $year,
  'labels' => $labels,     // ["SSD-PPIC", "R&D", ...]
  'data'   => $data,       // [{x:"SSD-PPIC", y:7}, ...]  <- good for ApexCharts
  'total'  => $total,
  'max'    => $max
], JSON_UNESCAPED_UNICODE);
