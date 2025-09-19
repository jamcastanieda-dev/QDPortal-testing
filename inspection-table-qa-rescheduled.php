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
    WHERE ir.status   = 'RESCHEDULED'
      AND ir.approval = 'NONE'
";
$where  = [];
$params = [];
$types  = '';

// — WBS filter
if ($wbs !== '') {
    $where[]  = 'ir.wbs LIKE ?';
    $params[] = "%{$wbs}%";
    $types   .= 's';
}

// — Request-type filter (human label → internal code)
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
            break;
    }
}

// Append WHERE clauses if any
if (!empty($where)) {
    $sql .= ' AND ' . implode(' AND ', $where);
}

// Final ordering
$sql .= ' ORDER BY ir.request DESC';

$stmt = $conn->prepare($sql);
if ($stmt === false) {
    die("Prepare failed: " . htmlspecialchars($conn->error));
}

// Bind filter params
if ($types !== '') {
    $stmt->bind_param($types, ...$params);
}

$stmt->execute();
$result = $stmt->get_result();

// Render rows
if ($result && $result->num_rows > 0) {
    while ($row = $result->fetch_assoc()) {
        // 1) Try FINAL/SUB lookup
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

        // 2) Fallback to INCOMING/OUTGOING
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

        // 3) Map to display label
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

        // 4) Shorten requestor name (First + last initial)
        $parts       = explode(' ', trim($row['requestor']), 2);
        $firstName   = $parts[0] ?? '';
        $lastInitial = isset($parts[1])
                     ? strtoupper(substr($parts[1], 0, 1)) . '.'
                     : '';
        $shortName   = $firstName . ($lastInitial ? " {$lastInitial}" : '');

        // 5) Output the row
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
        echo '<td class="status-rescheduled">'
             . htmlspecialchars($row['status'])
             . '</td>';

        // Action cell (hamburger unless status is CLOSED)
        if ($row['status'] !== 'CLOSED') {
            echo '<td class="action-cell">
                    <button class="hamburger-icon">
                      <i class="fas fa-bars"></i>
                    </button>
                  </td>';
        } else {
            echo '<td>CLOSED</td>';
        }

        // History button
        echo '<td>
                <i class="fa-solid fa-clock-rotate-left history-button">
                </i>
              </td>';
        echo '</tr>';
    }
} else {
    echo '<tr><td colspan="9">No records found</td></tr>';
}

$conn->close();
