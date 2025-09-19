<?php
session_start();
include 'connection.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {

    if (!isset($_POST['inspection-no'])) {
        echo json_encode(['status' => 'error', 'message' => 'Session error: Inspection number not set.']);
        exit;
    }

    if (empty($_FILES['dimension-file']['name'][0])) {
        echo json_encode(['status' => 'error', 'message' => 'Attachment is required.']);
        exit;
    }


    // Input & Textarea Values
    $notification = $_POST['dimension-notification'];
    $part_name = $_POST['dimension-part-name'];
    $part_no = $_POST['dimension-part-no'];
    $location_of_item = $_POST['dimension-location-of-item'];
    $inspection_no = $_POST['inspection-no'];

    // Check for empty values
    if (empty($notification) || empty($part_name) || empty($part_no)) {
        echo json_encode(['status' => 'error', 'message' => 'All fields are required.']);
        exit;
    }

    // Checkboxes Values
    $type_of_inspection = $_POST['inspection-dimension'];

    // Insert into inspection_dimensional table
    $stmt = $conn->prepare("INSERT INTO inspection_dimensional 
        (type_of_inspection, notification, part_name, part_no, location_of_item, inspection_no) 
        VALUES (?, ?, ?, ?, ?, ?)");

    $stmt->bind_param(
        'sssssi',
        $type_of_inspection,
        $notification,
        $part_name,
        $part_no,
        $location_of_item,
        $inspection_no
    );

    if ($stmt->execute()) {
        // Continue with file upload and attachment insert
        $uploadDir = 'inspection_dimensional_file/';
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0777, true);
        }

        if (isset($_FILES['dimension-file'])) {
            foreach ($_FILES['dimension-file']['tmp_name'] as $key => $tmpName) {
                $originalName = basename($_FILES['dimension-file']['name'][$key]);
                $sanitizedName = preg_replace("/[^a-zA-Z0-9_\.-]/", "_", $originalName);
                $targetPath = $uploadDir . time() . '_' . $sanitizedName;

                if (move_uploaded_file($tmpName, $targetPath)) {
                    $stmtAttachment = $conn->prepare("INSERT INTO inspection_dimensional_attachment (attachment, inspection_no) VALUES (?, ?)");
                    $stmtAttachment->bind_param('si', $targetPath, $inspection_no);
                    $stmtAttachment->execute();
                    $stmtAttachment->close();
                }
            }
        }

        echo json_encode(['status' => 'success', 'message' => 'Data inserted successfully']);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Error inserting data: ' . $stmt->error]);
    }

    $stmt->close();
    $conn->close();
} else {
    echo json_encode(['status' => 'error', 'message' => 'Invalid request method.']);
}
