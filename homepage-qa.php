<?php
// --- COOKIE-ONLY LOGIN: No session needed ---

// Prevent caching
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Cache-Control: post-check=0, pre-check=0', false);
header('Pragma: no-cache');
header('Expires: Thu, 01 Jan 1970 00:00:00 GMT');

// Check if user is logged in
if (!isset($_COOKIE['user'])) {
    header('Location: login.php');
    exit;
}
$user = json_decode($_COOKIE['user'], true);

// Check privilege
if (empty($user['privilege']) || $user['privilege'] !== 'QA-Respondent') {
    header('Location: login.php');
    exit;
}

$current_user = $user;

include "navigation-bar.html";
include "custom-scroll-bar.html";
include 'inspection-table.html';
include 'inspection-modal.html';
include 'inspection-sidebar.html';
include 'custom-elements.html';
date_default_timezone_set('Asia/Manila');
?>
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link href="style-inspection.css" rel="stylesheet">
    <link href="style-inspection-homepage.css" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css" rel="stylesheet">
    <title>Inspection Request</title>
</head>

<body>
    <!-- Sidebar Section -->
    <nav id="sidebar">
        <div>
            <!-- Homepage Button Link -->
            <p class="home-selected">RAMCAR TECHNOLOGY INC.</p>
        </div>
        <!-- Footer with Profile Picture and Logout -->
        <div class="sidebar-footer">
            <div class="logout-section">
                <a href="logout.php" class="logout-link" id="logoutLink">LOGOUT</a>
            </div>
        </div>
    </nav>

    <!-- Main Content Section -->
    <div class="main-content">
        <!-- Header with Logo and User Profile -->
        <div class="header">
            <div class="company-logo-image">
                <img src="images/RTI-Logo.png" alt="RAMCAR LOGO" class="company-logo">
                <label class="system-title">QUALITY PORTAL V1.0</label>
            </div>
            <div class="user-profile-section">
                <div class="profile">
                    <p class="greetings">Good Day, <?php echo htmlspecialchars($current_user['name']); ?></p>
                    <p id="date-time" class="date-time"><?php echo date('F d, Y g:i A'); ?></p>
                </div>
                <div class="profile-image">
                    <i class="fa-solid fa-user user-icon"></i>
                </div>
            </div>
        </div>

        <div class="module-container">
            <label class="module-label">Tasks</label>
            <div class="short-indentation">
                <div class="task-row" id="received">
                    <button class="task-icon icon-requested">
                        <i class="fa-solid fa-inbox"></i>
                    </button>
                    <button class="task-button">
                        Received
                    </button>
                </div><br>
                <div class="task-row" id="pending">
                    <button class="task-icon icon-pending">
                        <i class="fa-solid fa-hourglass-half" id="sand-time"></i>
                    </button>
                    <button class="task-button">
                        Pending
                    </button>
                </div><br>
                <div class="task-row" id="for-reschedule">
                    <button class="task-icon icon-for-reschedule">
                        <i class="fa-solid fa-rotate"></i>
                    </button>
                    <button class="task-button">
                        For Reschedule
                    </button>
                </div><br>
                <div class="task-row" id="rescheduled">
                    <button class="task-icon icon-rescheduled">
                        <div class="clock-wrapper">
                            <div class="clock-hand hand-fast"></div>
                            <div class="clock-hand hand-slow"></div>
                        </div>
                    </button>
                    <button class="task-button">
                        Rescheduled
                    </button>
                </div><br>
                <div class="task-row" id="completed">
                    <button class="task-icon icon-completed">
                        <i class="fa-solid fa-circle-check"></i>
                    </button>
                    <button class="task-button">
                        Completed
                    </button>
                </div><br>
            </div>
        </div>

    </div>

    <script src="homepage.js" type="text/javascript"></script>
    <script src="homepage-qa-task.js" type="text/javascript"></script>
    <script src="logout.js" type="text/javascript"></script>
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
</body>

</html>