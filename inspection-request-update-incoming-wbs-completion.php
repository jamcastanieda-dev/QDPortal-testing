<?php
include 'connection.php';

if (
    empty($_POST['inspection-no']) ||
    empty($_POST['items'])      ||
    !is_array($_POST['items'])
) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Missing inspection-no or items']);
    exit;
}

$inspectionNo = $_POST['inspection-no'];
$items        = $_POST['items'];

$sql = "
  UPDATE inspection_incoming_wbs
     SET status       = ?,
         passed_qty   = ?,
         failed_qty   = ?,
         pwf_pass     = ?,
         pwf_fail     = ?
   WHERE inspection_no = ?
     AND wbs           = ?
";
$stmt = mysqli_prepare($conn, $sql);
if (!$stmt) {
    http_response_code(500);
    echo json_encode([
      'status'  => 'error',
      'message' => 'Prepare failed: ' . mysqli_error($conn)
    ]);
    exit;
}

foreach ($items as $it) {
    if (empty($it['wbs']) || empty($it['status'])) {
        continue;
    }

    $status    = $it['status'];
    $passedQty = 0;
    $failedQty = 0;
    $pwfPass   = 0;
    $pwfFail   = 0;

    if ($status === 'passed') {
        $passedQty = isset($it['passed_qty']) ? (int)$it['passed_qty'] : 0;
    }
    else if ($status === 'failed') {
        $failedQty = isset($it['failed_qty']) ? (int)$it['failed_qty'] : 0;
    }
    else if ($status === 'pwf') {
        $pwfPass = isset($it['pwf_pass']) ? (int)$it['pwf_pass'] : 0;
        $pwfFail = isset($it['pwf_fail']) ? (int)$it['pwf_fail'] : 0;
    }

    mysqli_stmt_bind_param(
      $stmt,
      'siiiiss',
      $status,
      $passedQty,
      $failedQty,
      $pwfPass,
      $pwfFail,
      $inspectionNo,
      $it['wbs']
    );
    mysqli_stmt_execute($stmt);
}

mysqli_stmt_close($stmt);
mysqli_close($conn);

echo json_encode(['status' => 'success']);
