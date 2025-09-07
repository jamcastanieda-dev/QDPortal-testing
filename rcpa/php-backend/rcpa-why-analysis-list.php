<?php
// rcpa-why-analysis-list.php
header('Content-Type: application/json');
require_once '../../connection.php'; // mysqli $conn

$rcpa_no = isset($_GET['rcpa_no']) ? (int)$_GET['rcpa_no'] : 0;
if ($rcpa_no <= 0) {
  http_response_code(400);
  echo json_encode(['success'=>false,'error'=>'Missing rcpa_no']);
  exit;
}

$db = isset($mysqli) && $mysqli instanceof mysqli ? $mysqli
   : (isset($conn) && $conn instanceof mysqli ? $conn : null);
if (!$db) {
  http_response_code(500);
  echo json_encode(['success'=>false,'error'=>'DB connection not found']);
  exit;
}
$db->set_charset('utf8mb4');

// get latest description (if multiple rows, they should share same desc; pick latest by created_at)
$desc = '';
$rows = [];

$stmt = $db->prepare("SELECT analysis_type, why_occur, answer, description_of_findings, created_at
                      FROM rcpa_why_analysis
                      WHERE rcpa_no = ?
                      ORDER BY id ASC");
$stmt->bind_param('i', $rcpa_no);
if ($stmt->execute()) {
  $res = $stmt->get_result();
  while ($r = $res->fetch_assoc()) {
    $rows[] = [
      'analysis_type' => $r['analysis_type'],
      'why_occur' => $r['why_occur'],
      'answer' => $r['answer'],
      'created_at' => $r['created_at'],
    ];
    // capture last non-empty description
    if ($r['description_of_findings'] !== '') $desc = $r['description_of_findings'];
  }
}
$stmt->close();

echo json_encode([
  'success' => true,
  'rcpa_no' => $rcpa_no,
  'description_of_findings' => $desc,
  'rows' => $rows
]);
