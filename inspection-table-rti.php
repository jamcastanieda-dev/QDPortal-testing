<?php
include 'connection.php';

$employee_name = '';
if (isset($_COOKIE['user'])) {
    $user = json_decode($_COOKIE['user'], true);
    $employee_name = $user['name'] ?? '';
}


// Modify the query to order by custom status priority and then by request
$query = "
    SELECT inspection_no, wbs, description, request, status, remarks, requestor, date_time 
    FROM inspection_request WHERE company = 'rti'
    ORDER BY 
        CASE status 
            WHEN 'REQUESTED' THEN 1
            WHEN 'PENDING' THEN 2
            WHEN 'FOR RESCHEDULE' THEN 3
            WHEN 'RESCHEDULED' THEN 4
            WHEN 'COMPLETED' THEN 5
            WHEN 'REJECTED' THEN 6
            WHEN 'FAILED' THEN 7
            WHEN 'CANCELLED' THEN 8
            ELSE 9
        END,
        inspection_no DESC
";
$result = $conn->query($query);

// Generate table rows
if ($result && $result->num_rows > 0) {
    while ($row = $result->fetch_assoc()) {

        $sql = 'SELECT type_of_inspection
          FROM inspection_final_sub
         WHERE inspection_no = ?';
        $stmt = $conn->prepare($sql)
            or die('Prepare failed: (' . $conn->errno . ') ' . $conn->error);

        // 4) Bind, execute
        $stmt->bind_param('i', $row['inspection_no']);
        $stmt->execute();

        // 5) Bind result into your PHP variable
        $stmt->bind_result($typeOfInspection);

        // 6) Fetch — now $typeOfInspection holds your column’s value (or remains NULL)
        if ($stmt->fetch()) {
        } else {
            // no row found; you might set a default or handle the error
            $typeOfInspection = null;
        }

        $stmt->close();
    }
} else {
    echo '<tr><td colspan="9">No records found</td></tr>';
}

$conn->close();
