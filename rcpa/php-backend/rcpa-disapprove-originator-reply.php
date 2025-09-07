<?php
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

  // Inputs (multipart/form-data)
  $id = (int)($_POST['id'] ?? 0);
  $remarks = trim((string)($_POST['remarks'] ?? ''));
  if ($id <= 0) { http_response_code(400); echo json_encode(['ok'=>false,'error'=>'Missing or invalid id']); exit; }
  if ($remarks === '') { http_response_code(400); echo json_encode(['ok'=>false,'error'=>'Remarks required']); exit; }

  // Verify record belongs to originator
  $stmt = $conn->prepare("SELECT id FROM rcpa_request WHERE id=? AND TRIM(originator_name)=TRIM(?)");
  $stmt->bind_param('is', $id, $currentName);
  $stmt->execute();
  $res = $stmt->get_result();
  $row = $res->fetch_assoc();
  $stmt->close();
  if (!$row) { http_response_code(404); echo json_encode(['ok'=>false,'error'=>'Record not found']); exit; }

  // Uploads
  $filesOut = [];
  if (!empty($_FILES['attachments'])) {
    // Project root: .../qdportal-testing/rcpa
    $projectRoot = realpath(__DIR__ . '/..');
    if ($projectRoot === false) throw new Exception('Project root not found.');
    $stamp   = date('YmdHis') . '_' . bin2hex(random_bytes(4));
    $relPath = "uploads-rcpa-disapprove/$stamp/";
    $diskBase = rtrim($projectRoot, '/\\') . DIRECTORY_SEPARATOR . $relPath;
    // Per your note: web base starts at /qdportal-testing/rcpa/
    $webBase  = "/qdportal-testing/rcpa/" . $relPath;

    if (!is_dir($diskBase) && !mkdir($diskBase, 0775, true)) {
      throw new Exception('Failed to create upload directory.');
    }

    $count = is_array($_FILES['attachments']['name']) ? count($_FILES['attachments']['name']) : 0;
    $finfo = function_exists('finfo_open') ? finfo_open(FILEINFO_MIME_TYPE) : null;

    for ($i=0; $i<$count; $i++) {
      if ($_FILES['attachments']['error'][$i] !== UPLOAD_ERR_OK) continue;
      $tmp  = $_FILES['attachments']['tmp_name'][$i];
      $orig = basename($_FILES['attachments']['name'][$i]);

      $base = pathinfo($orig, PATHINFO_FILENAME);
      $ext  = pathinfo($orig, PATHINFO_EXTENSION);
      $safeBase = preg_replace('/[^A-Za-z0-9._-]+/', '_', $base);
      $filename = $safeBase . ($ext ? ".$ext" : '');

      $dest = $diskBase . $filename;
      $n = 1;
      while (file_exists($dest)) {
        $filename = $safeBase . "_$n" . ($ext ? ".$ext" : '');
        $dest = $diskBase . $filename;
        $n++;
      }

      if (!move_uploaded_file($tmp, $dest)) continue;
      $size = filesize($dest) ?: null;
      $mime = $finfo ? @finfo_file($finfo, $dest) : ($_FILES['attachments']['type'][$i] ?? null);

      $filesOut[] = [
        'name' => $filename,
        'url'  => $webBase . $filename,
        'size' => $size,
        'mime' => $mime
      ];
    }
    if ($finfo) finfo_close($finfo);
  }

  $attachmentsJson = json_encode($filesOut, JSON_UNESCAPED_SLASHES);

  $conn->begin_transaction();

  // Insert disapproval remark
  $type = 'Originator disapproved the validation reply';
  $ins = $conn->prepare("INSERT INTO rcpa_disapprove_remarks (rcpa_no, disapprove_type, remarks, attachments) VALUES (?, ?, ?, ?)");
  $ins->bind_param('isss', $id, $type, $remarks, $attachmentsJson);
  $ins->execute();
  $ins->close();

  // Update status
  $newStatus = 'VALIDATION REPLY';
  $upd = $conn->prepare("UPDATE rcpa_request SET status=? WHERE id=? AND TRIM(originator_name)=TRIM(?)");
  $upd->bind_param('sis', $newStatus, $id, $currentName);
  $upd->execute();
  if ($upd->affected_rows < 1) { $conn->rollback(); throw new Exception('Status update failed.'); }
  $upd->close();

  // INSERT HISTORY (NEW)
  $rcpaNo   = (string)$id;
  $activity = 'The Originator disapproved the validation reply';
  $hist = $conn->prepare("INSERT INTO rcpa_request_history (rcpa_no, name, activity) VALUES (?, ?, ?)");
  $hist->bind_param('sss', $rcpaNo, $currentName, $activity);
  $hist->execute();
  $hist->close();

  $conn->commit();

  echo json_encode(['ok'=>true, 'status'=>$newStatus, 'attachments'=>$filesOut]);
} catch (Throwable $e) {
  if (isset($conn) && $conn instanceof mysqli) { $conn->rollback(); }
  http_response_code(400);
  echo json_encode(['ok'=>false,'error'=>$e->getMessage()]);
}
