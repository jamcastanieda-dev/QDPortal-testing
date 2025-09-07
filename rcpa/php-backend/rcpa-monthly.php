<?php
// ../php-backend/rcpa-monthly.php
header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../../connection.php';

/**
 * Try to locate the mysqli connection variable regardless of how it's named.
 * Change this if your connection variable has a specific name.
 */
$db = null;
if (isset($conn) && $conn instanceof mysqli) {
    $db = $conn;
} elseif (isset($mysqli) && $mysqli instanceof mysqli) {
    $db = $mysqli;
} elseif (isset($db) && $db instanceof mysqli) {
    // already $db
} else {
    http_response_code(500);
    echo json_encode(['error' => 'Database connection not found.']);
    exit;
}

// Read and sanitize the target year (default: current year)
$year = isset($_GET['year']) ? (int)$_GET['year'] : (int)date('Y');
if ($year < 1970 || $year > 2100) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid year parameter.']);
    exit;
}

// Prepare result container with 12 months initialized to 0
$monthly = array_fill(0, 12, 0);

// Query: count rows by month for the given year
// date_request is DATETIME in schema; wrap with DATE() to be safe.
$sql = "
    SELECT MONTH(DATE(date_request)) AS m, COUNT(*) AS c
    FROM rcpa_request
    WHERE date_request IS NOT NULL
      AND YEAR(DATE(date_request)) = ?
    GROUP BY m
    ORDER BY m
";

if (!$stmt = $db->prepare($sql)) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to prepare statement.']);
    exit;
}

$stmt->bind_param('i', $year);

if (!$stmt->execute()) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to execute query.']);
    exit;
}

$res = $stmt->get_result();
while ($row = $res->fetch_assoc()) {
    $monthIndex = (int)$row['m'] - 1; // MONTH() is 1..12 -> index 0..11
    if ($monthIndex >= 0 && $monthIndex < 12) {
        $monthly[$monthIndex] = (int)$row['c'];
    }
}
$stmt->close();

// Optional labels if you want them
$months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// Final payload (matches your chart’s expected array)
echo json_encode([
    'year'    => $year,
    'months'  => $months,
    'monthly' => $monthly,
    'total'   => array_sum($monthly)
], JSON_UNESCAPED_UNICODE);
