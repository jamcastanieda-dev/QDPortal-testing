<?php
include 'connection.php';
require __DIR__ . '/send-email.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST' || !isset($_POST['inspection_no'])) {
    echo json_encode(['success' => false, 'message' => 'Invalid request']);
    exit;
}

$inspectionNo = (int) $_POST['inspection_no'];
$requestType = $_POST['request'] ?? '';
$remarks = isset($_POST['remarks']) ? trim($_POST['remarks']) : '';

// Ensure user is logged in
if (!isset($_COOKIE['user'])) {
    echo json_encode(['success' => false, 'message' => 'User not logged in']);
    exit;
}
$userData = json_decode($_COOKIE['user'], true);
$userName = $userData['name'] ?? '';

// -- Insert remarks if present
if (!empty($remarks)) {
    $sqlRemarks = "INSERT INTO inspection_completed_remarks (remarks, remarks_by, date_time, inspection_no) VALUES (?, ?, NOW(), ?)";
    $stmtRemarks = $conn->prepare($sqlRemarks);
    if (!$stmtRemarks) {
        throw new Exception('Failed to prepare remarks statement: ' . $conn->error);
    }
    $stmtRemarks->bind_param("ssi", $remarks, $userName, $inspectionNo);
    if (!$stmtRemarks->execute()) {
        throw new Exception('Failed to insert remarks: ' . $stmtRemarks->error);
    }
    $stmtRemarks->close();
}

$conn->begin_transaction();

