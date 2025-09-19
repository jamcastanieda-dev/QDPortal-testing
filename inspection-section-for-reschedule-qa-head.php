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

$current_user = $user;

include "navigation-bar.html";
include "custom-scroll-bar.html";
include 'inspection-history.html';
include 'inspection-table.html';
include 'inspection-modal.html';
include 'custom-elements.html';
include 'inspection-tasks.html';
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
    <title>For Reschedule</title>
</head>

<body>
    <!-- Sidebar Section -->
    <nav id="sidebar">
        <!-- Footer Home Icon -->
        <div class="sidebar-footer">
            <a href="homepage-inspection-qa-head.php"><i class="fa-solid fa-house home-icon"></i></a>
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

    <h2>Inspection Request</h2>
    <!-- Content Container -->
    <div class="container-for-approval">
        <!-- Scrollable Table -->
        <div class="inspection-container">
            <table class="inspection-table">
                <thead>
                    <tr>
                        <th>Inspection No.</th>
                        <th>WBS</th>
                        <th>Description</th>
                        <th>Request</th>
                        <th>Date of Request</th>
                        <th>Status</th>
                        <th>Action</th>
                        <th>History</th>
                    </tr>
                </thead>
                <tbody id="inspection-tbody">
                    <!-- Data will be displayed here using AJAX -->
                </tbody>
            </table>
        </div>
        <!-- pagination controls will go here -->
        <div class="immovable">
            <ul id="pagination" class="pagination"></ul>

            <div class="jump-to">
                Jump to:
                <div class="input-with-icon">
                    <input
                        type="number"
                        id="jump-page-input"
                        min="1"
                        placeholder="#"
                        autocomplete="off">
                    <i class="fa-solid fa-magnifying-glass search-icon"></i>
                </div>
                page
            </div>
        </div>
    </div>

    <!-- View Inspection Request Modal -->
    <?php include 'inspection-modal-view.php' ?>

    <!-- Reschedule Modal -->
    <?php include 'inspection-modal-reschedule.php' ?>

    <!-- History Table Modal -->
    <?php include 'inspection-modal-history.php' ?>

    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
    <script src="homepage.js" type="text/javascript"></script>
    <script src="inspection-data-retrieve-history.js" type="text/javascript"></script>
    <script src="inspection-populate-elements.js?v=3.1" type="text/javascript"></script>
    <script src="inspection-qa-data-for-reschedule.js?v=2" type="text/javascript"></script>
    <script src="inspection-remarks-data-retrieve.js" type="text/javascript"></script>
    <script src="logout.js" type="text/javascript"></script>
    <script src="pagination.js?v=2" type="text/javascript"></script>
</body>

</html>