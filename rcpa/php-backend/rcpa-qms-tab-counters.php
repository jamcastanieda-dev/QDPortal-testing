<?php
// php-backend/rcpa-qms-tab-counters.php
header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');

try {
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

    require '../../connection.php';
    if (!isset($mysqli) || !($mysqli instanceof mysqli)) {
        if (isset($conn) && $conn instanceof mysqli) $mysqli = $conn;
        elseif (isset($link) && $link instanceof mysqli) $mysqli = $link;
        else $mysqli = @new mysqli('localhost', 'DB_USER', 'DB_PASS', 'DB_NAME');
    }
    if (!$mysqli || $mysqli->connect_errno) {
        http_response_code(500);
        echo json_encode(['ok' => false, 'error' => 'DB unavailable']);
        exit;
    }

    // Find department
    $department = '';
    if ($user_name !== '') {
        $sql = "SELECT department
                  FROM system_users
                 WHERE LOWER(TRIM(employee_name)) = LOWER(TRIM(?))
                 LIMIT 1";
        if ($stmt = $mysqli->prepare($sql)) {
            $stmt->bind_param('s', $user_name);
            $stmt->execute();
            $stmt->bind_result($db_department);
            if ($stmt->fetch()) $department = (string)$db_department;
            $stmt->close();
        }
    }

    // QA and QMS behave the same
    $dept_norm = strtolower(trim($department));
    $is_qms = in_array($dept_norm, ['qms', 'qa'], true);

    // Prepare counts
    $qms_checking = 0;
    $not_valid = 0;           // IN-VALIDATION REPLY
    $valid = 0;               // VALIDATION REPLY
    $evidence_checking = 0;   // EVIDENCE CHECKING

    if ($is_qms) {
        // Global view for QA/QMS
        $sql = "SELECT
                    SUM(CASE WHEN status = 'QMS CHECKING'         THEN 1 ELSE 0 END) AS qms_checking,
                    SUM(CASE WHEN status = 'IN-VALIDATION REPLY'  THEN 1 ELSE 0 END) AS not_valid,
                    SUM(CASE WHEN status = 'VALIDATION REPLY'     THEN 1 ELSE 0 END) AS valid,
                    SUM(CASE WHEN status = 'EVIDENCE CHECKING'    THEN 1 ELSE 0 END) AS evidence_checking
                FROM rcpa_request
                WHERE status IN ('QMS CHECKING','IN-VALIDATION REPLY','VALIDATION REPLY','EVIDENCE CHECKING')";
        if ($stmt = $mysqli->prepare($sql)) {
            $stmt->execute();
            $stmt->bind_result($qc, $nv, $vl, $ev);
            if ($stmt->fetch()) {
                $qms_checking      = (int)($qc ?? 0);
                $not_valid         = (int)($nv ?? 0);
                $valid             = (int)($vl ?? 0);
                $evidence_checking = (int)($ev ?? 0);
            }
            $stmt->close();
        }
    } elseif ($department !== '') {
        // Assignee-only view for non-QA/QMS users
        $sql = "SELECT
                    SUM(CASE WHEN status = 'QMS CHECKING'         THEN 1 ELSE 0 END) AS qms_checking,
                    SUM(CASE WHEN status = 'IN-VALIDATION REPLY'  THEN 1 ELSE 0 END) AS not_valid,
                    SUM(CASE WHEN status = 'VALIDATION REPLY'     THEN 1 ELSE 0 END) AS valid,
                    SUM(CASE WHEN status = 'EVIDENCE CHECKING'    THEN 1 ELSE 0 END) AS evidence_checking
                FROM rcpa_request
                WHERE status IN ('QMS CHECKING','IN-VALIDATION REPLY','VALIDATION REPLY','EVIDENCE CHECKING')
                  AND LOWER(TRIM(assignee)) = LOWER(TRIM(?))";
        if ($stmt = $mysqli->prepare($sql)) {
            $stmt->bind_param('s', $department);
            $stmt->execute();
            $stmt->bind_result($qc, $nv, $vl, $ev);
            if ($stmt->fetch()) {
                $qms_checking      = (int)($qc ?? 0);
                $not_valid         = (int)($nv ?? 0);
                $valid             = (int)($vl ?? 0);
                $evidence_checking = (int)($ev ?? 0);
            }
            $stmt->close();
        }
    }

    echo json_encode([
        'ok' => true,
        'is_qms' => $is_qms,
        'counts' => [
            'qms_checking'      => $qms_checking,
            'not_valid'         => $not_valid,
            'valid'             => $valid,
            'evidence_checking' => $evidence_checking
        ]
    ]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Server error']);
}
