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
if (empty($user['privilege']) || $user['privilege'] !== 'Department Head') {
    header('Location: login.php');
    exit;
}

$current_user = $user;

include "navigation-bar.html";
include "custom-scroll-bar.html";
include 'inspection-history.html';
include 'inspection-table.html';
include 'inspection-modal.html';
include 'custom-elements.html';
include 'remarks-modal.html';
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
    <title>Home</title>
</head>

<body>
    <!-- Sidebar Section -->
    <nav id="sidebar">
        <ul class="sidebar-menu-list">
            <li class="selected">
                <a>Dashboard</a>
            </li>
            <li class="not-selected">
                <a href="#">Inspection Request <i class="fa-solid fa-caret-right submenu-indicator"></i></a>
                <ul class="submenu">
                    <li class="not-selected"><a href="inspection-create-department-head.php">Request</a></li>
                    <li class="not-selected"><a href="inspection-dashboard-department-head.php">Dashboard</a></li>
                </ul>
            </li>
            <!--<li class="not-selected">
                <a href="#">NCR <i class="fa-solid fa-caret-right submenu-indicator"></i></a>
                <ul class="submenu">
                    <li class="not-selected"><a href="ncr-create-department-head.php">Request</a></li>
                    <li class="not-selected"><a href="ncr-tasks-department-head.php">Tasks</a></li>
                    <li class="not-selected"><a>Dashboard</a></li>
                </ul>
            </li>
            <li class="not-selected">
                <a href="#">MRB <i class="fa-solid fa-caret-right submenu-indicator"></i></a>
                <ul class="submenu">
                    <li class="not-selected"><a>Tasks</a></li>
                    <li class="not-selected"><a>Dashboard</a></li>
                </ul>
            </li>
            <li class="not-selected">
                <a href="#">RCPA <i class="fa-solid fa-caret-right submenu-indicator"></i></a>
                <ul class="submenu">
                    <li class="not-selected"><a>Request</a></li>
                    <li class="not-selected"><a>Dashboard</a></li>
                </ul>
            </li>
            <li class="not-selected">
                <a href="#">Request for Distribution <i class="fa-solid fa-caret-right submenu-indicator"></i></a>
                <ul class="submenu">
                    <li class="not-selected"><a>Request</a></li>
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

    <h2>Dashboard <span class="arrow">></span><span class="home-label"> Home</span></h2>
    <!-- Content Container -->
    <div class="container">

    </div>
    <script src="homepage.js" type="text/javascript"></script>
    <script src="logout.js" type="text/javascript"></script>
    <script src="sidebar.js" type="text/javascript"></script>
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
</body>

</html>