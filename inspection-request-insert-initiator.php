<?php
session_start();
include 'connection.php';
include 'send-email.php';

// 1) Tell the client to expect JSON
header('Content-Type: application/json');

// 2) Only accept POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode([
        'status'  => 'error',
        'message' => 'Invalid request method.'
    ]);
    exit;
}

// 3) Read the skipEmail flag
$skipEmail = isset($_POST['skipEmail']) && $_POST['skipEmail'] === '1';

// 4) Collect & validate input
$employee_name = '';
if (isset($_COOKIE['user'])) {
    $user = json_decode($_COOKIE['user'], true);
    $employee_name = $user['name'] ?? '';
}


if (isset($_POST['inspection-type']) && $_POST['inspection-type'] === 'incoming') {
    $wbs         = trim($_POST['wbs-1']    ?? '');
    $description = trim($_POST['desc-1']   ?? '');
} else {
    $wbs         = trim($_POST['wbs']      ?? 'N/A');
    $description = trim($_POST['description'] ?? '');
}

$company   = trim($_POST['company']      ?? '');
$request   = trim($_POST['request']      ?? '');
$remarks   = trim($_POST['remarks']      ?? '');
$requestor = trim($_POST['requestor']    ?? '');
$date_time = trim($_POST['current-time'] ?? '');
$status    = 'REQUESTED';
$approval  = 'NONE';

// ── Paint-shortcut override ────────────────────────────────────────────────
if (
    isset($_POST['inspection-type'], $_POST['outgoing-options'])
    && $_POST['inspection-type'] === 'outgoing'
    && $_POST['outgoing-options']  === 'painting'
) {
    $status  = 'COMPLETED';
    $request = 'Incoming and Outgoing Inspection';
    $approval = 'COMPLETION APPROVED';
}
// ──────────────────────────────────────────────────────────────────────────

// If not Calibration, require these fields
if ($request !== 'Calibration') {
    if (empty($wbs) || empty($description) || empty($request) || empty($remarks)) {
        echo json_encode([
            'status'  => 'error',
            'message' => 'All fields are required.'
        ]);
        exit;
    }
}

// 5) Insert into the database
$stmt = $conn->prepare("
    INSERT INTO inspection_request
      (company, wbs, description, request, status, remarks, requestor, date_time, approval)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
");
$stmt->bind_param(
    'sssssssss',
    $company,
    $wbs,
    $description,
    $request,
    $status,
    $remarks,
    $requestor,
    $date_time,
    $approval
);

if (! $stmt->execute()) {
    echo json_encode([
        'status'  => 'error',
        'message' => 'Database error: ' . $stmt->error
    ]);
    $stmt->close();
    $conn->close();
    exit;
}

// Grab the new inspection number
$inspection_no = $conn->insert_id;

$stmt->close();
$conn->close();

// 6) Send the email (unless skipEmail was set)
if (! $skipEmail) {
    $recipientEmail = 'mode.tester.101@gmail.com';
    if (! empty($recipientEmail)) {
        $subject = "Inspection Request: Inspection No. $inspection_no";
        $body    = "
            <style>
                /* your existing email CSS here */
            </style>
            <div class='container'>
                <p>Hello,</p>
                <p>You have received a new inspection request.</p>
                <table class='inspection-table'>
                    <thead>
                        <tr>
                            <th>Inspection No.</th>
                            <th>WBS</th>
                            <th>Description</th>
                            <th>Request</th>
                            <th>Requestor</th>
                            <th>Date of Request</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>$inspection_no</td>
                            <td>$wbs</td>
                            <td>$description</td>
                            <td>$request</td>
                            <td>$requestor</td>
                            <td>$date_time</td>
                        </tr>
                    </tbody>
                </table>
                <p>Please log in to the QD Portal to see the new inspection request.</p>
                <div class='two-column'>
                    <p>Click the provided link:</p>
                    <a href='http://172.31.11.252//QDPortal/inspection-section-received.php'>
                        Inspection Request – Received
                    </a>
                </div>
            </div>
        ";
        try {
            sendEmailNotification($recipientEmail, $subject, $body);
        } catch (Exception $e) {
            error_log("Email failed for inspection $inspection_no: " . $e->getMessage());
        }
    } else {
        error_log("No recipient email for inspection $inspection_no");
    }
}

// 7) Finally, return success
echo json_encode([
    'status'  => 'success',
    'message' => 'Inspection request submitted successfully!',
    'data'    => [
        'inspection_no' => $inspection_no,
        'company'       => $company,
        'wbs'           => $wbs,
        'description'   => $description,
        'request'       => $request,
        'status'        => $status,
        'remarks'       => $remarks,
        'requestor'     => $requestor,
        'date_time'     => $date_time,
        'approval'      => $approval
    ]
]);
exit;
