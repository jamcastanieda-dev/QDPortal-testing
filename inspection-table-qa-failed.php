<?php
include 'connection.php';

$notViewedInspections = [];
$resNotViewed = $conn->query("SELECT inspection_no FROM inspection_failed_notification");
if ($resNotViewed) {
    while ($rowNotViewed = $resNotViewed->fetch_assoc()) {
        $notViewedInspections[] = $rowNotViewed['inspection_no'];
    }
}

$employee_name = '';
if (isset($_COOKIE['user'])) {
    $user = json_decode($_COOKIE['user'], true);
    $employee_name = $user['name'] ?? '';
}

// Grab filters from POST
$wbs     = isset($_POST['wbs'])     ? trim($_POST['wbs'])     : '';
$request = isset($_POST['request']) ? trim($_POST['request']) : '';
$viewStatus = isset($_POST['view_status']) ? trim($_POST['view_status']) : '';

// Base SQL and dynamic WHERE builder
$sql    = "
    SELECT
      ir.inspection_no,
      ir.wbs,
      ir.description,
      ir.request,
      ir.status,
      ir.requestor,
      ir.date_time,
      ir.company
    FROM inspection_request AS ir
    WHERE ir.status = 'FAILED'
";
$where  = [];
$params = [];
$types  = '';

// === View Status Filter ===
if ($viewStatus === 'unviewed') {
    if (count($notViewedInspections)) {
        $placeholders = implode(',', array_fill(0, count($notViewedInspections), '?'));
        $where[] = "ir.inspection_no IN ($placeholders)";
        foreach ($notViewedInspections as $id) {
            $params[] = $id;
            $types .= 's';
        }
    } else {
        // No unviewed: force no results
        $where[] = "0";
    }
} elseif ($viewStatus === 'viewed') {
    if (count($notViewedInspections)) {
        $placeholders = implode(',', array_fill(0, count($notViewedInspections), '?'));
        $where[] = "ir.inspection_no NOT IN ($placeholders)";
        foreach ($notViewedInspections as $id) {
            $params[] = $id;
            $types .= 's';
        }
    }
    // If no unviewed: show all as viewed
}


// — WBS filter
if ($wbs !== '') {
    $where[]  = 'ir.wbs LIKE ?';
    $params[] = "%{$wbs}%";
    $types   .= 's';
}

// — Request-type filter
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

// Append dynamic WHEREs if any
if (!empty($where)) {
    $sql .= ' AND ' . implode(' AND ', $where);
}

// Ordering
$sql .= ' ORDER BY ir.request DESC';

$stmt = $conn->prepare($sql);
if (!$stmt) {
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
        // 1) final/sub lookup
        $typeOfInspection = null;
        $sub = $conn->prepare("
            SELECT type_of_inspection
              FROM inspection_final_sub
             WHERE inspection_no = ?
        ");
        $sub->bind_param('i', $row['inspection_no']);
        $sub->execute();
        $sub->bind_result($type);
        if ($sub->fetch()) {
            $typeOfInspection = $type;
        }
        $sub->close();

        // 2) fallback to incoming/outgoing
        if ($typeOfInspection === null) {
            $sub = $conn->prepare("
                SELECT type_of_inspection
                  FROM inspection_incoming_outgoing
                 WHERE inspection_no = ?
            ");
            $sub->bind_param('i', $row['inspection_no']);
            $sub->execute();
            $sub->bind_result($type);
            if ($sub->fetch()) {
                $typeOfInspection = $type;
            }
            $sub->close();
        }

        // 3) map to human label
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

        // 4) short requestor name
        $parts       = explode(' ', trim($row['requestor']), 2);
        $firstName   = $parts[0] ?? '';
        $lastInitial = isset($parts[1]) ? strtoupper(substr($parts[1], 0, 1)) . '.' : '';
        $shortName   = $firstName . ($lastInitial ? " {$lastInitial}" : '');

        // 5) output the <tr>
        $rowClass = '';
        if (isset($row['company'])) {
            if (strtolower($row['company']) === 'rti') {
                $rowClass = 'company-rti';
            } elseif (strtolower($row['company']) === 'ssd') {
                $rowClass = 'company-ssd';
            }
        }

        echo '<tr class="' . $rowClass . '">';
          // --- INSPECTION_NO CELL WITH DATA ATTRIBUTE! ---
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
        echo '<td>' . htmlspecialchars($row['description'])   . '</td>';
        echo '<td>' . $label                                  . '</td>';
        echo '<td>' . htmlspecialchars($shortName)            . '</td>';
        echo '<td>' . htmlspecialchars($row['date_time'])     . '</td>';
        echo '<td class="status-failed">'
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
