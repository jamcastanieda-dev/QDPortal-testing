<?php
// php-backend/rcpa-task-counters-sse.php
// Streams live task counters using Server-Sent Events.

ignore_user_abort(true);
set_time_limit(0);

// SSE headers
header('Content-Type: text/event-stream; charset=UTF-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('X-Accel-Buffering: no'); // nginx: disable buffering if possible

// Flush any existing buffers
while (ob_get_level() > 0) { ob_end_flush(); }
ob_implicit_flush(true);

function send_event($event, $dataArr, $retryMs = 10000) {
    if (!headers_sent()) {
        echo "retry: {$retryMs}\n";
    }
    echo "event: {$event}\n";
    echo 'data: ' . json_encode($dataArr, JSON_UNESCAPED_UNICODE) . "\n\n";
    @flush();
}

function build_payload(mysqli $mysqli, string $user_name): array {
    // --- resolves department/section/role + computes same counts as rcpa-task-counters.php ---
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

    $dept_norm = strtolower(trim($department));
    $is_qms    = in_array($dept_norm, ['qms', 'qa'], true);
    $is_mgr    = (strcasecmp(trim($role), 'manager') === 0);

    // 1) QMS TASKS (global only if QA/QMS)
    $qms = 0;
    if ($is_qms) {
        $sql = "SELECT COUNT(*)
                  FROM rcpa_request
                 WHERE status IN ('QMS CHECKING','VALIDATION REPLY','IN-VALIDATION REPLY','EVIDENCE CHECKING')";
        if ($stmt = $mysqli->prepare($sql)) {
            $stmt->execute();
            $stmt->bind_result($cnt);
            if ($stmt->fetch()) $qms = (int)$cnt;
            $stmt->close();
        }
    }

    // 2) ASSIGNEE TASKS
    $assignee_pending = 0;
    if ($is_qms) {
        $sql = "SELECT COUNT(*)
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
            // Manager: ignore section
            $sql = "SELECT COUNT(*)
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
            // Non-manager
            $sql = "SELECT COUNT(*)
                      FROM rcpa_request
                     WHERE status IN ('ASSIGNEE PENDING','FOR CLOSING')
                       AND LOWER(TRIM(assignee)) = LOWER(TRIM(?))
                       AND (section IS NULL OR section = '' OR LOWER(TRIM(section)) = LOWER(TRIM(?)))";
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

    if ($is_qms) {
        $sql = "SELECT
                    SUM(CASE WHEN status = 'VALID APPROVAL'       THEN 1 ELSE 0 END),
                    SUM(CASE WHEN status = 'IN-VALID APPROVAL'    THEN 1 ELSE 0 END),
                    SUM(CASE WHEN status = 'FOR CLOSING APPROVAL' THEN 1 ELSE 0 END)
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
            // Manager: ignore section
            $sql = "SELECT
                        SUM(CASE WHEN status = 'VALID APPROVAL'       THEN 1 ELSE 0 END),
                        SUM(CASE WHEN status = 'IN-VALID APPROVAL'    THEN 1 ELSE 0 END),
                        SUM(CASE WHEN status = 'FOR CLOSING APPROVAL' THEN 1 ELSE 0 END)
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
            // Non-manager
            $sql = "SELECT
                        SUM(CASE WHEN status = 'VALID APPROVAL'       THEN 1 ELSE 0 END),
                        SUM(CASE WHEN status = 'IN-VALID APPROVAL'    THEN 1 ELSE 0 END),
                        SUM(CASE WHEN status = 'FOR CLOSING APPROVAL' THEN 1 ELSE 0 END)
                    FROM rcpa_request
                    WHERE status IN ('VALID APPROVAL','IN-VALID APPROVAL','FOR CLOSING APPROVAL')
                      AND LOWER(TRIM(assignee)) = LOWER(TRIM(?))
                      AND (section IS NULL OR section = '' OR LOWER(TRIM(section)) = LOWER(TRIM(?)))";
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

    // 4) QMS APPROVAL (only QA/QMS)
    $qms_reply_approval = 0;    // IN-VALIDATION REPLY APPROVAL
    $qms_evidence_approval = 0; // EVIDENCE APPROVAL
    if ($is_qms) {
        $sql = "SELECT
                    SUM(CASE WHEN status = 'IN-VALIDATION REPLY APPROVAL' THEN 1 ELSE 0 END),
                    SUM(CASE WHEN status = 'EVIDENCE APPROVAL'            THEN 1 ELSE 0 END)
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
    if ($is_qms) {
        $sql = "SELECT COUNT(*) FROM rcpa_request WHERE status IN ('CLOSED (VALID)','CLOSED (IN-VALID)')";
        if ($stmt = $mysqli->prepare($sql)) {
            $stmt->execute();
            $stmt->bind_result($cnt);
            if ($stmt->fetch()) $closed = (int)$cnt;
            $stmt->close();
        }
    } elseif ($department !== '') {
        if ($is_mgr) {
            // Manager: ignore section
            $sql = "SELECT COUNT(*)
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
            // Non-manager
            $sql = "SELECT COUNT(*)
                      FROM rcpa_request
                     WHERE status IN ('CLOSED (VALID)','CLOSED (IN-VALID)')
                       AND LOWER(TRIM(assignee)) = LOWER(TRIM(?))
                       AND (section IS NULL OR section = '' OR LOWER(TRIM(section)) = LOWER(TRIM(?)))";
            if ($stmt = $mysqli->prepare($sql)) {
                $stmt->bind_param('ss', $department, $section);
                $stmt->execute();
                $stmt->bind_result($cnt);
                if ($stmt->fetch()) $closed = (int)$cnt;
                $stmt->close();
            }
        }
    }

    return [
        'ok' => true,
        'is_qms' => $is_qms,
        'counts' => [
            'qms' => $qms,
            'assignee_pending' => $assignee_pending,
            'approval' => $approval_total,
            'closing_approval' => $valid_approval,        // backward-compat
            'valid_approval' => $valid_approval,
            'not_valid_approval' => $not_valid_approval,
            'for_closing_approval' => $for_closing_approval,
            'qms_approval_total' => $qms_approval_total,
            'qms_reply_approval' => $qms_reply_approval,
            'qms_closing_approval' => $qms_evidence_approval,
            'closed' => $closed
        ]
    ];
}

try {
    // --- Auth ---
    if (!isset($_COOKIE['user'])) {
        http_response_code(401);
        send_event('rcpa-task-counters', ['ok' => false, 'error' => 'Not authenticated']);
        exit;
    }
    $user = json_decode($_COOKIE['user'], true);
    if (!$user || !is_array($user)) {
        http_response_code(401);
        send_event('rcpa-task-counters', ['ok' => false, 'error' => 'Invalid user']);
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
        send_event('rcpa-task-counters', ['ok' => false, 'error' => 'DB unavailable']);
        exit;
    }
    $mysqli->set_charset('utf8mb4');

    // --- Stream loop ---
    $lastHash = '';
    $ticks = 0;
    $maxSeconds = 300;     // ~5 minutes per connection (let EventSource reconnect)
    $interval   = 5;       // poll DB every 5s

    // send initial snapshot immediately
    $payload = build_payload($mysqli, $user_name);
    $lastHash = md5(json_encode($payload));
    send_event('rcpa-task-counters', $payload);

    while (!connection_aborted() && $ticks < ($maxSeconds / $interval)) {
        sleep($interval);
        $ticks++;

        $cur = build_payload($mysqli, $user_name);
        $curHash = md5(json_encode($cur));
        if ($curHash !== $lastHash) {
            $lastHash = $curHash;
            send_event('rcpa-task-counters', $cur);
        } else {
            // keepalive ping (helps proxies keep the stream open)
            echo "event: ping\n";
            echo "data: {}\n\n";
            @flush();
        }
    }

    // graceful end; client will auto-reconnect
} catch (Throwable $e) {
    send_event('rcpa-task-counters', ['ok' => false, 'error' => 'Server error']);
}
