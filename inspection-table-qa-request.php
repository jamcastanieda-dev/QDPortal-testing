<?php
include 'connection.php';

$employee_name = '';
if (isset($_COOKIE['user'])) {
    $user = json_decode($_COOKIE['user'], true);
    $employee_name = $user['name'] ?? '';
}


$wbs = isset($_POST['wbs']) ? trim($_POST['wbs']) : '';
$request = isset($_POST['request']) ? trim($_POST['request']) : '';
$status = isset($_POST['status']) ? trim($_POST['status']) : 'REQUESTED';

$where = [];
$params = [];    // <-- ADD THIS
$types = '';     // <-- AND THIS

// Base query and condition arrays
$query = "
    SELECT inspection_no, wbs, description, request, status, remarks, requestor, date_time, company 
FROM inspection_request 
WHERE status = ? AND approval = 'NONE'
";

$params[] = $status;
$types .= 's';

// Apply WBS filter
if ($wbs !== '') {
    $where[] = 'wbs LIKE ?';
    $params[] = '%' . $wbs . '%';
    $types .= 's';
}

// Apply request filter with custom mapping
if ($request !== '') {
    if ($request === 'Final Inspection') {
        $where[] = 'inspection_no IN (SELECT inspection_no FROM inspection_final_sub WHERE type_of_inspection = ?)';
        $params[] = 'final-inspection';
        $types .= 's';
    } elseif ($request === 'Sub-Assembly Inspection') {
        $where[] = 'inspection_no IN (SELECT inspection_no FROM inspection_final_sub WHERE type_of_inspection = ?)';
        $params[] = 'sub-assembly';
        $types .= 's';
    } elseif ($request === 'Incoming Inspection') {
        $where[] = 'inspection_no IN (SELECT inspection_no FROM inspection_incoming_outgoing WHERE type_of_inspection = ?)';
        $params[] = 'incoming';
        $types .= 's';
    } elseif ($request === 'Outgoing Inspection') {
        $where[] = 'inspection_no IN (SELECT inspection_no FROM inspection_incoming_outgoing WHERE type_of_inspection = ?)';
        $params[] = 'outgoing';
        $types .= 's';
    } else {
        $where[] = 'request = ?';
        $params[] = $request;
        $types .= 's';
    }
}

// Append dynamic conditions
if (!empty($where)) {
    $query .= ' AND ' . implode(' AND ', $where);
}

$query .= ' ORDER BY request DESC';

$stmt = $conn->prepare($query);

if ($types) {
    $stmt->bind_param($types, ...$params);
}

$stmt->execute();
$result = $stmt->get_result();

// Output table rows
if ($result && $result->num_rows > 0) {
    while ($row = $result->fetch_assoc()) {

        $typeOfInspection = null;
        $sub = $conn->prepare(
            '   SELECT type_of_inspection 
                FROM inspection_final_sub 
                WHERE inspection_no = ?'
        );
        $sub->bind_param('i', $row['inspection_no']);
        $sub->execute();
        $sub->bind_result($type);
        if ($sub->fetch()) {
            $typeOfInspection = $type;
        }
        $sub->close();

        // 2) If still null, try INCOMING/OUTGOING
        if ($typeOfInspection === null) {
            $sub = $conn->prepare(
                '   SELECT type_of_inspection 
                    FROM inspection_incoming_outgoing 
                    WHERE inspection_no = ?'
            );
            $sub->bind_param('i', $row['inspection_no']);
            $sub->execute();
            $sub->bind_result($type);
            if ($sub->fetch()) {
                $typeOfInspection = $type;
            }
            $sub->close();
        }

        $name = $row['requestor'];

        // Split into words
        $parts = explode(' ', $name);

        // Take first name and first letter of last name
        $firstName = $parts[0];
        $lastInitial = substr($parts[1], 0, 1);

        // Combine
        $shortName = $firstName . ' ' . $lastInitial . '.';

        $rowClass = '';
        if (strtolower($row['company']) == 'rti') {
            $rowClass = 'company-rti';
        } elseif (strtolower($row['company']) == 'ssd') {
            $rowClass = 'company-ssd';
        }

        echo '<tr class="' . $rowClass . '">';
        echo '<td data-inspection-no="' . htmlspecialchars($row['inspection_no']) . '">' . htmlspecialchars($row['inspection_no']) . '</td>';
        echo '<td>' . htmlspecialchars($row['wbs']) . '</td>';
        echo '<td>' . htmlspecialchars($row['description']) . '</td>';

        if ($typeOfInspection === 'final-inspection') {
            echo '<td>Final Inspection</td>';
        } elseif ($typeOfInspection === 'sub-assembly') {
            echo '<td>Sub-Assembly Inspection</td>';
        } elseif ($typeOfInspection === 'incoming') {
            echo '<td>Incoming Inspection</td>';
        } elseif ($typeOfInspection === 'outgoing') {
            echo '<td>Outgoing Inspection</td>';
        } else {
            echo '<td>' . htmlspecialchars($row['request']) . '</td>';
        }

        echo '<td>' . htmlspecialchars($shortName) . '</td>';
        echo '<td>' . htmlspecialchars($row['date_time']) . '</td>';

        $statusClass = '';
        if ($row['status'] === 'REQUESTED') {
            $statusClass = 'status-requested';
        } elseif ($row['status'] === 'PE CALIBRATION') {
            $statusClass = 'status-pe-calibration';
        } else {
            $statusClass = 'status-' . strtolower(str_replace(' ', '-', $row['status']));
        }

        echo '<td class="' . $statusClass . '">' . htmlspecialchars($row['status']) . '</td>';

        echo '<td class="action-cell"><button class="hamburger-icon"><i class="fas fa-bars"></i></button></td>';
        echo '<td><i class="fa-solid fa-clock-rotate-left history-button"></i></td>';
        echo '</tr>';
    }
} else {
    echo '<tr><td colspan="9">No records found</td></tr>';
}

$conn->close();
