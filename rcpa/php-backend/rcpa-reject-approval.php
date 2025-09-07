<?php
// php-backend/rcpa-reject-approval.php
header('Content-Type: application/json; charset=utf-8');
date_default_timezone_set('Asia/Manila');

require_once __DIR__ . '/../../connection.php'; // mysqli connection -> $conn

$id = $_POST['id'] ?? null;
$remarks = isset($_POST['remarks']) ? trim((string)$_POST['remarks']) : '';

$user = json_decode($_COOKIE['user'] ?? 'null', true);
if (!$user || !is_array($user)) {
    header('Location: ../../login.php');
    exit;
}
$current_user = $user;
$user_name = $current_user['name'] ?? 'Unknown';

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

    // 1) Update main record status
    $stmt = $conn->prepare('UPDATE rcpa_request SET status = ? WHERE id = ?');
    if (!$stmt) throw new Exception('Prepare failed: ' . $conn->error);
    $stmt->bind_param('si', $status, $id);
    if (!$stmt->execute()) throw new Exception('Execute failed: ' . $stmt->error);
    $stmt->close();

    // 2) Insert disapproval record first (we'll attach files after we know its id)
    $disapproveType = "Disapproved by Originator's Supervisor/Manager";
    $stmt2 = $conn->prepare('
        INSERT INTO rcpa_disapprove_remarks (rcpa_no, disapprove_type, remarks, created_at)
        VALUES (?, ?, ?, NOW())
    ');
    if (!$stmt2) throw new Exception('Prepare failed (remarks): ' . $conn->error);
    $stmt2->bind_param('iss', $id, $disapproveType, $remarks);
    if (!$stmt2->execute()) throw new Exception('Execute failed (remarks): ' . $stmt2->error);
    $remarksId = $stmt2->insert_id;
    $stmt2->close();

    // 2b) Handle uploaded files (optional)
    // 2b) Handle uploaded files (ANY file type; keep original filename)
    //     Saves under: /uploads-rcpa-disapprove/<YYYY-MM-DD_HH-mm-ss>/<original>
    // 2b) Handle uploaded files (optional)
    $attachments = [];
    if (isset($_FILES['attachments']) && is_array($_FILES['attachments']['name'])) {
        // Location setup
        // Disk:  <project>/qdportal-testing/rcpa/php/uploads-rcpa-disapprove/<YYYY-mm-dd_HH-ii-ss>/
        // Web : /qdportal-testing/rcpa/php/uploads-rcpa-disapprove/<YYYY-mm-dd_HH-ii-ss>/
        $timestampFolder = date('Y-m-d_H-i-s');

        // __DIR__ = .../rcpa/php/php-backend
        $phpDir           = realpath(__DIR__ . '/..'); // -> .../rcpa/php
        if ($phpDir === false) {
            throw new Exception('Cannot resolve php directory');
        }

        $uploadsRootDisk  = $phpDir . DIRECTORY_SEPARATOR . 'uploads-rcpa-disapprove';
        $diskBase         = $uploadsRootDisk . DIRECTORY_SEPARATOR . $timestampFolder;

        $uploadsRootWeb   = '/qdportal-testing/rcpa/uploads-rcpa-disapprove';
        $webBase          = $uploadsRootWeb . '/' . $timestampFolder;

        if (!is_dir($uploadsRootDisk) && !mkdir($uploadsRootDisk, 0755, true)) {
            throw new Exception('Failed to create uploads root');
        }
        if (!is_dir($diskBase) && !mkdir($diskBase, 0755, true)) {
            throw new Exception('Failed to create upload subfolder');
        }

        $maxBytesPerFile = 15 * 1024 * 1024; // 15MB
        $count = count($_FILES['attachments']['name']);

        // Optional: detect MIME
        $finfo = function_exists('finfo_open') ? finfo_open(FILEINFO_MIME_TYPE) : null;

        for ($i = 0; $i < $count; $i++) {
            if ($_FILES['attachments']['error'][$i] !== UPLOAD_ERR_OK) continue;
            $tmp  = $_FILES['attachments']['tmp_name'][$i];
            $name = $_FILES['attachments']['name'][$i];
            $size = (int)$_FILES['attachments']['size'][$i];

            if ($size <= 0 || $size > $maxBytesPerFile) continue;

            // Keep original filename (safely)
            $finalName = basename($name); // don’t change the name
            $targetDisk = $diskBase . DIRECTORY_SEPARATOR . $finalName;

            if (!move_uploaded_file($tmp, $targetDisk)) continue;

            $mime = ($finfo) ? @finfo_file($finfo, $targetDisk) : null;

            // Build web URL with the correct prefix; encode only the URL component
            $url = $webBase . '/' . rawurlencode($finalName);

            $attachments[] = [
                'name' => $finalName,
                'url'  => $url,
                'size' => $size,
                'mime' => $mime ?: ''
            ];
        }
        if ($finfo) finfo_close($finfo);
    }

    // 2c) Save attachments JSON back onto the disapprove row (if any)
    if ($attachments) {
        $json = json_encode($attachments, JSON_UNESCAPED_SLASHES);
        $stmt3 = $conn->prepare('UPDATE rcpa_disapprove_remarks SET attachments = ? WHERE id = ?');
        if (!$stmt3) throw new Exception('Prepare failed (attach): ' . $conn->error);
        $stmt3->bind_param('si', $json, $remarksId);
        if (!$stmt3->execute()) throw new Exception('Execute failed (attach): ' . $stmt3->error);
        $stmt3->close();
    }


    // 3) History entry
    $historySql = "INSERT INTO rcpa_request_history (rcpa_no, name, date_time, activity)
                   VALUES (?, ?, CURRENT_TIMESTAMP, ?)";
    $historyStmt = $conn->prepare($historySql);
    if (!$historyStmt) throw new Exception('Prepare failed (history): ' . $conn->error);
    $activityText = "RCPA approval has been rejected.";
    $historyStmt->bind_param('iss', $id, $user_name, $activityText);
    if (!$historyStmt->execute()) throw new Exception('Execute failed (history): ' . $historyStmt->error);
    $historyStmt->close();

    if (!$conn->commit()) {
        throw new Exception('Commit failed: ' . $conn->error);
    }

    echo json_encode([
        'success'    => true,
        'id'         => (int)$id,
        'status'     => $status,
        'remarks_id' => $remarksId
    ]);
} catch (Throwable $e) {
    if (isset($conn) && $conn instanceof mysqli) {
        $conn->rollback();
    }
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
