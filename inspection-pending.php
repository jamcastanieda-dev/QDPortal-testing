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
    <title>Inspection Request</title>
</head>

<body>
    <!-- Sidebar Section -->
    <nav id="sidebar">
        <div class="homepage-header">
            <a href="homepage-qa.php">
                <p>RAMCAR TECHNOLOGY INC.</p>
            </a>
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
    </div>

    <h2>Inspection Request</h2>
    <!-- Content Container -->
    <div class="container">
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
                    </tr>
                </thead>
                <tbody id="inspection-tbody">
                    <!-- Data will be displayed here using AJAX -->
                </tbody>
            </table>
        </div>
        <div id="action-container" class="action-container hidden">
            <button class="action-btn view-btn" id="view-button">View</button>
            <button class="action-btn view-btn" id="completed-button">Complete</button>
            <button class="action-btn view-btn" id="reschedule-button">Reschedule</button>
        </div>
    </div>

    <!-- View Inspection Request Modal -->
    <?php include 'inspection-view-modal.php' ?>

    <!-- Outer Modal: Contains the file upload group -->
    <div id="complete-modal" class="complete-file-modal">
        <div class="modal-content">
            <span class="complete-close-btn" id="complete-main-close">&times;</span>
            <h3>Attachments For Completion</h3>
            <div class="detail-group file-upload-group" id="inspection-upload">
                <label>Attachments:</label>
                <div class="custom-file-upload">
                    <button id="upload-file" type="button" class="upload-btn">
                        <i class="fas fa-paperclip"></i> Upload File
                    </button>
                    <span class="file-name" id="file-name">No file chosen</span>
                </div>
            </div><br>
            <button id="inspection-complete-button">Complete Request</button>
            <!-- Hidden file input to hold selected files -->
            <input type="file" id="inspection-file" name="inspection-file[]" accept=".pdf,.doc,.docx,.jpg,.png" multiple style="display: none;" />
        </div>
    </div>

    <!-- Secondary Modal: Drop Zone for selecting files -->
    <div id="inspection-modal-upload" class="file-modal">
        <div class="file-modal-content">
            <span class="file-close-btn">&times;</span>
            <h3>Upload Files</h3>
            <div id="inspection-drop-zone" class="drop-zone">Drag and drop files here or click to select</div>
            <input type="file" id="inspection-file-input" accept=".pdf,.doc,.docx,.jpg,.png" multiple style="display: none;" />
            <ul id="inspection-file-list"></ul>
            <button id="inspection-confirm-button">Confirm</button>
        </div>
    </div>

    <!-- Remarks Modal -->
    <?php include 'remarks-modal.php' ?>

    <!-- Rschedule Remarks Modal -->
    <?php include 'reschedule-modal.php' ?>

    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
    <script src="inspection-populate-elements.js?v=3.1" type="text/javascript"></script>
    <script src="inspection-qa-data-pending.js" type="text/javascript"></script>
    <script src="inspection-remarks-data-retrieve.js" type="text/javascript"></script>
    <script src="inspection-remarks-modal.js" type="text/javascript"></script>
    <script src="inspection-update-status.js?v=3" type="text/javascript"></script>
    <script src="homepage.js" type="text/javascript"></script>
    <script src="logout.js" type="text/javascript"></script>
</body>

</html>