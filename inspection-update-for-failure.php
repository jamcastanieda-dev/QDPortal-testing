<?php
include 'connection.php';
require __DIR__ . '/send-email.php';

header('Content-Type: application/json');

// Check if the inspection_no is provided via POST request
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['inspection-no'])) {
    $inspectionNo = (int) $_POST['inspection-no'];

    // Prepare the SQL query to update the status to 'FAILED'
    $sqlUpdate = "UPDATE inspection_request SET status = 'FAILED', approval = 'FAILED' WHERE inspection_no = ?";

    if ($stmt = $conn->prepare($sqlUpdate)) {
        $stmt->bind_param("i", $inspectionNo);

        if ($stmt->execute()) {
            // Now insert into inspection_failed_notification table
            $sqlInsert = "INSERT INTO inspection_failed_notification (inspection_no) VALUES (?)";
            if ($insertStmt = $conn->prepare($sqlInsert)) {
                $insertStmt->bind_param("i", $inspectionNo);
                if ($insertStmt->execute()) {
                    // === EMAIL TRIGGER LOGIC (FAILED) ===

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

                    // Normalize/derive request detail if needed (reuse your existing rules)
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

                    // Lookup initiator (requestor) emails
                    $initiatorEmails = [];
                    if (!empty($requestor)) {
                        // 1) primary: find by employee name in system_users
                        $stmtInit = $conn->prepare("
                            SELECT email
                              FROM system_users
                             WHERE employee_name = ?
                               AND email IS NOT NULL
                               AND email <> ''
                        ");
                        if ($stmtInit) {
                            $reqName = trim($requestor);
                            $stmtInit->bind_param("s", $reqName);
                            if ($stmtInit->execute()) {
                                $resInit = $stmtInit->get_result();
                                while ($row = $resInit->fetch_assoc()) {
                                    $email = trim($row['email']);
                                    if (filter_var($email, FILTER_VALIDATE_EMAIL)) {
                                        $initiatorEmails[] = $email;
                                    }
                                }
                            }
                            $stmtInit->close();
                        }

                        // 2) fallback: if the `requestor` field itself is an email, include it
                        if (filter_var($requestor, FILTER_VALIDATE_EMAIL)) {
                            $initiatorEmails[] = $requestor;
                        }
                    }

                    // NEW: pull supervisors/managers from the same department as the requestor
                    $deptRoleEmails = [];
                    if (!empty($requestor)) {
                        $reqIdentifier = trim($requestor);
                        // Find requestor's department (match by name or email)
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

                                    // Fetch supervisor/manager emails in that department
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

                    // Build recipients based on company (rti/ssd)
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
                    }

                    // Ensure requestor receives the email (TO)
                    $toRecipients = array_values(array_unique(array_merge($toRecipients, $initiatorEmails)));

                    // Add same-department supervisors/managers to CC
                    if (!empty($deptRoleEmails)) {
                        $ccRecipients = array_values(array_unique(array_merge($ccRecipients, $deptRoleEmails)));
                    }

                    // Make sure CC does not duplicate TO
                    $ccRecipients = array_values(array_diff($ccRecipients, $toRecipients));

                    if (!empty($toRecipients)) {
                        // Subject per your request:
                        $newStatus = 'FAILED';
                        $subject = "{$requestDetail} | Inspection No: {$inspectionNo} Failed - Status: {$newStatus}";

                        $year = date('Y');

                        $htmlBody = <<<EOD
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Inspection Failed Notification</title>
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
        <h1>Inspection Failed</h1>
        <p>Dear Team,</p>
        <p>
            Please be informed that the inspection request below has been updated with status <strong>FAILED</strong>.
            Kindly review the details and take the necessary actions.
        </p>
        <table class="details">
            <tr><th>Inspection No.</th><td>{$inspectionNo}</td></tr>
            <tr><th>Status</th><td>FAILED</td></tr>
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

                        // Send the email
                        $emailResult = sendEmailNotification($toRecipients, $subject, $htmlBody, '', $ccRecipients);

                        if (!empty($emailResult['failed'])) {
                            error_log("Failed to send inspection FAILED email to: " . implode(', ', $emailResult['failed']));
                        }
                    }

                    echo json_encode(['success' => true, 'message' => 'Status updated, notification inserted, email sent if applicable']);
                } else {
                    echo json_encode(['success' => false, 'message' => 'Status updated but notification NOT inserted']);
                }
                $insertStmt->close();
            } else {
                echo json_encode(['success' => false, 'message' => 'Status updated but failed to prepare notification insert']);
            }
        } else {
            echo json_encode(['success' => false, 'message' => 'Failed to update status']);
        }
        $stmt->close();
    } else {
        echo json_encode(['success' => false, 'message' => 'Failed to prepare SQL statement']);
    }
    $conn->close();
} else {
    echo json_encode(['success' => false, 'message' => 'Invalid request']);
}
