<?php
session_start();
include 'connection.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'POST' && !empty($_POST['inspection_no'])) {
    $inspection_no = $_POST['inspection_no'];

    $sql = "SELECT inspection_no, name, date_time, activity
            FROM inspection_history_qa
            WHERE inspection_no = ?";
    $stmt = mysqli_prepare($conn, $sql);

    if ($stmt) {
        mysqli_stmt_bind_param($stmt, "s", $inspection_no);
        mysqli_stmt_execute($stmt);
        $result = mysqli_stmt_get_result($stmt);

        // collect all rows into $historyList
        $historyList = [];
        while ($row = mysqli_fetch_assoc($result)) {
            $historyList[] = $row;
        }

        if (count($historyList) > 0) {
            // at least one record found
            echo json_encode([
                'status'  => 'success',
                'history' => $historyList
            ]);
        } else {
            // zero records found
            echo json_encode([
                'status'  => 'error',
                'message' => 'No record found'
            ]);
        }

        mysqli_stmt_close($stmt);
    } else {
        echo json_encode([
            'status'  => 'error',
            'message' => 'Query preparation failed'
        ]);
    }
} else {
    echo json_encode([
        'status'  => 'error',
        'message' => 'Invalid request'
    ]);
}

mysqli_close($conn);
