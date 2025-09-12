<?php
// php-backend/rcpa-approval-sse.php
declare(strict_types=1);

// --- SSE headers ---
header('Content-Type: text/event-stream');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Connection: keep-alive');
header('X-Accel-Buffering: no');

@ini_set('output_buffering', 'off');
@ini_set('zlib.output_compression', '0');
if (function_exists('apache_setenv')) { @apache_setenv('no-gzip', '1'); }

while (ob_get_level() > 0) { @ob_end_flush(); }
ob_implicit_flush(true);

date_default_timezone_set('Asia/Manila');

/* -------- Auth -------- */
if (!isset($_COOKIE['user'])) { http_response_code(401); exit; }
$user = json_decode($_COOKIE['user'] ?? 'null', true);
if (!$user || !is_array($user)) { http_response_code(401); exit; }
$approverName = (string)($user['name'] ?? '');
if ($approverName === '') { http_response_code(401); exit; }

/* -------- DB -------- */
require '../../connection.php';
if (!isset($mysqli) || !($mysqli instanceof mysqli)) {
  if (isset($conn) && $conn instanceof mysqli)      $mysqli = $conn;
  elseif (isset($link) && $link instanceof mysqli)  $mysqli = $link;
  else                                              $mysqli = @new mysqli('localhost','DB_USER','DB_PASS','DB_NAME');
}
if (!$mysqli || $mysqli->connect_errno) { http_response_code(500); exit; }
$mysqli->set_charset('utf8mb4');

/* -------- Filters (same as list) -------- */
$allowed_statuses = ['FOR APPROVAL OF MANAGER', 'FOR APPROVAL OF SUPERVISOR'];

/* -------- Snapshot query: NO id>since; we watch (max_id, count) -------- */
$sql = "SELECT MAX(id) AS max_id, COUNT(*) AS cnt
        FROM rcpa_request
        WHERE originator_supervisor_head = ?
          AND (status = ? OR status = ?)";

$deadline   = time() + 60;
$lastPing   = 0;

/* Take initial snapshot to avoid immediate reload */
$lastMaxId = 0;
$lastCount = 0;

$stmt = $mysqli->prepare($sql);
if (!$stmt) { http_response_code(500); exit; }

$stmt->bind_param('sss', $approverName, $allowed_statuses[0], $allowed_statuses[1]);
$stmt->execute();
$res = $stmt->get_result();
if ($row = $res->fetch_assoc()) {
  $lastMaxId = (int)($row['max_id'] ?? 0);
  $lastCount = (int)($row['cnt'] ?? 0);
}

/* Long poll */
while (time() < $deadline && !connection_aborted()) {
  $stmt->bind_param('sss', $approverName, $allowed_statuses[0], $allowed_statuses[1]);
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

  if (time() - $lastPing >= 15) {
    echo ": ping\n\n";
    $lastPing = time();
    @flush();
  }

  usleep(300 * 1000);
}
$stmt->close();
