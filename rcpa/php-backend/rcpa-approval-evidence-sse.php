<?php
// php-backend/rcpa-approval-evidence-sse.php
declare(strict_types=1);

header('Content-Type: text/event-stream');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Connection: keep-alive');
header('X-Accel-Buffering: no');

@ini_set('output_buffering','off');
@ini_set('zlib.output_compression','0');
if (function_exists('apache_setenv')) { @apache_setenv('no-gzip','1'); }
while (ob_get_level() > 0) { @ob_end_flush(); }
ob_implicit_flush(true);

date_default_timezone_set('Asia/Manila');

/* -------- Auth -------- */
$user = json_decode($_COOKIE['user'] ?? 'null', true);
if (!$user || !is_array($user) || empty($user['name'])) { http_response_code(401); exit; }
$user_name = trim((string)$user['name']);

/* -------- DB -------- */
require '../../connection.php'; // must define $mysqli, $conn, or $link
if (!isset($mysqli) || !($mysqli instanceof mysqli)) {
  if (isset($conn) && $conn instanceof mysqli)      $mysqli = $conn;
  elseif (isset($link) && $link instanceof mysqli)  $mysqli = $link;
  else                                              $mysqli = @new mysqli('localhost','DB_USER','DB_PASS','DB_NAME');
}
if (!$mysqli || $mysqli->connect_errno) { http_response_code(500); exit; }
$mysqli->set_charset('utf8mb4');

/* -------- User department (same rule as list) -------- */
$user_dept = '';
if ($stmt0 = $mysqli->prepare("SELECT department FROM system_users WHERE LOWER(TRIM(employee_name)) = LOWER(TRIM(?)) LIMIT 1")) {
  $stmt0->bind_param('s', $user_name);
  if ($stmt0->execute()) {
    $stmt0->bind_result($db_department);
    if ($stmt0->fetch()) $user_dept = (string)$db_department;
  }
  $stmt0->close();
}
$is_qaqms = in_array(strtoupper(trim($user_dept)), ['QA','QMS'], true);

/* -------- Inputs (mirror JS/list) -------- */
$type = trim((string)($_GET['type'] ?? ''));

/* -------- WHERE (mirror rcpa-list-approval-evidence.php) -------- */
$allowed_statuses = ['EVIDENCE APPROVAL'];

$where  = [];
$params = [];
$types  = '';

if ($type !== '') {
  $where[]  = "rcpa_type = ?";
  $params[] = $type;
  $types   .= 's';
}
$where[] = '(' . implode(' OR ', array_fill(0, count($allowed_statuses), 'status = ?')) . ')';
foreach ($allowed_statuses as $st) { $params[] = $st; $types .= 's'; }

if (!$is_qaqms) {
  if ($user_dept !== '') {
    $where[]  = "(assignee = ? OR originator_name = ?)";
    $params[] = $user_dept;
    $params[] = $user_name;
    $types   .= 'ss';
  } else {
    $where[]  = "originator_name = ?";
    $params[] = $user_name;
    $types   .= 's';
  }
}

$where_sql = $where ? implode(' AND ', $where) : '1=1';

/* -------- Snapshot to detect changes -------- */
$sql = "SELECT MAX(id) AS max_id, COUNT(*) AS cnt
        FROM rcpa_request
        WHERE $where_sql";

$deadline  = time() + 60; // keep-alive window; EventSource will reconnect
$lastPing  = 0;
$lastMaxId = -1;
$lastCount = -1;

$stmt = $mysqli->prepare($sql);
if (!$stmt) { http_response_code(500); exit; }

while (time() < $deadline && !connection_aborted()) {
  if ($types !== '') $stmt->bind_param($types, ...$params);
  $stmt->execute();
  $res = $stmt->get_result();
  $row = $res ? $res->fetch_assoc() : null;

  $maxId = (int)($row['max_id'] ?? 0);
  $cnt   = (int)($row['cnt'] ?? 0);

  if ($maxId !== $lastMaxId || $cnt !== $lastCount) {
    $lastMaxId = $maxId;
    $lastCount = $cnt;
    echo "event: rcpa\n";
    echo "data: " . json_encode(['type' => 'refresh', 'max_id' => $maxId, 'count' => $cnt], JSON_UNESCAPED_UNICODE) . "\n";
    echo "retry: 2000\n\n";
    @flush();
  }

  // heartbeat every ~15s
  if (time() - $lastPing >= 15) {
    echo ": ping\n\n";
    $lastPing = time();
    @flush();
  }

  usleep(300 * 1000); // 300ms
}

$stmt->close();
