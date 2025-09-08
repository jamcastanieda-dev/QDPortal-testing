<?php
// ../php-backend/rcpa-grade-departments.php
header('Content-Type: application/json');

require_once __DIR__ . '/../../connection.php'; // must define $conn (mysqli)

try {
    if (!isset($conn) || !$conn instanceof mysqli) {
        throw new Exception('DB connection not available.');
    }

    // Get distinct department + section (section may be null/empty)
    $sql = "
        SELECT
            TRIM(department) AS department,
            TRIM(section)    AS section
        FROM system_users
        WHERE department IS NOT NULL
          AND TRIM(department) <> ''
        GROUP BY TRIM(department), TRIM(section)
        ORDER BY TRIM(department), TRIM(section)
    ";

    $result = $conn->query($sql);
    if ($result === false) {
        throw new Exception('Query failed: ' . $conn->error);
    }

    // Build list:
    // - include each unique Department once
    // - include Department - Section for each non-empty section
    $seen = [];
    $departments = [];

    while ($row = $result->fetch_assoc()) {
        $dept = $row['department'] ?? '';
        $sec  = $row['section'] ?? '';

        if ($dept === '') continue;

        // Add the pure department once
        if (!isset($seen[$dept])) {
            $departments[] = $dept;
            $seen[$dept] = true;
        }

        // If section exists, add "Department - Section"
        if ($sec !== '') {
            $label = $dept . ' - ' . $sec;
            if (!isset($seen[$label])) {
                $departments[] = $label;
                $seen[$label] = true;
            }
        }
    }

    echo json_encode(['ok' => true, 'departments' => $departments]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => $e->getMessage()]);
}
