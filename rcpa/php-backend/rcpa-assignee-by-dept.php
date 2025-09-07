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

/* Inputs */
$year = isset($_GET['year']) ? (int)$_GET['year'] : null;
$site = isset($_GET['site']) ? strtoupper(trim($_GET['site'])) : null;

if ($year !== null && ($year < 1970 || $year > 2100)) {
  http_response_code(400);
  echo json_encode(['error' => 'Invalid year parameter.']);
  exit;
}

/**
 * SQL:
 *  - DISTINCT (department, section) from system_users
 *  - label = "Department - Section" or "Department" if section empty
 *  - LEFT JOIN rcpa_request using department + section columns:
 *        rr.assignee = su.department
 *    AND COALESCE(rr.section, '') = COALESCE(su.section, '')
 *    (year filter stays in the JOIN to keep zero-count labels)
 *  - SITE filter applied on su:
 *        SSD => ONLY department = 'SSD'
 *        RTI => department <> 'SSD'
 */
$sql = "
  WITH su AS (
    SELECT DISTINCT
      TRIM(department) AS department,
      TRIM(section)    AS section,
      TRIM(
        CONCAT(
          TRIM(department),
          CASE
            WHEN section IS NOT NULL AND TRIM(section) <> ''
            THEN CONCAT(' - ', TRIM(section))
            ELSE ''
          END
        )
      ) AS label
    FROM system_users
    WHERE department IS NOT NULL AND TRIM(department) <> ''
  )
  SELECT
    su.label AS dept,
    COUNT(rr.id) AS cnt
  FROM su
  LEFT JOIN rcpa_request rr
    ON TRIM(rr.assignee) = su.department
   AND COALESCE(TRIM(rr.section), '') = COALESCE(su.section, '')
";

$params = [];
$types  = '';

if ($year !== null) {
  // keep year restriction in the JOIN to preserve zero-count labels
  $sql .= " AND rr.date_request IS NOT NULL AND YEAR(DATE(rr.date_request)) = ? ";
  $types .= 'i';
  $params[] = $year;
}

/* Apply SITE filter on the 'su' side so zero counts remain visible */
if ($site === 'SSD') {
  $sql .= " WHERE UPPER(su.department) = 'SSD' ";
} elseif ($site === 'RTI') {
  $sql .= " WHERE UPPER(su.department) <> 'SSD' ";
}

$sql .= "
  GROUP BY su.label
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
  $dept = (string)$row['dept'];  // e.g., "SSD - DESIGN" or "R&D"
  $cnt  = (int)$row['cnt'];
  $labels[] = $dept;
  $data[] = ['x' => $dept, 'y' => $cnt];
  $total += $cnt;
  if ($cnt > $max) $max = $cnt;
}
$stmt->close();

echo json_encode([
  'year'   => $year,
  'site'   => $site,
  'labels' => $labels,
  'data'   => $data,
  'total'  => $total,
  'max'    => $max
], JSON_UNESCAPED_UNICODE);
