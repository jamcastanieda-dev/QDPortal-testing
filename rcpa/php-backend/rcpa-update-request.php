<?php
// rcpa-update-request.php
declare(strict_types=1);
header('Content-Type: application/json');

/**
 * Security / Auth
 */
$user = json_decode($_COOKIE['user'] ?? 'null', true);
if (!$user || !is_array($user)) {
  header('Location: ../../login.php');
  exit;
}
$current_user = $user;
$user_name    = (string)($current_user['name'] ?? '');
$user_role    = strtolower(trim((string)($current_user['role'] ?? '')));

try {
  require_once __DIR__ . '/../../connection.php';
  if (!isset($conn) || !($conn instanceof mysqli)) {
    throw new Exception('MySQLi connection ($conn) not available.');
  }

  // ---------- Input ----------
  $idRaw = $_POST['id'] ?? '';
  if (!preg_match('/^\d+$/', (string)$idRaw)) {
    throw new Exception('Invalid or missing record id.');
  }
  $rcpaId = (int)$idRaw;

  // Editable fields (same names as submit)
  $rcpaType            = trim((string)($_POST['rcpa_type'] ?? ''));
  $projectName         = trim((string)($_POST['project_name'] ?? ''));
  $wbsNumber           = trim((string)($_POST['wbs_number'] ?? ''));
  $remarks             = trim((string)($_POST['finding_description'] ?? ''));
  $systemViolated      = trim((string)($_POST['system_violated'] ?? ''));
  $clauseNumbers       = trim((string)($_POST['clause_numbers'] ?? ''));
  $originatorSupervisor= trim((string)($_POST['originator_supervisor'] ?? ''));
  $assigneeRaw         = trim((string)($_POST['assignee'] ?? ''));

  if ($rcpaType === '')  throw new Exception('RCPA Type is required.');
  if ($assigneeRaw === '') throw new Exception('Assignee is required.');

  // Split "Department - Section" into parts.
  $assigneeDept = $assigneeRaw;
  $assigneeSect = null;
  if (strpos($assigneeRaw, ' - ') !== false) {
    [$assigneeDept, $assigneeSect] = array_map('trim', explode(' - ', $assigneeRaw, 2));
  }

  // Compute sem_year (same logic as submit; honor sem_year_calc when present)
  $semYear = trim((string)($_POST['sem_year_calc'] ?? ''));
  if ($semYear === '') {
    if ($rcpaType === 'external') {
      if (!empty($_POST['external_sem1_pick']))      $semYear = '1st Sem – ' . ($_POST['external_sem1_year'] ?? '');
      elseif (!empty($_POST['external_sem2_pick']))  $semYear = '2nd Sem – ' . ($_POST['external_sem2_year'] ?? '');
    } elseif ($rcpaType === 'internal') {
      if (!empty($_POST['internal_sem1_pick']))      $semYear = '1st Sem – ' . ($_POST['internal_sem1_year'] ?? '');
      elseif (!empty($_POST['internal_sem2_pick']))  $semYear = '2nd Sem – ' . ($_POST['internal_sem2_year'] ?? '');
    } elseif ($rcpaType === 'online') {
      $semYear = (string)($_POST['online_year'] ?? '');
    } elseif ($rcpaType === '5s') {
      $m = trim((string)($_POST['hs_month'] ?? ''));
      $y = trim((string)($_POST['hs_year'] ?? ''));
      $semYear = trim($m . ' ' . $y);
    } elseif ($rcpaType === 'mgmt') {
      $semYear = (string)($_POST['mgmt_year'] ?? '');
    }
  }

  // quarter (mgmt only)
  $quarter = trim((string)($_POST['quarter_calc'] ?? ''));
  if ($quarter === '' && $rcpaType === 'mgmt') {
    if (!empty($_POST['mgmt_q1']))      $quarter = 'Q1';
    elseif (!empty($_POST['mgmt_q2']))  $quarter = 'Q2';
    elseif (!empty($_POST['mgmt_q3']))  $quarter = 'Q3';
    elseif (!empty($_POST['mgmt_ytd'])) $quarter = 'YTD';
  }

  // category + conformance (same logic as submit)
  $category = trim((string)($_POST['category_calc'] ?? ''));
  if ($category === '') {
    if (!empty($_POST['cat_major']))        $category = 'Major';
    elseif (!empty($_POST['cat_minor']))    $category = 'Minor';
    elseif (!empty($_POST['cat_observation'])) $category = 'Observation';
  }
  $conformance = trim((string)($_POST['conformance_calc'] ?? ''));
  if ($conformance === '') {
    if ($category === 'Observation')                   $conformance = 'Potential Non-conformance';
    elseif ($category === 'Major' || $category === 'Minor') $conformance = 'Non-conformance';
  }

  // ---------- Load existing row ----------
  $sel = $conn->prepare("SELECT id, originator_name, status, remarks_attachment FROM rcpa_request WHERE id = ? LIMIT 1");
  if (!$sel) throw new Exception('Select prepare failed: ' . $conn->error);
  $sel->bind_param('i', $rcpaId);
  $sel->execute();
  $existing = $sel->get_result();
  $row = $existing ? $existing->fetch_assoc() : null;
  $sel->close();

  if (!$row) throw new Exception('Record not found.');
  $statusNow = strtoupper(trim((string)$row['status'] ?? ''));
  if ($statusNow !== 'REJECTED') {
    throw new Exception('Only REJECTED records can be edited.');
  }

  // Only originator (or admin) may edit
  $originatorName = (string)($row['originator_name'] ?? '');
  if (strcasecmp($originatorName, $user_name) !== 0 && $user_role !== 'admin') {
    throw new Exception('You are not allowed to edit this record.');
  }

  // ---------- Normalize existing attachments ----------
  $existingAtt = [];
  $raw = $row['remarks_attachment'] ?? null;
  if (is_string($raw) && $raw !== '') {
    $decoded = json_decode($raw, true);
    if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
      // JSON array of urls/objects
      foreach ($decoded as $f) {
        if (is_string($f) && $f !== '')           $existingAtt[] = $f;
        elseif (is_array($f) && !empty($f['url'])) $existingAtt[] = (string)$f['url'];
      }
    } else {
      // maybe comma-separated urls
      $parts = array_map('trim', explode(',', $raw));
      foreach ($parts as $u) if ($u !== '') $existingAtt[] = $u;
    }
  }

  // ---------- Handle new uploads (append) ----------
  $newAttachments = [];
  if (!empty($_FILES['finding_files']) && is_array($_FILES['finding_files']['name'])) {
    $fsBase = rtrim(__DIR__ . '/../uploads', '/\\');
    if (!is_dir($fsBase) && !@mkdir($fsBase, 0775, true)) {
      throw new Exception('Failed to create base upload directory.');
    }

    // Per-update subfolder
    $subdir  = preg_replace('/[^A-Za-z0-9._-]+/', '_', uniqid('upd_', true));
    $saveDir = $fsBase . DIRECTORY_SEPARATOR . $subdir;
    if (!is_dir($saveDir) && !@mkdir($saveDir, 0775, true)) {
      throw new Exception('Failed to create update upload directory.');
    }

    // Web base (same as submit: /rcpa/uploads)
    $scheme  = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $host    = $_SERVER['HTTP_HOST'];
    $root    = rtrim(dirname(dirname($_SERVER['SCRIPT_NAME'])), '/\\'); // /.../rcpa
    $webBase = $scheme . '://' . $host . $root . '/uploads';

    $count = count($_FILES['finding_files']['name']);
    for ($i = 0; $i < $count; $i++) {
      $err = $_FILES['finding_files']['error'][$i] ?? UPLOAD_ERR_NO_FILE;
      if ($err !== UPLOAD_ERR_OK) continue;

      $tmp   = $_FILES['finding_files']['tmp_name'][$i];
      $name  = $_FILES['finding_files']['name'][$i];
      $clean = preg_replace('/[^A-Za-z0-9._-]+/', '_', $name);

      $destAbs = $saveDir . DIRECTORY_SEPARATOR . $clean;
      if (move_uploaded_file($tmp, $destAbs)) {
        $newAttachments[] = $webBase . '/' . basename($saveDir) . '/' . rawurlencode($clean);
      }
    }
  }

  // Combine attachments (existing + new)
  $allAttachments = array_values(array_filter(array_merge($existingAtt, $newAttachments), static function($u) {
    return is_string($u) && $u !== '';
  }));
  $attachmentsStr = count($allAttachments) ? json_encode($allAttachments, JSON_UNESCAPED_SLASHES) : null;

  // ---------- Build UPDATE ----------
  // We DO NOT change: date_request, status, originator identity
  $sql = "UPDATE rcpa_request
          SET rcpa_type = ?,
              sem_year = ?,
              project_name = ?,
              wbs_number = ?,
              quarter = ?,
              category = ?,
              conformance = ?,
              remarks = ?,
              remarks_attachment = ?,
              system_applicable_std_violated = ?,
              standard_clause_number = ?,
              originator_supervisor_head = ?,
              assignee = ?,
              section = ?
          WHERE id = ?";

  $stmt = $conn->prepare($sql);
  if (!$stmt) throw new Exception('MySQLi prepare failed: ' . $conn->error);

  $p1  = $rcpaType ?: null;
  $p2  = $semYear ?: null;
  $p3  = $projectName ?: null;
  $p4  = $wbsNumber ?: null;
  $p5  = $quarter ?: null;
  $p6  = $category ?: null;
  $p7  = $conformance ?: null;
  $p8  = $remarks ?: null;
  $p9  = $attachmentsStr; // json or null (kept/merged)
  $p10 = $systemViolated ?: null;
  $p11 = $clauseNumbers ?: null;
  $p12 = $originatorSupervisor ?: null;
  $p13 = $assigneeDept ?: null;
  $p14 = $assigneeSect ?: null;
  $p15 = $rcpaId;

  $stmt->bind_param(
    'ssssssssssssssi',
    $p1, $p2, $p3, $p4, $p5, $p6, $p7, $p8, $p9, $p10, $p11, $p12, $p13, $p14, $p15
  );

  if (!$stmt->execute()) {
    throw new Exception('MySQLi execute failed: ' . $stmt->error);
  }
  $stmt->close();

  // ---------- History ----------
  $historySql  = "INSERT INTO rcpa_request_history (rcpa_no, name, date_time, activity)
                  VALUES (?, ?, CURRENT_TIMESTAMP, ?)";
  $historyStmt = $conn->prepare($historySql);
  if ($historyStmt) {
    $activityText = "RCPA details updated (kept REJECTED).";
    $historyStmt->bind_param('iss', $rcpaId, $user_name, $activityText);
    $historyStmt->execute();
    $historyStmt->close();
  }

  echo json_encode(['ok' => true, 'id' => $rcpaId]);
} catch (Throwable $e) {
  http_response_code(400);
  echo json_encode(['ok' => false, 'error' => $e->getMessage()]);
}
