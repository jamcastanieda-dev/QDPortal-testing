<?php
// rcpa-list-approval.php
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

date_default_timezone_set('Asia/Manila');

/* ---------------------------
   Auth
--------------------------- */
if (!isset($_COOKIE['user'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Not logged in']);
    exit;
}
$user = json_decode($_COOKIE['user'], true);
if (!$user || !is_array($user)) {
    http_response_code(401);
    echo json_encode(['error' => 'Invalid user cookie']);
    exit;
}
$current_user = $user;

/* ---------------------------
   DB connection
--------------------------- */
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

/* ---------------------------
   Inputs (filters + paging)
--------------------------- */
$page      = max(1, (int)($_GET['page'] ?? 1));
$page_size = min(100, max(1, (int)($_GET['page_size'] ?? 10)));
$offset    = ($page - 1) * $page_size;

$type   = trim((string)($_GET['type'] ?? ''));
$status = trim((string)($_GET['status'] ?? ''));
$q      = trim((string)($_GET['q'] ?? ''));

/* ---------------------------
   WHERE builder
--------------------------- */
$allowed_statuses = ['FOR APPROVAL OF MANAGER', 'FOR APPROVAL OF SUPERVISOR'];

$where  = ["originator_supervisor_head = ?"];
$params = [$current_user['name'] ?? ''];
$types  = 's';

if ($type !== '') {
    $where[]  = "rcpa_type = ?";
    $params[] = $type;
    $types   .= 's';
}

if ($q !== '') {
    $where[]  = "(
        project_name LIKE CONCAT('%', ?, '%')
        OR wbs_number LIKE CONCAT('%', ?, '%')
        OR assignee LIKE CONCAT('%', ?, '%')
        OR CONCAT(assignee, ' - ', COALESCE(section, '')) LIKE CONCAT('%', ?, '%')  -- 👈 include combined
        OR originator_name LIKE CONCAT('%', ?, '%')
    )";
    $params[] = $q; $params[] = $q; $params[] = $q; $params[] = $q; $params[] = $q;
    $types   .= 'sssss';
}


if ($status !== '' && in_array($status, $allowed_statuses, true)) {
    $where[]  = "status = ?";
    $params[] = $status;
    $types   .= 's';
} else {
    $where[]  = "(status = ? OR status = ?)";
    $params[] = $allowed_statuses[0];
    $params[] = $allowed_statuses[1];
    $types   .= 'ss';
}

$where_sql = implode(' AND ', $where);

/* ---------------------------
   Total count
--------------------------- */
$sql_total = "SELECT COUNT(*) FROM rcpa_request WHERE $where_sql";
if (!($stmt = $mysqli->prepare($sql_total))) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to prepare total query']);
    exit;
}
$stmt->bind_param($types, ...$params);
$stmt->execute();
$stmt->bind_result($total);
$stmt->fetch();
$stmt->close();

/* ---------------------------
   Data query
--------------------------- */
$sql = "SELECT
            id,
            rcpa_type,
            category,
            status,
            date_request,
            conformance,
            originator_name,
            assignee,
            section,           -- 👈 add this
            project_name,
            wbs_number
        FROM rcpa_request
        WHERE $where_sql
        ORDER BY date_request DESC, id DESC
        LIMIT ? OFFSET ?";

if (!($stmt = $mysqli->prepare($sql))) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to prepare data query']);
    exit;
}

$types_rows  = $types . 'ii';
$params_rows = array_merge($params, [$page_size, $offset]);

$stmt->bind_param($types_rows, ...$params_rows);
$stmt->execute();
$res = $stmt->get_result();

$rows = [];
while ($r = $res->fetch_assoc()) {
    $rows[] = [
        'id'              => (int)$r['id'],
        'rcpa_type'       => (string)($r['rcpa_type'] ?? ''),
        'category'        => (string)($r['category'] ?? ''),
        'date_request'    => $r['date_request'] ? date('Y-m-d H:i:s', strtotime($r['date_request'])) : null,
        'conformance'     => (string)($r['conformance'] ?? ''),
        'status'          => (string)($r['status'] ?? ''),
        'originator_name' => (string)($r['originator_name'] ?? ''),
        'assignee'        => (string)($r['assignee'] ?? ''),
        'section'         => (string)($r['section'] ?? ''),   // 👈 add this
        'project_name'    => (string)($r['project_name'] ?? ''),
        'wbs_number'      => (string)($r['wbs_number'] ?? ''),
    ];
}
$stmt->close();

/* ---------------------------
   Output
--------------------------- */
echo json_encode([
    'page'      => $page,
    'page_size' => $page_size,
    'total'     => (int)$total,
    'rows'      => $rows,
], JSON_UNESCAPED_UNICODE);
