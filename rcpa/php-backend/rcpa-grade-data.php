<?php
// ../php-backend/rcpa-grade-data.php
header('Content-Type: application/json');

require_once __DIR__ . '/../../connection.php'; // must define $conn (mysqli)

try {
    if (!isset($conn) || !$conn instanceof mysqli) {
        throw new Exception('DB connection not available.');
    }

    // Inputs
    $year = isset($_GET['year']) ? (int)$_GET['year'] : (int)date('Y');

    // Summarize by dept + section + month
    $sql = "
        SELECT
            TRIM(originator_department) AS dept,
            TRIM(COALESCE(section,'')) AS section,
            MONTH(date_request)        AS m,
            COUNT(*)                   AS total,
            SUM(CASE WHEN (reply_date IS NOT NULL OR reply_received IS NOT NULL) THEN 1 ELSE 0 END) AS reply_total,
            SUM(
                CASE WHEN
                    (hit_reply IS NOT NULL AND UPPER(TRIM(hit_reply)) IN ('HIT','YES','Y','ON TIME','ONTIME','ON-TIME'))
                    OR (reply_due_date IS NOT NULL AND reply_date IS NOT NULL AND reply_date <= reply_due_date)
                THEN 1 ELSE 0 END
            ) AS reply_hit,
            SUM(CASE WHEN close_date IS NOT NULL THEN 1 ELSE 0 END) AS close_total,
            SUM(
                CASE WHEN
                    (hit_close IS NOT NULL AND UPPER(TRIM(hit_close)) IN ('HIT','YES','Y','ON TIME','ONTIME','ON-TIME'))
                    OR (close_due_date IS NOT NULL AND close_date IS NOT NULL AND close_date <= close_due_date)
                THEN 1 ELSE 0 END
            ) AS close_hit
        FROM rcpa_request
        WHERE originator_department IS NOT NULL
          AND TRIM(originator_department) <> ''
          AND date_request >= CONCAT(?, '-01-01') 
          AND date_request <  CONCAT(?, '-01-01')
        GROUP BY TRIM(originator_department), TRIM(COALESCE(section,'')), MONTH(date_request)
        ORDER BY dept, section, m
    ";

    $stmt = $conn->prepare($sql);
    $nextYear = $year + 1;
    $stmt->bind_param('ii', $year, $nextYear);
    if (!$stmt->execute()) {
        throw new Exception('Query failed: ' . $stmt->error);
    }
    $res = $stmt->get_result();

    // Build metrics keyed by label ("Dept" and "Dept - Section")
    // metrics[label][month] = { total, reply_total, reply_hit, close_total, close_hit }
    $metrics = [];

    $addRow = function(&$bucket, $label, $m, $row) {
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

        // Dept - Section (leaf)
        if ($section !== '') {
            $label = $dept . ' - ' . $section;
            $addRow($metrics, $label, $m, $row);
        }
    }

    echo json_encode([
        'ok'      => true,
        'year'    => $year,
        'metrics' => $metrics, // see structure above
    ]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => $e->getMessage()]);
}
