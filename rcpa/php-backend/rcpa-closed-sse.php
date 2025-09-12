<?php
// php-backend/rcpa-closed-sse.php
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

/* -------- Resolve user's dept/section (visibility) -------- */
$dept = '';
$section = '';
if ($stmt0 = $mysqli->prepare("SELECT department, section FROM system_users WHERE LOWER(TRIM(employee_name)) = LOWER(TRIM(?)) LIMIT 1")) {
  $stmt0->bind_param('s', $user_name);
  if ($stmt0->execute()) {
    $stmt0->bind_result($db_department, $db_section);
    if ($stmt0->fetch()) {
      $dept    = (string)$db_department;
      $section = (string)$db_section;
    }
  }
  $stmt0->close();
}
$isQaqms = in_array(strtoupper(trim($dept)), ['QA','QMS'], true);

/* -------- Inputs (must mirror list endpoint) -------- */
$type   = trim((string)($_GET['type'] ?? ''));
$statusRaw = trim((string)($_GET['status'] ?? ''));
$statusNorm = '';
if ($statusRaw !== '') {
  $up = strtoupper($statusRaw);
  if ($up === 'VALID' || $up === 'CLOSED (VALID)')          $statusNorm = 'CLOSED (VALID)';
  elseif ($up === 'INVALID' || $up === 'IN-VALID' || $up === 'CLOSED (IN-VALID)') $statusNorm = 'CLOSED (IN-VALID)';
  elseif ($up === 'ALL')                                     $statusNorm = '';
}

/* -------- WHERE (mirror rcpa-list-closed.php) -------- */
$allowed_statuses = ['CLOSED (VALID)','CLOSED (IN-VALID)'];

$where  = [];
$params = [];
$types  = '';

if ($type !== '') {
  $where[]  = "rcpa_type = ?";
  $params[] = $type;
  $types   .= 's';
}

if ($statusNorm !== '' && in_array($statusNorm, $allowed_statuses, true)) {
  $where[]  = "status = ?";
  $params[] = $statusNorm;
  $types   .= 's';
} else {
  $where[] = '(' . implode(' OR ', array_fill(0, count($allowed_statuses), 'status = ?')) . ')';
  foreach ($allowed_statuses as $st) { $params[] = $st; $types .= 's'; }
}

if (!$isQaqms) {
  if ($dept !== '') {
    $where[]  = "(
      (LOWER(TRIM(assignee)) = LOWER(TRIM(?))
        AND (section IS NULL OR section = '' OR LOWER(TRIM(section)) = LOWER(TRIM(?)))
      )
      OR originator_name = ?
    )";
    $params[] = $dept;
    $params[] = $section;
    $params[] = $user_name;
    $types   .= 'sss';
  } else {
    $where[]  = "originator_name = ?";
    $params[] = $user_name;
    $types   .= 's';
  }
}

$where_sql = $where ? implode(' AND ', $where) : '1=1';

/* -------- Snapshot query -------- */
$sql = "SELECT MAX(id) AS max_id, COUNT(*) AS cnt
        FROM rcpa_request
        WHERE $where_sql";

$stmt = $mysqli->prepare($sql);
if (!$stmt) { http_response_code(500); exit; }

$deadline  = time() + 60;  // one-minute window; EventSource auto-reconnects
$lastPing  = 0;
$lastMaxId = -1;
$lastCount = -1;

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

  // heartbeat every ~15s to keep proxies happy
  if (time() - $lastPing >= 15) {
    echo ": ping\n\n";
    $lastPing = time();
    @flush();
  }

  usleep(300 * 1000); // 300ms
}

$stmt->close();
