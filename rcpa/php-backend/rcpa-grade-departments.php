<?php
// ../php-backend/rcpa-grade-departments.php
header('Content-Type: application/json');

require_once __DIR__ . '/../../connection.php'; // must define $conn (mysqli)

try {
    if (!isset($conn) || !$conn instanceof mysqli) {
        throw new Exception('DB connection not available.');
    }

    // Pull department + section pairs
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

    // Build a map: dept => { has_section: bool, sections: [..] }
    $map = [];
    while ($row = $result->fetch_assoc()) {
        $dept = $row['department'] ?? '';
        $sec  = $row['section'] ?? '';
        if ($dept === '') continue;

        if (!isset($map[$dept])) {
            $map[$dept] = ['has_section' => false, 'sections' => []];
        }
        if ($sec !== '') {
            $map[$dept]['has_section'] = true;
            $map[$dept]['sections'][$sec] = true; // set-like
        }
    }

    // Emit: if dept has sections, list only "Dept - Section" items;
    // otherwise, list just "Dept"
    $departments = [];
    foreach ($map as $dept => $info) {
        if ($info['has_section']) {
            $secs = array_keys($info['sections']);
            sort($secs, SORT_NATURAL | SORT_FLAG_CASE);
            foreach ($secs as $sec) {
                $departments[] = $dept . ' - ' . $sec;
            }
        } else {
            $departments[] = $dept;
        }
    }

    echo json_encode(['ok' => true, 'departments' => $departments]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => $e->getMessage()]);
}
