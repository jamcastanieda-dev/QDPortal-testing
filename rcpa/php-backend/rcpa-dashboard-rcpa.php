<?php
// php-backend/rcpa-dashboard-rcpa.php
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
date_default_timezone_set('Asia/Manila');

/* ---------------------------
   Auth: require cookie
--------------------------- */
if (!isset($_COOKIE['user'])) {
  http_response_code(401);
  echo json_encode(['success' => false, 'error' => 'Not logged in']);
  exit;
}
$user = json_decode($_COOKIE['user'], true);
if (!$user || !is_array($user)) {
  http_response_code(401);
  echo json_encode(['success' => false, 'error' => 'Invalid user cookie']);
  exit;
}
$current_user = $user;
$user_name = trim((string)($current_user['name'] ?? ''));

/* ---------------------------
   DB connection
--------------------------- */
require '../../connection.php'; // should define $mysqli, $conn, or $link

if (!isset($mysqli) || !($mysqli instanceof mysqli)) {
  if (isset($conn) && $conn instanceof mysqli)      $mysqli = $conn;
  elseif (isset($link) && $link instanceof mysqli)  $mysqli = $link;
  else {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'DB connection not available']);
    exit;
  }
}
if (!$mysqli || $mysqli->connect_errno) {
  http_response_code(500);
  echo json_encode(['success' => false, 'error' => 'Database connection not available']);
  exit;
}
$mysqli->set_charset('utf8mb4');

/* ---------------------------
   Resolve user's department / section / role
--------------------------- */
$dept = '';
$user_section = '';
$user_role = '';
if ($user_name !== '') {
  $sqlDept = "SELECT department, section, role
              FROM system_users
              WHERE LOWER(TRIM(employee_name)) = LOWER(TRIM(?))
              LIMIT 1";
  if ($stmt = $mysqli->prepare($sqlDept)) {
    $stmt->bind_param('s', $user_name);
    $stmt->execute();
    $stmt->bind_result($db_department, $db_section, $db_role);
    if ($stmt->fetch()) {
      $dept         = (string)$db_department;
      $user_section = (string)$db_section;
      $user_role    = (string)$db_role;
    }
    $stmt->close();
  }
}

/* ---------------------------
   Visibility rules
   - QMS: see all (any role)
   - QA: see all ONLY if role is supervisor or manager
   - Others: MUST MATCH (assignee == dept AND section == user's section)
             (but user can always see their own originated rows)
--------------------------- */
$dept_norm = strtoupper(trim($dept));
$role_norm = strtolower(trim($user_role));
$see_all   = false;

if ($dept_norm === 'QMS') {
  $see_all = true;
} elseif ($dept_norm === 'QA' && ($role_norm === 'manager' || $role_norm === 'supervisor')) {
  $see_all = true;
}

/* ---------------------------
   Inputs
--------------------------- */
$year = trim((string)($_GET['year'] ?? '')); // optional filter

/* ---------------------------
   WHERE builder
--------------------------- */
$where  = [];
$params = [];
$types  = '';

/* Year filter (SARGable) */
if ($year !== '' && preg_match('/^\d{4}$/', $year)) {
  $start = $year . '-01-01 00:00:00';
  $end   = ((int)$year + 1) . '-01-01 00:00:00';
  $where[]  = "(date_request >= ? AND date_request < ?)";
  $params[] = $start;
  $params[] = $end;
  $types   .= 'ss';
}

/* Visibility restriction */
if (!$see_all) {
  if ($dept !== '' && $user_section !== '') {
    // STRICT match: assignee == dept AND section == user's section
    // (user can also see rows they originated)
    // Dept must match; section matches user's section OR is NULL/empty (disregard section when row has none)
    // (user can also see rows they originated)
    $where[]  = "(
  (assignee = ? AND (
      section IS NULL
      OR TRIM(section) = ''
      OR LOWER(TRIM(section)) = LOWER(TRIM(?))
  ))
  OR originator_name = ?
)";
    $params[] = $dept;
    $params[] = $user_section;
    $params[] = $user_name;
    $types   .= 'sss';
  } elseif ($dept !== '') {
    // No section on profile: only see dept where section is empty + your own originated rows
    $where[]  = "(
      (assignee = ? AND (section IS NULL OR TRIM(section) = ''))
      OR originator_name = ?
    )";
    $params[] = $dept;
    $params[] = $user_name;
    $types   .= 'ss';
  } elseif ($user_name !== '') {
    $where[]  = "originator_name = ?";
    $params[] = $user_name;
    $types   .= 's';
  } else {
    $where[] = "1=0"; // no identity info → no visibility
  }
}

