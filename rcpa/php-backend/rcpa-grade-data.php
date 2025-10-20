<?php
header('Content-Type: application/json');

require_once __DIR__ . '/../../connection.php'; // must define $conn (mysqli)

try {
    if (!isset($conn) || !$conn instanceof mysqli) {
        throw new Exception('DB connection not available.');
    }
    $conn->set_charset('utf8mb4');

    $year = isset($_GET['year']) ? (int)$_GET['year'] : (int)date('Y');
    $nextYear = $year + 1;

    // Normalize section: '' -> NULL so "plain dept" means NULL section only
    $sql = "
        SELECT
            TRIM(rr.assignee)            AS dept,
            NULLIF(TRIM(rr.section), '') AS section,
            MONTH(rr.date_request)       AS m,
            COUNT(*)                     AS total,
            SUM(CASE WHEN rr.reply_date IS NOT NULL THEN 1 ELSE 0 END) AS reply_total,
            SUM(CASE
                  WHEN rr.hit_reply IS NOT NULL
                   AND UPPER(TRIM(rr.hit_reply)) IN ('HIT','YES','Y','ON TIME','ONTIME','ON-TIME')
                  THEN 1 ELSE 0
                END) AS reply_hit,
            SUM(CASE WHEN rr.close_date IS NOT NULL THEN 1 ELSE 0 END) AS close_total,
            SUM(CASE
                  WHEN rr.hit_close IS NOT NULL
                   AND UPPER(TRIM(rr.hit_close)) IN ('HIT','YES','Y','ON TIME','ONTIME','ON-TIME')
                  THEN 1 ELSE 0
                END) AS close_hit
        FROM rcpa_request rr
        WHERE rr.assignee IS NOT NULL
          AND TRIM(rr.assignee) <> ''
          AND rr.date_request >= CONCAT(?, '-01-01')
          AND rr.date_request <  CONCAT(?, '-01-01')
        GROUP BY dept, section, m
        ORDER BY dept, section, m
    ";

    $stmt = $conn->prepare($sql);
    if (!$stmt) throw new Exception('Prepare failed: ' . $conn->error);
    $stmt->bind_param('ii', $year, $nextYear);
    if (!$stmt->execute()) throw new Exception('Query failed: ' . $stmt->error);
    $res = $stmt->get_result();

    // metrics[label][month] = { total, reply_total, reply_hit, close_total, close_hit }
    $metrics = [];

    $addRow = function (&$bucket, string $label, int $m, array $row): void {
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
        $dept    = trim((string)($row['dept'] ?? ''));
        $section = $row['section']; // already NULL if blank
        $m       = (int)$row['m'];
        if ($dept === '' || $m < 1 || $m > 12) continue;

        if ($section === null) {
            // Plain dept gets ONLY no-section rows
            $addRow($metrics, $dept, $m, $row);
        } else {
            // Sectioned rows go ONLY to "Dept - Section"
            $label = $dept . ' - ' . trim((string)$section);
            $addRow($metrics, $label, $m, $row);
        }
    }
    $stmt->close();

    echo json_encode([
        'ok'      => true,
        'year'    => $year,
        'metrics' => $metrics,
    ], JSON_UNESCAPED_UNICODE);

} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => $e->getMessage()]);
}
