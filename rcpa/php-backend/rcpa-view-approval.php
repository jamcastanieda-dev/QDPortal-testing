<?php
// php-backend/rcpa-get.php
header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../../connection.php'; // adjust if your path differs

// Expect numeric id via GET
$id = isset($_GET['id']) ? $_GET['id'] : null;
if ($id === null || !ctype_digit((string)$id)) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing or invalid id']);
    exit;
}

try {
    // Assume your connection.php exposes $conn as mysqli
    if (!isset($conn) || !($conn instanceof mysqli)) {
        throw new Exception('Database connection not available as $conn');
    }
    $conn->set_charset('utf8mb4');

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

    if (!$row) {
        http_response_code(404);
        echo json_encode(['error' => 'Not found']);
        exit;
    }

    // Optional: format datetime consistently (leave as-is if you prefer)
    // if (!empty($row['date_request'])) {
    //   $row['date_request'] = date('Y-m-d H:i:s', strtotime($row['date_request']));
    // }

    echo json_encode($row, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Server error', 'detail' => $e->getMessage()]);
}