$where_sql = $where ? ('WHERE ' . implode(' AND ', $where)) : '';

/* ---------------------------
   Query
--------------------------- */
$sql = "SELECT
          id,
          rcpa_type,
          category,
          originator_name,
          originator_department,
          assignee,
          section,
          assignee_name,
          status,
          date_request,
          reply_received,
          no_days_reply,
          reply_date,
          reply_due_date,
          no_days_close,
          close_date,
          close_due_date,
          hit_reply,
          hit_close
        FROM rcpa_request
        $where_sql
        ORDER BY date_request DESC, id DESC
        LIMIT 1000";

$stmt = $mysqli->prepare($sql);
if (!$stmt) {
  http_response_code(500);
  echo json_encode(['success' => false, 'error' => 'Prepare failed']);
  exit;
}
if ($types !== '') $stmt->bind_param($types, ...$params);
$stmt->execute();
$res = $stmt->get_result();

/* Label mapping for client display (kept from original) */
$label_map = [
  'external' => 'External QMS Audit',
  'internal' => 'Internal Quality Audit',
  'unattain' => 'Un-attainment of delivery target of Project',
  'online'   => 'On-Line',
  '5s'       => '5S Audit / Health & Safety Concerns',
  'mgmt'     => 'Management Objective'
];

$rows = [];
while ($r = $res->fetch_assoc()) {
  $reply_received = $r['reply_received'] ? date('Y-m-d', strtotime($r['reply_received'])) : null;
  $reply_date     = $r['reply_date'] ? date('Y-m-d', strtotime($r['reply_date'])) : null;
  $close_date     = $r['close_date'] ? date('Y-m-d', strtotime($r['close_date'])) : null;
  $close_due_date = $r['close_due_date'] ? date('Y-m-d', strtotime($r['close_due_date'])) : null;

  $rows[] = [
    'id'                     => (int)$r['id'],
    'rcpa_type'              => (string)($r['rcpa_type'] ?? ''),
    'rcpa_type_label'        => $label_map[strtolower(trim($r['rcpa_type'] ?? ''))] ?? (string)($r['rcpa_type'] ?? ''),
    'category'               => (string)($r['category'] ?? ''),
    'originator_name'        => (string)($r['originator_name'] ?? ''),
    'originator_department'  => (string)($r['originator_department'] ?? ''),
    'assignee'               => (string)($r['assignee'] ?? ''),
    'section'                => (string)($r['section'] ?? ''),
    'assignee_name'          => (string)($r['assignee_name'] ?? ''),  // <-- add this
    'status'                 => (string)($r['status'] ?? ''),
    'date_request'           => $r['date_request'] ? date('Y-m-d H:i:s', strtotime($r['date_request'])) : null,

    'reply_received'         => $reply_received,
    'no_days_reply'          => is_null($r['no_days_reply']) ? null : (int)$r['no_days_reply'],
    'reply_date'             => $reply_date,
    'reply_due_date'         => $r['reply_due_date'] ? date('Y-m-d', strtotime($r['reply_due_date'])) : null,

    'no_days_close'          => is_null($r['no_days_close']) ? null : (int)$r['no_days_close'],
    'close_date'             => $close_date,
    'close_due_date'         => $close_due_date,

    'hit_reply'              => (string)($r['hit_reply'] ?? ''),
    'hit_close'              => (string)($r['hit_close'] ?? ''),
  ];
}
$stmt->close();

/* ---------------------------
   Output
--------------------------- */
echo json_encode(['success' => true, 'rows' => $rows], JSON_UNESCAPED_UNICODE);
