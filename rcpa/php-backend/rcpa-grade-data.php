<?php
// ../php-backend/rcpa-grade-data.php
header('Content-Type: application/json');

require_once __DIR__ . '/../../connection.php'; // must define $conn (mysqli)

try {
    if (!isset($conn) || !$conn instanceof mysqli) {
        throw new Exception('DB connection not available.');
    }

    $year = isset($_GET['year']) ? (int)$_GET['year'] : (int)date('Y');
    $nextYear = $year + 1;

    /**
     * Get authoritative department + section from system_users using the
     * originator's NAME as the key (originator_name ⇄ employee_name).
     *
     * - We join to a de-duplicated view of system_users grouped by employee_name
     *   to avoid double-counting if duplicates exist.
     * - If the user row isn't found, we fall back to rcpa_request.originator_department
     *   for dept, and leave section empty.
     */
    $sql = "
        WITH su_dedup AS (
            SELECT
                TRIM(LOWER(employee_name)) AS key_name,
                TRIM(MAX(department))      AS department,  -- pick a deterministic value if duplicates
                TRIM(MAX(section))         AS section
            FROM system_users
            WHERE employee_name IS NOT NULL AND TRIM(employee_name) <> ''
            GROUP BY TRIM(LOWER(employee_name))
        )
        SELECT
            -- authoritative department comes from system_users when available,
            -- else fall back to the request's department
            TRIM(
                COALESCE(su.department, rr.originator_department)
            )                                                AS dept,
            TRIM(COALESCE(su.section, ''))                   AS section,   -- authoritative section (may be empty)
            MONTH(rr.date_request)                           AS m,
            COUNT(*)                                         AS total,
            SUM(CASE WHEN (rr.reply_date IS NOT NULL OR rr.reply_received IS NOT NULL) THEN 1 ELSE 0 END) AS reply_total,
            SUM(
                CASE WHEN
                    (rr.hit_reply IS NOT NULL AND UPPER(TRIM(rr.hit_reply)) IN ('HIT','YES','Y','ON TIME','ONTIME','ON-TIME'))
                    OR (rr.reply_due_date IS NOT NULL AND rr.reply_date IS NOT NULL AND rr.reply_date <= rr.reply_due_date)
                THEN 1 ELSE 0 END
            )                                                AS reply_hit,
            SUM(CASE WHEN rr.close_date IS NOT NULL THEN 1 ELSE 0 END) AS close_total,
            SUM(
                CASE WHEN
                    (rr.hit_close IS NOT NULL AND UPPER(TRIM(rr.hit_close)) IN ('HIT','YES','Y','ON TIME','ONTIME','ON-TIME'))
                    OR (rr.close_due_date IS NOT NULL AND rr.close_date IS NOT NULL AND rr.close_date <= rr.close_due_date)
                THEN 1 ELSE 0 END
            )                                                AS close_hit
        FROM rcpa_request rr
        LEFT JOIN su_dedup su
               ON TRIM(rr.originator_name) <> ''
              AND TRIM(LOWER(rr.originator_name)) = su.key_name
        WHERE
              (rr.originator_department IS NOT NULL AND TRIM(rr.originator_department) <> '')
          AND rr.date_request >= CONCAT(?, '-01-01')
          AND rr.date_request <  CONCAT(?, '-01-01')
        GROUP BY dept, section, m
        ORDER BY dept, section, m
    ";

    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        throw new Exception('Prepare failed: ' . $conn->error);
    }
    $stmt->bind_param('ii', $year, $nextYear);
    if (!$stmt->execute()) {
        throw new Exception('Query failed: ' . $stmt->error);
    }
    $res = $stmt->get_result();

    // Build metrics keyed by label ("Dept" and "Dept - Section")
    // metrics[label][month] = { total, reply_total, reply_hit, close_total, close_hit }
    $metrics = [];

    $addRow = function (&$bucket, $label, $m, $row) {
        if (!isset($bucket[$label])) $bucket[$label] = [];
        if (!isset($bucket[$label][$m])) {
            $bucket[$label][$m] = [
                'total'       => 0,
                'reply_total' => 0,
                'reply_hit'   => 0,
                'close_total' => 0,
                'close_hit'   => 0,
            ];
        }
        $bucket[$label][$m]['total']       += (int)$row['total'];
        $bucket[$label][$m]['reply_total'] += (int)$row['reply_total'];
        $bucket[$label][$m]['reply_hit']   += (int)$row['reply_hit'];
        $bucket[$label][$m]['close_total'] += (int)$row['close_total'];
        $bucket[$label][$m]['close_hit']   += (int)$row['close_hit'];
    };

    while ($row = $res->fetch_assoc()) {
        $dept    = $row['dept'] ?? '';
        $section = $row['section'] ?? '';
        $m       = (int)$row['m'];
        if ($dept === '' || $m < 1 || $m > 12) continue;

        // Dept-only (aggregate across all sections)
        $addRow($metrics, $dept, $m, $row);

        // Dept - Section (only when section is non-empty)
        if ($section !== '') {
            $label = $dept . ' - ' . $section;
            $addRow($metrics, $label, $m, $row);
        }
    }

    echo json_encode([
        'ok'      => true,
        'year'    => $year,
        'metrics' => $metrics,
    ]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => $e->getMessage()]);
}
