<?php
header('Content-Type: application/json');
require_once '../../connection.php';

// Require logged-in user (for history + signature)
if (!isset($_COOKIE['user'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Not logged in']);
    exit;
}
$user = json_decode($_COOKIE['user'], true);
if (!$user || !is_array($user)) {
    http_response_code(401);
    echo json_encode(['error' => 'Invalid user cookie']);
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

$id = isset($_POST['id']) ? (int)$_POST['id'] : 0; // rcpa_request.id (same as rcpa_no in validity tables)
if ($id <= 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Missing or invalid id']);
    exit;
}

try {
    $db->begin_transaction();

    // 1) Read conformance for this request
    $conf = null;
    if (!($sel = $db->prepare("SELECT conformance FROM rcpa_request WHERE id=? FOR UPDATE"))) {
        throw new Exception('Prepare failed for conformance select');
    }
    $sel->bind_param('i', $id);
    if (!$sel->execute()) {
        $err = $sel->error;
        $sel->close();
        throw new Exception($err ?: 'Execute failed for conformance select');
    }
    $sel->bind_result($conf);
    if (!$sel->fetch()) {
        $sel->close();
        throw new Exception('No matching rcpa_request row found');
    }
    $sel->close();

    // Normalize conformance (be tolerant to case/hyphens/extra spaces)
    $norm = strtolower(trim(preg_replace('/[\s_-]+/', ' ', (string)$conf)));
    $is_nc  = ($norm === 'non conformance' || $norm === 'non-conformance' || $norm === 'nonconformance' || $norm === 'nc');
    $is_pnc = ($norm === 'potential non conformance' || $norm === 'potential non-conformance' || $norm === 'pnc' || strpos($norm, 'potential') !== false);

   
    $newStatus = 'FOR CLOSING';
    $upd = $db->prepare("
    UPDATE rcpa_request
    SET status = ?
    WHERE id = ?
    ");
    if (!$upd) throw new Exception('Prepare failed for status update');
    $upd->bind_param('si', $newStatus, $id);
    if (!$upd->execute()) {
        $err = $upd->error;
        $upd->close();
        throw new Exception($err ?: 'Execute failed for status update');
    }
    if ($upd->affected_rows < 1) {
        $upd->close();
        throw new Exception('No matching rcpa_request row found to update');
    }
    $upd->close();

    // 3) Stamp supervisor on the correct validity table (only one)
    $updated_nc = 0;
    $updated_pnc = 0;

    if ($is_nc && !$is_pnc) {
        if ($stmt = $db->prepare("
            UPDATE rcpa_valid_non_conformance
            SET assignee_supervisor_name = ?, assignee_supervisor_date = CURDATE()
            WHERE rcpa_no = ?
        ")) {
            $stmt->bind_param('si', $user_name, $id);
            $stmt->execute();
            $updated_nc = $stmt->affected_rows;
            $stmt->close();
        }
    } elseif ($is_pnc && !$is_nc) {
        if ($stmt = $db->prepare("
            UPDATE rcpa_valid_potential_conformance
            SET assignee_supervisor_name = ?, assignee_supervisor_date = CURDATE()
            WHERE rcpa_no = ?
        ")) {
            $stmt->bind_param('si', $user_name, $id);
            $stmt->execute();
            $updated_pnc = $stmt->affected_rows;
            $stmt->close();
        }
    } else {
        // If it's neither clearly NC nor PNC, we won't guess—leave both at 0 updates.
        // You could throw an Exception here if you want to enforce strict values.
    }

    // 4) History (exact wording)
    if ($db->query("SHOW TABLES LIKE 'rcpa_request_history'")->num_rows > 0) {
        $rcpa_no_str = (string)$id;
        $activity = 'The QA/QMS Supervisor/Manager approved the validation reply approval';
        if ($hist = $db->prepare("INSERT INTO rcpa_request_history (rcpa_no, name, activity) VALUES (?,?,?)")) {
            $hist->bind_param('sss', $rcpa_no_str, $user_name, $activity);
            $hist->execute();
            $hist->close();
        }
    }

    $db->commit();
    echo json_encode([
        'success' => true,
        'updated_nc' => $updated_nc,
        'updated_pnc' => $updated_pnc,
        'conformance' => $conf
    ]);
} catch (Throwable $e) {
    $db->rollback();
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
