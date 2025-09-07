<?php
// rcpa-list-request.php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

try {
  require_once __DIR__ . '/../../connection.php';
  if (!isset($conn) || !($conn instanceof mysqli)) {
    throw new Exception('MySQLi connection ($conn) not available.');
  }
  mysqli_set_charset($conn, 'utf8mb4');

  // ---- Current user from cookie
  if (!isset($_COOKIE['user'])) {
    http_response_code(401);
    echo json_encode(['ok' => false, 'error' => 'Unauthorized (no user cookie)']);
    exit;
  }
  $cookieUser = json_decode($_COOKIE['user'], true);
  if (!$cookieUser || empty($cookieUser['name'])) {
    http_response_code(401);
    echo json_encode(['ok' => false, 'error' => 'Unauthorized (invalid user cookie)']);
    exit;
  }
  $currentName = preg_replace('/\s+/u', ' ', trim((string)$cookieUser['name']));

  // ---- Inputs
  $page = max(1, (int)($_GET['page'] ?? 1));
  $pageSize = (int)($_GET['pageSize'] ?? 10);
  if ($pageSize < 1 || $pageSize > 100) $pageSize = 10;

  $status = trim((string)($_GET['status'] ?? ''));
  $type   = trim((string)($_GET['type'] ?? ''));
  $q      = trim((string)($_GET['q'] ?? ''));

  // ---- WHERE (restrict to this originator)
  $where   = ['TRIM(originator_name) = TRIM(?)'];
  $params  = [$currentName];
  $types   = 's';

  if ($status !== '') {
    $where[] = 'status = ?';
    $params[] = $status;
    $types .= 's';
  }
  if ($type   !== '') {
    $where[] = 'rcpa_type = ?';
    $params[] = $type;
    $types .= 's';
  }
  if ($q      !== '') {
    $where[] = '(project_name LIKE ? OR wbs_number LIKE ? OR originator_department LIKE ? OR CAST(id AS CHAR) LIKE ?)';
    $like = '%' . $q . '%';
    array_push($params, $like, $like, $like, $like);
    $types .= 'ssss';
  }
  $whereSql = 'WHERE ' . implode(' AND ', $where);
  $offset = ($page - 1) * $pageSize;

  // helper: bind params by reference
  $bindByRef = function (mysqli_stmt $stmt, string $types, array &$params) {
    $refs = [$types];
    foreach ($params as $k => &$v) {
      $refs[] = &$v;
    }
    return call_user_func_array([$stmt, 'bind_param'], $refs);
  };

  // ---- Total
  $sqlCount = "SELECT COUNT(*) AS cnt FROM rcpa_request $whereSql";
  $stmt = $conn->prepare($sqlCount);
  if (!$stmt) throw new Exception('MySQLi prepare failed: ' . $conn->error);
  $bindByRef($stmt, $types, $params);
  $stmt->execute();
  $res = $stmt->get_result();
  $row = $res->fetch_assoc();
  $total = (int)($row['cnt'] ?? 0);
  $stmt->close();

  // ---- Rows (now includes originator_name)
$sql = "SELECT
          id,
          rcpa_type,
          category,
          date_request,
          conformance,
          status,
          originator_name,
          assignee,
          section,                -- NEW
          close_due_date
        FROM rcpa_request
        $whereSql
        ORDER BY id DESC
        LIMIT ? OFFSET ?";



  $stmt = $conn->prepare($sql);
  if (!$stmt) throw new Exception('MySQLi prepare failed: ' . $conn->error);

  $limit = $pageSize;
  $off = $offset;
  $typesRows = $types . 'ii';
  $paramsRows = array_merge($params, [$limit, $off]);

  $bindByRef($stmt, $typesRows, $paramsRows);
  $stmt->execute();
  $result = $stmt->get_result();
  $rows = [];
  while ($r = $result->fetch_assoc()) {
    // normalize close_due_date to YYYY-MM-DD or null
    if (!empty($r['close_due_date'])) {
      $ts = strtotime($r['close_due_date']);
      $r['close_due_date'] = $ts ? date('Y-m-d', $ts) : null;
    } else {
      $r['close_due_date'] = null;
    }
    $rows[] = $r;
  }
  $stmt->close();

  echo json_encode(['ok' => true, 'total' => $total, 'rows' => $rows, 'me' => $currentName]);
} catch (Throwable $e) {
  http_response_code(400);
  echo json_encode(['ok' => false, 'error' => $e->getMessage()]);
}
