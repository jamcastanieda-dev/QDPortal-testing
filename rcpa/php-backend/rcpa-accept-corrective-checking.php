<?php
// rcpa-accept-corrective-checking.php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

try {
  require_once '../../connection.php';
  if (!isset($conn) || !($conn instanceof mysqli)) throw new Exception('MySQLi connection unavailable.');
  mysqli_set_charset($conn, 'utf8mb4');

  // Auth via cookie
  if (!isset($_COOKIE['user'])) { http_response_code(401); echo json_encode(['ok'=>false,'error'=>'Unauthorized']); exit; }
  $cookieUser = json_decode($_COOKIE['user'], true);
  if (!$cookieUser || empty($cookieUser['name'])) { http_response_code(401); echo json_encode(['ok'=>false,'error'=>'Unauthorized']); exit; }
  $currentName = preg_replace('/\s+/u', ' ', trim((string)$cookieUser['name']));

  // Read body: support JSON (legacy) or multipart/form-data (new w/ evidence)
  $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
  $id = 0;
  $remarks = '';
  $hasEvidencePayload = false;
  $actionDone = null; // 'yes' | 'no' | null

  if (stripos($contentType, 'application/json') !== false) {
    // Legacy callers: only { id }
    $raw = file_get_contents('php://input');
    $body = json_decode($raw ?: 'null', true);
    $id = (int)($body['id'] ?? 0);
  } else {
    // Modal submit: multipart/form-data
    $id = (int)($_POST['id'] ?? 0);
    $remarks = trim((string)($_POST['remarks'] ?? ''));
    $tmpAction = strtolower(trim((string)($_POST['action_done'] ?? '')));
    $actionDone = ($tmpAction === 'yes' || $tmpAction === 'no') ? $tmpAction : null;
    // Flag is optional—presence of files also implies evidence payload
    $hasEvidencePayload = isset($_POST['with_evidence']) || isset($_FILES['attachments']);
  }

  if ($id <= 0) { http_response_code(400); echo json_encode(['ok'=>false,'error'=>'Missing or invalid id']); exit; }

  // Fetch the RCPA record
  $stmt = $conn->prepare("SELECT id, status FROM rcpa_request WHERE id=?");
  if (!$stmt) throw new Exception('Prepare failed: '.$conn->error);
  $stmt->bind_param('i', $id);
  $stmt->execute();
  $res = $stmt->get_result();
  $row = $res->fetch_assoc();
  $stmt->close();
  if (!$row) { http_response_code(404); echo json_encode(['ok'=>false,'error'=>'Record not found']); exit; }

  // ▼▼ Updated target status ▼▼
  $targetStatus = 'EVIDENCE APPROVAL';
  $already = (trim((string)$row['status']) === $targetStatus);

  $conn->begin_transaction();

  // ---------- Save Evidence Checking Remarks (replace-if-exists) ----------
  if ($hasEvidencePayload) {
    // Roots used for both deletion and saving
    $projectRoot = isset($projectRoot) ? $projectRoot : realpath(__DIR__ . '/..');
    $webPrefix   = '/qdportal-testing/rcpa/'; // MUST match $webBase prefix below

    // Helpers
    $extractUrls = function ($attachment) {
        $urls = [];
        if (!$attachment) return $urls;

        $decoded = json_decode($attachment, true);
        if (is_array($decoded)) {
            $items = $decoded;
            if (isset($decoded['files']) && is_array($decoded['files'])) {
                $items = $decoded['files'];
            }
            foreach ($items as $it) {
                if (is_string($it)) {
                    $urls[] = $it;
                } elseif (is_array($it)) {
                    if (!empty($it['url']))  $urls[] = $it['url'];
                    elseif (!empty($it['path'])) $urls[] = $it['path'];
                    elseif (!empty($it['href'])) $urls[] = $it['href'];
                }
            }
        } else {
            // fallback: comma/newline/space-separated
            foreach (preg_split('/[\s,]+/', (string)$attachment) as $t) {
                $t = trim($t);
                if ($t !== '') $urls[] = $t;
            }
        }
        return array_values(array_filter($urls));
    };

    $urlToDisk = function ($url) use ($projectRoot, $webPrefix) {
        $path = parse_url($url, PHP_URL_PATH) ?: $url;
        // remove the public prefix to get the relative upload path
        $rel  = ltrim(preg_replace('#^' . preg_quote($webPrefix, '#') . '#', '', $path), '/');
        if ($rel === '') return null;
        $fs   = rtrim($projectRoot, '/\\') . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, urldecode($rel));
        return $fs;
    };

    $rcpa_no_str = (string)$id;

    // 1) Find existing rows (lock them) and collect dirs to maybe remove
    $sel = $conn->prepare("SELECT id, attachment FROM rcpa_evidence_checking_remarks WHERE rcpa_no = ? FOR UPDATE");
    if (!$sel) throw new Exception('Prepare failed: ' . $conn->error);
    $sel->bind_param('s', $rcpa_no_str);
    $sel->execute();
    $selRes = $sel->get_result();

    $dirsToMaybeRemove = [];

    // 2) Delete existing files from disk
    while ($old = $selRes->fetch_assoc()) {
        $att = $old['attachment'] ?? '';
        foreach ($extractUrls($att) as $fileUrl) {
            $fsPath = $urlToDisk($fileUrl);
            if ($fsPath && is_file($fsPath)) {
                @unlink($fsPath);
                $dirsToMaybeRemove[dirname($fsPath)] = true;
            }
        }
    }
    $sel->close();

    // remove now-empty folders
    foreach (array_keys($dirsToMaybeRemove) as $dir) {
        if (is_dir($dir)) {
            $scan = @scandir($dir);
            if ($scan && count($scan) <= 2) { // only . and ..
                @rmdir($dir);
            }
        }
    }

    // 3) Delete the existing DB rows for this rcpa_no
    $del = $conn->prepare("DELETE FROM rcpa_evidence_checking_remarks WHERE rcpa_no = ?");
    if (!$del) throw new Exception('Prepare failed: ' . $conn->error);
    $del->bind_param('s', $rcpa_no_str);
    $del->execute();
    $del->close();

    // 4) Save the NEW upload and insert a fresh row
    $stamp    = date('YmdHis') . '_' . bin2hex(random_bytes(4));
    $relPath  = "uploads-rcpa-evidence-checking/$stamp/";
    $diskBase = rtrim($projectRoot, '/\\') . DIRECTORY_SEPARATOR . $relPath;
    $webBase  = $webPrefix . $relPath;

    $filesMeta = [];

    if (!empty($_FILES['attachments']) && is_array($_FILES['attachments']['name'])) {
      if (!is_dir($diskBase) && !mkdir($diskBase, 0775, true)) {
        throw new Exception('Failed to create upload directory.');
      }

      $names = $_FILES['attachments']['name'];
      $tmps  = $_FILES['attachments']['tmp_name'];
      $errs  = $_FILES['attachments']['error'];
      $sizes = $_FILES['attachments']['size'];
      $len = count($names);

      for ($i = 0; $i < $len; $i++) {
        if ((int)$errs[$i] !== UPLOAD_ERR_OK) continue;
        $orig = $names[$i];
        $safe = preg_replace('/[^\w.\- ]+/u', '_', $orig);
        if ($safe === '') $safe = 'file_' . ($i+1);
        $target = $diskBase . $safe;

        if (!move_uploaded_file($tmps[$i], $target)) continue;

        $filesMeta[] = [
          'name' => $orig,
          'url'  => $webBase . rawurlencode($safe),
          'size' => (int)($sizes[$i] ?? 0),
        ];
      }
    }

    // Valid JSON in LONGTEXT (passes CHECK json_valid(...))
    $attachmentJson = json_encode($filesMeta, JSON_UNESCAPED_SLASHES);
    if ($attachmentJson === false) $attachmentJson = '[]';

    // Manual next id (no AUTO_INCREMENT)
    $nextId = 1;
    $rs = $conn->query("SELECT COALESCE(MAX(id),0)+1 AS next_id FROM rcpa_evidence_checking_remarks FOR UPDATE");
    if ($rs) {
      $rowMax = $rs->fetch_assoc();
      if ($rowMax && isset($rowMax['next_id'])) $nextId = (int)$rowMax['next_id'];
      $rs->close();
    }

    // INSERT includes action_done
    // Table columns: id, rcpa_no, action_done, remarks, attachment
    $insE = $conn->prepare("
      INSERT INTO rcpa_evidence_checking_remarks (id, rcpa_no, action_done, remarks, attachment)
      VALUES (?, ?, ?, ?, ?)
    ");
    if (!$insE) throw new Exception('Prepare failed: '.$conn->error);
    $insE->bind_param('issss', $nextId, $rcpa_no_str, $actionDone, $remarks, $attachmentJson);
    $insE->execute();
    $insE->close();
  }
  // -----------------------------------------------------------------------

  // Update status (idempotent)
  if (!$already) {
    $upd = $conn->prepare("UPDATE rcpa_request SET status=? WHERE id=? AND status<>?");
    if (!$upd) throw new Exception('Prepare failed: '.$conn->error);
    $upd->bind_param('sis', $targetStatus, $id, $targetStatus);
    $upd->execute();
    $upd->close();
  }

  // Insert request history
  $activity = 'The QMS/QA accepted the corrective reply for evidence approval';
  $insH = $conn->prepare("INSERT INTO rcpa_request_history (rcpa_no, name, activity) VALUES (?, ?, ?)");
  if (!$insH) throw new Exception('Prepare failed: '.$conn->error);
  $rcpa_no = (string)$id;
  $insH->bind_param('sss', $rcpa_no, $currentName, $activity);
  $insH->execute();
  $insH->close();

  $conn->commit();

  echo json_encode(['ok'=>true, 'status'=>$targetStatus]);
} catch (Throwable $e) {
  if (isset($conn) && $conn instanceof mysqli) { $conn->rollback(); }
  http_response_code(400);
  echo json_encode(['ok'=>false,'error'=>$e->getMessage()]);
}
