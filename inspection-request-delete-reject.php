<?php
include 'connection.php';

// Define the value to delete
$inspectionNo = $_POST['inspection-no'];

// First, fetch attachments linked to this inspection_no
$attachmentQuery = $conn->prepare("SELECT attachment FROM inspection_rejected_attachments WHERE inspection_no = ?");
if ($attachmentQuery === false) {
    die("Error preparing select statement: " . $conn->error);
}
$attachmentQuery->bind_param("i", $inspectionNo);
$attachmentQuery->execute();
$result = $attachmentQuery->get_result();

// Delete physical files
while ($row = $result->fetch_assoc()) {
    $filePath = $row['attachment'];
    if (file_exists($filePath)) {
        unlink($filePath); // delete the file
    }
}
$attachmentQuery->close();

// Delete from inspection_rejected_attachments table
$deleteAttachments = $conn->prepare("DELETE FROM inspection_rejected_attachments WHERE inspection_no = ?");
if ($deleteAttachments === false) {
    die("Error preparing delete attachment statement: " . $conn->error);
}
$deleteAttachments->bind_param("i", $inspectionNo);
if (!$deleteAttachments->execute()) {
    die("Error executing delete attachment statement: " . $deleteAttachments->error);
}
$deleteAttachments->close();

// Delete from inspection_reject table
$stmt = $conn->prepare("DELETE FROM inspection_reject WHERE inspection_no = ?");
if ($stmt === false) {
    die("Error preparing main delete statement: " . $conn->error);
}
$stmt->bind_param("i", $inspectionNo);
if (!$stmt->execute()) {
    die("Error executing main delete statement: " . $stmt->error);
}

// Respond to client
if ($stmt->affected_rows > 0) {
    echo json_encode(['message' => 'Record and attachments deleted successfully.']);
} else {
    echo json_encode(['message' => 'No record found with that inspection_no.']);
}

$stmt->close();
$conn->close();
?>
