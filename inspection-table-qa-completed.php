<?php
include 'connection.php';

$employee_name = '';
if (isset($_COOKIE['user'])) {
    $user = json_decode($_COOKIE['user'], true);
    $employee_name = $user['name'] ?? '';
}

// Grab and trim filter inputs
$wbsFilter     = isset($_POST['wbs'])     ? trim($_POST['wbs'])     : '';
$requestFilter = isset($_POST['request']) ? trim($_POST['request']) : '';
$status        = isset($_POST['status'])  ? trim($_POST['status'])  : '';
$viewStatus = isset($_POST['view_status']) ? trim($_POST['view_status']) : '';



// Base WHERE condition: COMPLETED or PASSED with COMPLETION APPROVED
$conditions = [
    "( (status = 'COMPLETED' AND approval = 'COMPLETION APPROVED')
     OR (status = 'PASSED'    AND approval = 'COMPLETION APPROVED')
     OR (status = 'PASSED W/ FAILED'    AND approval = 'COMPLETION APPROVED') )"
];
$types      = '';      // for bind_param
$bindValues = [];      // to collect values

// 1. Get all not-viewed inspection numbers
$notViewedInspections = [];
$query = "SELECT inspection_no FROM inspection_completed_notification";
$result = mysqli_query($conn, $query);

while ($notification = mysqli_fetch_assoc($result)) {
    $notViewedInspections[] = $notification['inspection_no'];
}

// 2. View status filter (IMPORTANT PART)
if ($viewStatus === 'unviewed') {
    if (count($notViewedInspections)) {
        $placeholders = implode(',', array_fill(0, count($notViewedInspections), '?'));
        $conditions[] = "ir.inspection_no IN ($placeholders)";
        $types .= str_repeat('s', count($notViewedInspections));
        foreach ($notViewedInspections as $id) {
            $bindValues[] = $id;
        }
    } else {
        // No unviewed inspections, so force no results
        $conditions[] = "0";
    }
} elseif ($viewStatus === 'viewed') {
    if (count($notViewedInspections)) {
        $placeholders = implode(',', array_fill(0, count($notViewedInspections), '?'));
        $conditions[] = "ir.inspection_no NOT IN ($placeholders)";
        $types .= str_repeat('s', count($notViewedInspections));
        foreach ($notViewedInspections as $id) {
            $bindValues[] = $id;
        }
    }
    // else: if there are no unviewed, all are viewed, so show all
}

// WBS partial match
if ($wbsFilter !== '') {
    $conditions[]   = "wbs LIKE ?";
    $types         .= 's';
    $bindValues[]   = "%{$wbsFilter}%";
}

if ($status !== '') {
    $conditions[] = 'status = ?';
    $bindValues[] = $status;
    $types .= 's';
}

// Request filter with custom mapping to type_of_inspection
if ($requestFilter !== '') {
    if ($requestFilter === 'Final Inspection') {
        // only those inspections whose final_sub record says "final-inspection"
        $conditions[]   = "inspection_no IN (
                               SELECT inspection_no
                                 FROM inspection_final_sub
                                WHERE type_of_inspection = ?
                           )";
        $types         .= 's';
        $bindValues[]   = 'final-inspection';
    } elseif ($requestFilter === 'Sub-Assembly Inspection') {
        // only those inspections whose final_sub record says "sub-assembly"
        $conditions[]   = "inspection_no IN (
                               SELECT inspection_no
                                 FROM inspection_final_sub
                                WHERE type_of_inspection = ?
                           )";
        $types         .= 's';
        $bindValues[]   = 'sub-assembly';
    } elseif ($requestFilter === 'Incoming Inspection') {
        $conditions[]   = "inspection_no IN (
                               SELECT inspection_no
                                 FROM inspection_incoming_outgoing
                                WHERE type_of_inspection = ?
                           )";
        $types         .= 's';
        $bindValues[]   = 'incoming';
    } elseif ($requestFilter === 'Outgoing Inspection') {
        $conditions[]   = "inspection_no IN (
                               SELECT inspection_no
                                 FROM inspection_incoming_outgoing
                                WHERE type_of_inspection = ?
                           )";
        $types         .= 's';
        $bindValues[]   = 'outgoing';
    } else {
        // anything else, filter against the request column itself
        $conditions[]   = "request = ?";
        $types         .= 's';
        $bindValues[]   = $requestFilter;
    }
}

// Build and prepare SQL
$whereClause = implode(' AND ', $conditions);
$sql = "
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
    FROM
        inspection_request AS ir
    WHERE
        {$whereClause}
    ORDER BY
        ir.inspection_no ASC
";

$stmt = $conn->prepare($sql)
    or die('Prepare failed: ' . $conn->error);

// Bind dynamic params if any
if ($types) {
    // MySQLi wants references
    $refs = [];
    foreach ($bindValues as $i => $val) {
        $refs[$i] = &$bindValues[$i];
    }
    array_unshift($refs, $types);
    call_user_func_array([$stmt, 'bind_param'], $refs);
}

$stmt->execute();
$result = $stmt->get_result();

// Render table rows
if ($result && $result->num_rows > 0) {
    while ($row = $result->fetch_assoc()) {
        // lookup type_of_inspection for display override
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
        $lastInitial = isset($parts[1]) ? substr($parts[1], 0, 1) : '';

        // Combine
        $shortName = $firstName . ($lastInitial ? ' ' . $lastInitial . '.' : '');

        $rowClass = '';
        if (isset($row['company'])) {
            if (strtolower($row['company']) === 'rti') {
                $rowClass = 'company-rti';
            } elseif (strtolower($row['company']) === 'ssd') {
                $rowClass = 'company-ssd';
            }
        }

        echo '<tr class="' . $rowClass . '">';
        if (in_array($row['inspection_no'], $notViewedInspections)) {
            echo '<td data-inspection-no="' . htmlspecialchars($row['inspection_no']) . '">
        <div class="tooltip-container">
            <i class="fa-solid fa-exclamation unviewed-request"></i>
            <span class="tooltip-text">Request not yet viewed.</span>
        </div>
        ' . htmlspecialchars($row['inspection_no']) . '
    </td>';
        } else {
            echo '<td data-inspection-no="' . htmlspecialchars($row['inspection_no']) . '">
        <div class="tooltip-container">
            <i class="fa-solid fa-check viewed-request"></i>
            <span class="tooltip-text">Request has been viewed.</span>
        </div>
        ' . htmlspecialchars($row['inspection_no']) . '
    </td>';
        }

        echo '<td>' . htmlspecialchars($row['wbs'])           . '</td>';
        echo '<td>' . htmlspecialchars($row['description']) . '</td>';

        // display human-friendly request/type
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
        if ($row['status'] == 'PASSED W/ FAILED') {
            echo '<td class="status-pass-fail">' . htmlspecialchars($row['status']) . '</td>';
        } else {
            echo '<td class="status-completed">' . htmlspecialchars($row['status']) . '</td>';
        }
        echo '<td><button class="view-btn">View</button></td>';
        echo '<td><i class="fa-solid fa-clock-rotate-left history-button"></i></td>';
        echo '</tr>';
    }
} else {
    echo '<tr><td colspan="9">No records found</td></tr>';
}

$stmt->close();
$conn->close();
