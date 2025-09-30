<?php
ignore_user_abort(true);
set_time_limit(0);
header('Content-Type: text/event-stream; charset=UTF-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('X-Accel-Buffering: no');
while (ob_get_level()>0) { ob_end_flush(); }
ob_implicit_flush(true);

function evt($d){ echo "event: rcpa-notif-request-count\n"; echo 'data: '.json_encode($d,JSON_UNESCAPED_UNICODE)."\n\n"; @flush(); }

try{
  if (!isset($_COOKIE['user'])) { http_response_code(401); evt(['ok'=>false,'error'=>'Not authenticated']); exit; }
  $u = json_decode($_COOKIE['user'], true);
  if (!$u || !is_array($u)) { http_response_code(401); evt(['ok'=>false,'error'=>'Invalid user']); exit; }
  $user_name = trim((string)($u['name'] ?? ''));

  require '../../connection.php';
  if (!isset($mysqli) || !($mysqli instanceof mysqli)) {
    if (isset($conn)&&$conn instanceof mysqli) $mysqli=$conn;
    elseif (isset($link)&&$link instanceof mysqli) $mysqli=$link;
    else $mysqli=@new mysqli('localhost','DB_USER','DB_PASS','DB_NAME');
  }
  if(!$mysqli || $mysqli->connect_errno){ http_response_code(500); evt(['ok'=>false,'error'=>'DB unavailable']); exit; }
  $mysqli->set_charset('utf8mb4');

  $status_list = "(
    'REPLY CHECKING - ORIGINATOR',
    'EVIDENCE CHECKING - ORIGINATOR',
    'INVALID APPROVAL - ORIGINATOR'
  )";

  $getCount = function() use($mysqli,$user_name,$status_list){
    $c=0;
    $sql="SELECT COUNT(*) FROM rcpa_request
          WHERE status IN $status_list
            AND originator_name IS NOT NULL AND TRIM(originator_name) <> ''
            AND LOWER(TRIM(originator_name)) = LOWER(TRIM(?))";
    if ($stmt=$mysqli->prepare($sql)){ $stmt->bind_param('s',$user_name); $stmt->execute(); $stmt->bind_result($cnt); if($stmt->fetch()) $c=(int)$cnt; $stmt->close(); }
    return $c;
  };

  $last=null; $ticks=0; $interval=5; $max=300;
  $cur=$getCount(); $last=$cur; evt(['ok'=>true,'count'=>$cur]);
  while(!connection_aborted() && $ticks<($max/$interval)){
    sleep($interval); $ticks++;
    $c=$getCount();
    if($c!==$last){ $last=$c; evt(['ok'=>true,'count'=>$c]); }
    else { echo "event: ping\n"; echo "data: {}\n\n"; @flush(); }
  }
}catch(Throwable $e){ evt(['ok'=>false,'error'=>'Server error']); }
