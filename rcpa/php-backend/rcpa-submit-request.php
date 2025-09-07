<?php
// rcpa-submit-request.php
declare(strict_types=1);
header('Content-Type: application/json');

$user = json_decode($_COOKIE['user'], true);
if (!$user || !is_array($user)) {
  header('Location: ../../login.php');
  exit;
}
$current_user = $user;
$user_name = $current_user['name'];


try {
  require_once __DIR__ . '/../../connection.php';
  if (!isset($conn) || !($conn instanceof mysqli)) {
    throw new Exception('MySQLi connection ($conn) not available.');
  }

  /* ---------- Read POST ---------- */
  $rcpaType = $_POST['rcpa_type'] ?? '';
  $projectName = trim($_POST['project_name'] ?? '');
  $wbsNumber = trim($_POST['wbs_number'] ?? '');
  $originatorName = trim($_POST['originator_name'] ?? '');
  $originatorDept = trim($_POST['originator_dept'] ?? '');
  $dateLocal = trim($_POST['date_request_calc'] ?? ($_POST['originator_date'] ?? ''));
  $remarks = trim($_POST['finding_description'] ?? '');
  $systemViolated = trim($_POST['system_violated'] ?? '');
  $clauseNumbers = trim($_POST['clause_numbers'] ?? '');
  $originatorSupervisor = trim($_POST['originator_supervisor'] ?? '');
  $assignee = trim($_POST['assignee'] ?? '');

  if ($rcpaType === '') throw new Exception('RCPA Type is required.');
  if ($assignee === '') throw new Exception('Assignee is required.');

  // Split "Department - Section" into parts. If no " - ", section stays null.
  $assigneeDept = $assignee;
  $assigneeSect = null;
  if (strpos($assignee, ' - ') !== false) {
    [$assigneeDept, $assigneeSect] = array_map('trim', explode(' - ', $assignee, 2));
  }

  /* ---------- Compute sem_year ---------- */
  $semYear = trim($_POST['sem_year_calc'] ?? '');
  if ($semYear === '') {
    if ($rcpaType === 'external') {
      if (!empty($_POST['external_sem1_pick'])) $semYear = '1st Sem – ' . ($_POST['external_sem1_year'] ?? '');
      elseif (!empty($_POST['external_sem2_pick'])) $semYear = '2nd Sem – ' . ($_POST['external_sem2_year'] ?? '');
    } elseif ($rcpaType === 'internal') {
      if (!empty($_POST['internal_sem1_pick'])) $semYear = '1st Sem – ' . ($_POST['internal_sem1_year'] ?? '');
      elseif (!empty($_POST['internal_sem2_pick'])) $semYear = '2nd Sem – ' . ($_POST['internal_sem2_year'] ?? '');
    } elseif ($rcpaType === 'online') {
      $semYear = $_POST['online_year'] ?? '';
    } elseif ($rcpaType === '5s') {
      $m = trim($_POST['hs_month'] ?? '');
      $y = trim($_POST['hs_year'] ?? '');
      $semYear = trim($m . ' ' . $y);
    } elseif ($rcpaType === 'mgmt') {
      $semYear = $_POST['mgmt_year'] ?? '';
    }
  }

  /* ---------- quarter ---------- */
  $quarter = trim($_POST['quarter_calc'] ?? '');
  if ($quarter === '' && $rcpaType === 'mgmt') {
    if (!empty($_POST['mgmt_q1'])) $quarter = 'Q1';
    elseif (!empty($_POST['mgmt_q2'])) $quarter = 'Q2';
    elseif (!empty($_POST['mgmt_q3'])) $quarter = 'Q3';
    elseif (!empty($_POST['mgmt_ytd'])) $quarter = 'YTD';
  }

  /* ---------- Category + Conformance ---------- */
  $category = trim($_POST['category_calc'] ?? '');
  if ($category === '') {
    if (!empty($_POST['cat_major'])) $category = 'Major';
    elseif (!empty($_POST['cat_minor'])) $category = 'Minor';
    elseif (!empty($_POST['cat_observation'])) $category = 'Observation';
  }
  $conformance = trim($_POST['conformance_calc'] ?? '');
  if ($conformance === '') {
    if ($category === 'Observation') $conformance = 'Potential Non-conformance';
    elseif ($category === 'Major' || $category === 'Minor') $conformance = 'Non-conformance';
  }

  /* ---------- DATETIME ---------- */
  $dateRequest = null;
  if ($dateLocal !== '') {
    $dateLocal = str_replace('T', ' ', $dateLocal);
    $ts = strtotime($dateLocal);
    if ($ts !== false) $dateRequest = date('Y-m-d H:i:s', $ts);
  }

  /* ---------- Attachments ---------- */
  $attachments = [];
  if (!empty($_FILES['finding_files']) && is_array($_FILES['finding_files']['name'])) {
    // Filesystem base: ../uploads/
    $fsBase = rtrim(__DIR__ . '/../uploads', '/\\');
    if (!is_dir($fsBase) && !@mkdir($fsBase, 0775, true)) {
      throw new Exception('Failed to create base upload directory.');
    }

    // Per-request subfolder
    $subdir  = preg_replace('/[^A-Za-z0-9._-]+/', '_', uniqid('req_', true));
    $saveDir = $fsBase . DIRECTORY_SEPARATOR . $subdir;
    if (!is_dir($saveDir) && !@mkdir($saveDir, 0775, true)) {
      throw new Exception('Failed to create request upload directory.');
    }

    // Build web base: http(s)://host/qdportal-testing/rcpa/uploads
    $scheme  = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $host    = $_SERVER['HTTP_HOST'];
    $root    = rtrim(dirname(dirname($_SERVER['SCRIPT_NAME'])), '/\\'); // /qdportal-testing/rcpa
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
        // Return a clickable absolute URL (no /php/ in the path)
        $attachments[] = $webBase . '/' . basename($saveDir) . '/' . rawurlencode($clean);
      }
    }
  }


  $attachmentsStr = empty($attachments) ? null : json_encode($attachments, JSON_UNESCAPED_SLASHES);

  /* ---------- STATUS by supervisor role ---------- */
  $status = 'QMS CHECKING';
  if ($originatorSupervisor !== '') {
    $sqlRole = '';
    $typeRole = '';
    $val = $originatorSupervisor;

    if (ctype_digit($originatorSupervisor)) { // employee_id
      $sqlRole = "SELECT role FROM system_users WHERE employee_id = ? LIMIT 1";
      $typeRole = 'i';
      $val = (int)$originatorSupervisor;
    } elseif (strpos($originatorSupervisor, '@') !== false) { // email
      $sqlRole = "SELECT role FROM system_users WHERE email = ? LIMIT 1";
      $typeRole = 's';
    } else { // name
      $sqlRole = "SELECT role FROM system_users WHERE employee_name = ? LIMIT 1";
      $typeRole = 's';
    }

    if ($sqlRole) {
      $st = $conn->prepare($sqlRole);
      if ($st) {
        $st->bind_param($typeRole, $val);
        $st->execute();
        $res = $st->get_result();
        $row = $res ? $res->fetch_assoc() : null;
        $role = $row ? strtolower((string)$row['role']) : null;
        if ($role === 'supervisor') $status = 'FOR APPROVAL OF SUPERVISOR';
        elseif ($role === 'manager') $status = 'FOR APPROVAL OF MANAGER';
        $st->close();
      }
    }
  }

  /* ---------- INSERT ---------- */
  /* ---------- INSERT (now includes section) ---------- */
  $sql = "INSERT INTO rcpa_request
  (rcpa_type, sem_year, project_name, wbs_number, quarter, category,
   originator_name, originator_department, date_request, conformance,
   remarks, remarks_attachment, system_applicable_std_violated,
   standard_clause_number, originator_supervisor_head, assignee, section, status)
  VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)";

  $stmt = $conn->prepare($sql);
  if (!$stmt) throw new Exception('MySQLi prepare failed: ' . $conn->error);

  $p1  = $rcpaType ?: null;
  $p2  = $semYear ?: null;
  $p3  = $projectName ?: null;
  $p4  = $wbsNumber ?: null;
  $p5  = $quarter ?: null;
  $p6  = $category ?: null;
  $p7  = $originatorName ?: null;
  $p8  = $originatorDept ?: null;
  $p9  = $dateRequest; // DATETIME or null
  $p10 = $conformance ?: null;
  $p11 = $remarks ?: null;
  $p12 = $attachmentsStr; // json or null
  $p13 = $systemViolated ?: null;
  $p14 = $clauseNumbers ?: null;
  $p15 = $originatorSupervisor ?: null;
  $p16 = $assigneeDept ?: null;   // department only
  $p16b = $assigneeSect ?: null;   // section (nullable)
  $p17 = $status;

  $stmt->bind_param(
    'ssssssssssssssssss',
    $p1,
    $p2,
    $p3,
    $p4,
    $p5,
    $p6,
    $p7,
    $p8,
    $p9,
    $p10,
    $p11,
    $p12,
    $p13,
    $p14,
    $p15,
    $p16,
    $p16b,
    $p17
  );


  if (!$stmt->execute()) {
    throw new Exception('MySQLi execute failed: ' . $stmt->error);
  }
  $newId = (int)$conn->insert_id;
  $stmt->close();

  // Insert history entry (no foreign key constraints)
  $historySql = "INSERT INTO rcpa_request_history (rcpa_no, name, date_time, activity)
               VALUES (?, ?, CURRENT_TIMESTAMP, ?)";

  $historyStmt = $conn->prepare($historySql);
  if (!$historyStmt) {
    throw new Exception('History insert prepare failed: ' . $conn->error);
  }

  $activityText = "RCPA has been requested.";
  $historyStmt->bind_param('iss', $newId, $user_name, $activityText);

  if (!$historyStmt->execute()) {
    throw new Exception('History insert execute failed: ' . $historyStmt->error);
  }

  $historyStmt->close();



  echo json_encode(['ok' => true, 'id' => $newId]);
} catch (Throwable $e) {
  http_response_code(400);
  echo json_encode(['ok' => false, 'error' => $e->getMessage()]);
}
