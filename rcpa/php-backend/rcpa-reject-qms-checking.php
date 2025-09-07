<?php
header('Content-Type: application/json; charset=utf-8');
date_default_timezone_set('Asia/Manila');

require_once __DIR__ . '/../../connection.php'; // mysqli -> $conn

$user = json_decode($_COOKIE['user'] ?? 'null', true);
if (!$user || !is_array($user)) {
    header('Location: ../../login.php');
    exit;
}
$user_name = $user['name'] ?? 'Unknown';

$id = $_POST['id'] ?? null;
$remarks = isset($_POST['remarks']) ? trim((string)$_POST['remarks']) : '';

if ($id === null || !ctype_digit((string)$id)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Missing or invalid id']);
    exit;
}

$status = 'REJECTED';

try {
    if (!isset($conn) || !($conn instanceof mysqli)) {
        throw new Exception('Database connection not available as $conn');
    }
    $conn->set_charset('utf8mb4');

    if (!$conn->begin_transaction()) {
        throw new Exception('Could not start transaction: ' . $conn->error);
    }

    // 1) Update main status
    $stmt = $conn->prepare('UPDATE rcpa_request SET status = ? WHERE id = ?');
    if (!$stmt) throw new Exception('Prepare failed: ' . $conn->error);
    $stmt->bind_param('si', $status, $id);
    if (!$stmt->execute()) throw new Exception('Execute failed: ' . $stmt->error);
    $stmt->close();

    // 2) Insert disapproval entry (type = QMS)
    $disType = "Disapproved by QMS/QA in checking";
    $stmt2 = $conn->prepare('
        INSERT INTO rcpa_disapprove_remarks (rcpa_no, disapprove_type, remarks, created_at)
        VALUES (?, ?, ?, NOW())
    ');
    if (!$stmt2) throw new Exception('Prepare failed (remarks): ' . $conn->error);
    $stmt2->bind_param('iss', $id, $disType, $remarks);
    if (!$stmt2->execute()) throw new Exception('Execute failed (remarks): ' . $stmt2->error);
    $remarksId = $stmt2->insert_id;
    $stmt2->close();

    // 2b) Save uploaded files (all kinds allowed), keep original names inside timestamp folder
    $attachments = [];
    if (isset($_FILES['attachments']) && is_array($_FILES['attachments']['name'])) {
        $maxBytesPerFile = 50 * 1024 * 1024; // 50MB per file
        $stamp = date('Y-m-d_H-i-s');

        // Disk + Web paths (store under ../uploads-rcpa-disapprove/<timestamp>/)
        $phpRoot  = realpath(__DIR__ . '/..');                // /.../rcpa/php
        $relPath  = "uploads-rcpa-disapprove/$stamp/";
        $diskBase = $phpRoot . DIRECTORY_SEPARATOR . $relPath; // /.../rcpa/php/uploads-rcpa-disapprove/<stamp>/
        $webBase  = "/qdportal-testing/rcpa/" . $relPath;  // http path

        if (!is_dir($diskBase) && !mkdir($diskBase, 0755, true)) {
            throw new Exception('Failed to create upload directory');
        }

        $count = count($_FILES['attachments']['name']);
        $finfo = new finfo(FILEINFO_MIME_TYPE);
        for ($i = 0; $i < $count; $i++) {
            if ($_FILES['attachments']['error'][$i] !== UPLOAD_ERR_OK) continue;

            $tmp  = $_FILES['attachments']['tmp_name'][$i];
            $name = basename($_FILES['attachments']['name'][$i]); // keep original file name (sanitized to basename)
            $size = (int)$_FILES['attachments']['size'][$i];
            if ($size > $maxBytesPerFile) continue;

            // Determine MIME (no extension filter: allow all kinds)
            $mime = @($finfo ? $finfo->file($tmp) : mime_content_type($tmp));
            if (!is_uploaded_file($tmp)) continue;

            $targetDisk = rtrim($diskBase, '/\\') . DIRECTORY_SEPARATOR . $name;

            // If a same-named file somehow exists, silently overwrite to keep "unchanged name" requirement
            if (!move_uploaded_file($tmp, $targetDisk)) continue;

            // Build public URL (encode name for URL safety)
            $url = rtrim($webBase, '/') . '/' . rawurlencode($name);

            $attachments[] = [
                'name' => $name,
                'url'  => $url,
                'size' => $size,
                'mime' => $mime ?: ''
            ];
        }
    }

    // 2c) Save attachments JSON back to disapprove row
    if ($attachments) {
        $json = json_encode($attachments, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        $stmt3 = $conn->prepare('UPDATE rcpa_disapprove_remarks SET attachments = ? WHERE id = ?');
        if (!$stmt3) throw new Exception('Prepare failed (attach): ' . $conn->error);
        $stmt3->bind_param('si', $json, $remarksId);
        if (!$stmt3->execute()) throw new Exception('Execute failed (attach): ' . $stmt3->error);
        $stmt3->close();
    }

    // 3) History
    $activity = "RCPA has been rejected by QMS";
    $historySql = "INSERT INTO rcpa_request_history (rcpa_no, name, date_time, activity)
                   VALUES (?, ?, CURRENT_TIMESTAMP, ?)";
    $historyStmt = $conn->prepare($historySql);
    if (!$historyStmt) throw new Exception('Prepare failed (history): ' . $conn->error);
    $historyStmt->bind_param('iss', $id, $user_name, $activity);
    if (!$historyStmt->execute()) throw new Exception('Execute failed (history): ' . $historyStmt->error);
    $historyStmt->close();

    if (!$conn->commit()) throw new Exception('Commit failed: ' . $conn->error);

    echo json_encode(['success'=>true,'id'=>(int)$id,'status'=>$status,'remarks_id'=>$remarksId]);
} catch (Throwable $e) {
    if (isset($conn) && $conn instanceof mysqli) $conn->rollback();
    http_response_code(500);
    echo json_encode(['success'=>false,'error'=>$e->getMessage()]);
}
