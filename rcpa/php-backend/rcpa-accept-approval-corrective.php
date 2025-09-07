<?php
// php-backend/rcpa-accept-approval-corrective.php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
// Make sure PHP notices/warnings don't leak into the JSON:
ini_set('display_errors', '0');

require_once '../../connection.php';

// Require logged-in user (for history + signature)
if (!isset($_COOKIE['user'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Not logged in']);
    exit;
}
$user = json_decode($_COOKIE['user'] ?? 'null', true);
if (!$user || !is_array($user)) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Invalid user cookie']);
    exit;
}
$user_name = $user['name'] ?? 'Unknown User';

$db = isset($mysqli) && $mysqli instanceof mysqli ? $mysqli
    : (isset($conn) && $conn instanceof mysqli ? $conn : null);
if (!$db) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'DB connection not found']);
    exit;
}
$db->set_charset('utf8mb4');

$id = isset($_POST['id']) ? (int)$_POST['id'] : 0; // rcpa_request.id
if ($id <= 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Missing or invalid id']);
    exit;
}

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    $db->begin_transaction();

    // 1) Read conformance for this request (and lock row)
    $conf = null;
    $sel = $db->prepare("SELECT conformance FROM rcpa_request WHERE id=? FOR UPDATE");
    $sel->bind_param('i', $id);
    $sel->execute();
    $sel->bind_result($conf);
    if (!$sel->fetch()) {
        $sel->close();
        throw new Exception('No matching rcpa_request row found');
    }
    $sel->close();

    // 2) Update status
    $newStatus = 'EVIDENCE CHECKING';
    $upd = $db->prepare("
        UPDATE rcpa_request
           SET status = ?
         WHERE id = ?
         LIMIT 1
    ");
    $upd->bind_param('si', $newStatus, $id);
    $upd->execute();
    if ($upd->affected_rows < 1) {
        $upd->close();
        throw new Exception('No matching rcpa_request row found to update');
    }
    $upd->close();

    // 3) History (if table exists)
    if ($db->query("SHOW TABLES LIKE 'rcpa_request_history'")->num_rows > 0) {
        $rcpa_no_str = (string)$id;
        $activity = 'The Assignee Supervisor/Manager approved the Assignee corrective action evidence approval';
        $hist = $db->prepare("INSERT INTO rcpa_request_history (rcpa_no, name, activity) VALUES (?,?,?)");
        $hist->bind_param('sss', $rcpa_no_str, $user_name, $activity);
        $hist->execute();
        $hist->close();
    }

    $db->commit();

    echo json_encode([
        'success'      => true,
        'status'       => $newStatus,
        'conformance'  => $conf
    ]);
    exit;
} catch (Throwable $e) {
    $db->rollback();
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    exit;
}
