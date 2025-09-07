<?php
// php-backend/rcpa-follow-up-save.php
header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../../connection.php'; // $conn (mysqli)

try {
    if (!isset($conn) || !($conn instanceof mysqli)) {
        throw new Exception('Database connection not available as $conn');
    }
    $conn->set_charset('utf8mb4');

    $id        = isset($_POST['id']) ? trim($_POST['id']) : '';          // optional (for update)
    $rcpa_no   = isset($_POST['rcpa_no']) ? trim($_POST['rcpa_no']) : '';
    $remarks   = isset($_POST['remarks']) ? trim($_POST['remarks']) : '';
    $target    = isset($_POST['target_date']) ? trim($_POST['target_date']) : '';

    if ($rcpa_no === '' || !ctype_digit($rcpa_no)) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'Missing/invalid rcpa_no']);
        exit;
    }
    if ($remarks === '') {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'Remarks required']);
        exit;
    }
    if ($target === '') {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'Target Date required']);
        exit;
    }

    // get existing (if update)
    $existing = null;
    if ($id !== '' && ctype_digit($id)) {
        $check = $conn->prepare("SELECT id, rcpa_no, target_date, remarks, attachment FROM rcpa_follow_up_remarks WHERE id=? LIMIT 1");
        if (!$check) throw new Exception('Prepare failed: ' . $conn->error);
        $check->bind_param('i', $id);
        $check->execute();
        $res = $check->get_result();
        $existing = $res->fetch_assoc() ?: null;
        $check->close();
        if (!$existing) {
            http_response_code(404);
            echo json_encode(['ok' => false, 'error' => 'Follow-up record not found']);
            exit;
        }
    }

    // ===== File upload handling =====
    // Project root: .../qdportal-testing/rcpa
    $projectRoot = realpath(__DIR__ . '/..');
    if ($projectRoot === false) { throw new Exception('Project root not resolved'); }

    $stamp     = date('Ymd-His');
    $relPath   = "uploads-rcpa-follow-up/$stamp/";
    $diskBase  = rtrim($projectRoot, '/\\') . DIRECTORY_SEPARATOR . $relPath;

    // Per your note: web base starts at /qdportal-testing/rcpa/
    $webBase   = "/qdportal-testing/rcpa/" . $relPath;

    if (!is_dir($diskBase) && !mkdir($diskBase, 0775, true)) {
        throw new Exception('Failed to create upload directory');
    }

    // Parse existing attachments into a normalized array
    $existingFiles = [];
    if ($existing && !empty($existing['attachment'])) {
        $raw = $existing['attachment'];
        $parsed = null;
        try { $parsed = json_decode($raw, true, 512, JSON_THROW_ON_ERROR); } catch (\Throwable $e) { $parsed = null; }
        if (is_array($parsed)) {
            if (isset($parsed['files']) && is_array($parsed['files'])) {
                $existingFiles = $parsed['files'];
            } elseif (array_is_list($parsed)) {
                $existingFiles = $parsed;
            }
        } else {
            // fallback: split on newlines/commas into {url}
            $parts = preg_split('/[\n,]+/', (string)$raw, -1, PREG_SPLIT_NO_EMPTY);
            foreach ($parts as $p) $existingFiles[] = ['url' => trim($p)];
        }
    }

    // Save new uploads
    $newFiles = [];
    if (!empty($_FILES['attachments']) && is_array($_FILES['attachments']['name'])) {
        $names = $_FILES['attachments']['name'];
        $tmps  = $_FILES['attachments']['tmp_name'];
        $sizes = $_FILES['attachments']['size'];
        $errs  = $_FILES['attachments']['error'];
        $N = count($names);

        for ($i=0; $i<$N; $i++) {
            if ($errs[$i] !== UPLOAD_ERR_OK) { continue; }
            $orig = $names[$i];
            $tmp  = $tmps[$i];
            $sz   = (int)$sizes[$i];

            // sanitize filename
            $safe = preg_replace('/[^A-Za-z0-9._-]+/', '_', $orig);
            $dest = $diskBase . $safe;

            // avoid collisions
            $k = 1;
            $base = pathinfo($safe, PATHINFO_FILENAME);
            $ext  = pathinfo($safe, PATHINFO_EXTENSION);
            while (is_file($dest)) {
                $alt = $base . '_' . $k . ($ext ? '.' . $ext : '');
                $dest = $diskBase . $alt;
                $k++;
            }

            if (!move_uploaded_file($tmp, $dest)) { continue; }

            $newFiles[] = [
                'name' => $safe,
                'url'  => $webBase . basename($dest),
                'size' => $sz
            ];
        }
    }

    // Merge (append) new files to existing; if you want “replace”, set $files = $newFiles instead
    $files = array_values(array_merge($existingFiles, $newFiles));
    $attachmentJson = $files ? json_encode(['files' => $files], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) : '';

    if ($existing) {
        // UPDATE
        $stmt = $conn->prepare("UPDATE rcpa_follow_up_remarks SET target_date=?, remarks=?, attachment=? WHERE id=?");
        if (!$stmt) throw new Exception('Prepare failed: ' . $conn->error);
        $stmt->bind_param('sssi', $target, $remarks, $attachmentJson, $existing['id']);
        if (!$stmt->execute()) throw new Exception('Execute failed: ' . $stmt->error);
        $stmt->close();
        echo json_encode(['ok' => true, 'id' => (int)$existing['id']]);
    } else {
        // INSERT
        $stmt = $conn->prepare("INSERT INTO rcpa_follow_up_remarks (rcpa_no, target_date, remarks, attachment) VALUES (?, ?, ?, ?)");
        if (!$stmt) throw new Exception('Prepare failed: ' . $conn->error);
        $rcpaNoInt = (int)$rcpa_no;
        $stmt->bind_param('isss', $rcpaNoInt, $target, $remarks, $attachmentJson);
        if (!$stmt->execute()) throw new Exception('Execute failed: ' . $stmt->error);
        $newId = $stmt->insert_id;
        $stmt->close();
        echo json_encode(['ok' => true, 'id' => (int)$newId]);
    }
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => $e->getMessage()]);
}
