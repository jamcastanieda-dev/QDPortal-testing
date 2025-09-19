<?php
include 'connection.php'; 

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $inspection_no = $_POST['inspection_no'];

    if (empty($inspection_no)) {
        echo json_encode(['status' => 'error', 'message' => 'Inspection number is required']);
        exit();
    }

    // 1. Check if painting is NOT NULL for this inspection_no
    $stmt = $conn->prepare("SELECT painting FROM inspection_incoming_outgoing WHERE inspection_no = ? LIMIT 1");
    $stmt->bind_param("i", $inspection_no);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($row = $result->fetch_assoc()) {
        if (!is_null($row['painting'])) {
            // painting is NOT NULL → no attachments needed
            echo json_encode(['status' => 'no_attachment', 'message' => 'Attachments are not required for this inspection (painting).']);
            $stmt->close();
            $conn->close();
            exit();
        }
    }
    $stmt->close();

    // 2. Otherwise, show attachments (original code)
    $stmt = $conn->prepare("SELECT completed_attachments, document_no, completed_by, acknowledged_by FROM inspection_completed_attachments WHERE inspection_no = ?");
    $stmt->bind_param("i", $inspection_no);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows > 0) {
        $files = [];
        while ($row = $result->fetch_assoc()) {
            $files[] = $row['completed_attachments'];
            $document_no = $row['document_no'];
            $completed_by = $row['completed_by'];
            $acknowledged_by = $row['acknowledged_by'];
        }
        echo json_encode(['status' => 'success', 'files' => $files, 'document_no' => $document_no, 'completed_by' => $completed_by, 'acknowledged_by' => $acknowledged_by]);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'No attachments found for this Inspection number']);
    }

    $stmt->close();
    $conn->close();
}
?>
