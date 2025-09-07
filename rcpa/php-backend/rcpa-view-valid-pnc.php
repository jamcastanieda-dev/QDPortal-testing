<?php
header('Content-Type: application/json');

require_once __DIR__ . '/../../connection.php'; // $conn (mysqli)

$rcpa_no = isset($_GET['rcpa_no']) ? (int)$_GET['rcpa_no'] : 0;
if ($rcpa_no <= 0) {
  http_response_code(400);
  echo json_encode(['error' => 'Invalid rcpa_no']);
  exit;
}

$sql = "
  SELECT
    id,
    rcpa_no,
    root_cause,
    preventive_action,
    preventive_target_date,
    preventive_date_completed,
    assignee_name,
    assignee_date,
    assignee_supervisor_name,
    assignee_supervisor_date,
    attachment
  FROM rcpa_valid_potential_conformance
  WHERE rcpa_no = ?
  LIMIT 1
";

$stmt = $conn->prepare($sql);
if (!$stmt) {
  http_response_code(500);
  echo json_encode(['error' => 'Prepare failed: ' . $conn->error]);
  exit;
}
$stmt->bind_param('i', $rcpa_no);
$stmt->execute();
$res = $stmt->get_result();
$row = $res ? $res->fetch_assoc() : null;

echo json_encode($row ?: (object)[]);
