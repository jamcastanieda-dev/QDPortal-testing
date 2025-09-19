<?php
include 'connection.php';
header('Content-Type: application/json');

// Must have inspection number
$inspection_no = $_POST['inspection-no'] ?? '';
if ($inspection_no === '') {
    echo json_encode([
        'error'   => true,
        'message' => 'Inspection number not provided.'
    ]);
    exit;
}

// ——— DELETE EXISTING ENTRIES FOR THIS INSPECTION ———
$deleteSql  = "DELETE FROM inspection_incoming_wbs WHERE inspection_no = ?";
$deleteStmt = $conn->prepare($deleteSql);
if (!$deleteStmt) {
    echo json_encode([
        'error'   => true,
        'message' => 'Failed to prepare DELETE statement: ' . $conn->error
    ]);
    exit;
}
$deleteStmt->bind_param("i", $inspection_no);
if (!$deleteStmt->execute()) {
    echo json_encode([
        'error'   => true,
        'message' => 'Failed to delete existing WBS entries.'
    ]);
    $deleteStmt->close();
    exit;
}
$deleteStmt->close();

// ——— SEND A SUCCESS JSON RESPONSE ———
echo json_encode([
    'error'   => false,
    'message' => 'Existing WBS entries deleted successfully.'
]);
exit;
