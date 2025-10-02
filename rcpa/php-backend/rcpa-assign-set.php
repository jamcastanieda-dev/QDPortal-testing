<?php
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
date_default_timezone_set('Asia/Manila');

if (!isset($_COOKIE['user'])) { http_response_code(401); echo json_encode(['error'=>'Not logged in']); exit; }
$user = json_decode($_COOKIE['user'], true);
if (!$user || !is_array($user)) { http_response_code(401); echo json_encode(['error'=>'Invalid user cookie']); exit; }
$current_user = $user;
$user_name = trim((string)($current_user['name'] ?? ''));

require '../../connection.php';
if (!isset($mysqli) || !($mysqli instanceof mysqli)) {
  if (isset($conn) && $conn instanceof mysqli)      $mysqli = $conn;
  elseif (isset($link) && $link instanceof mysqli)  $mysqli = $link;
  else                                              $mysqli = @new mysqli('localhost','DB_USER','DB_PASS','DB_NAME');
}
if (!$mysqli || $mysqli->connect_errno) { http_response_code(500); echo json_encode(['error'=>'Database connection not available']); exit; }
$mysqli->set_charset('utf8mb4');

$dept=''; $user_section=''; $user_role='';
if ($user_name!=='') {
  $sql="SELECT department, section, role FROM system_users WHERE LOWER(TRIM(employee_name))=LOWER(TRIM(?)) LIMIT 1";
  if($st=$mysqli->prepare($sql)){ $st->bind_param('s',$user_name); $st->execute(); $st->bind_result($d,$s,$r);
    if($st->fetch()){ $dept=(string)$d; $user_section=(string)$s; $user_role=(string)$r; } $st->close();
  }
}
$role_norm = strtolower(trim($user_role));
$norm = fn($x)=>strtolower(trim((string)$x));

$raw = file_get_contents('php://input'); $data = json_decode($raw,true);
if(!is_array($data)) $data = $_POST;
$id = isset($data['id']) ? (int)$data['id'] : 0;
$assignee_name = trim((string)($data['assignee_name'] ?? ''));
if ($id<=0 || $assignee_name===''){ http_response_code(400); echo json_encode(['error'=>'Missing id or assignee_name']); exit; }

$sqlRow="SELECT id, assignee, section FROM rcpa_request WHERE id=? LIMIT 1";
$st=$mysqli->prepare($sqlRow); $st->bind_param('i',$id); $st->execute();
$row=$st->get_result()->fetch_assoc(); $st->close();
if(!$row){ http_response_code(404); echo json_encode(['error'=>'RCPA not found']); exit; }

$rcpa_dept=(string)($row['assignee']??'');
$rcpa_sect=trim((string)($row['section']??''));

if ($role_norm!=='manager' && $role_norm!=='supervisor'){ http_response_code(403); echo json_encode(['error'=>'Not allowed']); exit; }
if ($norm($rcpa_dept)!==$norm($dept)){ http_response_code(403); echo json_encode(['error'=>'Not allowed (department mismatch)']); exit; }
if ($rcpa_sect!=='' && $norm($rcpa_sect)!==$norm($user_section)){ http_response_code(403); echo json_encode(['error'=>'Not allowed (section mismatch)']); exit; }

if ($rcpa_sect==='') {
  $sqlChk="SELECT 1 FROM system_users WHERE UPPER(TRIM(employee_name))=UPPER(TRIM(?)) AND UPPER(TRIM(department))=UPPER(TRIM(?)) AND (section IS NULL OR TRIM(section)='') LIMIT 1";
  $st=$mysqli->prepare($sqlChk); $st->bind_param('ss',$assignee_name,$rcpa_dept);
} else {
  $sqlChk="SELECT 1 FROM system_users WHERE UPPER(TRIM(employee_name))=UPPER(TRIM(?)) AND UPPER(TRIM(department))=UPPER(TRIM(?)) AND LOWER(TRIM(section))=LOWER(TRIM(?)) LIMIT 1";
  $st=$mysqli->prepare($sqlChk); $st->bind_param('sss',$assignee_name,$rcpa_dept,$rcpa_sect);
}
$st->execute(); $st->store_result(); $valid = $st->num_rows>0; $st->close();
if(!$valid){ http_response_code(422); echo json_encode(['error'=>'Selected employee is not in the same department/section']); exit; }

$sqlUpd="UPDATE rcpa_request SET assignee_name=? WHERE id=?";
$st=$mysqli->prepare($sqlUpd); $st->bind_param('si',$assignee_name,$id);
$ok=$st->execute(); $err=$st->error; $st->close();
if(!$ok){ http_response_code(500); echo json_encode(['error'=>'Failed to update assignee_name: '.$err]); exit; }

echo json_encode(['ok'=>true], JSON_UNESCAPED_UNICODE);
