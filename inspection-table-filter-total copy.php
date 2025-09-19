<?php
session_start();
include 'connection.php';

// 1) Grab filters
$wbs     = isset($_GET['wbs'])     ? trim($_GET['wbs'])     : '';
$request = isset($_GET['request']) ? trim($_GET['request']) : '';
$status  = isset($_GET['status'])  ? trim($_GET['status'])  : '';
$company = isset($_GET['company']) ? trim($_GET['company']) : '';

// 2) Build WHERE clauses
$where   = [];
$params  = [];
$types   = '';

// WBS filter
if ($wbs !== '') {
    $where[]  = 'ir.wbs LIKE ?';
    $params[] = "%{$wbs}%";
    $types   .= 's';
}

// Request filter: special-case the two “inspection_final_sub” types
if ($request !== '') {
    if ($request === 'Final Inspection') {
        // filter on type_of_inspection = "final-inspection"
        $where[]  = 'ifs.type_of_inspection = ?';
        $params[] = 'final-inspection';
        $types   .= 's';
    } else if ($request === 'Sub-Assembly Inspection') {
        // filter on type_of_inspection = "sub-assembly"
        $where[]  = 'ifs.type_of_inspection = ?';
        $params[] = 'sub-assembly';
        $types   .= 's';
    } else if ($request === 'Incoming Inspection') {
        // filter on type_of_inspection = "sub-assembly"
        $where[]  = 'iio.type_of_inspection = ?';
        $params[] = 'incoming';
        $types   .= 's';
    } else if ($request === 'Outgoing Inspection') {
        // filter on type_of_inspection = "sub-assembly"
        $where[]  = 'iio.type_of_inspection = ?';
        $params[] = 'outgoing';
        $types   .= 's';
    } else {
        // everything else comes straight from the IR table
        $where[]  = 'ir.request = ?';
        $params[] = $request;
        $types   .= 's';
    }
}

// Status filter
if ($status !== '') {
    $where[]  = 'ir.status = ?';
    $params[] = $status;
    $types   .= 's';
}

// Company filter
if ($company !== '') {
    $where[]  = 'company = ?';
    $params[] = $company;
    $types   .= 's';
}

// Join the WHERE bits
$where_sql = $where
    ? 'WHERE ' . implode(' AND ', $where)
    : '';

// 3) Main query with custom status ordering
$sql = "SELECT
    ir.company,
    ir.inspection_no,
    ir.wbs,
    ir.description,
    ir.request           AS original_request,
    ir.status,
    ir.remarks,
    ir.requestor,
    su.department        AS department,
    ir.date_time,
    CASE
      WHEN ir.status IN ('PASSED','FAILED', 'PASSED W/ FAILED', 'COMPLETED') THEN (
        SELECT h.date_time
          FROM inspection_history AS h
         WHERE h.inspection_no = ir.inspection_no
           AND h.name          = 'Sandy Vito'
         ORDER BY h.date_time DESC
         LIMIT 1
      )
      ELSE ''
    END                   AS date_completed,
    COALESCE(
      ifs.type_of_inspection,
      iio.type_of_inspection
    )                     AS type_of_inspection
  FROM inspection_request AS ir
  LEFT JOIN inspection_final_sub AS ifs
    ON ir.inspection_no = ifs.inspection_no
  LEFT JOIN inspection_incoming_outgoing AS iio
    ON ir.inspection_no = iio.inspection_no
  LEFT JOIN system_users AS su
    ON su.employee_name = ir.requestor
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
";

$stmt = $conn->prepare($sql)
    or die('Prepare failed: ' . $conn->error);

if (count($params)) {
    $stmt->bind_param($types, ...$params);
}

$stmt->execute();
$res = $stmt->get_result();

// 4) Build JSON array, with your “friendly” request label
$data = [];
while ($row = $res->fetch_assoc()) {
    // compute the user‐visible “request” label
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
        'description'    => $row['description'],
        'request'        => $requestLabel,
        'dateOfRequest'  => $row['date_time'],
        'dateCompleted'  => $row['date_completed'],
        'status'         => $row['status'],
        'remarks'        => $row['remarks'],
        'requestor'      => $row['requestor'],
    ];
}

$stmt->close();
$conn->close();

// 5) Return JSON
header('Content-Type: application/json; charset=utf-8');
echo json_encode($data);
exit;
