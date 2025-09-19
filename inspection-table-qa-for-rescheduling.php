<?php
session_start();
include 'connection.php';

$user = json_decode($_COOKIE['user'], true);

$privilege = $user['privilege'] ?? '';

// Collect filters
$wbs     = isset($_POST['wbs'])     ? trim($_POST['wbs'])     : '';
$request = isset($_POST['request']) ? trim($_POST['request']) : '';

// Base query: statuses PENDING, REQUESTED or RESCHEDULED + FOR RESCHEDULE
$query = "
    SELECT inspection_no, wbs, description, request, status, remarks, requestor, date_time, company 
      FROM inspection_request 
     WHERE (status = 'PENDING'
            OR status = 'REQUESTED'
            OR status = 'RESCHEDULED')
       AND approval = 'FOR RESCHEDULE'
";

// Build additional filters
$where   = [];
$params  = [];
$types   = '';

// WBS filter
if ($wbs !== '') {
    $where[]  = 'wbs LIKE ?';
    $params[] = "%{$wbs}%";
    $types   .= 's';
}

// Request filter → maps to your sub‐tables
if ($request !== '') {
    switch ($request) {
        case 'Final Inspection':
            $where[]  = 'inspection_no IN (
                             SELECT inspection_no
                               FROM inspection_final_sub
                              WHERE type_of_inspection = ?
                         )';
            $params[] = 'final-inspection';
            $types   .= 's';
            break;
        case 'Sub-Assembly Inspection':
            $where[]  = 'inspection_no IN (
                             SELECT inspection_no
                               FROM inspection_final_sub
                              WHERE type_of_inspection = ?
                         )';
            $params[] = 'sub-assembly';
            $types   .= 's';
            break;
        case 'Incoming Inspection':
            $where[]  = 'inspection_no IN (
                             SELECT inspection_no
                               FROM inspection_incoming_outgoing
                              WHERE type_of_inspection = ?
                         )';
            $params[] = 'incoming';
            $types   .= 's';
            break;
        case 'Outgoing Inspection':
            $where[]  = 'inspection_no IN (
                             SELECT inspection_no
                               FROM inspection_incoming_outgoing
                              WHERE type_of_inspection = ?
                         )';
            $params[] = 'outgoing';
            $types   .= 's';
            break;
        default:
            $where[]  = 'request = ?';
            $params[] = $request;
            $types   .= 's';
    }
}

// Append dynamic WHERE clauses
if (!empty($where)) {
    $query .= "\n  AND " . implode("\n  AND ", $where);
}

// Final ORDER BY
$query .= "\n  ORDER BY request DESC";

$stmt = $conn->prepare($query);

// Bind filter params
if ($types) {
    $stmt->bind_param($types, ...$params);
}

$stmt->execute();
$result = $stmt->get_result();

if ($result && $result->num_rows > 0) {
    while ($row = $result->fetch_assoc()) {
        // — two‐step inspection‐type lookup —
        $typeOfInspection = null;

        // 1) final_sub
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

        // 2) incoming_outgoing
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

        // — shorten requestor name —
        $parts       = explode(' ', $row['requestor']);
        $firstName   = $parts[0] ?? '';
        $lastInitial = isset($parts[1]) ? substr($parts[1], 0, 1) : '';
        $shortName   = trim("{$firstName} {$lastInitial}.");

        // — output row —
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

        // mapped inspection‐type cell
        switch ($typeOfInspection) {
            case 'final-inspection':
                echo '<td>Final Inspection</td>';
                break;
            case 'sub-assembly':
                echo '<td>Sub-Assembly Inspection</td>';
                break;
            case 'incoming':
                echo '<td>Incoming Inspection</td>';
                break;
            case 'outgoing':
                echo '<td>Outgoing Inspection</td>';
                break;
            default:
                echo '<td>' . htmlspecialchars($row['request']) . '</td>';
        }

        echo '<td>' . htmlspecialchars($shortName)        . '</td>';
        echo '<td>' . htmlspecialchars($row['date_time']) . '</td>';
        echo '<td class="status-for-approval">FOR APPROVAL</td>';

        // privilege‐based action
        if ($privilege === 'QA-Head-Inspection') {
            echo '<td class="action-cell">
                      <button class="hamburger-icon">
                        <i class="fas fa-bars"></i>
                      </button>
                    </td>';
        } else {
            echo '<td><button class="view-btn">View</button></td>';
        }

        echo '<td>
                  <i class="fa-solid fa-clock-rotate-left history-button"></i>
                </td>';
        echo '</tr>';
    }
} else {
    echo '<tr><td colspan="9">No records found</td></tr>';
}

$conn->close();
