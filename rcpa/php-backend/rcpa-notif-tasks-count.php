<?php
// rcpa-notif-tasks-count.php
header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');

try {
    // --- cookie auth ---
    if (!isset($_COOKIE['user'])) {
        http_response_code(401);
        echo json_encode(['ok' => false, 'error' => 'Not authenticated']);
        exit;
    }
    $user = json_decode($_COOKIE['user'], true);
    if (!$user || !is_array($user)) {
        http_response_code(401);
        echo json_encode(['ok' => false, 'error' => 'Invalid user cookie']);
        exit;
    }
    $user_name = trim((string)($user['name'] ?? ''));
    if ($user_name === '') {
        http_response_code(401);
        echo json_encode(['ok' => false, 'error' => 'Missing user name']);
        exit;
    }

    // DB handle
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

    // Resolve department + role + section
    $department = '';
    $role = '';
    $section = '';
    if ($stmt = $mysqli->prepare("
            SELECT department, role, section
              FROM system_users
             WHERE LOWER(TRIM(employee_name)) = LOWER(TRIM(?))
             LIMIT 1")) {
        $stmt->bind_param('s', $user_name);
        $stmt->execute();
        $stmt->bind_result($dep, $r, $sec);
        if ($stmt->fetch()) {
            $department = (string)$dep;
            $role       = (string)$r;
            $section    = (string)$sec;
        }
        $stmt->close();
    }

    $dept_norm    = strtolower(trim($department));
    $role_norm    = strtolower(trim($role));
    $section_norm = strtolower(trim($section));

    // Privilege rule (global visibility):
    //  - QMS department, OR
    //  - QA department WITH role == manager or supervisor
    $can_qms_view = ($dept_norm === 'qms') ||
                    ($dept_norm === 'qa' && in_array($role_norm, ['manager','supervisor'], true));

    // FULL list (privileged global view)
    $STATUS_FULL = "(
        'QMS CHECKING',
        'VALIDATION REPLY',
        'IN-VALIDATION REPLY',
        'EVIDENCE CHECKING',
        'ASSIGNEE PENDING',
        'FOR CLOSING',
        'VALID APPROVAL',
        'IN-VALID APPROVAL',
        'FOR CLOSING APPROVAL',
        'IN-VALIDATION REPLY APPROVAL',
        'EVIDENCE APPROVAL',
        'CLOSED (VALID)',
        'CLOSED (IN-VALID)'
    )";

    // RESTRICTED list (non-privileged users only)
    $STATUS_RESTRICTED = "(
        'ASSIGNEE PENDING',
        'FOR CLOSING',
        'VALID APPROVAL',
        'IN-VALID APPROVAL',
        'FOR CLOSING APPROVAL',
        'CLOSED (VALID)',
        'CLOSED (IN-VALID)'
    )";

    $count = 0;

    if ($can_qms_view) {
        // Privileged: global, FULL list
        $sql = "SELECT COUNT(*) FROM rcpa_request WHERE status IN $STATUS_FULL";
        if ($stmt = $mysqli->prepare($sql)) {
            $stmt->execute();
            $stmt->bind_result($cnt);
            if ($stmt->fetch()) $count = (int)$cnt;
            $stmt->close();
        }
    } else {
        // Non-privileged: RESTRICTED list + scoping
        if ($department === '') {
            echo json_encode(['ok' => true, 'count' => 0]);
            exit;
        }

        if ($role_norm === 'manager') {
            // Managers: department-only
            $sql = "SELECT COUNT(*)
                      FROM rcpa_request
                     WHERE status IN $STATUS_RESTRICTED
                       AND LOWER(TRIM(assignee)) = LOWER(TRIM(?))";
            if ($stmt = $mysqli->prepare($sql)) {
                $stmt->bind_param('s', $department);
                $stmt->execute();
                $stmt->bind_result($cnt);
                if ($stmt->fetch()) $count = (int)$cnt;
                $stmt->close();
            }
        } else {
            // Non-managers: department + section must match
            if ($section_norm === '') {
                echo json_encode(['ok' => true, 'count' => 0]);
                exit;
            }
            $sql = "SELECT COUNT(*)
                      FROM rcpa_request
                     WHERE status IN $STATUS_RESTRICTED
                       AND LOWER(TRIM(assignee)) = LOWER(TRIM(?))
                       AND LOWER(TRIM(section))  = LOWER(TRIM(?))";
            if ($stmt = $mysqli->prepare($sql)) {
                $stmt->bind_param('ss', $department, $section);
                $stmt->execute();
                $stmt->bind_result($cnt);
                if ($stmt->fetch()) $count = (int)$cnt;
                $stmt->close();
            }
        }
    }

    echo json_encode(['ok' => true, 'count' => $count]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Server error']);
}
