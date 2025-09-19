<?php
session_start();
include 'connection.php';

// 1) Grab filters
$wbs = isset($_GET['wbs']) ? trim($_GET['wbs']) : '';
$request = isset($_GET['request']) ? trim($_GET['request']) : '';
$status = isset($_GET['status']) ? trim($_GET['status']) : '';
$date = isset($_GET['date']) ? trim($_GET['date']) : '';
$department = $_GET['department'] ?? '';

$page = isset($_GET['page']) && is_numeric($_GET['page']) && $_GET['page'] > 0
  ? (int) $_GET['page'] : 1;
$limit = 20;
$offset = ($page - 1) * $limit;

// 2) Build WHERE clauses (always include company = 'rti')
$where = [];
$params = [];
$types = '';

// Company filter (always)
$where[] = 'ir.company = ?';
$params[] = 'rti';
$types .= 's';

// WBS filter
if ($wbs !== '') {
  $where[]  = '(ir.wbs LIKE ? OR ir.description LIKE ?)';
  $params[] = "%{$wbs}%";
  $params[] = "%{$wbs}%";
  $types   .= 'ss';
}

// Request filter: special-case the two “inspection_final_sub” types
if ($request !== '') {
  if ($request === 'Final Inspection') {
    $where[] = 'ifs.type_of_inspection = ?';
    $params[] = 'final-inspection';
    $types .= 's';
  } elseif ($request === 'Sub-Assembly Inspection') {
    $where[] = 'ifs.type_of_inspection = ?';
    $params[] = 'sub-assembly';
    $types .= 's';
  } else if ($request === 'Incoming Inspection') {
    // filter on type_of_inspection = "sub-assembly"
    $where[] = 'iio.type_of_inspection = ?';
    $params[] = 'incoming';
    $types .= 's';
  } else if ($request === 'Outgoing Inspection') {
    // filter on type_of_inspection = "sub-assembly"
    $where[] = 'iio.type_of_inspection = ?';
    $params[] = 'outgoing';
    $types .= 's';
  } else {
    $where[] = 'ir.request = ?';
    $params[] = $request;
    $types .= 's';
  }
}

// Status filter
if ($status !== '') {
  $where[] = 'ir.status = ?';
  $params[] = $status;
  $types .= 's';
}

// Department filter (FIXED)
if ($department !== '') {
  $where[] = 'su.department = ?';
  $params[] = $department;
  $types  .= 's';
}
if ($date !== '') {
  $where[] = "(
    (ir.request = 'Calibration'
      AND ir.status IN ('COMPLETED', 'PASSED', 'FAILED', 'PASSED W/ FAILED', 'FOR RESCHEDULE')
      AND STR_TO_DATE(LEFT(ir.date_time, 10), '%d-%m-%Y') = ?)
    OR
    (ir.request <> 'Calibration'
      AND ir.status IN ('COMPLETED', 'PASSED', 'FAILED', 'PASSED W/ FAILED', 'FOR RESCHEDULE')
      AND STR_TO_DATE(LEFT(h2.date_completed, 10), '%d-%m-%Y') = ?)
  )";
  $params[] = $date;
  $params[] = $date;
  $types .= 'ss';
}


$where_sql = $where
  ? 'WHERE ' . implode(' AND ', $where)
  : '';

$params[] = $offset;
$types .= 'i';
$params[] = $limit;
$types .= 'i';

$sql = "SELECT SQL_CALC_FOUND_ROWS
    ir.company,
    ir.inspection_no,
    ir.wbs,
    ir.description,
    ica.document_no                             AS document_no,
    COALESCE(ifs.quantity, iio.quantity, '-')   AS quantity,
    ir.request                                  AS original_request,
    ir.status,
    ir.remarks,
    ir.requestor,
    su.department                               AS department,
    ir.date_time,
    CASE
    WHEN ir.request = 'Calibration' AND ir.status IN ('COMPLETED', 'PASSED', 'FAILED', 'PASSED W/ FAILED', 'FOR RESCHEDULE')
        THEN (
            SELECT MAX(STR_TO_DATE(LEFT(h.date_time, 10), '%d-%m-%Y'))
            FROM inspection_history h
            WHERE h.inspection_no = ir.inspection_no
                AND h.date_time IS NOT NULL
        )
    WHEN ir.request <> 'Calibration' AND ir.status IN ('COMPLETED', 'PASSED', 'FAILED', 'PASSED W/ FAILED', 'FOR RESCHEDULE')
        THEN h2.date_completed
    ELSE NULL
