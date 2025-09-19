<?php
session_start();
include 'connection.php';
header('Content-Type: application/json');

$sql = "
SELECT
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
  WHEN ir.status IN ('PASSED','FAILED', 'PASSED W/ FAILED', 'COMPLETED', 'FOR RESCHEDULE') THEN (
    SELECT h.date_time
      FROM inspection_history AS h
     WHERE h.inspection_no = ir.inspection_no
       AND (
            ir.request = 'Calibration'
            OR h.name = 'Sandy Vito'
       )
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
";

$stmt = $conn->prepare($sql);
$stmt->execute();
$res = $stmt->get_result();
$dates = [];

while ($row = $res->fetch_assoc()) {
    if ($row['date_completed']) {
        $parts = explode(' | ', $row['date_completed']);
        $dt = DateTime::createFromFormat('d-m-Y', $parts[0]);
        if ($dt) {
            $dates[] = $dt->format('Y-m-d');
        }
    }
}

$dates = array_values(array_unique($dates));
echo json_encode($dates);
exit;
