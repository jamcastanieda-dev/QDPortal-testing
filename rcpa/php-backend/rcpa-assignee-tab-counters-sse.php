<?php
// php-backend/rcpa-assignee-tab-counters-sse.php
// Streams live tab counters for Assignee tabs via SSE.

@ini_set('zlib.output_compression', '0');
@ini_set('implicit_flush', '1');

header('Content-Type: text/event-stream; charset=UTF-8');
header('Cache-Control: no-cache, no-store, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('X-Accel-Buffering: no'); // disable nginx buffering if present

ignore_user_abort(true);
set_time_limit(0);

// Flush any active output buffers
while (ob_get_level() > 0) { @ob_end_flush(); }
@ob_implicit_flush(true);

// --- Auth ---
if (!isset($_COOKIE['user'])) {
  http_response_code(401);
  echo "event: rcpa-assignee-tabs\n";
  echo 'data: {"ok":false,"error":"Not authenticated"}' . "\n\n";
  flush();
  exit;
}
$user = json_decode($_COOKIE['user'], true);
if (!$user || !is_array($user)) {
  http_response_code(401);
  echo "event: rcpa-assignee-tabs\n";
  echo 'data: {"ok":false,"error":"Invalid user"}' . "\n\n";
  flush();
  exit;
}
$user_name = trim((string)($user['name'] ?? ''));

// --- DB ---
require '../../connection.php';
if (!isset($mysqli) || !($mysqli instanceof mysqli)) {
  if (isset($conn) && $conn instanceof mysqli)      $mysqli = $conn;
  elseif (isset($link) && $link instanceof mysqli)  $mysqli = $link;
  else                                              $mysqli = @new mysqli('localhost', 'DB_USER', 'DB_PASS', 'DB_NAME');
}
if (!$mysqli || $mysqli->connect_errno) {
  http_response_code(500);
  echo "event: rcpa-assignee-tabs\n";
  echo 'data: {"ok":false,"error":"DB unavailable"}' . "\n\n";
  flush();
  exit;
}
$mysqli->set_charset('utf8mb4');

// --- Helpers ---
function fetch_counts(mysqli $db, string $user_name): array {
  // Resolve department + section + role
  $department = '';
  $section    = '';
  $role       = '';
  if ($user_name !== '') {
    $sql = "SELECT department, section, role
              FROM system_users
             WHERE LOWER(TRIM(employee_name)) = LOWER(TRIM(?))
             LIMIT 1";
    if ($stmt = $db->prepare($sql)) {
      $stmt->bind_param('s', $user_name);
      $stmt->execute();
      $stmt->bind_result($db_department, $db_section, $db_role);
      if ($stmt->fetch()) {
        $department = (string)$db_department;
        $section    = (string)$db_section;
        $role       = (string)$db_role;
      }
      $stmt->close();
    }
  }

  // Visibility:
  // - QMS: see all (any role)
  // - QA : see all only if role in ('supervisor','manager')
  // - Others: restricted by dept/section (manager ignores section)
  $dept_norm = strtoupper(trim($department));
  $role_norm = strtolower(trim($role));
  $see_all   = ($dept_norm === 'QMS') || ($dept_norm === 'QA' && in_array($role_norm, ['manager','supervisor'], true));
  $is_manager = ($role_norm === 'manager');

  $assignee_pending = 0;
  $for_closing      = 0;

  if ($see_all) {
    $sql = "SELECT
              SUM(CASE WHEN status = 'ASSIGNEE PENDING' THEN 1 ELSE 0 END) AS assignee_pending,
              SUM(CASE WHEN status = 'FOR CLOSING'      THEN 1 ELSE 0 END) AS for_closing
            FROM rcpa_request
            WHERE status IN ('ASSIGNEE PENDING','FOR CLOSING')";
    if ($stmt = $db->prepare($sql)) {
      $stmt->execute();
      $stmt->bind_result($p, $c);
      if ($stmt->fetch()) {
        $assignee_pending = (int)($p ?? 0);
        $for_closing      = (int)($c ?? 0);
      }
      $stmt->close();
    }
  } elseif ($department !== '') {
    if ($is_manager) {
      // Manager: ignore section; department match only
      $sql = "SELECT
                SUM(CASE WHEN status = 'ASSIGNEE PENDING' THEN 1 ELSE 0 END) AS assignee_pending,
                SUM(CASE WHEN status = 'FOR CLOSING'      THEN 1 ELSE 0 END) AS for_closing
              FROM rcpa_request
              WHERE status IN ('ASSIGNEE PENDING','FOR CLOSING')
                AND LOWER(TRIM(assignee)) = LOWER(TRIM(?))";
      if ($stmt = $db->prepare($sql)) {
        $stmt->bind_param('s', $department);
        $stmt->execute();
        $stmt->bind_result($p, $c);
        if ($stmt->fetch()) {
          $assignee_pending = (int)($p ?? 0);
          $for_closing      = (int)($c ?? 0);
        }
        $stmt->close();
      }
    } else {
      // Non-manager: dept + (blank OR matching) section
      $sql = "SELECT
                SUM(CASE WHEN status = 'ASSIGNEE PENDING' THEN 1 ELSE 0 END) AS assignee_pending,
                SUM(CASE WHEN status = 'FOR CLOSING'      THEN 1 ELSE 0 END) AS for_closing
              FROM rcpa_request
              WHERE status IN ('ASSIGNEE PENDING','FOR CLOSING')
                AND LOWER(TRIM(assignee)) = LOWER(TRIM(?))
                AND (section IS NULL OR section = '' OR LOWER(TRIM(section)) = LOWER(TRIM(?)))";
      if ($stmt = $db->prepare($sql)) {
        $stmt->bind_param('ss', $department, $section);
        $stmt->execute();
        $stmt->bind_result($p, $c);
        if ($stmt->fetch()) {
          $assignee_pending = (int)($p ?? 0);
          $for_closing      = (int)($c ?? 0);
        }
        $stmt->close();
      }
    }
  }

  return [
    'ok'      => true,
    // Legacy flag kept for UI gating; now reflects "global visibility" (QMS or QA supervisor/manager)
    'is_qms'  => $see_all,
    'see_all' => $see_all,
    'counts'  => [
      'assignee_pending' => $assignee_pending,
      'for_closing'      => $for_closing
    ]
  ];
}

function sse_send(array $payload, string $event = 'rcpa-assignee-tabs', ?string $id = null, int $retryMs = 5000): void {
  if ($retryMs > 0) echo "retry: {$retryMs}\n";
  if ($event)       echo "event: {$event}\n";
  if ($id)          echo "id: {$id}\n";
  echo 'data: ' . json_encode($payload, JSON_UNESCAPED_UNICODE) . "\n\n";
  @flush();
}

// --- Stream loop (short-lived; EventSource will reconnect automatically) ---
$lastHash   = '';
$maxSeconds = 60;   // lifetime per connection
$interval   = 3;    // seconds between polls
$start      = time();

// Send initial snapshot immediately
$current  = fetch_counts($mysqli, $user_name);
$lastHash = md5(json_encode($current['counts']));
sse_send($current, 'rcpa-assignee-tabs', (string)time());

while (!connection_aborted()) {
  if ((time() - $start) >= $maxSeconds) break;

  // Heartbeat
  echo ": ping\n\n";
  @flush();

  // Poll counts
  $snap = fetch_counts($mysqli, $user_name);
  $hash = md5(json_encode($snap['counts']));
  if ($hash !== $lastHash) {
    $lastHash = $hash;
    sse_send($snap, 'rcpa-assignee-tabs', (string)time());
  }

  sleep($interval);
}

exit;
