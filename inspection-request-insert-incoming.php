<?php
session_start();
include 'connection.php';
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['status' => 'error', 'message' => 'Invalid request method.']);
    exit;
}

if (!isset($_POST['inspection-no']) || $_POST['inspection-no'] === '') {
    echo json_encode(['status' => 'error', 'message' => 'Session error: Inspection number not set.']);
    exit;
}

$inspection_no     = (int)$_POST['inspection-no'];
$quantity          = trim($_POST['detail-quantity'] ?? '');
$scope             = trim($_POST['detail-scope'] ?? '');
$inspection_type   = trim($_POST['inspection-type'] ?? '');   // may be missing or differently worded
$location_of_item  = trim($_POST['incoming-location-of-item'] ?? '');

// OLD painting logic preserved
$painting = (isset($_POST['painting']) && $_POST['painting'] === 'y') ? 'y' : null;

// Incoming-only
$type_of_incoming_inspection = $_POST['incoming-options'] ?? 'none';
$vendor  = $_POST['vendor'] ?? 'none';
$po      = $_POST['po'] ?? 'none';
$dr      = $_POST['dr'] ?? 'none';

if ($quantity === '' || $scope === '' || $inspection_type === '' || $location_of_item === '') {
    echo json_encode(['status' => 'error', 'message' => 'All required fields are missing.']);
    exit;
}

try {
    // Start transaction
    if (method_exists($conn, 'begin_transaction')) {
        $conn->begin_transaction();
    } else {
        $conn->autocommit(false);
    }

    // Insert main record
    $stmt = $conn->prepare("INSERT INTO inspection_incoming_outgoing
        (type_of_inspection, type_of_incoming_inspection, painting, quantity, scope, vendor, po_no, dr_no, location_of_item, inspection_no)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    $stmt->bind_param(
        'sssssssssi',
        $inspection_type,
        $type_of_incoming_inspection,
        $painting,
        $quantity,
        $scope,
        $vendor,
        $po,
        $dr,
        $location_of_item,
        $inspection_no
    );
    if (!$stmt->execute()) {
        throw new Exception('Error inserting data: ' . $stmt->error);
    }
    $stmt->close();

    // ---- Outgoing items (robust detection) -------------------------------
    // Accept arrays posted as outgoing-item[] / outgoing-quantity[]
    $items = isset($_POST['outgoing-item']) ? (array)$_POST['outgoing-item'] : [];
    $qtys  = isset($_POST['outgoing-quantity']) ? (array)$_POST['outgoing-quantity'] : [];

    // Normalize lengths and build rows (skip fully empty lines)
    $max = max(count($items), count($qtys));
    $rows = [];
    for ($i = 0; $i < $max; $i++) {
        $item = isset($items[$i]) ? trim((string)$items[$i]) : '';
        $qty  = isset($qtys[$i])  ? trim((string)$qtys[$i])  : '';
        if ($item === '' && $qty === '') continue;
        $rows[] = [$inspection_no, $item, $qty];
    }

    // Decide whether to insert: either explicitly outgoing, OR payload present
    $typeLooksOutgoing = (strtolower($inspection_type) === 'outgoing' || strtolower($inspection_type) === 'outgoing inspection');
    if ($typeLooksOutgoing || !empty($rows)) {
        if (!empty($rows)) {
            $stmt2 = $conn->prepare("INSERT INTO inspection_outgoing_item (inspection_no, item, quantity) VALUES (?, ?, ?)");
            foreach ($rows as [$insNo, $item, $qty]) {
                // If your column 'quantity' is INT, change 'iss' to 'isi' and cast $qty = (int)$qty;
                $stmt2->bind_param('iss', $insNo, $item, $qty);
                if (!$stmt2->execute()) {
                    throw new Exception('Error inserting outgoing item: ' . $stmt2->error);
                }
            }
            $stmt2->close();
        }
    }
    // ----------------------------------------------------------------------

    // Commit
    if (method_exists($conn, 'commit')) {
        $conn->commit();
    } else {
        $conn->autocommit(true);
    }

    echo json_encode([
        'status'  => 'success',
        'message' => 'Data inserted successfully',
        'inserted_outgoing_rows' => count($rows)
    ]);

} catch (Throwable $e) {
    if (method_exists($conn, 'rollback')) {
        $conn->rollback();
    } else {
        $conn->autocommit(true);
    }
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
} finally {
    $conn->close();
}
