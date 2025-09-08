<?php
// rcpa-save-evidence-checking.php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

try {
  require_once '../../connection.php';
  if (!isset($conn) || !($conn instanceof mysqli)) throw new Exception('MySQLi connection unavailable.');
  mysqli_set_charset($conn, 'utf8mb4');

  if (!isset($_COOKIE['user'])) { http_response_code(401); echo json_encode(['ok'=>false,'error'=>'Unauthorized']); exit; }
  $cookieUser = json_decode($_COOKIE['user'], true);
  if (!$cookieUser || empty($cookieUser['name'])) { http_response_code(401); echo json_encode(['ok'=>false,'error'=>'Unauthorized']); exit; }
  $currentName = preg_replace('/\s+/u', ' ', trim((string)$cookieUser['name']));

  // Expect multipart/form-data
  $id = (int)($_POST['id'] ?? 0);
  $remarks = trim((string)($_POST['remarks'] ?? ''));
  $actionDone = 'yes';

  if ($id <= 0) { http_response_code(400); echo json_encode(['ok'=>false,'error'=>'Missing or invalid id']); exit; }

  // Ensure record exists (any status) — we’re only saving evidence, not moving status
  $chk = $conn->prepare("SELECT id FROM rcpa_request WHERE id=?");
  if (!$chk) throw new Exception('Prepare failed: '.$conn->error);
  $chk->bind_param('i',$id);
  $chk->execute();
  $row = $chk->get_result()->fetch_assoc();
  $chk->close();
  if (!$row) { http_response_code(404); echo json_encode(['ok'=>false,'error'=>'Record not found']); exit; }

  $projectRoot = realpath(__DIR__ . '/..');
  if ($projectRoot === false) throw new Exception('Project root not found.');
  $webPrefix   = '/qdportal-testing/rcpa/';

  $extractUrls = function ($attachment) {
      $urls = [];
      if (!$attachment) return $urls;
      $decoded = json_decode($attachment, true);
      if (is_array($decoded)) {
          $items = $decoded;
          if (isset($decoded['files']) && is_array($decoded['files'])) $items = $decoded['files'];
          foreach ($items as $it) {
              if (is_string($it)) $urls[] = $it;
              elseif (is_array($it)) {
                  if (!empty($it['url']))  $urls[] = $it['url'];
                  elseif (!empty($it['path'])) $urls[] = $it['path'];
                  elseif (!empty($it['href'])) $urls[] = $it['href'];
              }
          }
      } else {
          foreach (preg_split('/[\s,]+/', (string)$attachment) as $t) {
              $t = trim($t); if ($t !== '') $urls[] = $t;
          }
      }
      return array_values(array_filter($urls));
  };
  $urlToDisk = function ($url) use ($projectRoot, $webPrefix) {
      $path = parse_url($url, PHP_URL_PATH) ?: $url;
      $rel  = ltrim(preg_replace('#^' . preg_quote($webPrefix, '#') . '#', '', $path), '/');
      if ($rel === '') return null;
      return rtrim($projectRoot, '/\\') . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, urldecode($rel));
  };

  $conn->begin_transaction();

  // Read and purge existing evidence rows for this rcpa_no (and delete old files)
  $rcpaNoStr = (string)$id;
  $sel = $conn->prepare("SELECT id, attachment FROM rcpa_evidence_checking_remarks WHERE rcpa_no=? FOR UPDATE");
  if (!$sel) throw new Exception('Prepare failed: '.$conn->error);
  $sel->bind_param('s', $rcpaNoStr);
  $sel->execute();
  $res = $sel->get_result();

  $dirsToMaybeRemove = [];
  while ($old = $res->fetch_assoc()) {
      $att = $old['attachment'] ?? '';
      foreach ($extractUrls($att) as $fileUrl) {
          $fs = $urlToDisk($fileUrl);
          if ($fs && is_file($fs)) {
              @unlink($fs);
              $dirsToMaybeRemove[dirname($fs)] = true;
          }
      }
  }
  $sel->close();
  foreach (array_keys($dirsToMaybeRemove) as $dir) {
      if (is_dir($dir)) {
          $scan = @scandir($dir);
          if ($scan && count($scan) <= 2) @rmdir($dir);
      }
  }

  $del = $conn->prepare("DELETE FROM rcpa_evidence_checking_remarks WHERE rcpa_no=?");
  if (!$del) throw new Exception('Prepare failed: '.$conn->error);
  $del->bind_param('s', $rcpaNoStr);
  $del->execute();
  $del->close();

  // Save new uploads
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
  $attachmentJson = json_encode($filesMeta, JSON_UNESCAPED_SLASHES);
  if ($attachmentJson === false) $attachmentJson = '[]';

  // Manual next id (if table uses manual PK)
  $nextId = 1;
  $rs = $conn->query("SELECT COALESCE(MAX(id),0)+1 AS next_id FROM rcpa_evidence_checking_remarks FOR UPDATE");
  if ($rs) {
      $mx = $rs->fetch_assoc();
      if ($mx && isset($mx['next_id'])) $nextId = (int)$mx['next_id'];
      $rs->close();
  }

  // Insert
  $ins = $conn->prepare("
    INSERT INTO rcpa_evidence_checking_remarks (id, rcpa_no, action_done, remarks, attachment)
    VALUES (?,?,?,?,?)
  ");
  if (!$ins) throw new Exception('Prepare failed: '.$conn->error);
  $ins->bind_param('issss', $nextId, $rcpaNoStr, $actionDone, $remarks, $attachmentJson);
  $ins->execute();
  $ins->close();

  // History log (optional)
  $act = 'Saved evidence checking remarks (final stage)';
  $hist = $conn->prepare("INSERT INTO rcpa_request_history (rcpa_no, name, activity) VALUES (?,?,?)");
  if ($hist) { $rcpa_no = (string)$id; $hist->bind_param('sss', $rcpa_no, $currentName, $act); $hist->execute(); $hist->close(); }

  $conn->commit();
  echo json_encode(['ok'=>true, 'saved'=>true, 'files'=>$filesMeta]);
} catch (Throwable $e) {
  if (isset($conn) && $conn instanceof mysqli) { $conn->rollback(); }
  http_response_code(400);
  echo json_encode(['ok'=>false,'error'=>$e->getMessage()]);
}
