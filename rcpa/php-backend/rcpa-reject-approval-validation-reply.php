<?php
// php-backend/rcpa-reject-approval-valid.php
header('Content-Type: application/json; charset=utf-8');
date_default_timezone_set('Asia/Manila');

require_once __DIR__ . '/../../connection.php'; // $conn (mysqli)

$user = json_decode($_COOKIE['user'] ?? 'null', true);
if (!$user || !is_array($user)) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Unauthorized']);
    exit;
}
$user_name = $user['name'] ?? 'Unknown';

$id      = $_POST['id']      ?? null;
$remarks = isset($_POST['remarks']) ? trim((string)$_POST['remarks']) : '';

if ($id === null || !ctype_digit((string)$id)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Missing or invalid id']);
    exit;
}

$status = 'VALIDATION REPLY'; // ← per your requirement

try {
    if (!isset($conn) || !($conn instanceof mysqli)) {
        throw new Exception('Database connection not available as $conn');
    }
    $conn->set_charset('utf8mb4');

    if (!$conn->begin_transaction()) {
        throw new Exception('Could not start transaction: ' . $conn->error);
    }

    // 1) Update main record status
    $stmt = $conn->prepare('UPDATE rcpa_request SET status = ? WHERE id = ?');
    if (!$stmt) throw new Exception('Prepare failed: ' . $conn->error);
    $stmt->bind_param('si', $status, $id);
    if (!$stmt->execute()) throw new Exception('Execute failed: ' . $stmt->error);
    $stmt->close();

    // 2) Build attachments (optional) — allow ANY file type, keep original names
    $attachments = [];
    if (isset($_FILES['attachments']) && is_array($_FILES['attachments']['name'])) {
        $maxBytesPerFile = 50 * 1024 * 1024; // 50MB per file
        $stamp = date('Y-m-d_H-i-s');

        // Project root: .../qdportal-testing/rcpa
        $projectRoot = realpath(__DIR__ . '/..');
        $relPath     = "uploads-rcpa-disapprove/$stamp/";
        $diskBase    = rtrim($projectRoot, '/\\') . DIRECTORY_SEPARATOR . $relPath;

        // Per your note: web base starts at /qdportal-testing/rcpa/
        $webBase     = "/qdportal-testing/rcpa/" . $relPath;

        if (!is_dir($diskBase) && !mkdir($diskBase, 0755, true)) {
            throw new Exception('Failed to create upload directory');
        }

        $count = count($_FILES['attachments']['name']);
        for ($i = 0; $i < $count; $i++) {
            $err  = $_FILES['attachments']['error'][$i];
            if ($err !== UPLOAD_ERR_OK) continue;

            $tmp  = $_FILES['attachments']['tmp_name'][$i];
            $name = (string)$_FILES['attachments']['name'][$i]; // keep original
            $size = (int)$_FILES['attachments']['size'][$i];
            $mime = (string)($_FILES['attachments']['type'][$i] ?? '');

            if ($size > $maxBytesPerFile) continue;

            // sanitize to prevent traversal; preserve visible name
            $safeName = preg_replace('/[\\\\\\/]+/', '_', basename($name));
            $target   = $diskBase . $safeName;

            if (move_uploaded_file($tmp, $target)) {
                $attachments[] = [
                    'name' => $safeName,                              // original (sanitized)
                    'url'  => $webBase . rawurlencode($safeName),    // http URL
                    'size' => $size,
                    'mime' => $mime
                ];
            }
        }
    }

    // 3) Insert disapproval record (with attachments JSON)
    $json = $attachments ? json_encode($attachments, JSON_UNESCAPED_SLASHES) : null;

    $disapproveType = "Disapproved by QMS in VALIDATION REPLY";
    $stmt2 = $conn->prepare('
      INSERT INTO rcpa_disapprove_remarks (rcpa_no, disapprove_type, remarks, attachments, created_at)
      VALUES (?, ?, ?, ?, NOW())
    ');
    if (!$stmt2) throw new Exception('Prepare failed (remarks): ' . $conn->error);
    $stmt2->bind_param('isss', $id, $disapproveType, $remarks, $json);
    if (!$stmt2->execute()) throw new Exception('Execute failed (remarks): ' . $stmt2->error);
    $remarksId = $stmt2->insert_id;
    $stmt2->close();

    // 4) History entry
    $activity = "The validation reply approval of QA/QMS team was disapproved by QA/QMS Supervisor/Manager";
    $historySql = "INSERT INTO rcpa_request_history (rcpa_no, name, date_time, activity)
                   VALUES (?, ?, CURRENT_TIMESTAMP, ?)";
    $historyStmt = $conn->prepare($historySql);
    if (!$historyStmt) throw new Exception('Prepare failed (history): ' . $conn->error);
    $historyStmt->bind_param('iss', $id, $user_name, $activity);
    if (!$historyStmt->execute()) throw new Exception('Execute failed (history): ' . $historyStmt->error);
    $historyStmt->close();

    if (!$conn->commit()) throw new Exception('Commit failed: ' . $conn->error);

    echo json_encode([
        'success'    => true,
        'id'         => (int)$id,
        'status'     => $status,
        'remarks_id' => $remarksId
    ]);
} catch (Throwable $e) {
    if (isset($conn) && $conn instanceof mysqli) $conn->rollback();
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
