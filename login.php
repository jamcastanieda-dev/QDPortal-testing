<?php

require_once 'connection.php';

// Get all departments for the select dropdown
$sql = "SELECT DISTINCT department FROM system_users ORDER BY department";
$result = $conn->query($sql);

$departments = [];
if ($result) {
    while ($row = $result->fetch_assoc()) {
        $departments[] = $row['department'];
    }
}

// ---- COOKIE-BASED LOGIN REDIRECT ----
if (!empty($_COOKIE['user'])) {
    $user = json_decode($_COOKIE['user'], true);
    switch ($user['privilege'] ?? '') {
        case 'Department Head':
            $loc = 'homepage-dashboard-department-head.php';
            break;
        case 'Initiator':
            $loc = 'homepage-dashboard-initiator.php';
            break;
        case 'QA-Respondent':
            $loc = 'homepage-dashboard-qa.php';
            break;
        case 'QA-Head-Inspection':
            $loc = 'homepage-dashboard-qa-head.php';
            break;
        case 'PPIC-Inspection':
            $loc = 'homepage-inspection-ppic.php';
            break;
        case 'QMS':
            $loc = 'homepage-dashboard-qms.php';
            break;
        case 'Manager':
            $loc = 'homepage-ppic-manager.php';
            break;
        case 'QA Head':
            $loc = 'homepage-qa-head.php';
            break;
        case 'Job-Order Taker':
            $loc = 'homepage-ppic-job-order-taker.php';
            break;
        case 'PMO Staff':
            $loc = 'homepage-ppic-pmo-staff.php';
            break;
        case 'Reservation Staff':
            $loc = 'homepage-ppic-reservation-staff.php';
            break;
        default:
            $loc = 'homepage-dashboard-initiator.php';
            break;
    }
    header("Location: $loc");
    exit;
}

// Prevent caching for the login page
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Cache-Control: post-check=0, pre-check=0', false);
header('Pragma: no-cache');
header('Expires: Thu, 01 Jan 1970 00:00:00 GMT');
?>
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login</title>
    <link rel="stylesheet" href="style-login.css">
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
</head>

<body>
    <div class="page-layout">
        <div class="login-container">
            <div class="two-column-layout">
                <div class="company-logo-image">
                    <img src="images/RTI-Login.png" alt="RAMCAR LOGO" class="company-logo">
                </div>
                <div class="system-label">
                    <h2>Quality Portal</h2>
                </div>
            </div>
            <div class="header">
                <h2 class="system-title">Welcome! Ready to get started?</h2>
            </div>
            <div class="input-group">
                <label for="employee-id">Employee ID:</label>
                <input type="text" id="employee-id" name="employee-id" autocomplete="off">
            </div>
            <div class="input-group">
                <label for="password">Password:</label>
                <input type="password" id="password" name="password" autocomplete="off">
            </div>

            <div class="input-group" id="fullname-group" style="display: none;">
                <label for="full-name">Full Name:</label>
                <input type="text" id="full-name" name="full-name" placeholder="Juan Dela Cruz" autocomplete="off" required>
            </div>

            <div class="input-group" id="department-group" style="display: none;">
                <label for="department">Department:</label>
                <select name="department" id="department" required>
                    <option value="">— Select department —</option>
                    <?php foreach ($departments as $dept): ?>
                        <option value="<?php echo htmlspecialchars($dept); ?>">
                            <?php echo htmlspecialchars($dept); ?>
                        </option>
                    <?php endforeach; ?>
                </select>
            </div>

            <button class="login-button" id="login"><span>Login</span></button>
            <p class="toggle-register">
                Don't have an account?
                <a href="#" id="toggle-register">Register here!</a>
            </p>

            <p class="toggle-login" style="display: none;">
                Already have an account?
                <a href="#" id="toggle-login">Log-in here!</a>
            </p>
        </div>
        <div class="info-panel">
            <div class="floating-circles">
                <div class="floating-circle circle1"></div>
                <div class="floating-circle circle2"></div>
                <div class="floating-circle circle3"></div>
                <div class="floating-circle circle4"></div>
            </div>
            <div class="overlay">
                <img src="images/RTI-White-1.png" alt="Welcome Image" class="welcome-img">
                <h2 class="info-label">RAMCAR TECHNOLOGY INC.</h2>
            </div>
        </div>
    </div>
    <script src="login-data-retrieve.js" type="text/javascript"></script>
</body>
</html>
