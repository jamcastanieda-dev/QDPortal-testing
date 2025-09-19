<?php
include 'connection.php';

// Get inspection_no from session
$inspection_no = $_POST['inspection-no'];
$document_no = $_POST['complete-document-no'];

if (!$inspection_no) {
    echo json_encode(["status" => "error", "message" => "Inspection number is missing."]);
    exit();
}

if (!$document_no) {
    echo json_encode(["status" => "error", "message" => "Document number is missing."]);
    exit();
}

// Check if files are uploaded
if (!isset($_FILES['complete-inspection-file'])) {
    echo json_encode(["status" => "error", "message" => "No files uploaded."]);
    exit();
}

$files = $_FILES['complete-inspection-file'];
// --- COOKIE-BASED AUTH: Get user's name ---
if (!isset($_COOKIE['user'])) {
    echo json_encode(["status" => "error", "message" => "Not logged in."]);
    exit();
}
$user = json_decode($_COOKIE['user'], true);
$completed_by = $user['name'] ?? '';
$uploadDir = "inspection-completed-documents/";

// Ensure the upload directory exists
if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0777, true);
}

$uploadErrors = [];
$uploadedFiles = [];

// Set timezone to Asia/Manila
date_default_timezone_set('Asia/Manila');

// Loop through each file
for ($i = 0; $i < count($files['name']); $i++) {
    $originalName = basename($files['name'][$i]);
    $fileExt = pathinfo($originalName, PATHINFO_EXTENSION);
    $fileBase = pathinfo($originalName, PATHINFO_FILENAME);
    $datetime = date('Ymd_His'); // Format: YYYYMMDD_His

    // New filename with datetime
    $newFileName = $fileBase . '_' . $datetime . '.' . $fileExt;
    $filePath = $uploadDir . $newFileName;

    // Validate file upload
    if ($files['error'][$i] !== UPLOAD_ERR_OK) {
        $uploadErrors[] = "Error uploading {$originalName}. Error code: " . $files['error'][$i];
        continue;
    }

    // Move file to the upload directory
    if (move_uploaded_file($files['tmp_name'][$i], $filePath)) {
        // Prepare SQL for insertion into inspection_completed_attachments
        $stmt = $conn->prepare("INSERT INTO inspection_completed_attachments (completed_attachments, document_no, completed_by, inspection_no) VALUES (?, ?, ?, ?)");
        $stmt->bind_param("sssi", $filePath, $document_no, $completed_by, $inspection_no);

        if ($stmt->execute()) {
            $uploadedFiles[] = $newFileName;
        } else {
            $uploadErrors[] = "Database error for {$originalName}: " . $stmt->error;
        }
        $stmt->close();
    } else {
        $uploadErrors[] = "Failed to move file {$originalName}.";
    }
}

// Provide a response based on success or error
if (!empty($uploadedFiles)) {
    $message = "Successfully uploaded: " . implode(", ", $uploadedFiles);
    echo json_encode(["status" => "success", "message" => $message, "errors" => $uploadErrors]);
} else {
    echo json_encode(["status" => "error", "message" => "No files uploaded successfully.", "errors" => $uploadErrors]);
}

$conn->close();
?>
