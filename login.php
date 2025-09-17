<?php
//login.php
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

<style>
    .input-with-icon {
        position: relative;
    }

    .input-with-icon input[type="password"],
    .input-with-icon input[type="text"] {
        padding-right: 44px;
    }

    .input-with-icon .toggle-visibility {
        position: absolute;
        right: 10px;
        top: 50%;
        transform: translateY(-50%);
        border: 0;
        background: transparent;
        padding: 6px;
        cursor: pointer;
        color: #555;
    }

    .input-with-icon .toggle-visibility:focus {
        outline: 2px solid #6aa9ff;
        border-radius: 6px;
    }

    /* --- Allow page to scroll when content overflows --- */
    html,
    body {
        /* let the page grow and scroll vertically */
        min-height: 90vh;
        overflow-y: auto;
    }
</style>

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
                <div class="input-with-icon">
                    <input type="password" id="password" name="password" autocomplete="off">
                    <button type="button" class="toggle-visibility" data-target="password" aria-label="Show password">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                            <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2" />
                        </svg>
                    </button>
                </div>
            </div>

            <div class="input-group" id="confirm-group" style="display:none;">
                <label for="confirm-password">Confirm Password:</label>
                <div class="input-with-icon">
                    <input type="password" id="confirm-password" name="confirm-password" autocomplete="off">
                    <button type="button" class="toggle-visibility" data-target="confirm-password" aria-label="Show password">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                            <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2" />
                        </svg>
                    </button>
                </div>
            </div>

            <div class="input-group" id="fullname-group" style="display: none;">
                <label for="full-name">Full Name:</label>
                <input type="text" id="full-name" name="full-name" placeholder="Juan Dela Cruz" autocomplete="off" required>
            </div>

            <!-- Email (only visible in Register mode) -->
            <div class="input-group" id="email-group" style="display: none;">
                <label for="email">Email:</label>
                <input
                    type="email"
                    id="email"
                    name="email"
                    placeholder="name@company.com"
                    autocomplete="email"
                    required>
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

            <!-- Section (shown when department has sections; options injected by JS) -->
            <div class="input-group" id="section-group" style="display:none;">
                <label for="section">Section:</label>
                <select name="section" id="section">
                    <option value="">— Select section —</option>
                    <!-- options injected by JS -->
                </select>
            </div>

            <!-- Role (always visible in Register mode) -->
            <div class="input-group" id="role-group" style="display:none;">
                <label for="role">Role:</label>
                <select name="role" id="role">
                    <option value="">— Select role —</option>
                    <option value="Manager">Manager</option>
                    <option value="Supervisor">Supervisor</option>
                    <option value="Regular">Regular</option>
                    <option value="Probi">Probi</option>
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
    <script src="login-data-retrieve.js?v=1.4" type="text/javascript"></script>
</body>

</html>
