<?php
include 'connection.php';

$employee_name = '';
if (isset($_COOKIE['user'])) {
    $user = json_decode($_COOKIE['user'], true);
    $employee_name = $user['name'] ?? '';
}
$wbs     = $_POST['wbs']     ?? '';
$request = $_POST['request'] ?? '';
$status  = $_POST['status']  ?? '';

$where = ['requestor = ?'];
$params = [$employee_name];
$types = 's';

if ($wbs !== '') {
    $where[] = 'wbs LIKE ?';
    $params[] = "%{$wbs}%";
    $types .= 's';
}

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

if ($status !== '') {
    $where[] = 'status = ?';
    $params[] = $status;
    $types .= 's';
}

$sql = "
    SELECT inspection_no, wbs, description, request, status, remarks, requestor, date_time, company
    FROM inspection_request
    WHERE " . implode(' AND ', $where) . "
    ORDER BY 
        CASE status
            WHEN 'REQUESTED' THEN 1
            WHEN 'PENDING' THEN 2
            WHEN 'FOR RESCHEDULE' THEN 3
            WHEN 'RESCHEDULED' THEN 4
            WHEN 'COMPLETED' THEN 5
            WHEN 'PASSED' THEN 6
            WHEN 'PASSED W/ FAILED' THEN 7
            WHEN 'REJECTED' THEN 8
            WHEN 'FAILED' THEN 9
            WHEN 'CANCELLED' THEN 10
            ELSE 11
        END,
        inspection_no ASC
";

$stmt = $conn->prepare($sql);
$stmt->bind_param($types, ...$params);
$stmt->execute();
$result = $stmt->get_result();

while ($row = $result->fetch_assoc()) {
    // 1) Try to fetch FINAL/SUB
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

    // 3) Now map to your label
    switch ($typeOfInspection) {
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
            $requestLabel = $row['request'];
    }

    if ($row['status'] == 'PASSED W/ FAILED') {
        $statusClass = 'status-pass-fail';
    } else {
        $statusClass = 'status-' . strtolower(str_replace(' ', '-', $row['status']));
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
    if (isset($row['company'])) {
        if (strtolower($row['company']) == 'rti') {
            $rowClass = 'company-rti';
        } elseif (strtolower($row['company']) == 'ssd') {
            $rowClass = 'company-ssd';
        }
    }


    echo "<tr class='{$rowClass}'>
    <td>{$row['inspection_no']}</td>
    <td>{$row['wbs']}</td>
    <td style='width: 20%;'>{$row['description']}</td>
    <td>{$requestLabel}</td>
    <td>{$shortName}</td>
    <td>{$row['date_time']}</td>
    <td class='{$statusClass}'>{$row['status']}</td>
    <td><button class='view-btn'>View</button></td>
    <td><i class='fa-solid fa-clock-rotate-left history-button'></i></td>
</tr>";
}

$conn->close();
