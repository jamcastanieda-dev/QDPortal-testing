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
if (empty($user['privilege']) || $user['privilege'] !== 'QA-Head-Inspection') {
    header('Location: login.php');
    exit;
}

// You can now use $user or assign:
$current_user = $user;

include "navigation-bar.html";
include "custom-scroll-bar.html";
include 'inspection-table.html';
include 'inspection-modal.html';
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
    <audio id="notification-sound" src="audio/notification.mp3" preload="auto"></audio>
    <title>Home</title>
</head>

<body>
    <!-- Sidebar Section -->
    <nav id="sidebar">
        <!-- Footer Home Icon -->
        <div class="sidebar-footer">
            <a><i class="fa-solid fa-house home-selected"></i></a>
        </div>
    </nav>

    <!-- Header with Logo and User Profile -->
    <div class="header">
        <div class="left-section">
            <div id="side-hamburger" class="side-hamburger-icon">
                <i class="fas fa-bars"></i>
            </div>
            <div class="company-logo-image">
                <img src="images/RTI-Logo.png" alt="RAMCAR LOGO" class="company-logo">
                <label class="system-title">QUALITY PORTAL V1.1.3</label>
            </div>
        </div>
        <div class="user-profile-section">
           <div class="profile">
                <p class="greetings">Good Day, <?php echo htmlspecialchars($current_user['name']); ?></p>
                <p id="date-time" class="date-time"><?php echo date('F d, Y g:i A'); ?></p>
            </div>
            <div class="profile-image">
                <i class="fa-solid fa-user user-icon"></i>
                <a href="logout.php" class="logout-button" id="logoutButton">Logout</a>
            </div>
        </div>
    </div>

    <div class="module-container">
        <label class="module-label">Tasks</label>
        <div class="short-indentation">
            <!-- Row 1 -->
            <div class="task-row" id="received">
                <span class="notification-icon" id="notification-received">0</span>
                <i class="fa-solid fa-inbox task-icon icon-received"></i><br>
                <span class="task-text">Received</span>
            </div>

            <div class="task-row" id="pending">
                <span class="notification-icon" id="notification-pending">0</span>
                <i class="fa-solid fa-hourglass-half task-icon icon-pending"></i><br>
                <span class="task-text">Pending</span>
            </div>

            <div class="task-row" id="for-reschedule">
                <span class="notification-icon" id="notification-for-reschedule">0</span>
                <i class="fa-solid fa-rotate task-icon icon-for-reschedule"></i><br>
                <span class="task-text">For Reschedule</span>
            </div>

            <!-- Row 2 -->
            <div class="task-row" id="rescheduled">
                <span class="notification-icon" id="notification-rescheduled">0</span>
                <i class="fa-solid fa-clock task-icon icon-rescheduled"></i><br>
                <span class="task-text">Rescheduled</span>
            </div>

            <div class="task-row" id="completed">
                <span class="notification-icon" id="notification-completed">0</span>
                <i class="fa-solid fa-circle-check task-icon icon-completed"></i><br>
                <span class="task-text">Completed</span>
            </div>

            <div class="task-row" id="rejected">
                <span class="notification-icon" id="notification-rejected">0</span>
                <i class="fa-solid fa-circle-xmark fa-bounce task-icon icon-rejected"></i><br>
                <span class="task-text">Rejected</span>
            </div>

            <!-- Row 3 -->
            <div class="task-row" id="failed">
                <span class="notification-icon" id="notification-failed">0</span>
                <i class="fa-solid fa-circle-exclamation task-icon icon-failed"></i><br>
                <span class="task-text">Failed</span>
            </div>

            <div class="task-row" id="for-approval">
                <span class="notification-icon" id="notification-for-approval">0</span>
                <i class="fa-solid fa-check-to-slot task-icon icon-for-approval"></i><br>
                <span class="task-text">Cancelled</span>
            </div>

            <div class="task-row" id="cancelled">
                <span class="notification-icon" id="notification-cancelled">0</span>
                <i class="fa-solid fa-ban task-icon icon-cancelled"></i><br>
                <span class="task-text">Cancelled</span>
            </div>

        </div>
    </div>

    <script src="homepage.js" type="text/javascript"></script>
    <script src="homepage-qa-task.js" type="text/javascript"></script>
    <script src="inspection-data-retrieve-notification.js" type="text/javascript"></script>
    <script src="logout.js" type="text/javascript"></script>
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
</body>

</html>