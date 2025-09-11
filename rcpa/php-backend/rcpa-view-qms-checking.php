<?php
// rcpa-view-qms-checking.php
header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../../connection.php';

$id = isset($_GET['id']) ? $_GET['id'] : null;
if ($id === null || !ctype_digit((string)$id)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Missing or invalid id']);
    exit;
}

try {
    if (!isset($conn) || !($conn instanceof mysqli)) {
        throw new Exception('Database connection not available as $conn');
    }
    $conn->set_charset('utf8mb4');

    // Main row
    $sql = "SELECT id, rcpa_type, sem_year, project_name, wbs_number, quarter, category,
               originator_name, originator_department, date_request, conformance, remarks,
               remarks_attachment, system_applicable_std_violated, standard_clause_number,
               originator_supervisor_head, assignee, section, status
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
        echo json_encode(['ok' => false, 'error' => 'Not found']);
        exit;
    }

    // Disapproval remarks for this RCPA
    $rejects = [];
    $rejSql = "SELECT id, disapprove_type, remarks, attachments, created_at
               FROM rcpa_disapprove_remarks
               WHERE rcpa_no = ?
               ORDER BY created_at DESC, id DESC";
    if ($rejStmt = $conn->prepare($rejSql)) {
        $rejStmt->bind_param('i', $id);
        $rejStmt->execute();
        $rejRes = $rejStmt->get_result();
        while ($r = $rejRes->fetch_assoc()) {
            $rejects[] = $r;
        }
        $rejStmt->close();
    }

    // Fetch the Findings In-Validation Reply data from `rcpa_not_valid`
    $invalidData = [];
    $invalidSql = "SELECT reason_non_valid, assignee_name, assignee_date, assignee_supervisor_name, assignee_supervisor_date, attachment
                   FROM rcpa_not_valid
                   WHERE rcpa_no = ?";
    if ($st3 = $conn->prepare($invalidSql)) {
        $st3->bind_param('i', $id);
        if ($st3->execute()) {
            $resInvalid = $st3->get_result();
            $invalidData = $resInvalid->fetch_assoc();
        }
        $st3->close();
    }

    // Combine all data
    $row['rejects'] = $rejects;
    $row['findings_invalidation'] = $invalidData;

    echo json_encode(['ok' => true, 'row' => $row, 'rejects' => $rejects], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Server error', 'detail' => $e->getMessage()]);
}
