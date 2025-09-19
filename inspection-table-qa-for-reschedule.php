<?php
include 'connection.php';

$employee_name = '';
if (isset($_COOKIE['user'])) {
    $user = json_decode($_COOKIE['user'], true);
    $employee_name = $user['name'] ?? '';
}


// Grab filters from POST
$wbs     = isset($_POST['wbs'])     ? trim($_POST['wbs'])     : '';
$request = isset($_POST['request']) ? trim($_POST['request']) : '';

// Base SQL: only FOR RESCHEDULE & approved
$sql    = "
    SELECT
      ir.inspection_no,
      ir.wbs,
      ir.description,
      ir.request,
      ir.status,
      ir.remarks,
      ir.requestor,
      ir.date_time,
      ir.company
    FROM inspection_request AS ir
    WHERE ir.status = 'FOR RESCHEDULE'
      AND ir.approval = 'RESCHEDULE APPROVED'
";
$where  = [];
$params = [];
$types  = '';

// WBS filter
if ($wbs !== '') {
    $where[]   = 'ir.wbs LIKE ?';
    $params[]  = "%{$wbs}%";
    $types    .= 's';
}

// Request-type filter (human labels → internal codes)
if ($request !== '') {
    switch ($request) {
        case 'Final Inspection':
            $where[]  = 'ir.inspection_no IN (
                            SELECT inspection_no
                              FROM inspection_final_sub
                             WHERE type_of_inspection = ?
                         )';
            $params[] = 'final-inspection';
            $types   .= 's';
            break;
        case 'Sub-Assembly Inspection':
            $where[]  = 'ir.inspection_no IN (
                            SELECT inspection_no
                              FROM inspection_final_sub
                             WHERE type_of_inspection = ?
                         )';
            $params[] = 'sub-assembly';
            $types   .= 's';
            break;
        case 'Incoming Inspection':
            $where[]  = 'ir.inspection_no IN (
                            SELECT inspection_no
                              FROM inspection_incoming_outgoing
                             WHERE type_of_inspection = ?
                         )';
            $params[] = 'incoming';
            $types   .= 's';
            break;
        case 'Outgoing Inspection':
            $where[]  = 'ir.inspection_no IN (
                            SELECT inspection_no
                              FROM inspection_incoming_outgoing
                             WHERE type_of_inspection = ?
                         )';
            $params[] = 'outgoing';
            $types   .= 's';
            break;
        default:
            $where[]  = 'ir.request = ?';
            $params[] = $request;
            $types   .= 's';
    }
}

// Append dynamic WHERE clauses
if (!empty($where)) {
    $sql .= ' AND ' . implode(' AND ', $where);
}

// Order
$sql .= ' ORDER BY ir.request DESC';

$stmt = $conn->prepare($sql);
if ($stmt === false) {
    die("Prepare failed: " . htmlspecialchars($conn->error));
}

// Bind filters
if ($types !== '') {
    $stmt->bind_param($types, ...$params);
}

$stmt->execute();
$result = $stmt->get_result();

// Render rows
if ($result && $result->num_rows > 0) {
    while ($row = $result->fetch_assoc()) {
        // 1) Try final/sub lookup
        $typeOfInspection = null;
        $sub = $conn->prepare(
            'SELECT type_of_inspection
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

        // 2) If still null, try incoming/outgoing
        if ($typeOfInspection === null) {
            $sub = $conn->prepare(
                'SELECT type_of_inspection
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

        // Shorten requestor name: First + last initial
        $parts       = explode(' ', $row['requestor'], 2);
        $firstName   = $parts[0];
        $lastInitial = isset($parts[1])
            ? strtoupper(substr($parts[1], 0, 1)) . '.'
            : '';
        $shortName   = $firstName . ($lastInitial ? " {$lastInitial}" : '');

        // Map code → label
        switch ($typeOfInspection) {
            case 'final-inspection':
                $label = 'Final Inspection';
                break;
            case 'sub-assembly':
                $label = 'Sub-Assembly Inspection';
                break;
            case 'incoming':
                $label = 'Incoming Inspection';
                break;
            case 'outgoing':
                $label = 'Outgoing Inspection';
                break;
            default:
                $label = htmlspecialchars($row['request']);
        }

        $rowClass = '';
        if (isset($row['company'])) {
            if (strtolower($row['company']) === 'rti') {
                $rowClass = 'company-rti';
            } elseif (strtolower($row['company']) === 'ssd') {
                $rowClass = 'company-ssd';
            }
        }

        echo '<tr class="' . $rowClass . '">';
        echo '<td data-inspection-no="' . htmlspecialchars($row['inspection_no']) . '">' . htmlspecialchars($row['inspection_no']) . '</td>';
        echo '<td>' . htmlspecialchars($row['wbs'])           . '</td>';
        echo '<td>' . htmlspecialchars($row['description'])   . '</td>';
        echo '<td>' . $label                                  . '</td>';
        echo '<td>' . htmlspecialchars($shortName)            . '</td>';
        echo '<td>' . htmlspecialchars($row['date_time'])     . '</td>';
        echo '<td class="status-for-reschedule">'
            . htmlspecialchars($row['status'])
            . '</td>';
        echo '<td><button class="view-btn">View</button></td>';
        echo '<td><i class="fa-solid fa-clock-rotate-left history-button"></i></td>';
        echo '</tr>';
    }
} else {
    echo '<tr><td colspan="9">No records found</td></tr>';
}

$conn->close();
