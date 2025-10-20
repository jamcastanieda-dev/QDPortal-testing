<?php
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../../connection.php';
 
/* Locate mysqli connection */
$db = null;
if (isset($conn) && $conn instanceof mysqli) {
  $db = $conn;
} elseif (isset($mysqli) && $mysqli instanceof mysqli) {
  $db = $mysqli;
}
 
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
 * Build labels directly from rcpa_request so only those with activity are returned.
 * - Plain "Dept" appears ONLY when there are rows with blank/NULL section.
 * - "Dept - Section" appears for sections that have rows.
 * - Site filter mimics your previous logic: SSD = only assignee 'SSD', RTI = assignee <> 'SSD'.
 */
$sql = "
  WITH rr_norm AS (
    SELECT
      TRIM(assignee)              AS department,
      NULLIF(TRIM(section), '')   AS section,
      UPPER(TRIM(status))         AS status
    FROM rcpa_request
    WHERE assignee IS NOT NULL
      AND TRIM(assignee) <> ''
";
 
$params = [];
$types  = '';
 
if ($year !== null) {
  // [YYYY-01-01, YYYY+1-01-01)
  $sql   .= " AND date_request >= ? AND date_request < ? ";
  $types .= 'ss';
  $params[] = sprintf('%04d-01-01', $year);
  $params[] = sprintf('%04d-01-01', $year + 1);
}
 
/* SITE filter based on assignee */
if ($site === 'SSD') {
  $sql .= " AND UPPER(TRIM(assignee)) = 'SSD' ";
} elseif ($site === 'RTI') {
  $sql .= " AND UPPER(TRIM(assignee)) <> 'SSD' ";
}
 
$sql .= "
  )
  SELECT
    TRIM(
      CONCAT(
        department,
        CASE WHEN section IS NOT NULL THEN CONCAT(' - ', section) ELSE '' END
      )
    ) AS dept,
    COUNT(*) AS total,
    /* Count closed exactly; everything else (including NULL) is not_closed */
    SUM(CASE WHEN status IN ('CLOSED (VALID)', 'CLOSED (INVALID)') THEN 1 ELSE 0 END) AS closed,
    SUM(CASE WHEN status IN ('CLOSED (VALID)', 'CLOSED (INVALID)') THEN 0 ELSE 1 END) AS not_closed
  FROM rr_norm
  GROUP BY dept
  ORDER BY total DESC, dept ASC
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
 
$labels = [];
$data_closed = [];
$data_open   = [];
$total = 0;
$max = 0;
 
while ($row = $res->fetch_assoc()) {
  $dept   = (string)$row['dept'];
  $closed = (int)$row['closed'];
  $open   = (int)$row['not_closed'];
 
  $labels[]      = $dept;
  $data_closed[] = ['x' => $dept, 'y' => $closed];
  $data_open[]   = ['x' => $dept, 'y' => $open];
 
  $rowTotal = $closed + $open; // same as COUNT(*)
  $total   += $rowTotal;
  if ($rowTotal > $max) $max = $rowTotal;
}
$stmt->close();
 
echo json_encode([
  'year'        => $year,
  'site'        => $site,
  'labels'      => $labels,
  'data_closed' => $data_closed,
  'data_open'   => $data_open,
  'total'       => $total,
  'max'         => $max
], JSON_UNESCAPED_UNICODE);
 