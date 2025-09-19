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
if (
    empty($user['privilege']) ||
    (
        $user['privilege'] !== 'QA-Respondent' &&
        $user['privilege'] !== 'QA-Head-Inspection'
    )
) {
    header('Location: login.php');
    exit;
}

$current_user = $user;

include __DIR__ . '/rcpa-visibility.php';

include "navigation-bar.html";
include "custom-scroll-bar.html";
include 'inspection-history.html';
include 'inspection-modal.html';
include 'inspection-pending.html';
include 'inspection-table.html';
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
    <link href="rcpa-notif.css" rel="stylesheet"> <!-- RCPA ADDED -->
    <title>Pending</title>
</head>

<body>
    <!-- Sidebar Section -->
    <nav id="sidebar">
        <ul class="sidebar-menu-list">
            <li class="not-selected">
                <a href="inspection-homepage-dashboard-qa.php">Dashboard</a>
            </li>
            <li class="selected">
                <a href="#">Inspection Request <i class="fa-solid fa-caret-right submenu-indicator"></i></a>
                <ul class="submenu">
                    <li class="not-selected"><a href="inspection-dashboard-qa.php">Dashboard</a></li>
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
            <!--<li class="not-selected">
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

    <h2>Inspection Request</h2>
    <!-- Content Container -->
    <div class="container">
        <a href="inspection-tasks-qa.php" class="back-button"><i class="fa-solid fa-right-from-bracket fa-flip-horizontal"></i> Back</i></a>
        <!-- Filters -->
        <div class="inspection-filters">
            <div>
                <label for="filter-wbs">WBS</label>
                <input type="text" id="filter-wbs" placeholder="Search WBS…">
            </div>
            <div>
                <label for="filter-request">Request</label>
                <select id="filter-request">
                    <option value="">All</option>
                    <option>Final Inspection</option>
                    <option>Sub-Assembly Inspection</option>
                    <option>Incoming Inspection</option>
                    <option>Outgoing Inspection</option>
                    <option>Material Analysis</option>
                    <option>Dimensional Inspection</option>
                    <option>Calibration</option>
                </select>
            </div>
        </div>
        <!-- Scrollable Table -->
        <div class="inspection-container">
            <table class="inspection-table">
                <thead>
                    <tr>
                        <th>Inspection No.</th>
                        <th>WBS</th>
                        <th>Description</th>
                        <th>Request</th>
                        <th>Requestor</th>
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
        <div id="action-container" class="action-container hidden">
            <button class="action-btn view-btn" id="view-button">View</button>
            <button class="action-btn view-btn" id="completed-button">Pass</button>
            <button class="action-btn view-btn" id="reject-button">Fail</button>
            <button class="action-btn view-btn" id="reschedule-button">Reschedule</button>

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

    <!-- Complete Upload Modal -->
    <div id="complete-modal" class="complete-file-modal">
        <div class="modal-content">
            <span class="complete-close-btn" id="complete-main-close">&times;</span>
            <h3>Attachments For Completion</h3>
            <div class="detail-group file-upload-group" id="complete-inspection-upload">
                <label>Attachments:</label>
                <div class="custom-file-upload">
                    <button id="complete-upload-file" type="button" class="upload-btn">
                        <i class="fas fa-paperclip"></i> Upload File
                    </button>
                    <span class="file-name" id="complete-file-name">No file chosen</span>
                </div>
            </div>
            <div class="detail-group">
                <label>Document No:</label>
                <input type="text" id="complete-document-no" name="complete-document-no" autocomplete="off">
            </div>
            <div id="incoming-wbs-section">
                <label class="wbs-left">WBS:</label>
                <div class="two-col">
                    <button type="button" class="pass">Pass</button>
                    <button type="button" class="fail">Fail</button>
                    <button type="button" class="pwf">Pass w/ Fail</button>
                </div>
                <div id="wbs-list">
                </div>
            </div><br><br>
            <button id="inspection-complete-button">Complete Request</button>
            <!-- Hidden file input to hold selected files -->
            <input type="file" id="complete-inspection-file" name="complete-inspection-file[]" accept=".pdf,.doc,.docx,.jpg,.png" multiple style="display: none;" />
        </div>
    </div>

    <!-- Secondary Modal: Drop Zone for selecting files -->
    <div id="inspection-complete-modal-upload" class="file-modal">
        <div class="file-modal-content">
            <span class="file-close-btn">&times;</span>
            <h3>Upload Files</h3>
            <div id="inspection-complete-drop-zone" class="drop-zone">Drag and drop files here or click to select</div>
            <input type="file" id="inspection-complete-file-input" accept=".pdf,.doc,.docx,.jpg,.png" multiple style="display: none;" />
            <ul id="inspection-complete-file-list"></ul>
            <button id="inspection-complete-confirm-button">Confirm</button>
        </div>
    </div>

    <!-- Reject Upload Modal -->
    <div id="reject-modal" class="reject-file-modal">
        <div class="modal-content">
            <span class="complete-close-btn" id="reject-main-close">&times;</span>
            <h3>Attachments For Failed</h3>
            <div class="detail-group file-upload-group" id="reject-inspection-upload">
                <label>Attachments:</label>
                <div class="custom-file-upload">
                    <button id="reject-upload-file" type="button" class="upload-btn">
                        <i class="fas fa-paperclip"></i> Upload File
                    </button>
                    <span class="file-name" id="reject-file-name">No file chosen</span>
                </div>
            </div>
            <div class="detail-group">
                <label>Document No:</label>
                <input type="text" id="reject-document-no" name="document-no">
            </div>
            <h3>Remarks For Failed</h3>
            <textarea id="reject-remarks" name="reject-remarks" rows="4" style="width:100%; resize: none;"></textarea>
            <button id="inspection-reject-button">Fail Request</button>
            <!-- Hidden file input to hold selected files -->
            <input type="file" id="reject-inspection-file" name="reject-inspection-file[]" accept=".pdf,.doc,.docx,.jpg,.png" multiple style="display: none;" />
        </div>
    </div>

    <!-- Secondary Modal: Drop Zone for selecting files -->
    <div id="inspection-reject-modal-upload" class="file-modal">
        <div class="file-modal-content">
            <span class="file-close-btn">&times;</span>
            <h3>Upload Files</h3>
            <div id="inspection-reject-drop-zone" class="drop-zone">Drag and drop files here or click to select</div>
            <input type="file" id="inspection-reject-file-input" accept=".pdf,.doc,.docx,.jpg,.png" multiple style="display: none;" />
            <ul id="inspection-reject-file-list"></ul>
            <button id="inspection-reject-confirm-button">Confirm</button>
        </div>
    </div>

    <!-- Remarks Modal -->
    <?php include 'inspection-modal-remarks.php' ?>

    <!-- Rschedule Remarks Modal -->
    <?php include 'inspection-modal-reschedule.php' ?>

    <!-- History Table Modal -->
    <?php include 'inspection-modal-history.php' ?>

    <!-- Front End JS -->
    <script src="current-date-time.js" type="text/javascript"></script>
    <script src="homepage.js" type="text/javascript"></script>
    <script src="logout.js" type="text/javascript"></script>
    <script src="inspection-modal-remarks.js" type="text/javascript"></script>
    <script src="inspection-upload-pending.js" type="text/javascript"></script>
    <script src="pagination.js?v=2" type="text/javascript"></script>
    <script src="sidebar.js" type="text/javascript"></script>

    <!-- Back End JS -->
    <script src="inspection-update-status.js?v=3" type="text/javascript"></script>
    <script src="inspection-filter-table-pending.js" type="text/javascript"></script>
    <script src="inspection-populate-elements.js?v=3.1" type="text/javascript"></script>
    <script src="inspection-qa-task-pending.js?v=9" type="text/javascript"></script>
    <script src="inspection-data-retrieve-history.js" type="text/javascript"></script>
    <script src="inspection-data-retrieve-remarks.js" type="text/javascript"></script>
    <script src="inspection-data-insert-history.js" type="text/javascript"></script>

    <!-- RCPA notif -->
    <script src="sidebar-notif.js"></script>
    <!-- CDN JS -->
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
</body>

</html>