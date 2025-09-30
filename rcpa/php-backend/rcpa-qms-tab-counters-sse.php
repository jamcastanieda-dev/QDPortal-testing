<?php
// php-backend/rcpa-qms-tab-counters-sse.php
declare(strict_types=1);

header('Content-Type: text/event-stream; charset=UTF-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Connection: keep-alive');
header('X-Accel-Buffering: no'); // disable nginx buffering if present

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
require '../../connection.php'; // defines $mysqli / $conn / $link
if (!isset($mysqli) || !($mysqli instanceof mysqli)) {
  if (isset($conn) && $conn instanceof mysqli)      $mysqli = $conn;
  elseif (isset($link) && $link instanceof mysqli)  $mysqli = $link;
  else                                              $mysqli = @new mysqli('localhost','DB_USER','DB_PASS','DB_NAME');
}
if (!$mysqli || $mysqli->connect_errno) { http_response_code(500); exit; }
$mysqli->set_charset('utf8mb4');

/* -------- Resolve visibility (QA/QMS = global; others = by assignee dept) -------- */
$dept = '';
if ($stmt0 = $mysqli->prepare("SELECT department FROM system_users WHERE LOWER(TRIM(employee_name)) = LOWER(TRIM(?)) LIMIT 1")) {
  $stmt0->bind_param('s', $user_name);
  $stmt0->execute();
  $stmt0->bind_result($db_department);
  if ($stmt0->fetch()) $dept = (string)$db_department;
  $stmt0->close();
}
$isQaqms = in_array(strtoupper(trim($dept)), ['QA','QMS'], true);

/* -------- Build WHERE (mirror rcpa-qms-tab-counters.php) -------- */
$where = [];
$params = [];
$types  = '';

$statuses = ["'QMS CHECKING'","'INVALIDATION REPLY'","'VALIDATION REPLY'","'EVIDENCE CHECKING'"];
$where[] = "status IN (" . implode(',', $statuses) . ")";

if (!$isQaqms && $dept !== '') {
  $where[]  = "LOWER(TRIM(assignee)) = LOWER(TRIM(?))";
  $params[] = $dept;
  $types   .= 's';
} elseif (!$isQaqms && $dept === '') {
  // No department info: show nothing
  $where[] = "1=0";
}

$where_sql = $where ? ('WHERE ' . implode(' AND ', $where)) : '';

/* -------- Snapshot query -------- */
$sql = "
  SELECT
    SUM(CASE WHEN status = 'QMS CHECKING'        THEN 1 ELSE 0 END) AS qms_checking,
    SUM(CASE WHEN status = 'INVALIDATION REPLY' THEN 1 ELSE 0 END) AS not_valid,
    SUM(CASE WHEN status = 'VALIDATION REPLY'    THEN 1 ELSE 0 END) AS valid,
    SUM(CASE WHEN status = 'EVIDENCE CHECKING'   THEN 1 ELSE 0 END) AS evidence_checking
  FROM rcpa_request
  $where_sql
";
$stmt = $mysqli->prepare($sql);
if (!$stmt) { http_response_code(500); exit; }

/* -------- Stream loop -------- */
$deadline = time() + 60;           // ~1 minute per connection (browser auto-reconnects)
$last     = ['qms_checking'=>-1,'not_valid'=>-1,'valid'=>-1,'evidence_checking'=>-1];
$lastPing = 0;

while (time() < $deadline && !connection_aborted()) {
  if ($types !== '') { $stmt->bind_param($types, ...$params); }
  $stmt->execute();
  $res = $stmt->get_result();
  $row = $res ? $res->fetch_assoc() : null;

  $curr = [
    'qms_checking'      => (int)($row['qms_checking'] ?? 0),
    'not_valid'         => (int)($row['not_valid'] ?? 0),
    'valid'             => (int)($row['valid'] ?? 0),
    'evidence_checking' => (int)($row['evidence_checking'] ?? 0),
  ];

  if ($curr !== $last) {
    $last = $curr;
    echo "event: rcpa-tabs\n";
    echo "data: " . json_encode(['counts' => $curr], JSON_UNESCAPED_UNICODE) . "\n";
    echo "retry: 2000\n\n";
    @flush();
  }

  // Heartbeat every ~15s
  if (time() - $lastPing >= 15) {
    echo ": ping\n\n";
    $lastPing = time();
    @flush();
  }

  usleep(400 * 1000); // 400ms
}

$stmt->close();
