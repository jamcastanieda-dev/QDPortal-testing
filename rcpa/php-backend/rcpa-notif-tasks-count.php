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
    $user_name = trim($user['name'] ?? '');
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

    // Look up department + role + section from system_users using cookie name
    $department = '';
    $role       = '';
    $section    = '';
    $sql = "SELECT department, role, section
              FROM system_users
             WHERE LOWER(TRIM(employee_name)) = LOWER(TRIM(?))
             LIMIT 1";
    if ($stmt = $mysqli->prepare($sql)) {
        $stmt->bind_param('s', $user_name);
        $stmt->execute();
        $stmt->bind_result($db_department, $db_role, $db_section);
        if ($stmt->fetch()) {
            $department = (string)$db_department;
            $role       = (string)$db_role;
            $section    = (string)$db_section;
        }
        $stmt->close();
    }

    $dept_norm    = strtolower(trim($department));
    $role_norm    = strtolower(trim($role));
    $section_norm = strtolower(trim($section));

    // QMS-wide visibility rule:
    //  - QMS department, OR
    //  - QA department WITH role == manager or supervisor
    $can_qms_view = ($dept_norm === 'qms') ||
                    ($dept_norm === 'qa' && in_array($role_norm, ['manager','supervisor'], true));

    // FULL list (for QMS/QA managers & supervisors)
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

    // RESTRICTED list (for everyone else)
    // Excludes:
    //   'QMS CHECKING', 'VALIDATION REPLY', 'IN-VALIDATION REPLY',
    //   'EVIDENCE CHECKING', 'IN-VALIDATION REPLY APPROVAL', 'EVIDENCE APPROVAL'
    $STATUS_RESTRICTED = "(
        'ASSIGNEE PENDING',
        'FOR CLOSING',
        'VALID APPROVAL',
        'IN-VALID APPROVAL',
        'FOR CLOSING APPROVAL',
        'CLOSED (VALID)',
        'CLOSED (IN-VALID)'
    )";

    $status_list = $can_qms_view ? $STATUS_FULL : $STATUS_RESTRICTED;

    $count = 0;

    if ($can_qms_view) {
        // QMS or QA managers/supervisors: global count (full status set)
        $sql = "SELECT COUNT(*) FROM rcpa_request WHERE status IN $status_list";
        if ($stmt = $mysqli->prepare($sql)) {
            $stmt->execute();
            $stmt->bind_result($cnt);
            if ($stmt->fetch()) $count = (int)$cnt;
            $stmt->close();
        }
    } else {
        // Everyone else: restricted statuses with scoping rules
        if ($department === '') {
            echo json_encode(['ok' => true, 'count' => 0]);
            exit;
        }

        if ($role_norm === 'manager') {
            // Managers (non-privileged depts): department-only
            $sql = "SELECT COUNT(*)
                      FROM rcpa_request
                     WHERE status IN $status_list
                       AND LOWER(TRIM(assignee)) = LOWER(TRIM(?))";
            if ($stmt = $mysqli->prepare($sql)) {
                $stmt->bind_param('s', $department);
                $stmt->execute();
                $stmt->bind_result($cnt);
                if ($stmt->fetch()) $count = (int)$cnt;
                $stmt->close();
            }
        } else {
            // Non-managers: department + section match
            if ($section_norm === '') {
                echo json_encode(['ok' => true, 'count' => 0]);
                exit;
            }
            $sql = "SELECT COUNT(*)
                      FROM rcpa_request
                     WHERE status IN $status_list
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
