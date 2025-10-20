<?php
// ../php-backend/rcpa-grade-departments.php
header('Content-Type: application/json');

require_once __DIR__ . '/../../connection.php'; // must define $conn (mysqli)

try {
    if (!isset($conn) || !$conn instanceof mysqli) {
        throw new Exception('DB connection not available.');
    }
    $conn->set_charset('utf8mb4');

    $year = isset($_GET['year']) ? (int)$_GET['year'] : (int)date('Y');
    $nextYear = $year + 1;

    /**
     * Rule:
     *  - Include "Dept - Section" labels that have rows in the year.
     *  - Include the plain "Dept" label ONLY if there are rows where section is NULL/blank.
     * (i.e., no more forcing a plain label just because some section had rows)
     */
    $sql = "
        WITH rr_norm AS (
          SELECT
            TRIM(assignee)              AS department,
            NULLIF(TRIM(section), '')   AS section
          FROM rcpa_request
          WHERE assignee IS NOT NULL
            AND TRIM(assignee) <> ''
            AND date_request >= CONCAT(?, '-01-01')
            AND date_request <  CONCAT(?, '-01-01')
        ),
        agg AS (
          SELECT department, section, COUNT(*) AS cnt
          FROM rr_norm
          GROUP BY department, section
        )
        SELECT
          CASE
            WHEN section IS NULL THEN department
            ELSE CONCAT(department, ' - ', section)
          END AS label
        FROM agg
        WHERE cnt > 0
        ORDER BY
          department,
          CASE WHEN section IS NULL THEN 0 ELSE 1 END,
          section
    ";

    $stmt = $conn->prepare($sql);
    if (!$stmt) throw new Exception('Prepare failed: ' . $conn->error);
    $stmt->bind_param('ii', $year, $nextYear);
    if (!$stmt->execute()) throw new Exception('Query failed: ' . $stmt->error);
    $res = $stmt->get_result();

    $departments = [];
    while ($row = $res->fetch_assoc()) {
        $label = trim((string)($row['label'] ?? ''));
        if ($label !== '') $departments[] = $label;
    }
    $stmt->close();

    echo json_encode(['ok' => true, 'departments' => $departments], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => $e->getMessage()]);
}
