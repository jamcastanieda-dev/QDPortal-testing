<?php
include 'connection.php';
require __DIR__ . '/send-email.php';

ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

file_put_contents(__DIR__ . '/php_error_log.txt', "----\n" . date('Y-m-d H:i:s') . "\n" . print_r($_POST, true) . "\n" . print_r($_FILES, true) . "\n", FILE_APPEND);

header('Content-Type: application/json');
$response = ['success' => false, 'message' => 'Invalid request'];

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['inspection_no'])) {
    $inspectionNo = (int) $_POST['inspection_no'];

    // 1) Update status to REJECTED
    $sqlUpdate = "UPDATE inspection_request SET status = 'REJECTED', approval = 'REJECTED' WHERE inspection_no = ?";
    if ($stmtUpdate = $conn->prepare($sqlUpdate)) {
        $stmtUpdate->bind_param("i", $inspectionNo);
        if ($stmtUpdate->execute()) {

            // 2) Insert notification row
            $sqlInsert = "INSERT INTO inspection_rejected_notification (inspection_no) VALUES (?)";
            if ($stmtInsert = $conn->prepare($sqlInsert)) {
                $stmtInsert->bind_param("i", $inspectionNo);
                if (!$stmtInsert->execute()) {
                    $response = ['success' => false, 'message' => 'Status updated but failed to insert notification. Error: ' . $stmtInsert->error];
                    $stmtInsert->close();
                    $stmtUpdate->close();
                    $conn->close();
                    echo json_encode($response);
                    exit;
                }
                $stmtInsert->close();
            } else {
                $response = ['success' => false, 'message' => 'Status updated but failed to prepare notification insert. Error: ' . $conn->error];
                $stmtUpdate->close();
                $conn->close();
                echo json_encode($response);
                exit;
            }

            // 3) Handle file uploads (optional attachments)
            $uploaded = [];
            $uploadDir = __DIR__ . "/inspection_rejected_files/";
            $dbDir = "inspection_rejected_files/";
            if (!file_exists($uploadDir)) {
                mkdir($uploadDir, 0777, true);
            }

            if (isset($_FILES['attachments'])) {
                $attachments = $_FILES['attachments'];
                $files = [];
                if (is_array($attachments['name'])) {
                    for ($i = 0; $i < count($attachments['name']); $i++) {
                        if (empty($attachments['name'][$i])) continue;
                        $files[] = [
                            'name' => $attachments['name'][$i],
                            'type' => $attachments['type'][$i],
                            'tmp_name' => $attachments['tmp_name'][$i],
                            'error' => $attachments['error'][$i],
                            'size' => $attachments['size'][$i]
                        ];
                    }
                } else {
                    if (!empty($attachments['name'])) $files[] = $attachments;
                }

                foreach ($files as $file) {
                    if ($file['error'] !== UPLOAD_ERR_OK) {
                        error_log("Upload error for {$file['name']}: " . $file['error']);
                        continue;
                    }
                    $originalName = basename($file['name']);
                    $uniqueName = uniqid() . '_' . preg_replace('/[^A-Za-z0-9_\-\.]/', '_', $originalName);
                    $targetFile = $uploadDir . $uniqueName;
                    $dbPath = $dbDir . $uniqueName;
                    if (move_uploaded_file($file['tmp_name'], $targetFile)) {
                        $stmt = $conn->prepare("INSERT INTO inspection_rejected_attachments (attachment, inspection_no) VALUES (?, ?)");
                        if ($stmt) {
                            $stmt->bind_param("si", $dbPath, $inspectionNo);
                            $stmt->execute();
                            $stmt->close();
                            $uploaded[] = $dbPath;
                        }
                    } else {
                        error_log("Failed to move uploaded file: {$file['tmp_name']} to $targetFile");
                    }
                }
                $response['uploaded'] = $uploaded;
            }

            // 4) === EMAIL TRIGGER LOGIC (REJECTED) ===

            // Fetch details for the email
            $stmtDet = $conn->prepare("
                SELECT company, wbs, description, request, requestor
                  FROM inspection_request
                 WHERE inspection_no = ?
            ");
            $stmtDet->bind_param("i", $inspectionNo);
            $stmtDet->execute();
            $stmtDet->bind_result($company, $wbs, $description, $requestDetail, $requestor);
            $stmtDet->fetch();
            $stmtDet->close();

            // Normalize request detail
            if ($requestDetail === 'Incoming and Outgoing Inspection') {
                $stmtType = $conn->prepare("SELECT type_of_inspection FROM inspection_incoming_outgoing WHERE inspection_no = ? LIMIT 1");
                $stmtType->bind_param("i", $inspectionNo);
                $stmtType->execute();
                $stmtType->bind_result($typeOfInspection);
                if ($stmtType->fetch()) {
                    $requestDetail = ucwords($typeOfInspection) . ' Inspection';
                }
                $stmtType->close();
            } elseif ($requestDetail === 'Final & Sub-Assembly Inspection') {
                $stmtType = $conn->prepare("SELECT type_of_inspection FROM inspection_final_sub WHERE inspection_no = ? LIMIT 1");
                $stmtType->bind_param("i", $inspectionNo);
                $stmtType->execute();
                $stmtType->bind_result($typeOfInspection);
                if ($stmtType->fetch()) {
                    if (substr($typeOfInspection, -11) === '-inspection') {
                        $typeOfInspection = substr($typeOfInspection, 0, -11);
                    }
                    $requestDetail = ucwords(str_replace('-', ' ', $typeOfInspection)) . ' Inspection';
                }
                $stmtType->close();
            }

            // Requestor emails
            $initiatorEmails = [];
            if (!empty($requestor)) {
                $stmtInit = $conn->prepare("
                    SELECT email FROM system_users
                     WHERE employee_name = ?
                       AND email IS NOT NULL AND email <> ''
                ");
                if ($stmtInit) {
                    $reqName = trim($requestor);
                    $stmtInit->bind_param("s", $reqName);
                    if ($stmtInit->execute()) {
                        $resInit = $stmtInit->get_result();
                        while ($row = $resInit->fetch_assoc()) {
                            $em = trim($row['email']);
                            if (filter_var($em, FILTER_VALIDATE_EMAIL)) $initiatorEmails[] = $em;
                        }
                    }
                    $stmtInit->close();
                }
                if (filter_var($requestor, FILTER_VALIDATE_EMAIL)) {
                    $initiatorEmails[] = $requestor;
                }
            }

            // Same-dept supervisors/managers (by requestor's dept)
            $deptRoleEmails = [];
            if (!empty($requestor)) {
                $reqIdentifier = trim($requestor);
                $stmtDept = $conn->prepare("SELECT department FROM system_users WHERE (employee_name = ? OR email = ?) LIMIT 1");
                if ($stmtDept) {
                    $stmtDept->bind_param("ss", $reqIdentifier, $reqIdentifier);
                    if ($stmtDept->execute()) {
                        $stmtDept->bind_result($requestorDept);
                        if ($stmtDept->fetch() && !empty($requestorDept)) {
                            $stmtDept->close();
                            $stmtSupMgr = $conn->prepare("
                                SELECT email FROM system_users
                                 WHERE department = ?
                                   AND role IN ('supervisor','manager')
                                   AND email IS NOT NULL AND email <> ''
                            ");
                            if ($stmtSupMgr) {
                                $stmtSupMgr->bind_param("s", $requestorDept);
                                if ($stmtSupMgr->execute()) {
                                    $resSupMgr = $stmtSupMgr->get_result();
                                    while ($row = $resSupMgr->fetch_assoc()) {
                                        $em = trim($row['email']);
                                        if (filter_var($em, FILTER_VALIDATE_EMAIL)) $deptRoleEmails[] = $em;
                                    }
                                }
                                $stmtSupMgr->close();
                            }
                        } else {
                            $stmtDept->close();
                        }
                    } else {
                        $stmtDept->close();
                    }
                }
            }

            // Recipients by company
            $toRecipients = [];
            $ccRecipients = [];
            $companyKey = is_string($company) ? strtolower(trim($company)) : '';

            if ($companyKey === 'rti') {
                $toRecipients = array_unique([
                    'thaddeus.manuel@motolite.com',
                    'rachel.panganiban@motolite.com',
                    'vicente.malagamba@motolite.com',
                    'lorice.castillo@motolite.com',
                    'mhell.torrefranca@motolite.com',
                    'edward.frando@motolite.com',
                    'analyn.garcia@motolite.com',
                    'jun.bernardino@motolite.com',
                    'kharen.montederamos@motolite.com',
                    'larry.canimo@motolite.com',
                    'ray.requiero@motolite.com',
                    'mark.pates@motolite.com',
                    'rolly.aco@motolite.com',
                    'cathrine.ignacio@motolite.com',
                    'gemarc.bautista@motolite.com',
                    'rosario.villaluz@motolite.com',
                    'paula.degalicia@motolite.com',

                ]);
                $ccRecipients = array_unique([
                    'patricia.principe@motolite.com',
                    'sandy.vito@motolite.com',
                    'kendall.abarcar@motolite.com',
                    'juan.sibug@motolite.com',
                    'jayson.langoy@motolite.com',
                    'brian.santos@motolite.com',
                    'ronald.duldulao@motolite.com',
                    'rti.batteryqa@motolite.com',
                    'carlo.malto@motolite.com',

                ]);
            } elseif ($companyKey === 'ssd') {
                $toRecipients = array_unique([
                    'melkie.lozano@motolite.com',
                    'ssd-pmostaff@motolite.com',
                    'alfonso.teopez@motolite.com',
                    'angelica.baltazar@motolite.com',
                    'marco.flores@motolite.com',
                    'avelino.ignacio@motolite.com',
                    'aldrin.villar@motolite.com',
                    'paula.caparas@motolite.com',

                ]);
                $ccRecipients = array_unique([
                    'patricia.principe@motolite.com',
                    'sandy.vito@motolite.com',
                    'christian.andan@motolite.com',
                    'kenneth.ramos@motolite.com',
                    'mark.ale@motolite.com',

                ]);
            }

            // Merge requestor and dept heads
            $toRecipients = array_values(array_unique(array_merge($toRecipients, $initiatorEmails)));
            if (!empty($deptRoleEmails)) {
                $ccRecipients = array_values(array_unique(array_merge($ccRecipients, $deptRoleEmails)));
            }
            $ccRecipients = array_values(array_diff($ccRecipients, $toRecipients));

            if (!empty($toRecipients)) {
                $newStatus = 'REJECTED';
                $subject = "{$requestDetail} | Inspection No: {$inspectionNo} Rejected - Status: {$newStatus}";
                $year = date('Y');

                $htmlBody = <<<EOD
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Inspection Rejected Notification</title>
<style>
    body { margin:0; padding:0; background-color:#f4f4f4; font-family: Arial, sans-serif; color:#333; }
    .email-container { width:auto; margin:30px auto; background:#fff; border-radius:8px; overflow:hidden; box-shadow:0 2px 6px rgba(0,0,0,0.1); }
    .header { background-color:#ffefef; padding:20px; text-align:center; }
    .header img { max-height:50px; }
    .content { padding:20px; }
    .content h1 { font-size:20px; margin-top:0; color:#b00020; }
    .content p { line-height:1.6; }
    .details { width:100%; border-collapse:collapse; margin:20px 0; }
    .details th, .details td { padding:12px; border:1px solid #ddd; text-align:left; }
    .details th { background-color:#f9f9f9; width:35%; }
    .warning-box { background-color:#fff3cd; border:1px solid #ffeeba; border-radius:4px; padding:15px; color:#856404; margin:20px 0; }
    .warning-box a { font-weight:bold; color:#856404; text-decoration:underline; }
    .footer { background-color:#fafafa; padding:15px 20px; font-size:12px; color:#777; text-align:center; }
</style>
</head>
<body>
<div class="email-container">
    <div class="header">
        <img src="https://uploads.onecompiler.io/42sz4nhpa/42wmg5fr4/logo1-removebg-preview.png" alt="Ramcar Logo">
    </div>
    <div class="content">
        <h1>Inspection Rejected</h1>
        <p>Dear Team,</p>
        <p>
            Please be informed that the inspection request below has been updated with status <strong>REJECTED</strong>.
            Kindly review the details and take the necessary actions.
        </p>
        <table class="details">
            <tr><th>Inspection No.</th><td>{$inspectionNo}</td></tr>
            <tr><th>Status</th><td>REJECTED</td></tr>
            <tr><th>WBS</th><td>{$wbs}</td></tr>
            <tr><th>Description</th><td>{$description}</td></tr>
            <tr><th>Request</th><td>{$requestDetail}</td></tr>
            <tr><th>Requestor</th><td>{$requestor}</td></tr>
        </table>
        <div class="warning-box">
            <p style="margin:0;">
                Please log in to the portal to review full details. Make sure you are connected to the <strong>RGC</strong> network to continue.
            </p>
            <p style="margin:8px 0 0 0;">
                <a href="http://172.31.11.252/qdportal/login.php">http://172.31.11.252/qdportal/login.php</a>
            </p>
        </div>
    </div>
    <div class="footer">
        &copy; {$year} Ramcar Technology Incorporated. All rights reserved.
    </div>
</div>
</body>
</html>
EOD;

                $emailResult = sendEmailNotification($toRecipients, $subject, $htmlBody, '', $ccRecipients);
                if (!empty($emailResult['failed'])) {
                    error_log("Failed to send inspection REJECTED email to: " . implode(', ', $emailResult['failed']));
                }
            }

            $response['success'] = true;
            $response['message'] = 'Status updated, notification inserted, files uploaded successfully (if any), email sent if applicable.';
        } else {
            $response = ['success' => false, 'message' => 'Failed to update status'];
        }
        $stmtUpdate->close();
    } else {
        $response = ['success' => false, 'message' => 'Failed to prepare update statement'];
    }

    $conn->close();
}

echo json_encode($response);
