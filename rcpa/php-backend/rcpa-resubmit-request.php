<?php
// rcpa-resubmit-request.php
declare(strict_types=1);
header('Content-Type: application/json');

try {
  // ---- auth (same as submit) ----
  $user = json_decode($_COOKIE['user'] ?? 'null', true);
  if (!$user || !is_array($user)) {
    http_response_code(401);
    echo json_encode(['ok' => false, 'error' => 'Not authenticated.']);
    exit;
  }
  $current_user = $user;
  $user_name = $current_user['name'] ?? '';
  $user_role = strtolower(trim((string)($current_user['role'] ?? '')));

  // ---- input ----
  $raw = file_get_contents('php://input') ?: '';
  $in  = json_decode($raw, true);
  $id  = (int)($in['id'] ?? 0);
  if ($id <= 0) throw new Exception('Invalid request id.');

  require_once __DIR__ . '/../../connection.php';
  if (!isset($conn) || !($conn instanceof mysqli)) {
    throw new Exception('MySQLi connection ($conn) not available.');
  }

  // ---- fetch the request ----
  $st = $conn->prepare("SELECT id, status, originator_name, originator_supervisor_head FROM rcpa_request WHERE id = ? LIMIT 1");
  if (!$st) throw new Exception('Prepare failed: ' . $conn->error);
  $st->bind_param('i', $id);
  $st->execute();
  $res = $st->get_result();
  $row = $res ? $res->fetch_assoc() : null;
  $st->close();

  if (!$row) throw new Exception('Request not found.');
  $statusNow = strtoupper(trim((string)$row['status']));
  if ($statusNow !== 'REJECTED') throw new Exception('Only REJECTED requests can be resubmitted.');

  // ---- permission: originator or privileged roles ----
  $isOriginator = $user_name && (trim($user_name) === trim((string)$row['originator_name']));
  $isPrivileged = in_array($user_role, ['qms','qa','admin','manager','supervisor'], true);
  if (!$isOriginator && !$isPrivileged) {
    http_response_code(403);
    echo json_encode(['ok' => false, 'error' => 'You are not allowed to resubmit this request.']);
    exit;
  }

  // ---- compute new status (exactly like rcpa-submit-request.php) ----
  $originatorSupervisor = trim((string)($row['originator_supervisor_head'] ?? ''));
  $newStatus = 'QMS CHECKING'; // default if no supervisor/head

  if ($originatorSupervisor !== '') {
    $sqlRole = '';
    $typeRole = '';
    $val = $originatorSupervisor;

    if (ctype_digit($originatorSupervisor)) { // employee_id
      $sqlRole = "SELECT role FROM system_users WHERE employee_id = ? LIMIT 1";
      $typeRole = 'i';
      $val = (int)$originatorSupervisor;
    } elseif (strpos($originatorSupervisor, '@') !== false) { // email
      $sqlRole = "SELECT role FROM system_users WHERE email = ? LIMIT 1";
      $typeRole = 's';
    } else { // name
      $sqlRole = "SELECT role FROM system_users WHERE employee_name = ? LIMIT 1";
      $typeRole = 's';
    }

    if ($sqlRole) {
      $st2 = $conn->prepare($sqlRole);
      if ($st2) {
        $st2->bind_param($typeRole, $val);
        $st2->execute();
        $r2 = $st2->get_result();
        $u  = $r2 ? $r2->fetch_assoc() : null;
        $role = $u ? strtolower((string)$u['role']) : null;
        if ($role === 'supervisor')      $newStatus = 'FOR APPROVAL OF SUPERVISOR';
        elseif ($role === 'manager')     $newStatus = 'FOR APPROVAL OF MANAGER';
        else                             $newStatus = 'QMS CHECKING'; // fallback
        $st2->close();
      }
    }
  }

  // ---- update status ----
  $up = $conn->prepare("UPDATE rcpa_request SET status = ? WHERE id = ?");
  if (!$up) throw new Exception('Update prepare failed: ' . $conn->error);
  $up->bind_param('si', $newStatus, $id);
  if (!$up->execute()) throw new Exception('Update failed: ' . $up->error);
  $up->close();

  // ---- history entry ----
  $h = $conn->prepare("INSERT INTO rcpa_request_history (rcpa_no, name, date_time, activity)
                       VALUES (?, ?, CURRENT_TIMESTAMP, ?)");
  if (!$h) throw new Exception('History prepare failed: ' . $conn->error);
  $activity = "Request resubmitted; status set to {$newStatus}.";
  $h->bind_param('iss', $id, $user_name, $activity);
  if (!$h->execute()) throw new Exception('History insert failed: ' . $h->error);
  $h->close();

  echo json_encode(['ok' => true, 'id' => $id, 'status' => $newStatus]);
} catch (Throwable $e) {
  http_response_code(400);
  echo json_encode(['ok' => false, 'error' => $e->getMessage()]);
}
