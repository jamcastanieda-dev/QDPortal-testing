<?php
// php-backend/rcpa-view-approval-corrective.php
header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../../connection.php'; // $conn (mysqli)

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

    // main row
    $sql = "SELECT id, rcpa_type, sem_year, project_name, wbs_number, quarter, category,
                   originator_name, originator_department, date_request, conformance, remarks,
                   remarks_attachment, system_applicable_std_violated, standard_clause_number,
                   originator_supervisor_head, assignee, status
            FROM rcpa_request
            WHERE id = ?";
    $stmt = $conn->prepare($sql);
    if (!$stmt) throw new Exception('Prepare failed: ' . $conn->error);
    $stmt->bind_param('i', $id);
    if (!$stmt->execute()) throw new Exception('Execute failed: ' . $stmt->error);
    $res = $stmt->get_result();
    $row = $res->fetch_assoc();
    $stmt->close();

    if (!$row) {
        http_response_code(404);
        echo json_encode(['error' => 'Not found']);
        exit;
    }

    // disapproval remarks for this rcpa
    $rejects = [];
    $rejSql = "SELECT id, disapprove_type, remarks, attachments, created_at
               FROM rcpa_disapprove_remarks
               WHERE rcpa_no = ?
               ORDER BY created_at DESC, id DESC";
    if ($rej = $conn->prepare($rejSql)) {
        $rej->bind_param('i', $id);
        $rej->execute();
        $rejRes = $rej->get_result();
        while ($r = $rejRes->fetch_assoc()) {
            $rejects[] = $r;
        }
        $rej->close();
    }
    $row['rejects'] = $rejects;

    // === Latest corrective action evidence (renamed table/columns) ===
    $caSql = "SELECT id, rcpa_no, remarks, attachment, created_at
              FROM rcpa_corrective_evidence
              WHERE rcpa_no = ?
              ORDER BY created_at DESC, id DESC
              LIMIT 1";
    if ($caStmt = $conn->prepare($caSql)) {
        $caStmt->bind_param('i', $id);
        $caStmt->execute();
        $caRes = $caStmt->get_result();
        $ca = $caRes->fetch_assoc();
        $caStmt->close();

        if ($ca) {
            // Full object (keys now: remarks, attachment)
            $row['corrective_action'] = $ca;

            // Back-compat convenience fields
            $row['corrective_action_remarks'] = $ca['remarks'];
            $row['corrective_action_attachment'] = $ca['attachment'];
        } else {
            $row['corrective_action'] = null;
            $row['corrective_action_remarks'] = '';
            $row['corrective_action_attachment'] = '';
        }
    }

    // === NEW: Latest Evidence Checking (rcpa_evidence_checking_remarks) ===
    // Note: table columns used: id, rcpa_no, action_done, remarks, attachment
    // (no reliance on created_at to keep this compatible with your schema)
    $evSql = "SELECT id, rcpa_no, action_done, remarks, attachment
              FROM rcpa_evidence_checking_remarks
              WHERE rcpa_no = ?
              ORDER BY id DESC
              LIMIT 1";
    if ($evStmt = $conn->prepare($evSql)) {
        $evStmt->bind_param('i', $id);
        $evStmt->execute();
        $evRes = $evStmt->get_result();
        $ev = $evRes->fetch_assoc();
        $evStmt->close();

        if ($ev) {
            $row['evidence_checking'] = $ev; // object with action_done, remarks, attachment
            // convenience fields for the UI
            $row['evidence_checking_action_done'] = $ev['action_done'];
            $row['evidence_checking_remarks'] = $ev['remarks'];
            $row['evidence_checking_attachment'] = $ev['attachment'];
        } else {
            $row['evidence_checking'] = null;
            $row['evidence_checking_action_done'] = null;
            $row['evidence_checking_remarks'] = '';
            $row['evidence_checking_attachment'] = '';
        }
    }

    echo json_encode($row, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Server error', 'detail' => $e->getMessage()]);
}
