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
    FROM inspection_request
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
        inspection_no ASC
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

        echo '<tr>';
        echo '<td>' . htmlspecialchars($row['inspection_no']) . '</td>';
        echo '<td>' . htmlspecialchars($row['wbs']) . '</td>';
        echo '<td>' . htmlspecialchars($row['description']) . '</td>';
        if ($typeOfInspection == 'final-inspection') {
            echo '<td> Final Inspection </td>';
        } else if ($typeOfInspection == 'sub-assembly') {
            echo '<td> Sub-Assembly Inspection </td>';
        } else {
            echo '<td>' . htmlspecialchars($row['request']) . '</td>';
        }
        echo '<td>' . htmlspecialchars($row['date_time']) . '</td>';
        if ($row['status'] == 'REQUESTED') {
            echo '<td class="status-requested">' . htmlspecialchars($row['status']) . '</td>';
        } else if ($row['status'] == 'PENDING') {
            echo '<td class="status-pending">' . htmlspecialchars($row['status']) . '</td>';
        } else if ($row['status'] == 'FOR RESCHEDULE') {
            echo '<td class="status-for-reschedule">' . htmlspecialchars($row['status']) . '</td>';
        } else if ($row['status'] == 'RESCHEDULED') {
            echo '<td class="status-rescheduled">' . htmlspecialchars($row['status']) . '</td>';
        } else if ($row['status'] == 'COMPLETED' || $row['status'] == 'PASSED') {
            echo '<td class="status-completed">' . htmlspecialchars($row['status']) . '</td>';
        } else if ($row['status'] == 'REJECTED') {
            echo '<td class="status-rejected">' . htmlspecialchars($row['status']) . '</td>';
        } else if ($row['status'] == 'FAILED') {
            echo '<td class="status-rejected">' . htmlspecialchars($row['status']) . '</td>';
        } else if ($row['status'] == 'CANCELLED') {
            echo '<td class="status-cancelled">' . htmlspecialchars($row['status']) . '</td>';
        }
        echo '<td><i class="fa-solid fa-clock-rotate-left history-button"></i></td>';
        echo '<td><button class="view-btn">View</button></td>';
    }
    echo '</tr>';
} else {
    echo '<tr><td colspan="9">No records found</td></tr>';
}

$conn->close();
