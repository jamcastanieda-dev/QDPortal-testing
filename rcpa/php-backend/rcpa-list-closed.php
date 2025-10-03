<?php
// rcpa-list-closed.php
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

date_default_timezone_set('Asia/Manila');

/* ---------------------------
   Auth: require cookie
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
$user_name = trim((string)($current_user['name'] ?? ''));

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
   Resolve user's department + section + role
   Visibility rules:
     - QMS  => can see ALL rows (any role)
     - QA   => can see ALL rows ONLY if role is 'supervisor' or 'manager'
     - MANAGER (when not see-all)
             => can see rows where:
                 * assignee = user's department  (ignore section)
                 * OR originator_name = user's name
     - Others (when not see-all)
             => can see rows where:
                 * (assignee = user's department AND (section is NULL/'' OR section = user's section))
                   OR originator_name = user's name
--------------------------- */
$dept = '';
$section = '';
$role = '';
if ($user_name !== '') {
    $sqlDept = "SELECT department, section, role
                FROM system_users
                WHERE LOWER(TRIM(employee_name)) = LOWER(TRIM(?))
                LIMIT 1";
    if ($stmt = $mysqli->prepare($sqlDept)) {
        $stmt->bind_param('s', $user_name);
        $stmt->execute();
        $stmt->bind_result($db_department, $db_section, $db_role);
        if ($stmt->fetch()) {
            $dept    = (string)$db_department;
            $section = (string)$db_section;
            $role    = (string)$db_role;
        }
        $stmt->close();
    }
}

$dept_norm = strtoupper(trim($dept));
$role_norm = strtolower(trim($role));

$isManager = ($role_norm === 'manager');
$see_all   = false;
if ($dept_norm === 'QMS') {
    $see_all = true; // QMS always see all
} elseif ($dept_norm === 'QA' && ($role_norm === 'manager' || $role_norm === 'supervisor')) {
    $see_all = true; // QA supervisors/managers see all
}

/* ---------------------------
   Inputs (filters + paging)
--------------------------- */
$page      = max(1, (int)($_GET['page'] ?? 1));
$page_size = min(100, max(1, (int)($_GET['page_size'] ?? 10)));
$offset    = ($page - 1) * $page_size;

$type = trim((string)($_GET['type'] ?? ''));     // rcpa_type filter (optional)
$q    = trim((string)($_GET['q'] ?? ''));        // free-text query (project/wbs/assignee)

// status filter: '', 'valid', 'invalid', 'CLOSED (VALID)', 'CLOSED (INVALID)', 'all'
$statusParamRaw = trim((string)($_GET['status'] ?? ''));
$statusNorm = '';
if ($statusParamRaw !== '') {
    $up = strtoupper($statusParamRaw);
    if ($up === 'VALID' || $up === 'CLOSED (VALID)') {
        $statusNorm = 'CLOSED (VALID)';
    } elseif ($up === 'INVALID' || $up === 'INVALID' || $up === 'CLOSED (INVALID)') {
        $statusNorm = 'CLOSED (INVALID)';
    } elseif ($up === 'ALL') {
        $statusNorm = ''; // include both allowed statuses
    } else {
        $statusNorm = '';
    }
}

/* ---------------------------
   WHERE builder
--------------------------- */
$allowed_statuses = ['CLOSED (VALID)', 'CLOSED (INVALID)'];

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

// Status: if a valid specific status was requested, use it; else include both allowed
if ($statusNorm !== '' && in_array($statusNorm, $allowed_statuses, true)) {
    $where[]  = "status = ?";
    $params[] = $statusNorm;
    $types   .= 's';
} else {
    $placeholders = implode(' OR ', array_fill(0, count($allowed_statuses), 'status = ?'));
    $where[] = "($placeholders)";
    foreach ($allowed_statuses as $st) {
        $params[] = $st;
        $types   .= 's';
    }
}

/* Visibility restriction (role-aware):
   - see_all (QMS, or QA supervisor/manager): no extra restriction
   - Else:
       * If department known:
            Manager:
              (LOWER(TRIM(assignee)) = LOWER(TRIM(?))) OR originator_name = ?
            Non-manager:
              (
                LOWER(TRIM(assignee)) = LOWER(TRIM(?))
                AND (section IS NULL OR section = '' OR LOWER(TRIM(section)) = LOWER(TRIM(?)))
              )
              OR originator_name = ?
       * If department unknown: only originator_name = user_name
*/
if (!$see_all) {
    if ($dept !== '') {
        if ($isManager) {
            $where[]  = "(
                LOWER(TRIM(assignee)) = LOWER(TRIM(?))
                OR originator_name = ?
            )";
            $params[] = $dept;
            $params[] = $user_name;
            $types   .= 'ss';
        } else {
            $where[]  = "(
                (
                  LOWER(TRIM(assignee)) = LOWER(TRIM(?))
                  AND (section IS NULL OR TRIM(section) = '' OR LOWER(TRIM(section)) = LOWER(TRIM(?)))
                )
                OR originator_name = ?
            )";
            $params[] = $dept;
            $params[] = $section;
            $params[] = $user_name;
            $types   .= 'sss';
        }
    } else {
        if ($user_name !== '') {
            $where[]  = "originator_name = ?";
            $params[] = $user_name;
            $types   .= 's';
        } else {
            $where[] = "1=0";
        }
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
            section,
            project_name,
            wbs_number,
            close_date,
            hit_close,
            assignee_name              -- 👈 add this
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
        'section'          => (string)($r['section'] ?? ''),
        'project_name'     => (string)($r['project_name'] ?? ''),
        'wbs_number'       => (string)($r['wbs_number'] ?? ''),
        'close_date'       => $r['close_date'] ? date('Y-m-d', strtotime($r['close_date'])) : null,
        'hit_close'        => (string)($r['hit_close'] ?? ''),
        'assignee_name'    => (string)($r['assignee_name'] ?? ''),   // 👈 add this
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
