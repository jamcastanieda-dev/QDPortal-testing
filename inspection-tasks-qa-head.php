<?php
// --- COOKIE-ONLY LOGIN: No session needed ---

// Prevent caching
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Cache-Control: post-check=0, pre-check=0', false);
header('Pragma: no-cache');
header('Expires: Thu, 01 Jan 1970 00:00:00 GMT');

// --- Cookie-based authentication check ---
if (!isset($_COOKIE['user'])) {
    header('Location: login.php');
    exit;
}
$user = json_decode($_COOKIE['user'], true);
// Check privilege
if (!$user || !isset($user['privilege']) || $user['privilege'] !== 'QA-Head-Inspection') {
    header('Location: login.php');
    exit;
}

$current_user = $user;

include __DIR__ . '/rcpa-visibility.php';

include "navigation-bar.html";
include "custom-scroll-bar.html";
include 'inspection-table.html';
include 'inspection-modal.html';
include 'inspection-modal-for-approval.html';
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
    <link href="rcpa/css/rcpa-style.css" rel="stylesheet">
    <audio id="notification-sound" src="audio/notification.mp3" preload="auto"></audio>
    <title>Tasks</title>
</head>

<body>
    <!-- Sidebar Section -->
    <nav id="sidebar">
        <ul class="sidebar-menu-list">
            <li class="not-selected">
                <a href="homepage-dashboard-qa-head.php">Dashboard</a>
            </li>
            <li class="selected">
                <a href="#">Inspection Request <i class="fa-solid fa-caret-right submenu-indicator"></i></a>
                <ul class="submenu">
                    <li class="not-selected"><a href="inspection-dashboard-qa-head.php">Dashboard</a></li>
                    <li class="not-selected"><a class="sublist-selected">Tasks</a></li>
                </ul>
            </li>
            <!--<li class="not-selected">
                <a href="#">NCR <i class="fa-solid fa-caret-right submenu-indicator"></i></a>
                <ul class="submenu">
                    <li class="not-selected"><a>Tasks</a></li>
                    <li class="not-selected"><a>Dashboard</a></li>
                </ul>
            </li>
            <li class="not-selected">
                <a href="#">MRB <i class="fa-solid fa-caret-right submenu-indicator"></i></a>
                <ul class="submenu">
                    <li class="not-selected"><a>Tasks</a></li>
                    <li class="not-selected"><a>Dashboard</a></li>
                </ul>
            </li>-->

            <li class="not-selected">
                <a href="#" class="has-badge">
                    RCPA
                    <span id="rcpa-parent-badge" class="notif-badge" hidden>0</span>
                    <i class="fa-solid fa-caret-right submenu-indicator"></i>
                </a>
                <ul class="submenu">
                    <li class="not-selected">
                        <a href="rcpa/php/rcpa-dashboard.php" class="has-badge">
                            Dashboard
                            <span id="rcpa-dashboard-badge" class="notif-badge" hidden>0</span>
                        </a>
                    </li>

                    <li class="not-selected">
                        <a href="rcpa/php/rcpa-request.php" class="has-badge">
                            Request
                            <span id="rcpa-request-badge" class="notif-badge" hidden>0</span>
                        </a>
                    </li>

                    <?php if (!empty($can_see_rcpa_approval) && $can_see_rcpa_approval): ?>
                        <li class="not-selected">
                            <a href="rcpa/php/rcpa-approval.php" class="has-badge">
                                Approval
                                <span id="rcpa-approval-badge" class="notif-badge" hidden>0</span>
                            </a>
                        </li>
                    <?php endif; ?>

                    <li class="not-selected">
                        <a href="rcpa/php/rcpa-task.php" class="has-badge">
                            Tasks
                            <span id="rcpa-task-badge" class="notif-badge" hidden>0</span>
                        </a>
                    </li>
                </ul>
            </li>

            <!-- <li class="not-selected">
                <a href="#">Request for Distribution <i class="fa-solid fa-caret-right submenu-indicator"></i></a>
                <ul class="submenu">
                    <li class="not-selected"><a>Tasks</a></li>
                    <li class="not-selected"><a>Dashboard</a></li>
                </ul>
            </li>-->
        </ul>
    </nav>

    <!-- Header with Logo and User Profile -->
    <div class="header">
        <div class="left-section">
            <div id="side-hamburger" class="side-hamburger-icon">
                <i class="fas fa-bars"></i>
            </div>
            <div class="company-logo-image">
                <img src="images/RTI-Logo.png" alt="RAMCAR LOGO" class="company-logo">
                <label class="system-title">QUALITY PORTAL</label>
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
                <span class="task-text">For Approval</span>
            </div>

            <div class="task-row" id="cancelled">
                <span class="notification-icon" id="notification-cancelled">0</span>
                <i class="fa-solid fa-ban task-icon icon-cancelled"></i><br>
                <span class="task-text">Cancelled</span>
            </div>

        </div>
    </div>

    <!-- Modal structure -->
    <div class="for-approval-modal-overlay" id="for-approval-modal">
        <div class="for-approval-modal-box">
            <div class="for-approval-modal-header">
                <h2>For Approval</h2>
                <button class="for-approval-modal-close" id="close-modal">×</button>
            </div>
            <div class="for-approval-modal-actions">
                <button id="completion-button">Completion<span id="notification-for-completion" class="approval-badge">0</span></button>
                <button id="reschedule-button">Reschedule<span id="notification-for-rescheduling" class="approval-badge">0</span></button>
                <button id="failure-button">Failed<span id="notification-for-failure" class="approval-badge">0</span></button>
            </div>
        </div>
    </div>

    <!-- Front End JS -->
    <script src="homepage.js" type="text/javascript"></script>
    <script src="logout.js" type="text/javascript"></script>
    <script src="sidebar.js" type="text/javascript"></script>

    <!-- Back End JS -->
    <script src="inspection-qa-task.js" type="text/javascript"></script>
    <script src="inspection-data-retrieve-notification.js" type="text/javascript"></script>

    <!-- RCPA notif -->
    <script src="sidebar-notif.js"></script>

    <!-- CDN JS -->
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
</body>

</html>