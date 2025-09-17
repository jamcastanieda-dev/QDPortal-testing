<?php
// rcpa-notif-tasks-count-sse.php
ignore_user_abort(true);
set_time_limit(0);

header('Content-Type: text/event-stream; charset=UTF-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('X-Accel-Buffering: no');

while (ob_get_level() > 0) { ob_end_flush(); }
ob_implicit_flush(true);

function send_evt($name, $data, $retry=10000){
  if (!headers_sent()) echo "retry: {$retry}\n";
  echo "event: {$name}\n";
  echo 'data: ' . json_encode($data, JSON_UNESCAPED_UNICODE) . "\n\n";
  @flush();
}

try {
  if (!isset($_COOKIE['user'])) { http_response_code(401); send_evt('rcpa-notif-tasks-count', ['ok'=>false,'error'=>'Not authenticated']); exit; }
  $user = json_decode($_COOKIE['user'], true);
  if (!$user || !is_array($user)) { http_response_code(401); send_evt('rcpa-notif-tasks-count', ['ok'=>false,'error'=>'Invalid user']); exit; }
  $user_name = trim((string)($user['name'] ?? ''));

  require '../../connection.php';
  if (!isset($mysqli) || !($mysqli instanceof mysqli)) {
    if (isset($conn) && $conn instanceof mysqli)      $mysqli = $conn;
    elseif (isset($link) && $link instanceof mysqli)  $mysqli = $link;
    else                                              $mysqli = @new mysqli('localhost','DB_USER','DB_PASS','DB_NAME');
  }
  if (!$mysqli || $mysqli->connect_errno) { http_response_code(500); send_evt('rcpa-notif-tasks-count', ['ok'=>false,'error'=>'DB unavailable']); exit; }
  $mysqli->set_charset('utf8mb4');

  // Resolve department + role
  $department = '';
  $role = '';
  if ($user_name !== '') {
    if ($stmt=$mysqli->prepare("SELECT department, role FROM system_users WHERE LOWER(TRIM(employee_name))=LOWER(TRIM(?)) LIMIT 1")){
      $stmt->bind_param('s',$user_name);
      $stmt->execute();
      $stmt->bind_result($dep, $r);
      if($stmt->fetch()) { $department=(string)$dep; $role=(string)$r; }
      $stmt->close();
    }
  }
  $dept_norm = strtolower(trim($department));
  $role_norm = strtolower(trim($role));
  $can_qms_view = ($dept_norm === 'qms') ||
                  ($dept_norm === 'qa' && in_array($role_norm, ['manager','supervisor'], true));

  $status_list = "(
    'QMS CHECKING','VALIDATION REPLY','IN-VALIDATION REPLY','EVIDENCE CHECKING',
    'ASSIGNEE PENDING','FOR CLOSING',
    'VALID APPROVAL','IN-VALID APPROVAL','FOR CLOSING APPROVAL',
    'IN-VALIDATION REPLY APPROVAL','EVIDENCE APPROVAL',
    'CLOSED (VALID)','CLOSED (IN-VALID)'
  )";

  $getCount = function() use($mysqli,$can_qms_view,$department,$status_list){
    $count = 0;
    if ($can_qms_view) {
      $sql = "SELECT COUNT(*) FROM rcpa_request WHERE status IN $status_list";
      if ($stmt=$mysqli->prepare($sql)) { $stmt->execute(); $stmt->bind_result($cnt); if($stmt->fetch()) $count=(int)$cnt; $stmt->close(); }
    } elseif ($department !== '') {
      $sql = "SELECT COUNT(*) FROM rcpa_request WHERE status IN $status_list AND LOWER(TRIM(assignee))=LOWER(TRIM(?))";
      if ($stmt=$mysqli->prepare($sql)) { $stmt->bind_param('s',$department); $stmt->execute(); $stmt->bind_result($cnt); if($stmt->fetch()) $count=(int)$cnt; $stmt->close(); }
    }
    return $count;
  };

  $last = null;
  $ticks = 0; $interval = 5; $max = 300;
  $cur = $getCount(); $last = $cur;
  send_evt('rcpa-notif-tasks-count', ['ok'=>true,'count'=>$cur]);

  while (!connection_aborted() && $ticks < ($max / $interval)) {
    sleep($interval); $ticks++;
    $c = $getCount();
    if ($c !== $last) {
      $last = $c;
      send_evt('rcpa-notif-tasks-count', ['ok'=>true,'count'=>$c]);
    } else {
      echo "event: ping\n"; echo "data: {}\n\n"; @flush();
    }
  }
} catch (Throwable $e) {
  send_evt('rcpa-notif-tasks-count', ['ok'=>false,'error'=>'Server error']);
}
