<?php
// php-backend/rcpa-view-approval-valid.php
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

    // ship as part of the same object the JS already expects
    $row['rejects'] = $rejects;

    echo json_encode($row, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Server error', 'detail' => $e->getMessage()]);
}
