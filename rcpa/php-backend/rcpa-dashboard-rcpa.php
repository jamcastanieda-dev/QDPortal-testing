<?php
// php-backend/rcpa-dashboard-rcpa.php
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
date_default_timezone_set('Asia/Manila');

/* ---------- Auth ---------- */
if (!isset($_COOKIE['user'])) {
  http_response_code(401);
  echo json_encode(['success'=>false,'error'=>'Not logged in']);
  exit;
}
$user = json_decode($_COOKIE['user'], true);
if (!$user || !is_array($user)) {
  http_response_code(401);
  echo json_encode(['success'=>false,'error'=>'Invalid user cookie']);
  exit;
}

/* ---------- DB ---------- */
require '../../connection.php';
$db = isset($mysqli) && $mysqli instanceof mysqli ? $mysqli
   : (isset($conn) && $conn instanceof mysqli ? $conn : null);
if (!$db) {
  http_response_code(500);
  echo json_encode(['success'=>false,'error'=>'DB connection not available']);
  exit;
}
$db->set_charset('utf8mb4');

/* ---------- Inputs ---------- */
$site = trim((string)($_GET['site'] ?? '')); // reserved for future use
$year = trim((string)($_GET['year'] ?? ''));

$where  = [];
$params = [];
$types  = '';

if ($year !== '') {
  $where[]  = "YEAR(date_request) = ?";
  $params[] = (int)$year;
  $types   .= 'i';
}

$where_sql = $where ? ('WHERE '.implode(' AND ', $where)) : '';

/* ---------- Query ---------- */
$sql = "SELECT
          id,
          rcpa_type,
          category,
          originator_name,
          originator_department,
          assignee,
          section,
          status,
          date_request,
          reply_received,
          no_days_reply,
          reply_date,
          reply_due_date,
          no_days_close,
          close_date,
          close_due_date,
          hit_reply,            -- NEW
          hit_close             -- NEW
        FROM rcpa_request
        $where_sql
        ORDER BY date_request DESC, id DESC
        LIMIT 1000";

$stmt = $db->prepare($sql);
if (!$stmt) {
  http_response_code(500);
  echo json_encode(['success'=>false,'error'=>'Prepare failed']);
  exit;
}
if ($types !== '') $stmt->bind_param($types, ...$params);
$stmt->execute();
$res = $stmt->get_result();

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
    'status'                 => (string)($r['status'] ?? ''),
    'date_request'           => $r['date_request'] ? date('Y-m-d H:i:s', strtotime($r['date_request'])) : null,

    'reply_received'         => $reply_received,
    'no_days_reply'          => is_null($r['no_days_reply']) ? null : (int)$r['no_days_reply'],
    'reply_date'             => $reply_date,
    'reply_due_date'         => $r['reply_due_date'] ? date('Y-m-d', strtotime($r['reply_due_date'])) : null,

    'no_days_close'          => is_null($r['no_days_close']) ? null : (int)$r['no_days_close'],
    'close_date'             => $close_date,
    'close_due_date'         => $close_due_date,

    'hit_reply'              => (string)($r['hit_reply'] ?? ''),  // NEW
    'hit_close'              => (string)($r['hit_close'] ?? ''),  // NEW
  ];
}
$stmt->close();

echo json_encode(['success'=>true, 'rows'=>$rows], JSON_UNESCAPED_UNICODE);
