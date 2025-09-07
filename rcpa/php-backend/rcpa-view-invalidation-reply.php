<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
  http_response_code(405);
  echo json_encode(['error' => 'Method Not Allowed'], JSON_UNESCAPED_UNICODE);
  exit;
}

require_once __DIR__ . '/../../connection.php';

function json_out($row): void {
  echo json_encode($row ?: new stdClass(), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}

function json_err(string $msg, int $code = 500): void {
  http_response_code($code);
  echo json_encode(['error' => $msg], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}

// Get rcpa_no (preferred) or id (fallback)
$rcpa_no = filter_input(INPUT_GET, 'rcpa_no', FILTER_VALIDATE_INT);
if (!$rcpa_no) {
  $rcpa_no = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
}
if (!$rcpa_no) {
  json_err('Missing or invalid rcpa_no', 400);
}

if (!isset($conn) || !($conn instanceof mysqli)) {
  json_err('No mysqli connection found ($conn).', 500);
}
@$conn->set_charset('utf8mb4');

// 1) Latest IN-VALIDATION row
$sqlNv = "
  SELECT
    rcpa_no,
    reason_non_valid,
    assignee_name,
    assignee_date,
    assignee_supervisor_name,
    assignee_supervisor_date,
    attachment
  FROM rcpa_not_valid
  WHERE rcpa_no = ?
  ORDER BY id DESC
  LIMIT 1
";
$stmt = $conn->prepare($sqlNv);
if (!$stmt) json_err('DB prepare failed: ' . $conn->error, 500);
$stmt->bind_param('i', $rcpa_no);
if (!$stmt->execute()) {
  $err = $stmt->error ?: 'Execute failed';
  $stmt->close();
  json_err('DB execute failed: ' . $err, 500);
}
$res = $stmt->get_result();
$nv  = $res ? $res->fetch_assoc() : null;
$stmt->close();

// 2) Disapproval remarks list for this RCPA
$rejects = [];
$sqlRj = "
  SELECT id, disapprove_type, remarks, attachments, created_at
  FROM rcpa_disapprove_remarks
  WHERE rcpa_no = ?
  ORDER BY created_at DESC, id DESC
  LIMIT 50
";
if ($st2 = $conn->prepare($sqlRj)) {
  $st2->bind_param('i', $rcpa_no);
  if ($st2->execute()) {
    $r = $st2->get_result();
    while ($row = $r->fetch_assoc()) {
      $rejects[] = [
        'id'              => (int)$row['id'],
        'disapprove_type' => $row['disapprove_type'],
        'remarks'         => $row['remarks'],
        'attachments'     => $row['attachments'], // JSON string or null
        'created_at'      => $row['created_at'],
      ];
    }
  }
  $st2->close();
}

// 3) Build a JSON-serializable payload (force object)
$payload = $nv ? (object)$nv : new stdClass();
$payload->rcpa_no = $rcpa_no;
$payload->rejects = $rejects;

json_out($payload);
