<?php
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../../connection.php';

/* Locate mysqli connection */
$db = null;
if (isset($conn) && $conn instanceof mysqli)         $db = $conn;
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
 * We keep all (department, section) pairs from system_users,
 * BUT we drop the "plain department" row when that department
 * has at least one non-empty section.
 *
 * Examples:
 *   Dept A + sections X,Y  => show "Dept A - X", "Dept A - Y" (hide "Dept A")
 *   Dept B with no section => show "Dept B"
 *
 * Still LEFT JOIN to rcpa_request so zero counts are kept.
 * Site filter is applied on the 'su' side so zero-count rows stay visible.
 */
$sql = "
  WITH su_base AS (
    SELECT DISTINCT
      TRIM(department) AS department,
      TRIM(section)    AS section
    FROM system_users
    WHERE department IS NOT NULL AND TRIM(department) <> ''
  ),
  su AS (
    /* Remove plain department when any non-empty section exists for that department */
    SELECT
      b.department,
      b.section,
      TRIM(
        CONCAT(
          b.department,
          CASE
            WHEN b.section IS NOT NULL AND TRIM(b.section) <> ''
              THEN CONCAT(' - ', TRIM(b.section))
            ELSE ''
          END
        )
      ) AS label
    FROM su_base b
    WHERE NOT (
      (b.section IS NULL OR TRIM(b.section) = '')
      AND EXISTS (
        SELECT 1
        FROM su_base b2
        WHERE b2.department = b.department
          AND b2.section IS NOT NULL AND TRIM(b2.section) <> ''
      )
    )
  )
  SELECT
    su.label AS dept,
    COUNT(rr.id) AS total,
    SUM(
      CASE
        WHEN rr.id IS NOT NULL
         AND UPPER(TRIM(rr.status)) IN ('CLOSED (VALID)', 'CLOSED (IN-VALID)')
        THEN 1 ELSE 0
      END
    ) AS closed,
    SUM(
      CASE
        WHEN rr.id IS NOT NULL
         AND UPPER(TRIM(rr.status)) NOT IN ('CLOSED (VALID)', 'CLOSED (IN-VALID)')
        THEN 1 ELSE 0
      END
    ) AS not_closed
  FROM su
  LEFT JOIN rcpa_request rr
    ON TRIM(rr.assignee) = su.department
   AND COALESCE(TRIM(rr.section), '') = COALESCE(su.section, '')
";

$params = [];
$types  = '';

if ($year !== null) {
  // keep year filter in JOIN side (preserve zero-count labels)
  $sql .= " AND rr.date_request IS NOT NULL AND YEAR(DATE(rr.date_request)) = ? ";
  $types .= 'i';
  $params[] = $year;
}

/* SITE filter on 'su' side to keep zero-count items */
if ($site === 'SSD') {
  $sql .= " WHERE UPPER(su.department) = 'SSD' ";
} elseif ($site === 'RTI') {
  $sql .= " WHERE UPPER(su.department) <> 'SSD' ";
}

$sql .= "
  GROUP BY su.label
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

  $rowTotal = $closed + $open;
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
