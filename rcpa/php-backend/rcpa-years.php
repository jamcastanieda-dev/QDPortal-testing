<?php
// ../php-backend/rcpa-years.php
header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../../connection.php';

/** Locate mysqli connection */
$db = null;
if (isset($conn) && $conn instanceof mysqli) {
  $db = $conn;
} elseif (isset($mysqli) && $mysqli instanceof mysqli) {
  $db = $mysqli;
} elseif (isset($db) && $db instanceof mysqli) {
  // already $db
} else {
  http_response_code(500);
  echo json_encode(['error' => 'Database connection not found.']);
  exit;
}

/** Query distinct years from date_request */
$sql = "
  SELECT DISTINCT YEAR(DATE(date_request)) AS y
  FROM rcpa_request
  WHERE date_request IS NOT NULL
  ORDER BY y DESC
";
$result = $db->query($sql);
if (!$result) {
  http_response_code(500);
  echo json_encode(['error' => 'Failed to fetch years.']);
  exit;
}

$years = [];
while ($row = $result->fetch_assoc()) {
  if ($row['y'] !== null) $years[] = (int)$row['y'];
}

echo json_encode([
  'years'   => $years,
  'count'   => count($years),
  'latest'  => $years[0] ?? null,
  'earliest'=> $years ? $years[count($years)-1] : null
], JSON_UNESCAPED_UNICODE);
