<?php
// rcpa-view-not-valid.php
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

require '../../connection.php';
if (!isset($mysqli) || !($mysqli instanceof mysqli)) {
    if (isset($conn) && $conn instanceof mysqli)      $mysqli = $conn;
    elseif (isset($link) && $link instanceof mysqli)  $mysqli = $link;
    else                                              $mysqli = @new mysqli('localhost', 'DB_USER', 'DB_PASS', 'DB_NAME');
}
if (!$mysqli || $mysqli->connect_errno) {
    http_response_code(500);
    echo json_encode(['error' => 'Database connection not available']);
    exit;
}
$mysqli->set_charset('utf8mb4');

$rcpa_no = isset($_GET['rcpa_no']) ? (int)$_GET['rcpa_no'] : 0;
if ($rcpa_no <= 0) {
    echo json_encode(null);
    exit;
}

// If multiple rows exist, we take the latest one.
$sql = "SELECT
            id,
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
        LIMIT 1";

if (!($stmt = $mysqli->prepare($sql))) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to prepare query']);
    exit;
}
$stmt->bind_param('i', $rcpa_no);
$stmt->execute();
$res = $stmt->get_result();
$row = $res->fetch_assoc();
$stmt->close();

if (!$row) {
    echo json_encode(null);
    exit;
}

// Normalize date formats to YYYY-MM-DD strings (or null)
$fmtDate = function($d) {
    if (!$d) return null;
    $ts = strtotime($d);
    return $ts ? date('Y-m-d', $ts) : $d;
};

$out = [
    'id'                          => (int)$row['id'],
    'rcpa_no'                     => (int)$row['rcpa_no'],
    'reason_non_valid'            => (string)($row['reason_non_valid'] ?? ''),
    'assignee_name'               => (string)($row['assignee_name'] ?? ''),
    'assignee_date'               => $fmtDate($row['assignee_date'] ?? null),
    'assignee_supervisor_name'    => (string)($row['assignee_supervisor_name'] ?? ''),
    'assignee_supervisor_date'    => $fmtDate($row['assignee_supervisor_date'] ?? null),
    'attachment'                  => (string)($row['attachment'] ?? ''),
];

echo json_encode($out, JSON_UNESCAPED_UNICODE);
