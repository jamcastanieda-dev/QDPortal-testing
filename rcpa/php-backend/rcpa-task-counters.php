<?php
// php-backend/rcpa-task-counters.php
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
    $user_name = trim($user['name'] ?? '');

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

    // Look up user's department + section + role
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

    // ===== Visibility flags =====
    // SEE-ALL: QMS (any role), or QA ONLY if role is 'manager' or 'supervisor'
    $dept_norm = strtolower(trim($department));
    $role_norm = strtolower(trim($role));

    $see_all = ($dept_norm === 'qms')
            || ($dept_norm === 'qa' && in_array($role_norm, ['manager','supervisor'], true));

    // Keep separate flag for dept managers (dept-wide, ignore section) when NOT see-all
    $is_mgr  = ($role_norm === 'manager');

    // Back-compat flag for frontend: previously named "is_qms" to toggle QMS/QA badges.
    // Now true only for QMS, or QA supervisors/managers.
    $is_qms_like_viewer = $see_all;

    // ---------- COUNTS ----------

    // 1) QMS TASKS (visible only to QMS or QA supervisors/managers) — global
    $qms = 0;
    if ($see_all) {
        $sql = "
            SELECT COUNT(*)
            FROM rcpa_request
            WHERE status IN ('QMS CHECKING','VALIDATION REPLY','IN-VALIDATION REPLY','EVIDENCE CHECKING')";
        if ($stmt = $mysqli->prepare($sql)) {
            $stmt->execute();
            $stmt->bind_result($cnt);
            if ($stmt->fetch()) $qms = (int)$cnt;
            $stmt->close();
        }
    }

    // 2) ASSIGNEE TASKS (ASSIGNEE PENDING + FOR CLOSING)
    $assignee_pending = 0;
    if ($see_all) {
        // Global for QMS or QA sup/manager
        $sql = "
            SELECT COUNT(*)
            FROM rcpa_request
            WHERE status IN ('ASSIGNEE PENDING','FOR CLOSING')";
        if ($stmt = $mysqli->prepare($sql)) {
            $stmt->execute();
            $stmt->bind_result($cnt);
            if ($stmt->fetch()) $assignee_pending = (int)$cnt;
            $stmt->close();
        }
    } elseif ($department !== '') {
        if ($is_mgr) {
            // Manager: department-wide, ignore section
            $sql = "
                SELECT COUNT(*)
                FROM rcpa_request
                WHERE status IN ('ASSIGNEE PENDING','FOR CLOSING')
                  AND LOWER(TRIM(assignee)) = LOWER(TRIM(?))";
            if ($stmt = $mysqli->prepare($sql)) {
                $stmt->bind_param('s', $department);
                $stmt->execute();
                $stmt->bind_result($cnt);
                if ($stmt->fetch()) $assignee_pending = (int)$cnt;
                $stmt->close();
            }
        } else {
            // Non-manager: dept + (section empty OR matches user's section)
            $sql = "
                SELECT COUNT(*)
                FROM rcpa_request
                WHERE status IN ('ASSIGNEE PENDING','FOR CLOSING')
                  AND LOWER(TRIM(assignee)) = LOWER(TRIM(?))
                  AND (
                        section IS NULL OR TRIM(section) = '' OR
                        LOWER(TRIM(section)) = LOWER(TRIM(?))
                      )";
            if ($stmt = $mysqli->prepare($sql)) {
                $stmt->bind_param('ss', $department, $section);
                $stmt->execute();
                $stmt->bind_result($cnt);
                if ($stmt->fetch()) $assignee_pending = (int)$cnt;
                $stmt->close();
            }
        }
    }

    // 3) ASSIGNEE APPROVAL (VALID / IN-VALID / FOR CLOSING APPROVAL)
    $valid_approval = 0;
    $not_valid_approval = 0;
    $for_closing_approval = 0;

    if ($see_all) {
        // Global for QMS or QA sup/manager
        $sql = "
            SELECT
                SUM(CASE WHEN status = 'VALID APPROVAL'        THEN 1 ELSE 0 END),
                SUM(CASE WHEN status = 'IN-VALID APPROVAL'     THEN 1 ELSE 0 END),
                SUM(CASE WHEN status = 'FOR CLOSING APPROVAL'  THEN 1 ELSE 0 END)
            FROM rcpa_request
            WHERE status IN ('VALID APPROVAL','IN-VALID APPROVAL','FOR CLOSING APPROVAL')";
        if ($stmt = $mysqli->prepare($sql)) {
            $stmt->execute();
            $stmt->bind_result($v1, $v2, $v3);
            if ($stmt->fetch()) {
                $valid_approval        = (int)($v1 ?? 0);
                $not_valid_approval    = (int)($v2 ?? 0);
                $for_closing_approval  = (int)($v3 ?? 0);
            }
            $stmt->close();
        }
    } elseif ($department !== '') {
        if ($is_mgr) {
            // Manager: department-wide, ignore section
            $sql = "
                SELECT
                    SUM(CASE WHEN status = 'VALID APPROVAL'        THEN 1 ELSE 0 END),
                    SUM(CASE WHEN status = 'IN-VALID APPROVAL'     THEN 1 ELSE 0 END),
                    SUM(CASE WHEN status = 'FOR CLOSING APPROVAL'  THEN 1 ELSE 0 END)
                FROM rcpa_request
                WHERE status IN ('VALID APPROVAL','IN-VALID APPROVAL','FOR CLOSING APPROVAL')
                  AND LOWER(TRIM(assignee)) = LOWER(TRIM(?))";
            if ($stmt = $mysqli->prepare($sql)) {
                $stmt->bind_param('s', $department);
                $stmt->execute();
                $stmt->bind_result($v1, $v2, $v3);
                if ($stmt->fetch()) {
                    $valid_approval        = (int)($v1 ?? 0);
                    $not_valid_approval    = (int)($v2 ?? 0);
                    $for_closing_approval  = (int)($v3 ?? 0);
                }
                $stmt->close();
            }
        } else {
            // Non-manager: dept + (section empty/match)
            $sql = "
                SELECT
                    SUM(CASE WHEN status = 'VALID APPROVAL'        THEN 1 ELSE 0 END),
                    SUM(CASE WHEN status = 'IN-VALID APPROVAL'     THEN 1 ELSE 0 END),
                    SUM(CASE WHEN status = 'FOR CLOSING APPROVAL'  THEN 1 ELSE 0 END)
                FROM rcpa_request
                WHERE status IN ('VALID APPROVAL','IN-VALID APPROVAL','FOR CLOSING APPROVAL')
                  AND LOWER(TRIM(assignee)) = LOWER(TRIM(?))
                  AND (
                        section IS NULL OR TRIM(section) = '' OR
                        LOWER(TRIM(section)) = LOWER(TRIM(?))
                      )";
            if ($stmt = $mysqli->prepare($sql)) {
                $stmt->bind_param('ss', $department, $section);
                $stmt->execute();
                $stmt->bind_result($v1, $v2, $v3);
                if ($stmt->fetch()) {
                    $valid_approval        = (int)($v1 ?? 0);
                    $not_valid_approval    = (int)($v2 ?? 0);
                    $for_closing_approval  = (int)($v3 ?? 0);
                }
                $stmt->close();
            }
        }
    }
    $approval_total = $valid_approval + $not_valid_approval + $for_closing_approval;

    // 4) QMS APPROVAL (only for see-all users: QMS or QA supervisor/manager) — global
    $qms_reply_approval    = 0; // IN-VALIDATION REPLY APPROVAL
    $qms_evidence_approval = 0; // EVIDENCE APPROVAL
    if ($see_all) {
        $sql = "
            SELECT
                SUM(CASE WHEN status = 'IN-VALIDATION REPLY APPROVAL' THEN 1 ELSE 0 END),
                SUM(CASE WHEN status = 'EVIDENCE APPROVAL'           THEN 1 ELSE 0 END)
            FROM rcpa_request
            WHERE status IN ('IN-VALIDATION REPLY APPROVAL','EVIDENCE APPROVAL')";
        if ($stmt = $mysqli->prepare($sql)) {
            $stmt->execute();
            $stmt->bind_result($r1, $r2);
            if ($stmt->fetch()) {
                $qms_reply_approval    = (int)($r1 ?? 0);
                $qms_evidence_approval = (int)($r2 ?? 0);
            }
            $stmt->close();
        }
    }
    $qms_approval_total = $qms_reply_approval + $qms_evidence_approval;

    // 5) CLOSED
    $closed = 0;
    if ($see_all) {
        $sql = "
            SELECT COUNT(*)
            FROM rcpa_request
            WHERE status IN ('CLOSED (VALID)','CLOSED (IN-VALID)')";
        if ($stmt = $mysqli->prepare($sql)) {
            $stmt->execute();
            $stmt->bind_result($cnt);
            if ($stmt->fetch()) $closed = (int)$cnt;
            $stmt->close();
        }
    } elseif ($department !== '') {
        if ($is_mgr) {
            // Manager: department-wide, ignore section
            $sql = "
                SELECT COUNT(*)
                FROM rcpa_request
                WHERE status IN ('CLOSED (VALID)','CLOSED (IN-VALID)')
                  AND LOWER(TRIM(assignee)) = LOWER(TRIM(?))";
            if ($stmt = $mysqli->prepare($sql)) {
                $stmt->bind_param('s', $department);
                $stmt->execute();
                $stmt->bind_result($cnt);
                if ($stmt->fetch()) $closed = (int)$cnt;
                $stmt->close();
            }
        } else {
            // Non-manager: dept + (section empty/match)
            $sql = "
                SELECT COUNT(*)
                FROM rcpa_request
                WHERE status IN ('CLOSED (VALID)','CLOSED (IN-VALID)')
                  AND LOWER(TRIM(assignee)) = LOWER(TRIM(?))
                  AND (
                        section IS NULL OR TRIM(section) = '' OR
                        LOWER(TRIM(section)) = LOWER(TRIM(?))
                      )";
            if ($stmt = $mysqli->prepare($sql)) {
                $stmt->bind_param('ss', $department, $section);
                $stmt->execute();
                $stmt->bind_result($cnt);
                if ($stmt->fetch()) $closed = (int)$cnt;
                $stmt->close();
            }
        }
    }

    echo json_encode([
        'ok' => true,
        // Back-compat key used by frontend to toggle QA/QMS-wide badges.
        // True only for QMS (any role) or QA with role manager/supervisor.
        'is_qms' => $is_qms_like_viewer,
        'counts' => [
            // QMS TASKS
            'qms' => $qms,

            // Assignee Tasks
            'assignee_pending' => $assignee_pending,

            // Assignee Approval (total + breakdown)
            'approval' => $approval_total,
            'closing_approval' => $valid_approval,          // kept for backward-compat
            'valid_approval' => $valid_approval,            // explicit
            'not_valid_approval' => $not_valid_approval,
            'for_closing_approval' => $for_closing_approval,

            // QMS Approval (total + breakdown)
            'qms_approval_total' => $qms_approval_total,
            'qms_reply_approval' => $qms_reply_approval,      // IN-VALIDATION REPLY APPROVAL
            'qms_closing_approval' => $qms_evidence_approval, // EVIDENCE APPROVAL

            // Closed
            'closed' => $closed
        ]
    ]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Server error']);
}
