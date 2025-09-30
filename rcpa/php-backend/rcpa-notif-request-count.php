<?php
// php-backend/rcpa-notif-request-count.php
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

    // Only these originator statuses count
    $status_list = "(
        'REPLY CHECKING - ORIGINATOR',
        'EVIDENCE CHECKING - ORIGINATOR',
        'INVALID APPROVAL - ORIGINATOR'
    )";

    $count = 0;

    // Scope to the current user as Originator (using rcpa_request.originator_name)
    $sql = "SELECT COUNT(*)
              FROM rcpa_request
             WHERE status IN $status_list
               AND originator_name IS NOT NULL
               AND TRIM(originator_name) <> ''
               AND LOWER(TRIM(originator_name)) = LOWER(TRIM(?))";
    if ($stmt = $mysqli->prepare($sql)) {
        $stmt->bind_param('s', $user_name);
        $stmt->execute();
        $stmt->bind_result($cnt);
        if ($stmt->fetch()) $count = (int)$cnt;
        $stmt->close();
    }

    echo json_encode(['ok' => true, 'count' => $count]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Server error']);
}
