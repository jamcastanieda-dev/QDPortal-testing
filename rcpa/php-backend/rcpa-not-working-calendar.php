<?php
// rcpa-not-working-calendar.php
header('Content-Type: application/json');
date_default_timezone_set('Asia/Manila');

$user = json_decode($_COOKIE['user'] ?? 'null', true);
if (!$user || !is_array($user)) {
  http_response_code(401);
  echo json_encode(['error' => 'Invalid user cookie']);
  exit;
}
$user_name = $user['name'] ?? 'Unknown User';

require_once __DIR__ . '/../../connection.php'; // mysqli $conn

if (!isset($conn) || !($conn instanceof mysqli)) {
  http_response_code(500);
  echo json_encode(['ok' => false, 'error' => 'DB connection not available']);
  exit;
}
$conn->set_charset('utf8mb4');

function get_json_body()
{
  $raw = file_get_contents('php://input');
  if ($raw) {
    $data = json_decode($raw, true);
    if (json_last_error() === JSON_ERROR_NONE) return $data;
  }
  return null;
}

/**
 * Generic helper: add N working days to $start_ymd, skipping Sundays and non-working dates.
 */
function add_working_days(string $start_ymd, int $days, array $non_working): string
{
  $dt = new DateTime($start_ymd, new DateTimeZone('Asia/Manila'));
  $count = 0;
  while ($count < $days) {
    $dt->modify('+1 day');
    $ymd = $dt->format('Y-m-d');
    $isSunday = ($dt->format('w') === '0'); // Sunday = 0
    if ($isSunday) continue;
    if (isset($non_working[$ymd])) continue;
    $count++;
  }
  return $dt->format('Y-m-d');
}

/**
 * Compute +5 working days from $reply_received (Y-m-d), skipping Sundays and non-working dates.
 */
function compute_reply_due_date(?string $reply_received, array $non_working): ?string
{
  if (!$reply_received) return null;
  $ts = strtotime($reply_received);
  if ($ts === false) return null;

  $start = date('Y-m-d', $ts);
  return add_working_days($start, 5, $non_working);
}

/**
 * NEW: Compute +30 working days from $reply_due (Y-m-d), skipping Sundays and non-working dates.
 */
function compute_close_due_date(?string $reply_due, array $non_working): ?string
{
  if (!$reply_due) return null;
  $ts = strtotime($reply_due);
  if ($ts === false) return null;

  $start = date('Y-m-d', $ts);
  return add_working_days($start, 30, $non_working);
}

/**
 * Recompute and persist due dates for all target statuses.
 * - reply_due_date = 5 working days after reply_received
 * - close_due_date = 30 working days after (effective) reply_due_date
 * Returns an array with summary info.
 */
function recompute_all_due_dates(mysqli $conn): array
{
  // 1) Load non-working dates into a set for O(1) lookups
  $non_working = [];
  if ($resNW = $conn->query("SELECT `date` FROM rcpa_not_working_calendar")) {
    while ($rw = $resNW->fetch_assoc()) {
      $d = date('Y-m-d', strtotime($rw['date']));
      $non_working[$d] = true;
    }
    $resNW->free();
  }

  // Counters
  $total_scanned_reply = 0;
  $total_scanned_close = 0;
  $updated_reply = 0;
  $updated_close = 0;
  $changed_reply_ids = [];
  $changed_close_ids = [];

  /* ---------------------------
   * PASS 1: reply_due_date
   * Only for these statuses
   * --------------------------- */
  $statuses_reply = ['ASSIGNEE PENDING', 'VALID APPROVAL', 'INVALID APPROVAL'];
  $placeholders_r = implode(',', array_fill(0, count($statuses_reply), '?'));

  $sql_r = "SELECT id,
                   DATE_FORMAT(reply_received,'%Y-%m-%d') AS rr,
                   DATE_FORMAT(reply_due_date,'%Y-%m-%d') AS rdd
            FROM rcpa_request
            WHERE status IN ($placeholders_r)
              AND reply_received IS NOT NULL";
  $stmt_r = $conn->prepare($sql_r);
  if (!$stmt_r) {
    return ['ok' => false, 'error' => 'Prepare reply candidates failed: ' . $conn->error];
  }
  $types_r = str_repeat('s', count($statuses_reply));
  $stmt_r->bind_param($types_r, ...$statuses_reply);
  if (!$stmt_r->execute()) {
    $err = $stmt_r->error;
    $stmt_r->close();
    return ['ok' => false, 'error' => 'Execute reply candidates failed: ' . $err];
  }
  $res_r = $stmt_r->get_result();

  $updReply = $conn->prepare("UPDATE rcpa_request SET reply_due_date = ? WHERE id = ?");
  if (!$updReply) {
    $stmt_r->close();
    return ['ok' => false, 'error' => 'Prepare reply_due update failed: ' . $conn->error];
  }

  while ($row = $res_r->fetch_assoc()) {
    $total_scanned_reply++;
    $id  = (int)$row['id'];
    $rr  = $row['rr']  ?: null; // reply_received (Y-m-d)
    $rdd = $row['rdd'] ?: null; // current reply_due_date (Y-m-d)

    $rdd_new = compute_reply_due_date($rr, $non_working);
    if ($rdd_new && $rdd_new !== $rdd) {
      $updReply->bind_param('si', $rdd_new, $id);
      if ($updReply->execute()) {
        $updated_reply++;
        $changed_reply_ids[] = $id;
      }
    }
  }
  $updReply->close();
  $stmt_r->close();

  /* ---------------------------
   * PASS 2: close_due_date
   * For ALL STATUSES EXCEPT these four
   * --------------------------- */
  $excluded_close = ['FOR APPROVAL MANAGER', 'FOR APPROVAL SUPERVISOR', 'CLOSED (VALID)', 'CLOSED (INVALID)'];
  $placeholders_cx = implode(',', array_fill(0, count($excluded_close), '?'));

  $sql_c = "SELECT id,
                   DATE_FORMAT(reply_due_date,'%Y-%m-%d') AS rdd,
                   DATE_FORMAT(close_due_date,'%Y-%m-%d') AS cdd
            FROM rcpa_request
            WHERE status NOT IN ($placeholders_cx)
              AND reply_due_date IS NOT NULL";
  $stmt_c = $conn->prepare($sql_c);
  if (!$stmt_c) {
    return ['ok' => false, 'error' => 'Prepare close candidates failed: ' . $conn->error];
  }
  $types_cx = str_repeat('s', count($excluded_close));
  $stmt_c->bind_param($types_cx, ...$excluded_close);
  if (!$stmt_c->execute()) {
    $err = $stmt_c->error;
    $stmt_c->close();
    return ['ok' => false, 'error' => 'Execute close candidates failed: ' . $err];
  }
  $res_c = $stmt_c->get_result();

  $updClose = $conn->prepare("UPDATE rcpa_request SET close_due_date = ? WHERE id = ?");
  if (!$updClose) {
    $stmt_c->close();
    return ['ok' => false, 'error' => 'Prepare close_due update failed: ' . $conn->error];
  }

  while ($row = $res_c->fetch_assoc()) {
    $total_scanned_close++;
    $id      = (int)$row['id'];
    $rdd_eff = $row['rdd'] ?: null; // effective reply_due_date (Y-m-d)
    $cdd_cur = $row['cdd'] ?: null; // current close_due_date (Y-m-d)

    if ($rdd_eff) {
      $cdd_new = compute_close_due_date($rdd_eff, $non_working);
      if ($cdd_new && $cdd_new !== $cdd_cur) {
        $updClose->bind_param('si', $cdd_new, $id);
        if ($updClose->execute()) {
          $updated_close++;
          $changed_close_ids[] = $id;
        }
      }
    }
  }
  $updClose->close();
  $stmt_c->close();

  // Keep the original response shape
  return [
    'ok' => true,
    'scanned' => $total_scanned_reply + $total_scanned_close,
    'reply_due' => ['updated' => $updated_reply, 'changed_ids' => $changed_reply_ids],
    'close_due' => ['updated' => $updated_close, 'changed_ids' => $changed_close_ids],
  ];
}