try {
    // 0) Determine new status
    $newStatus = 'PASSED';
    if ($requestType === 'Incoming Inspection') {
        $sqlCheck = "
            SELECT status
              FROM inspection_incoming_wbs
             WHERE inspection_no = ?
        ";
        $chkStmt = $conn->prepare($sqlCheck);
        $chkStmt->bind_param("i", $inspectionNo);
        if (!$chkStmt->execute()) {
            throw new Exception('Failed to query incoming WBS statuses');
        }
        $result = $chkStmt->get_result();
        $hasFailed = false;
        while ($row = $result->fetch_assoc()) {
            $stat = strtolower($row['status']);
            if ($stat === 'failed' || $stat === 'pwf') {
                $hasFailed = true;
                break;
            }
        }
        $chkStmt->close();
        $newStatus = $hasFailed ? 'PASSED W/ FAILED' : 'PASSED';
    }

    // 1) Update inspection_request
    $sql1 = "
        UPDATE inspection_request
           SET status   = ?,
               approval = 'COMPLETION APPROVED'
         WHERE inspection_no = ?
    ";
    $stmt1 = $conn->prepare($sql1);
    $stmt1->bind_param("si", $newStatus, $inspectionNo);
    if (!$stmt1->execute()) {
        throw new Exception('Failed to update inspection_request');
    }
    $stmt1->close();

    // 2) Update inspection_completed_attachments
    $sql2 = "
        UPDATE inspection_completed_attachments
           SET acknowledged_by = ?
         WHERE inspection_no = ?
    ";
    $stmt2 = $conn->prepare($sql2);
    $stmt2->bind_param("si", $userName, $inspectionNo);
    if (!$stmt2->execute()) {
        throw new Exception('Failed to update inspection_completed_attachments');
    }
    $stmt2->close();

    // 3) Commit the DB changes
    $conn->commit();

    //
    // === EMAIL TRIGGER LOGIC ===
    //

    // A) Get the most‐recent history entry’s name
    $stmtHist = $conn->prepare("
        SELECT name
          FROM inspection_history
         WHERE inspection_no = ?
      ORDER BY history_id DESC
         LIMIT 1
    ");
    $stmtHist->bind_param("i", $inspectionNo);
    $stmtHist->execute();
    $stmtHist->bind_result($historyName);
    $stmtHist->fetch();
    $stmtHist->close();

    // B) Get the company + the five fields to include
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

    // D) Lookup initiator (requestor) email(s)
    $initiatorEmails = [];
    if (!empty($requestor)) {
        $stmtInit = $conn->prepare("
            SELECT email
              FROM system_users
             WHERE employee_name = ?
               AND email IS NOT NULL
               AND email <> ''
        ");
        if (!$stmtInit) {
            throw new Exception('Failed to prepare initiator lookup: ' . $conn->error);
        }
        $reqName = trim($requestor);
        $stmtInit->bind_param("s", $reqName);
        if (!$stmtInit->execute()) {
            throw new Exception('Failed to query initiator email: ' . $stmtInit->error);
        }
        $resInit = $stmtInit->get_result();
        while ($row = $resInit->fetch_assoc()) {
            $email = trim($row['email']);
            if (filter_var($email, FILTER_VALIDATE_EMAIL)) {
                $initiatorEmails[] = $email;
            }
        }
        $stmtInit->close();
    }

    // Normalize request detail if needed
    if ($requestDetail === 'Incoming and Outgoing Inspection') {
        $stmtType = $conn->prepare("
            SELECT type_of_inspection 
              FROM inspection_incoming_outgoing
             WHERE inspection_no = ?
             LIMIT 1
        ");
        $stmtType->bind_param("i", $inspectionNo);
        $stmtType->execute();
        $stmtType->bind_result($typeOfInspection);
        if ($stmtType->fetch()) {
            $requestDetail = ucwords($typeOfInspection) . ' Inspection';
        }
        $stmtType->close();
    } elseif ($requestDetail === 'Final & Sub-Assembly Inspection') {
        $stmtType = $conn->prepare("
            SELECT type_of_inspection 
              FROM inspection_final_sub
             WHERE inspection_no = ?
             LIMIT 1
        ");
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

    // E) NEW: find requestor's department, then all supervisor/manager emails in same department
    $deptRoleEmails = [];
    if (!empty($requestor)) {
        $reqIdentifier = trim($requestor);
        // Try to get requestor's department by either name or email
        $stmtDept = $conn->prepare("
            SELECT department
              FROM system_users
             WHERE (employee_name = ? OR email = ?)
             LIMIT 1
        ");
        if ($stmtDept) {
            $stmtDept->bind_param("ss", $reqIdentifier, $reqIdentifier);
            if ($stmtDept->execute()) {
                $stmtDept->bind_result($requestorDept);
                if ($stmtDept->fetch() && !empty($requestorDept)) {
                    $stmtDept->close();

                    // Get all supervisor/manager emails in that department
                    $stmtSupMgr = $conn->prepare("
                        SELECT email
                          FROM system_users
                         WHERE department = ?
                           AND role IN ('supervisor','manager')
                           AND email IS NOT NULL
                           AND email <> ''
                    ");
                    if ($stmtSupMgr) {
                        $stmtSupMgr->bind_param("s", $requestorDept);
                        if ($stmtSupMgr->execute()) {
                            $resSupMgr = $stmtSupMgr->get_result();
                            while ($row = $resSupMgr->fetch_assoc()) {
                                $em = trim($row['email']);
                                if (filter_var($em, FILTER_VALIDATE_EMAIL)) {
                                    $deptRoleEmails[] = $em;
                                }
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

    // C) Only if status is PASSED/PWF, last history by Sandy Vito, and company is rti or ssd
    error_log("DEBUG: newStatus=$newStatus, historyName=$historyName, company=$company");
    if (
        in_array($newStatus, ['PASSED', 'PASSED W/ FAILED'], true)
        //&& $historyName === 'Sandy Vito'
    ) {
        $companyKey = strtolower($company);

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
                'paula.caparas@motolite.com'
            ]);
            $ccRecipients = array_unique([
                'patricia.principe@motolite.com',
                'sandy.vito@motolite.com',
                'christian.andan@motolite.com',
                'kenneth.ramos@motolite.com',
                'mark.ale@motolite.com',
                'ssd.prod@motolite.com',
                'ssdprogrammer@motolite.com',
                'laser.2023@outlook.com',
                'bending2023@outlook.com',
                'ssd.materialpreparation@outlook.com',
                'ssd.assembly@outlook.com',
                'ssd.finishing@motolite.com',
                'ssd.electricalrefrigeration@outlook.com',
                'ssd.refurbishing@outlook.com',
                'ssdprocesstechnician@motolite.com'

            ]);
        } else {
            $toRecipients = [];
            $ccRecipients = [];
        }

        // Ensure requestor receives in To:
        $toRecipients = array_values(array_unique(array_merge($toRecipients, $initiatorEmails)));

        // NEW: add supervisors/managers in the requestor's department to CC
        if (!empty($deptRoleEmails)) {
            $ccRecipients = array_values(array_unique(array_merge($ccRecipients, $deptRoleEmails)));
        }

        if (!empty($toRecipients)) {
            $subject = "{$requestDetail} | Inspection No: {$inspectionNo} Completed - Status: {$newStatus}";

            // For the year in the footer, use a PHP variable
            $year = date('Y');

            $htmlBody = <<<EOD
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Inspection Completed Notification</title>
<style>
    body { margin:0; padding:0; background-color:#f4f4f4; font-family: Arial, sans-serif; color:#333; }
    .email-container { width:auto; margin:30px auto; background-color:#ffffff; border-radius:8px; overflow:hidden; box-shadow:0 2px 6px rgba(0,0,0,0.1); }
    .header { background-color:#99999950; padding:20px; text-align:center; }
    .header img { max-height:50px; }
    .content { padding:20px; }
    .content h1 { font-size:20px; margin-top:0; color:#005b96; }
    .content p { line-height:1.6; }
    .details { width:100%; border-collapse:collapse; margin:20px 0; }
    .details th, .details td { padding:12px; border:1px solid #ddd; text-align:left; }
    .details th { background-color:#f2f2f2; width:35%; }
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
        <h1>Inspection Completed</h1>
        <p>Dear Team,</p>
        <p>
            We are pleased to inform you that the inspection request below has been completed.  
            Please review the details and let us know if you have any questions.
        </p>
        <table class="details">
            <tr><th>Inspection No.</th><td>{$inspectionNo}</td></tr>
            <tr><th>Status</th><td>{$newStatus}</td></tr>
            <tr><th>WBS</th><td>{$wbs}</td></tr>
            <tr><th>Description</th><td>{$description}</td></tr>
            <tr><th>Request</th><td>{$requestDetail}</td></tr>
            <tr><th>Requestor</th><td>{$requestor}</td></tr>
        </table>
        <div class="warning-box">
            <p style="margin:0;">
                Please log-in to the portal to check. Make sure you are connected to the <strong>RGC</strong> network to continue.
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

            // Send the email
            $emailResult = sendEmailNotification($toRecipients, $subject, $htmlBody, '', $ccRecipients);

            // Optional: Log failures for debugging
            if (!empty($emailResult['failed'])) {
                error_log("Failed to send inspection completion email to: " . implode(', ', $emailResult['failed']));
            }
        }
    }

    echo json_encode([
        'success' => true,
        'message' => 'Inspection marked completed, attachments acknowledged, email sent if applicable'
    ]);
    $conn->close();
    exit;
} catch (Exception $e) {
    $conn->rollback();
    $conn->close();
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
    exit;
}
