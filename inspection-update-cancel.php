<?php
include 'connection.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['inspection-no'])) {
    $inspectionNo = $_POST['inspection-no'];

    // Prepare the SQL query to update the status to 'CANCELLED'
    $sql = "UPDATE inspection_request SET status = 'CANCELLED', approval = 'CANCELLED' WHERE inspection_no = ?";

    if ($stmt = $conn->prepare($sql)) {
        $stmt->bind_param("i", $inspectionNo);

        if ($stmt->execute()) {
            // If update is successful, insert into notification table
            $notifSql = "INSERT INTO inspection_cancelled_notification (inspection_no) VALUES (?)";
            if ($notifStmt = $conn->prepare($notifSql)) {
                $notifStmt->bind_param("i", $inspectionNo);
                if ($notifStmt->execute()) {
                    echo json_encode(['status' => 'success', 'message' => 'Status updated and notification inserted']);
                } else {
                    echo json_encode(['status' => 'warning', 'message' => 'Status updated, but failed to insert notification']);
                }
                $notifStmt->close();
            } else {
                echo json_encode(['status' => 'warning', 'message' => 'Status updated, but failed to prepare notification insert']);
            }
        } else {
            echo json_encode(['status' => 'error', 'message' => 'Failed to update status']);
        }

        $stmt->close();
    } else {
        echo json_encode(['success' => false, 'message' => 'Failed to prepare SQL statement']);
    }

    $conn->close();
} else {
    echo json_encode(['success' => false, 'message' => 'Invalid request']);
}
?>
