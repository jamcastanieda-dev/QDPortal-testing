<?php
// rcpa-approve-originator-invalid.php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

try {
  require_once '../../connection.php';
  if (!isset($conn) || !($conn instanceof mysqli)) throw new Exception('MySQLi connection unavailable.');
  mysqli_set_charset($conn, 'utf8mb4');

  // Ensure correct TZ for date math
  date_default_timezone_set('Asia/Manila');

  // Auth via cookie
  if (!isset($_COOKIE['user'])) { http_response_code(401); echo json_encode(['ok'=>false,'error'=>'Unauthorized']); exit; }
  $cookieUser = json_decode($_COOKIE['user'], true);
  if (!$cookieUser || empty($cookieUser['name'])) { http_response_code(401); echo json_encode(['ok'=>false,'error'=>'Unauthorized']); exit; }
  $currentName = preg_replace('/\s+/u', ' ', trim((string)$cookieUser['name']));

  // Read JSON body or POST
  $raw = file_get_contents('php://input');
  $body = json_decode($raw ?: 'null', true);
  $id = (int)($body['id'] ?? $_POST['id'] ?? 0);
  if ($id <= 0) { http_response_code(400); echo json_encode(['ok'=>false,'error'=>'Missing or invalid id']); exit; }

  // Verify record belongs to this originator and fetch reply_due_date for SLA computation
  $stmt = $conn->prepare("SELECT id, status, reply_due_date FROM rcpa_request WHERE id=? AND TRIM(originator_name)=TRIM(?)");
  if (!$stmt) throw new Exception('Prepare failed: '.$conn->error);
  $stmt->bind_param('is', $id, $currentName);
  $stmt->execute();
  $row = $stmt->get_result()->fetch_assoc();
  $stmt->close();
  if (!$row) { http_response_code(404); echo json_encode(['ok'=>false,'error'=>'Record not found']); exit; }

  // Compute close_date (today)
  $now = new DateTime('now', new DateTimeZone('Asia/Manila'));
  $todayStr = $now->format('Y-m-d');

  // ---- Compute no_days_close (EXCLUDE reply_due_date, INCLUDE today), exclude Sundays & non-working dates
  $noDaysClose = null;
  $replyDue = $row['reply_due_date'] ? new DateTime($row['reply_due_date'], new DateTimeZone('Asia/Manila')) : null;

  if ($replyDue instanceof DateTime) {
      $todayDate = new DateTime($todayStr, new DateTimeZone('Asia/Manila'));

      if ($replyDue >= $todayDate) {
          $noDaysClose = 0;
      } else {
          $start = (clone $replyDue)->modify('+1 day');
          $end   = $todayDate;

          // Preload non-working dates between start..today (inclusive)
          $holidays = [];
          $hstmt = $conn->prepare("SELECT `date` FROM rcpa_not_working_calendar WHERE `date` BETWEEN ? AND ?");
          if (!$hstmt) throw new Exception('Prepare failed: '.$conn->error);
          $startStr = $start->format('Y-m-d');
          $hstmt->bind_param('ss', $startStr, $todayStr);
          $hstmt->execute();
          $res = $hstmt->get_result();
          while ($h = $res->fetch_assoc()) { $holidays[$h['date']] = true; }
          $hstmt->close();

          // Count working days
          $count = 0;
          $iter = clone $start;
          while ($iter <= $end) {
              $ymd = $iter->format('Y-m-d');
              $dow = (int)$iter->format('w'); // 0=Sun
              if ($dow !== 0 && !isset($holidays[$ymd])) { $count++; }
              $iter->modify('+1 day');
          }
          $noDaysClose = $count;
      }
  }

  // ---- Compute hit_close based on no_days_close
  // rule: <= 30 => 'hit', > 30 => 'missed'; keep NULL if no_days_close is NULL
  $hitClose = null;
  if ($noDaysClose !== null) {
      $hitClose = ($noDaysClose <= 30) ? 'hit' : 'missed';
  }

  $conn->begin_transaction();

  // Update status + close_date + no_days_close + hit_close (idempotent on status)
  $target = 'CLOSED (INVALID)';
  $upd = $conn->prepare("UPDATE rcpa_request SET status=?, close_date=?, no_days_close=?, hit_close=? WHERE id=?");
  if (!$upd) throw new Exception('Prepare failed: '.$conn->error);
  $upd->bind_param('ssisi', $target, $todayStr, $noDaysClose, $hitClose, $id);
  $upd->execute();
  $upd->close();

  // History
  $activity = 'Originator approved that the RCPA is CLOSED (INVALID)';
  $ins = $conn->prepare("INSERT INTO rcpa_request_history (rcpa_no, name, activity) VALUES (?, ?, ?)");
  if (!$ins) throw new Exception('Prepare failed: '.$conn->error);
  $rcpa_no = (string)$id;
  $ins->bind_param('sss', $rcpa_no, $currentName, $activity);
  $ins->execute();
  $ins->close();

  $conn->commit();

  echo json_encode([
    'ok' => true,
    'status' => $target,
    'close_date' => $todayStr,
    'no_days_close' => $noDaysClose,
    'hit_close' => $hitClose
  ]);
} catch (Throwable $e) {
  if (isset($conn) && $conn instanceof mysqli) { $conn->rollback(); }
  http_response_code(400);
  echo json_encode(['ok'=>false,'error'=>$e->getMessage()]);
}
