<?php
// php-backend/rcpa-assignee-tab-counters.php
header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');

try {
    // --- Auth via cookie ---
    if (!isset($_COOKIE['user'])) {
        http_response_code(401);
        echo json_encode(['ok' => false, 'error' => 'Not authenticated']);
        exit;
    }
    $user = json_decode($_COOKIE['user'], true);
    if (!$user || !is_array($user)) {
        http_response_code(401);
        echo json_encode(['ok' => false, 'error' => 'Invalid user']);
        exit;
    }
    $user_name = trim((string)($user['name'] ?? ''));

    // --- DB ---
    require '../../connection.php';
    if (!isset($mysqli) || !($mysqli instanceof mysqli)) {
        if (isset($conn) && $conn instanceof mysqli)      $mysqli = $conn;
        elseif (isset($link) && $link instanceof mysqli)  $mysqli = $link;
        else                                              $mysqli = @new mysqli('localhost', 'DB_USER', 'DB_PASS', 'DB_NAME');
    }
    if (!$mysqli || $mysqli->connect_errno) {
        http_response_code(500);
        echo json_encode(['ok' => false, 'error' => 'DB unavailable']);
        exit;
    }
    $mysqli->set_charset('utf8mb4');

    // --- Lookup user's department + section + role ---
    $department = '';
    $section    = '';
    $role       = '';
    if ($user_name !== '') {
        $sql = "SELECT department, section, role
                  FROM system_users
                 WHERE LOWER(TRIM(employee_name)) = LOWER(TRIM(?))
                 LIMIT 1";
        if ($stmt = $mysqli->prepare($sql)) {
            $stmt->bind_param('s', $user_name);
            $stmt->execute();
            $stmt->bind_result($db_department, $db_section, $db_role);
            if ($stmt->fetch()) {
                $department = (string)$db_department;
                $section    = (string)$db_section;
                $role       = (string)$db_role;
            }
            $stmt->close();
        }
    }

    // QA/QMS have full visibility
    $dept_norm = strtolower(trim($department));
    $is_qms    = in_array($dept_norm, ['qms', 'qa'], true);
    $is_manager = (strcasecmp(trim($role), 'manager') === 0);

    $assignee_pending = 0;
    $for_closing      = 0;

    if ($is_qms) {
        // Global view
        $sql = "SELECT
                    SUM(CASE WHEN status = 'ASSIGNEE PENDING' THEN 1 ELSE 0 END) AS assignee_pending,
                    SUM(CASE WHEN status = 'FOR CLOSING'      THEN 1 ELSE 0 END) AS for_closing
                FROM rcpa_request
                WHERE status IN ('ASSIGNEE PENDING','FOR CLOSING')";
        if ($stmt = $mysqli->prepare($sql)) {
            $stmt->execute();
            $stmt->bind_result($p, $c);
            if ($stmt->fetch()) {
                $assignee_pending = (int)($p ?? 0);
                $for_closing      = (int)($c ?? 0);
            }
            $stmt->close();
        }
    } elseif ($department !== '') {
        // Department-scoped view
        if ($is_manager) {
            // Manager: ignore section; department match only
            $sql = "SELECT
                        SUM(CASE WHEN status = 'ASSIGNEE PENDING' THEN 1 ELSE 0 END) AS assignee_pending,
                        SUM(CASE WHEN status = 'FOR CLOSING'      THEN 1 ELSE 0 END) AS for_closing
                    FROM rcpa_request
                    WHERE status IN ('ASSIGNEE PENDING','FOR CLOSING')
                      AND LOWER(TRIM(assignee)) = LOWER(TRIM(?))";
            if ($stmt = $mysqli->prepare($sql)) {
                $stmt->bind_param('s', $department);
                $stmt->execute();
                $stmt->bind_result($p, $c);
                if ($stmt->fetch()) {
                    $assignee_pending = (int)($p ?? 0);
                    $for_closing      = (int)($c ?? 0);
                }
                $stmt->close();
            }
        } else {
            // Non-manager: dept + (blank OR matching) section
            $sql = "SELECT
                        SUM(CASE WHEN status = 'ASSIGNEE PENDING' THEN 1 ELSE 0 END) AS assignee_pending,
                        SUM(CASE WHEN status = 'FOR CLOSING'      THEN 1 ELSE 0 END) AS for_closing
                    FROM rcpa_request
                    WHERE status IN ('ASSIGNEE PENDING','FOR CLOSING')
                      AND LOWER(TRIM(assignee)) = LOWER(TRIM(?))
                      AND (
                            section IS NULL OR section = '' OR
                            LOWER(TRIM(section)) = LOWER(TRIM(?))
                      )";
            if ($stmt = $mysqli->prepare($sql)) {
                $stmt->bind_param('ss', $department, $section);
                $stmt->execute();
                $stmt->bind_result($p, $c);
                if ($stmt->fetch()) {
                    $assignee_pending = (int)($p ?? 0);
                    $for_closing      = (int)($c ?? 0);
                }
                $stmt->close();
            }
        }
    }

    echo json_encode([
        'ok' => true,
        'is_qms' => $is_qms,
        'counts' => [
            'assignee_pending' => $assignee_pending,
            'for_closing'      => $for_closing
        ]
    ]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Server error']);
}