$method = $_SERVER['REQUEST_METHOD'];

/* --- determine if user can edit (QA/QMS only) --- */
$can_edit = false;
if ($stmtDept = $conn->prepare("SELECT department FROM system_users WHERE employee_name = ? LIMIT 1")) {
  $stmtDept->bind_param('s', $user_name);
  if ($stmtDept->execute()) {
    $resDept = $stmtDept->get_result();
    if ($rowDept = $resDept->fetch_assoc()) {
      $dept = $rowDept['department'] ?? null;
      if ($dept === 'QA' || $dept === 'QMS') {
        $can_edit = true;
      }
    }
  }
  $stmtDept->close();
}

if ($method === 'GET') {
  $sql = "SELECT id, DATE_FORMAT(`date`,'%Y-%m-%d') AS date, created_at
          FROM rcpa_not_working_calendar
          ORDER BY `date` ASC, id ASC";
  $res = $conn->query($sql);
  if (!$res) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => $conn->error]);
    exit;
  }
  $rows = [];
  while ($row = $res->fetch_assoc()) $rows[] = $row;

  // include permission flag for the frontend
  echo json_encode(['ok' => true, 'data' => $rows, 'can_edit' => $can_edit]);
  exit;
}

if ($method === 'POST') {
  $body   = get_json_body();
  $action = $body['action'] ?? ($_POST['action'] ?? 'add');
  $date   = $body['date']   ?? ($_POST['date']   ?? null);

  if (!$date) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Missing date']);
    exit;
  }
  if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Invalid date format']);
    exit;
  }

  if ($action === 'delete') {
    $stmt = $conn->prepare("DELETE FROM rcpa_not_working_calendar WHERE `date` = ?");
    if (!$stmt) {
      http_response_code(500);
      echo json_encode(['ok' => false, 'error' => $conn->error]);
      exit;
    }
    $stmt->bind_param('s', $date);
    if (!$stmt->execute()) {
      http_response_code(500);
      echo json_encode(['ok' => false, 'error' => $stmt->error]);
      exit;
    }
    $deleted = $stmt->affected_rows;
    $stmt->close();

    // Recompute after delete (updates both reply_due_date and close_due_date)
    $recalc = recompute_all_due_dates($conn);
    echo json_encode(['ok' => true, 'action' => 'delete', 'deleted' => $deleted, 'date' => $date, 'recalc' => $recalc]);
    exit;
  }

  // default: add
  $stmt = $conn->prepare("INSERT INTO rcpa_not_working_calendar (`date`) VALUES (?)");
  if (!$stmt) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => $conn->error]);
    exit;
  }
  $stmt->bind_param('s', $date);
  if (!$stmt->execute()) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => $stmt->error]);
    exit;
  }
  $insert_id = $stmt->insert_id;
  $stmt->close();

  // Recompute after add (updates both reply_due_date and close_due_date)
  $recalc = recompute_all_due_dates($conn);
  echo json_encode(['ok' => true, 'action' => 'add', 'inserted' => true, 'id' => $insert_id, 'date' => $date, 'recalc' => $recalc]);
  exit;
}

http_response_code(405);
echo json_encode(['ok' => false, 'error' => 'Method not allowed']);
