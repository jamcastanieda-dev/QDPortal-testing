<?php
// rcpa-list-validation-reply.php
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

date_default_timezone_set('Asia/Manila');

/* ---------------------------
   Auth: read current user
--------------------------- */
$user = json_decode($_COOKIE['user'] ?? 'null', true);
if (!$user || !is_array($user)) {
    header('Location: ../../login.php');
    exit;
}
$current_user = $user;
$user_name = $current_user['name'] ?? '';

/* ---------------------------
   DB connection
--------------------------- */
require '../../connection.php'; // must define $mysqli, $conn, or $link

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
   Resolve current user's department (visibility rules)
   - QA or QMS  => can see ALL rows
   - Others     => can see rows where:
        * rcpa_request.assignee = user's department
        * OR rcpa_request.originator_name = current user's name
--------------------------- */
$user_dept = null;
$is_qaqms  = false;

if ($user_name !== '') {
    if ($stmt = $mysqli->prepare("SELECT department FROM system_users WHERE employee_name = ? LIMIT 1")) {
        $stmt->bind_param('s', $user_name);
        if ($stmt->execute()) {
            $stmt->bind_result($dept);
            if ($stmt->fetch()) {
                $user_dept = trim((string)$dept);
            }
        }
        $stmt->close();
    }
    $is_qaqms = in_array(strtoupper($user_dept ?? ''), ['QA', 'QMS'], true);
}

/* ---------------------------
   Inputs (filters + paging)
--------------------------- */
$page      = max(1, (int)($_GET['page'] ?? 1));
$page_size = min(100, max(1, (int)($_GET['page_size'] ?? 10)));
$offset    = ($page - 1) * $page_size;

$type   = trim((string)($_GET['type'] ?? ''));    // rcpa_type filter (optional)
$status = trim((string)($_GET['status'] ?? ''));  // optional, but constrained to allowed list
$q      = trim((string)($_GET['q'] ?? ''));       // free-text query (project/wbs/assignee)

/* ---------------------------
   WHERE builder
--------------------------- */
$allowed_statuses = ['VALIDATION REPLY'];

$where  = [];
$params = [];
$types  = '';

if ($type !== '') {
    $where[]  = "rcpa_type = ?";
    $params[] = $type;
    $types   .= 's';
}

if ($q !== '') {
    $where[]  = "(
        project_name LIKE CONCAT('%', ?, '%')
        OR wbs_number LIKE CONCAT('%', ?, '%')
        OR assignee   LIKE CONCAT('%', ?, '%')
        OR section    LIKE CONCAT('%', ?, '%')
        OR CONCAT(assignee, ' - ', COALESCE(section, '')) LIKE CONCAT('%', ?, '%')
    )";
    $params[] = $q; $params[] = $q; $params[] = $q; $params[] = $q; $params[] = $q;
    $types   .= 'sssss';
}


if ($status !== '' && in_array($status, $allowed_statuses, true)) {
    $where[]  = "status = ?";
    $params[] = $status;
    $types   .= 's';
} else {
    $placeholders = implode(' OR ', array_fill(0, count($allowed_statuses), 'status = ?'));
    $where[] = "($placeholders)";
    foreach ($allowed_statuses as $st) {
        $params[] = $st;
        $types   .= 's';
    }
}

/* Visibility restriction:
   - If QA/QMS: no extra restriction (see all)
   - Else:
       * If department known: (assignee = user_dept OR originator_name = user_name)
       * If department unknown: only originator_name = user_name
*/
if (!$is_qaqms) {
    if (!empty($user_dept)) {
        $where[]  = "(assignee = ? OR originator_name = ?)";
        $params[] = $user_dept;
        $params[] = $user_name;
        $types   .= 'ss';
    } else {
        $where[]  = "originator_name = ?";
        $params[] = $user_name;
        $types   .= 's';
    }
}

$where_sql = $where ? implode(' AND ', $where) : '1=1';

/* ---------------------------
   Total count
--------------------------- */
$sql_total = "SELECT COUNT(*) FROM rcpa_request WHERE $where_sql";
if (!($stmt = $mysqli->prepare($sql_total))) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to prepare total query']);
    exit;
}
if ($types !== '') {
    $stmt->bind_param($types, ...$params);
}
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
            section,          -- 👈 add this
            project_name,
            wbs_number,
            close_due_date
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
        'id'               => (int)$r['id'],
        'rcpa_type'        => (string)($r['rcpa_type'] ?? ''),
        'category'         => (string)($r['category'] ?? ''),
        'date_request'     => $r['date_request'] ? date('Y-m-d H:i:s', strtotime($r['date_request'])) : null,
        'conformance'      => (string)($r['conformance'] ?? ''),
        'status'           => (string)($r['status'] ?? ''),
        'originator_name'  => (string)($r['originator_name'] ?? ''),
        'assignee'         => (string)($r['assignee'] ?? ''),
        'section'          => (string)($r['section'] ?? ''),  // 👈 add this
        'project_name'     => (string)($r['project_name'] ?? ''),
        'wbs_number'       => (string)($r['wbs_number'] ?? ''),
        'close_due_date'   => $r['close_due_date'] ? date('Y-m-d', strtotime($r['close_due_date'])) : null,
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
