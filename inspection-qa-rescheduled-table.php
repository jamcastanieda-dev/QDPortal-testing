<?php
session_start();
include 'connection.php';

$employee_name = '';
if (isset($_COOKIE['user'])) {
    $user = json_decode($_COOKIE['user'], true);
    $employee_name = $user['name'] ?? '';
}


// Modify the query to order by custom status priority and then by request
$query = "
    SELECT inspection_no, wbs, description, request, status, remarks, requestor, date_time 
    FROM inspection_request WHERE status = 'RESCHEDULED'
    ORDER BY request ASC
";
$result = $conn->query($query);

// Generate table rows
if ($result && $result->num_rows > 0) {
    while ($row = $result->fetch_assoc()) {
        echo '<tr>';
        echo '<td>' . htmlspecialchars($row['inspection_no']) . '</td>';
        echo '<td>' . htmlspecialchars($row['wbs']) . '</td>';
        echo '<td>' . htmlspecialchars($row['description']) . '</td>';
        echo '<td>' . htmlspecialchars($row['request']) . '</td>';
        echo '<td>' . htmlspecialchars($row['date_time']) . '</td>';
        if ($row['status'] == 'RESCHEDULED') {
            echo '<td class="status-rescheduled">' . htmlspecialchars($row['status']) . '</td>';
        }
        // Display a View button if not CLOSED; otherwise, output CLOSED text.
        if ($row['status'] !== 'CLOSED') {
            echo '<td class="action-cell">
                    <button class="hamburger-icon"><i class="fas fa-bars"></i></button>
                </td>';
        } else {
            echo '<td>CLOSED</td>';
        }
        echo '</tr>';
    }
} else {
    echo '<tr><td colspan="7">No records found</td></tr>';
}

$conn->close();
