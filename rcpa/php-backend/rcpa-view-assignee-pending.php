<?php
// php-backend/rcpa-view-assignee-pending.php
header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../../connection.php'; // $conn mysqli

$id = isset($_GET['id']) ? $_GET['id'] : null;
if ($id === null || !ctype_digit((string)$id)) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing or invalid id']);
    exit;
}

try {
    if (!isset($conn) || !($conn instanceof mysqli)) {
        throw new Exception('Database connection not available as $conn');
    }
    $conn->set_charset('utf8mb4');

    // ---------- Main record ----------
    $sql = "SELECT id, rcpa_type, sem_year, project_name, wbs_number, quarter, category,
               originator_name, originator_department, date_request, conformance, remarks,
               remarks_attachment, system_applicable_std_violated, standard_clause_number,
               originator_supervisor_head, assignee, section, status, close_due_date
        FROM rcpa_request
        WHERE id = ?";

    $stmt = $conn->prepare($sql);
    if (!$stmt) throw new Exception('Prepare failed: ' . $conn->error);
    $stmt->bind_param('i', $id);
    if (!$stmt->execute()) throw new Exception('Execute failed: ' . $stmt->error);
    $res = $stmt->get_result();
    $row = $res->fetch_assoc();
    // format close_due_date as YYYY-MM-DD or null
    if (isset($row['close_due_date'])) {
        $row['close_due_date'] = $row['close_due_date']
            ? date('Y-m-d', strtotime($row['close_due_date']))
            : null;
    }
    $stmt->close();

    if (!$row) {
        http_response_code(404);
        echo json_encode(['error' => 'Not found']);
        exit;
    }

    // ---------- Disapproval remarks ----------
    $rejects = [];
    $rsql = "SELECT id, disapprove_type, remarks, attachments, created_at
             FROM rcpa_disapprove_remarks
             WHERE rcpa_no = ?
             ORDER BY created_at DESC, id DESC";
    if ($st2 = $conn->prepare($rsql)) {
        $st2->bind_param('i', $id);
        if ($st2->execute()) {
            $rres = $st2->get_result();
            while ($r = $rres->fetch_assoc()) {
                $rejects[] = $r;
            }
        }
        $st2->close();
    }

    // ---------- Findings In-Validation reply ----------
    $invalidData = [];
    $invalidSql = "SELECT reason_non_valid, assignee_name, assignee_date, assignee_supervisor_name, assignee_supervisor_date, attachment
                   FROM rcpa_not_valid
                   WHERE rcpa_no = ?
                   ORDER BY id DESC
                   LIMIT 1";
    if ($st3 = $conn->prepare($invalidSql)) {
        $st3->bind_param('i', $id);
        if ($st3->execute()) {
            $resInvalid = $st3->get_result();
            $invalidData = $resInvalid->fetch_assoc() ?: [];
        }
        $st3->close();
    }

    // ---------- NEW: Assignee Validation (Valid Findings) ----------
    // Pull latest entry from both tables (if any) and return; frontend decides which to render.
    $validNC = null;
    $ncSql = "SELECT root_cause, correction, correction_target_date, correction_date_completed,
                     corrective, corrective_target_date, corrective_date_completed,
                     assignee_name, assignee_date, assignee_supervisor_name, assignee_supervisor_date, attachment
              FROM rcpa_valid_non_conformance
              WHERE rcpa_no = ?
              ORDER BY id DESC
              LIMIT 1";
    if ($st4 = $conn->prepare($ncSql)) {
        $st4->bind_param('i', $id);
        if ($st4->execute()) {
            $ncRes = $st4->get_result();
            $validNC = $ncRes->fetch_assoc() ?: null;
        }
        $st4->close();
    }

    $validPNC = null;
    $pncSql = "SELECT root_cause, preventive_action, preventive_target_date, preventive_date_completed,
                      assignee_name, assignee_date, assignee_supervisor_name, assignee_supervisor_date, attachment
               FROM rcpa_valid_potential_conformance
               WHERE rcpa_no = ?
               ORDER BY id DESC
               LIMIT 1";
    if ($st5 = $conn->prepare($pncSql)) {
        $st5->bind_param('i', $id);
        if ($st5->execute()) {
            $pncRes = $st5->get_result();
            $validPNC = $pncRes->fetch_assoc() ?: null;
        }
        $st5->close();
    }

    // ---------- Compose response ----------
    $row['rejects'] = $rejects;
    $row['findings_invalidation'] = $invalidData;
    $row['validation_assignee'] = [
        'nc'  => $validNC,
        'pnc' => $validPNC
    ];

    echo json_encode($row, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Server error', 'detail' => $e->getMessage()]);
}
