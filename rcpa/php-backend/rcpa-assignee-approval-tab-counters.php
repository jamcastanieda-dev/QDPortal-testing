<?php
// php-backend/rcpa-assignee-approval-tab-counters.php
header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');

try {
    // --- Cookie auth ---
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

    // Visibility:
    // - QMS => see all (any role)
    // - QA  => see all only if role in ('supervisor','manager')
    // - Others => restricted by dept/section (manager ignores section)
    $dept_norm  = strtoupper(trim($department));
    $role_norm  = strtolower(trim($role));
    $see_all    = ($dept_norm === 'QMS') || ($dept_norm === 'QA' && in_array($role_norm, ['manager','supervisor'], true));
    $is_manager = ($role_norm === 'manager');

    $valid_approval   = 0; // status = 'VALID APPROVAL'
    $invalid_approval = 0; // status = 'INVALID APPROVAL'

    if ($see_all) {
        // Global counts
        $sql = "SELECT
                    SUM(CASE WHEN status = 'VALID APPROVAL'    THEN 1 ELSE 0 END) AS valid_approval,
                    SUM(CASE WHEN status = 'INVALID APPROVAL' THEN 1 ELSE 0 END) AS invalid_approval
                FROM rcpa_request
                WHERE status IN ('VALID APPROVAL','INVALID APPROVAL')";
        if ($stmt = $mysqli->prepare($sql)) {
            $stmt->execute();
            $stmt->bind_result($v, $nv);
            if ($stmt->fetch()) {
                $valid_approval   = (int)($v  ?? 0);
                $invalid_approval = (int)($nv ?? 0);
            }
            $stmt->close();
        }
    } elseif ($department !== '') {
        if ($is_manager) {
            // Manager: ignore section; department match only
            $sql = "SELECT
                        SUM(CASE WHEN status = 'VALID APPROVAL'    THEN 1 ELSE 0 END) AS valid_approval,
                        SUM(CASE WHEN status = 'INVALID APPROVAL' THEN 1 ELSE 0 END) AS invalid_approval
                    FROM rcpa_request
                    WHERE status IN ('VALID APPROVAL','INVALID APPROVAL')
                      AND LOWER(TRIM(assignee)) = LOWER(TRIM(?))";
            if ($stmt = $mysqli->prepare($sql)) {
                $stmt->bind_param('s', $department);
                $stmt->execute();
                $stmt->bind_result($v, $nv);
                if ($stmt->fetch()) {
                    $valid_approval   = (int)($v  ?? 0);
                    $invalid_approval = (int)($nv ?? 0);
                }
                $stmt->close();
            }
        } else {
            // Non-manager: dept + (blank OR matching) section
            $sql = "SELECT
                        SUM(CASE WHEN status = 'VALID APPROVAL'    THEN 1 ELSE 0 END) AS valid_approval,
                        SUM(CASE WHEN status = 'INVALID APPROVAL' THEN 1 ELSE 0 END) AS invalid_approval
                    FROM rcpa_request
                    WHERE status IN ('VALID APPROVAL','INVALID APPROVAL')
                      AND LOWER(TRIM(assignee)) = LOWER(TRIM(?))
                      AND (
                            section IS NULL OR section = '' OR
                            LOWER(TRIM(section)) = LOWER(TRIM(?))
                      )";
            if ($stmt = $mysqli->prepare($sql)) {
                $stmt->bind_param('ss', $department, $section);
                $stmt->execute();
                $stmt->bind_result($v, $nv);
                if ($stmt->fetch()) {
                    $valid_approval   = (int)($v  ?? 0);
                    $invalid_approval = (int)($nv ?? 0);
                }
                $stmt->close();
            }
        }
    }

    echo json_encode([
        'ok'      => true,
        // Back-compat flag for UI; reflects global visibility
        'is_qms'  => $see_all,
        'see_all' => $see_all,
        'counts'  => [
            'valid_approval'   => $valid_approval,
            'invalid_approval' => $invalid_approval
        ]
    ]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Server error']);
}