END AS date_completed,
    COALESCE(ifs.type_of_inspection,
             iio.type_of_inspection)            AS type_of_inspection,
    COALESCE(iiw.passed_qty, 0)                 AS passed_qty,
    COALESCE(iiw.failed_qty, 0)                 AS failed_qty,
    COALESCE(iiw.pwf_pass,   0)                 AS pwf_pass,
    COALESCE(iiw.pwf_fail,   0)                 AS pwf_fail
FROM inspection_request AS ir

LEFT JOIN inspection_final_sub AS ifs
  ON ifs.inspection_no = ir.inspection_no

LEFT JOIN inspection_incoming_outgoing AS iio
  ON iio.inspection_no = ir.inspection_no

LEFT JOIN (
  SELECT
    inspection_no,
    SUM(passed_qty) AS passed_qty,
    SUM(failed_qty) AS failed_qty,
    SUM(pwf_pass)   AS pwf_pass,
    SUM(pwf_fail)   AS pwf_fail
  FROM inspection_incoming_wbs
  GROUP BY inspection_no
) AS iiw
  ON iiw.inspection_no = ir.inspection_no

LEFT JOIN system_users AS su
  ON su.employee_name = ir.requestor

LEFT JOIN (
  SELECT
    inspection_no,
     MAX(date_time) AS date_completed
  FROM inspection_history
  WHERE name = 'Sandy Vito'
    AND date_time IS NOT NULL
  GROUP BY inspection_no
) AS h2
  ON h2.inspection_no = ir.inspection_no

LEFT JOIN (
  SELECT
    inspection_no,
    MIN(document_no) AS document_no
  FROM inspection_completed_attachments
  WHERE document_no REGEXP '[0-9]'
  GROUP BY inspection_no
) AS ica
  ON ica.inspection_no = ir.inspection_no

{$where_sql}

ORDER BY
  CASE ir.status
    WHEN 'REQUESTED'        THEN 1
    WHEN 'PENDING'          THEN 2
    WHEN 'FOR RESCHEDULE'   THEN 3
    WHEN 'RESCHEDULED'      THEN 4
    WHEN 'COMPLETED'        THEN 5
    WHEN 'PASSED'           THEN 6
    WHEN 'PASSED W/ FAILED' THEN 7
    WHEN 'REJECTED'         THEN 8
    WHEN 'FAILED'           THEN 9
    WHEN 'CANCELLED'        THEN 10
    ELSE 11
  END,
  ir.inspection_no DESC
LIMIT ?, ?
";


$stmt = $conn->prepare($sql) or die($conn->error);

if ($types) {
  $stmt->bind_param($types, ...$params);
}

$stmt->execute();
$res = $stmt->get_result();

$data = [];
while ($row = $res->fetch_assoc()) {
  switch ($row['type_of_inspection']) {
    case 'final-inspection':
      $requestLabel = 'Final Inspection';
      break;
    case 'sub-assembly':
      $requestLabel = 'Sub-Assembly Inspection';
      break;
    case 'incoming':
      $requestLabel = 'Incoming Inspection';
      break;
    case 'outgoing':
      $requestLabel = 'Outgoing Inspection';
      break;
    default:
      $requestLabel = $row['original_request'];
  }

  $data[] = [
    'inspectionNo'   => (int) $row['inspection_no'],
    'company'        => $row['company'],
    'department'     => $row['department'],
    'wbs'            => $row['wbs'],
    'documentNo'     => $row['document_no'],
    'description'    => $row['description'],
    'quantity'       => $row['quantity'],
    'request'        => $requestLabel,
    'dateOfRequest'  => $row['date_time'],
    'dateCompleted'  => $row['date_completed'],
    'status'         => $row['status'],
    'remarks'        => $row['remarks'],
    'requestor'      => $row['requestor'],
    'passed_qty'     => (int)$row['passed_qty'],
    'failed_qty'     => (int)$row['failed_qty'],
    'pwf_pass'       => (int)$row['pwf_pass'],
    'pwf_fail'       => (int)$row['pwf_fail'],
  ];
}

$totalRes = $conn->query("SELECT FOUND_ROWS() AS total");
$total = (int) $totalRes->fetch_assoc()['total'];

$stmt->close();
$conn->close();

header('Content-Type: application/json; charset=utf-8');
echo json_encode(['data' => $data, 'total' => $total]);
exit;
