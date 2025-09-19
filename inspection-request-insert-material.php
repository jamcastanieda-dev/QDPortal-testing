<?php
session_start();
date_default_timezone_set('Asia/Manila'); // Set to Asia/Manila at the start!
include 'connection.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {

    if (!isset($_POST['inspection-no'])) {
        echo json_encode(['status' => 'error', 'message' => 'Session error: Inspection number not set.']);
        exit;
    }

    // Input & Textarea Values
    $notification = $_POST['material-notification'];
    $part_name = $_POST['material-part-name'];
    $part_no = $_POST['material-part-no'];
    $location_of_item = $_POST['material-location-of-item'];
    $inspection_no = $_POST['inspection-no'];

    // Check for empty values
    if (empty($notification) || empty($part_name) || empty($part_no) || empty($location_of_item)) {
        echo json_encode(['status' => 'error', 'message' => 'All fields are required.']);
        exit;
    }

    // Checkboxes Values
    $type_of_inspection = $_POST['inspection-material'];
    $xrf = $_POST['xrf'] ?? 'none';
    $hardness_test = $_POST['hardness'] ?? 'none';
    $type_of_grinding = $_POST['grindingOption'] ?? 'none';

    // Prepare and execute SQL query
    $stmt = $conn->prepare("INSERT INTO inspection_material_analysis
    (type_of_inspection, xrf, hardness_test, type_of_grinding, notification, part_name, part_no, location_of_item, inspection_no) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");

    $stmt->bind_param(
        'ssssssssi',
        $type_of_inspection,
        $xrf,
        $hardness_test,
        $type_of_grinding,
        $notification,
        $part_name,
        $part_no,
        $location_of_item,
        $inspection_no
    );

    // Set up upload directory for material files
    $uploadDir = __DIR__ . '/inspection_material_file/';
    if (!file_exists($uploadDir)) {
        mkdir($uploadDir, 0755, true);
    }

    if ($stmt->execute()) {
        // Handle file uploads
        $filesUploaded = 0;
        $fileErrors = [];
        if (!empty($_FILES['material-analysis-file']) && isset($_FILES['material-analysis-file']['name']) && is_array($_FILES['material-analysis-file']['name'])) {
            $files = $_FILES['material-analysis-file'];
            for ($i = 0; $i < count($files['name']); $i++) {
                if ($files['error'][$i] === UPLOAD_ERR_OK) {
                    $originalName = basename($files['name'][$i]);
                    $nowStr = date('Ymd_His'); // e.g. 20250805_154821
                    $ext = pathinfo($originalName, PATHINFO_EXTENSION);
                    // Clean the original file name for safety
                    $baseName = pathinfo($originalName, PATHINFO_FILENAME);
                    $baseName = preg_replace('/[^A-Za-z0-9_\-]/', '_', $baseName); // Only safe chars

                    // THIS is the format you want: cancelled_20250804_103323.txt
                    $uniqueName = $baseName . '_' . $nowStr . '.' . $ext;
                    $targetPath = $uploadDir . $uniqueName;

                    if (move_uploaded_file($files['tmp_name'][$i], $targetPath)) {
                        // Insert file record into DB
                        $relativePath = 'inspection_material_file/' . $uniqueName;
                        $stmtFile = $conn->prepare("INSERT INTO inspection_material_attachments (attachment, inspection_no) VALUES (?, ?)");
                        $stmtFile->bind_param('si', $relativePath, $inspection_no);
                        $stmtFile->execute();
                        $stmtFile->close();
                        $filesUploaded++;
                    } else {
                        $fileErrors[] = $originalName;
                    }
                } elseif ($files['error'][$i] !== UPLOAD_ERR_NO_FILE) {
                    $fileErrors[] = $files['name'][$i];
                }
            }
        }

        $message = 'Data inserted successfully';
        if ($filesUploaded > 0) {
            $message .= " ($filesUploaded file(s) uploaded)";
        }
        if (!empty($fileErrors)) {
            $message .= ". Failed to upload: " . implode(', ', $fileErrors);
        }

        echo json_encode(['status' => 'success', 'message' => $message]);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Error inserting data: ' . $stmt->error]);
    }

    $stmt->close();
    $conn->close();
} else {
    echo json_encode(['status' => 'error', 'message' => 'Invalid request method.']);
}
