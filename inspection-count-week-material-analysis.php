<?php
header('Content-Type: application/json; charset=utf-8');
ini_set('display_errors', 0);
error_reporting(E_ALL & ~E_NOTICE & ~E_WARNING);
include 'connection.php';

$query = "
    SELECT
      SUM(DAYOFWEEK(STR_TO_DATE(SUBSTRING_INDEX(date_time, ' | ', 1), '%d-%m-%Y')) = 2) AS monday_count,
      SUM(DAYOFWEEK(STR_TO_DATE(SUBSTRING_INDEX(date_time, ' | ', 1), '%d-%m-%Y')) = 3) AS tuesday_count,
      SUM(DAYOFWEEK(STR_TO_DATE(SUBSTRING_INDEX(date_time, ' | ', 1), '%d-%m-%Y')) = 4) AS wednesday_count,
      SUM(DAYOFWEEK(STR_TO_DATE(SUBSTRING_INDEX(date_time, ' | ', 1), '%d-%m-%Y')) = 5) AS thursday_count,
      SUM(DAYOFWEEK(STR_TO_DATE(SUBSTRING_INDEX(date_time, ' | ', 1), '%d-%m-%Y')) = 6) AS friday_count,
      SUM(DAYOFWEEK(STR_TO_DATE(SUBSTRING_INDEX(date_time, ' | ', 1), '%d-%m-%Y')) = 7) AS saturday_count,
      SUM(DAYOFWEEK(STR_TO_DATE(SUBSTRING_INDEX(date_time, ' | ', 1), '%d-%m-%Y')) = 1) AS sunday_count
    FROM inspection_request
    WHERE request = 'Material Analysis'
";

try {
    $result = $conn->query($query);
    $counts = $result->fetch_assoc();
    echo json_encode([
        'status' => 'success',
        'counts' => [
            'monday'    => (int)$counts['monday_count'],
            'tuesday'   => (int)$counts['tuesday_count'],
            'wednesday' => (int)$counts['wednesday_count'],
            'thursday'  => (int)$counts['thursday_count'],
            'friday'    => (int)$counts['friday_count'],
            'saturday'  => (int)$counts['saturday_count'],
            'sunday'    => (int)$counts['sunday_count'],
        ],
    ]);
} catch (Exception $e) {
    error_log("Inspection count error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
      'status'  => 'error',
      'message' => $e->getMessage()
    ]);
}

$conn->close();
