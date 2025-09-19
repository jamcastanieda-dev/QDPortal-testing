<?php
include 'connection.php';

// Get inspection_no from POST, not session!
$inspection_no = $_POST['inspection_no'] ?? '';

if (!$inspection_no) {
    echo json_encode(["status" => "error", "message" => "Inspection number is missing."]);
    exit();
}

// Check if files are uploaded
if (!isset($_FILES['inspection-file'])) {
    echo json_encode(["status" => "error", "message" => "No files uploaded."]);
    exit();
}

$files = $_FILES['inspection-file'];
$uploadDir = "inspection-documents/";

// Ensure the upload directory exists
if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0777, true);
}

$uploadErrors = [];
$uploadedFiles = [];

// Loop through each file
for ($i = 0; $i < count($files['name']); $i++) {
    $fileName = basename($files['name'][$i]);
    $filePath = $uploadDir . $fileName;

    // Validate file upload
    if ($files['error'][$i] !== UPLOAD_ERR_OK) {
        $uploadErrors[] = "Error uploading {$fileName}. Error code: " . $files['error'][$i];
        continue;
    }

    // Move file to the upload directory
    if (move_uploaded_file($files['tmp_name'][$i], $filePath)) {
        // Prepare SQL for insertion into inspection_attachments
        $stmt = $conn->prepare("INSERT INTO inspection_attachments (inspection_file, inspection_no) VALUES (?, ?)");
        $stmt->bind_param("si", $filePath, $inspection_no);

        if ($stmt->execute()) {
            $uploadedFiles[] = $fileName;
        } else {
            $uploadErrors[] = "Database error for {$fileName}: " . $stmt->error;
        }
        $stmt->close();
    } else {
        $uploadErrors[] = "Failed to move file {$fileName}.";
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
