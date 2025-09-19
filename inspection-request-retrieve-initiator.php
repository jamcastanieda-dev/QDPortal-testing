<?php
include 'connection.php';

$user_data = json_decode($_COOKIE['user'], true);
$current_user   = $user_data['name'] ?? '';
$user_privilege = $user_data['privilege'] ?? '';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] == 'POST' && isset($_POST['inspection_no'])) {
    $inspection_no = $_POST['inspection_no'];

    $sql = "SELECT ir.*,
             iio.painting
        FROM inspection_request AS ir
   LEFT JOIN inspection_incoming_outgoing AS iio
          ON ir.inspection_no = iio.inspection_no
       WHERE ir.inspection_no = ?
    ";
    $stmt = mysqli_prepare($conn, $sql);
    if ($stmt) {
        mysqli_stmt_bind_param($stmt, "s", $inspection_no);
        mysqli_stmt_execute($stmt);
        $result = mysqli_stmt_get_result($stmt);
        $row    = mysqli_fetch_assoc($result);

        if ($row) {
            echo json_encode([
              'status'    => 'success',
              'data'      => $row,
              'user'      => $current_user,
              'privilege' => $user_privilege
            ]);
        } else {
            echo json_encode(['status' => 'error', 'message' => 'No record found']);
        }
        mysqli_stmt_close($stmt);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Query preparation failed']);
    }
} else {
    echo json_encode(['status' => 'error', 'message' => 'Invalid request']);
}

mysqli_close($conn);