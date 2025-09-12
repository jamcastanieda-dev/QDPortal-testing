<?php
// php-backend/rcpa-assignee-approval-tab-counters-sse.php
// Streams badge counts via Server-Sent Events.
// Keep your JSON endpoint (rcpa-assignee-approval-tab-counters.php) unchanged.

@ini_set('output_buffering', 'off');
@ini_set('zlib.output_compression', '0');
@ini_set('implicit_flush', '1');
while (ob_get_level() > 0) { ob_end_flush(); }
ob_implicit_flush(1);

header('Content-Type: text/event-stream; charset=UTF-8');
header('Cache-Control: no-cache, no-store, must-revalidate, max-age=0');
header('Connection: keep-alive');

function sse_send($event, $dataArr) {
    echo "event: {$event}\n";
    echo 'data: ' . json_encode($dataArr, JSON_UNESCAPED_UNICODE) . "\n\n";
    @flush();
}

function get_counts(mysqli $mysqli, string $user_name): array {
    // Resolve user's department + section
    $department = '';
    $section    = '';

    if ($user_name !== '') {
        $sql = "SELECT department, section
                  FROM system_users
                 WHERE LOWER(TRIM(employee_name)) = LOWER(TRIM(?))
                 LIMIT 1";
        if ($stmt = $mysqli->prepare($sql)) {
            $stmt->bind_param('s', $user_name);
            $stmt->execute();
            $stmt->bind_result($db_department, $db_section);
            if ($stmt->fetch()) {
                $department = (string)$db_department;
                $section    = (string)$db_section;
            }
            $stmt->close();
        }
    }

    $dept_norm = strtolower(trim($department));
    $is_qms = in_array($dept_norm, ['qms', 'qa'], true);

    $valid_approval   = 0; // 'VALID APPROVAL'
    $invalid_approval = 0; // 'IN-VALID APPROVAL'

    if ($is_qms) {
        $sql = "SELECT
                    SUM(CASE WHEN status = 'VALID APPROVAL'    THEN 1 ELSE 0 END) AS valid_approval,
                    SUM(CASE WHEN status = 'IN-VALID APPROVAL' THEN 1 ELSE 0 END) AS invalid_approval
                FROM rcpa_request
                WHERE status IN ('VALID APPROVAL','IN-VALID APPROVAL')";
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
        $sql = "SELECT
                    SUM(CASE WHEN status = 'VALID APPROVAL'    THEN 1 ELSE 0 END) AS valid_approval,
                    SUM(CASE WHEN status = 'IN-VALID APPROVAL' THEN 1 ELSE 0 END) AS invalid_approval
                FROM rcpa_request
                WHERE status IN ('VALID APPROVAL','IN-VALID APPROVAL')
                  AND LOWER(TRIM(assignee)) = LOWER(TRIM(?))
                  AND (section IS NULL OR section = '' OR LOWER(TRIM(section)) = LOWER(TRIM(?)))";
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

    return [
        'ok'     => true,
        'counts' => [
            'valid_approval'   => $valid_approval,
            'invalid_approval' => $invalid_approval,
        ],
    ];
}

try {
    // --- Auth via cookie ---
    if (!isset($_COOKIE['user'])) {
        http_response_code(401);
        sse_send('rcpa-assignee-approval-tabs', ['ok' => false, 'error' => 'Not authenticated']);
        exit;
    }
    $user = json_decode($_COOKIE['user'], true);
    if (!$user || !is_array($user)) {
        http_response_code(401);
        sse_send('rcpa-assignee-approval-tabs', ['ok' => false, 'error' => 'Invalid user']);
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
        sse_send('rcpa-assignee-approval-tabs', ['ok' => false, 'error' => 'DB unavailable']);
        exit;
    }
    $mysqli->set_charset('utf8mb4');

    // Stream for ~5 minutes, emit on change (or at least once immediately)
    $lastHash = null;
    $iterations = 60;         // 60 * 5s = 5 minutes
    $sleepSec   = 5;

    for ($i = 0; $i < $iterations; $i++) {
        if (connection_aborted()) break;

        $payload = get_counts($mysqli, $user_name);
        $hash = md5(json_encode($payload['counts'] ?? []));
        if ($hash !== $lastHash || $i === 0) {
            sse_send('rcpa-assignee-approval-tabs', $payload);
            $lastHash = $hash;
        }

        @sleep($sleepSec);
    }
} catch (Throwable $e) {
    sse_send('rcpa-assignee-approval-tabs', ['ok' => false, 'error' => 'Server error']);
}
