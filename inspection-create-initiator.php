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
if (empty($user['privilege']) || $user['privilege'] !== 'Initiator') {
    header('Location: login.php');
    exit;
}

$current_user = $user;

include __DIR__ . '/rcpa-visibility.php';

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
    <link href="rcpa-notif.css" rel="stylesheet"> <!-- RCPA ADDED -->
    <title>Inspection</title>
</head>

<body>
    <!-- Sidebar Section -->
    <nav id="sidebar">
        <ul class="sidebar-menu-list">
            <li class="not-selected">
                <a href="homepage-dashboard-initiator.php">Dashboard</a>
            </li>
            <li class="selected">
                <a>Inspection Request <i class="fa-solid fa-caret-right submenu-indicator"></i></a>
                <ul class="submenu">
                    <li class="not-selected"><a href="inspection-dashboard-initiator.php">Dashboard</a></li>
                    <li class="not-selected"><a class="sublist-selected">Request</a></li>
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

    <h2>Inspection Request</h2>
    <!-- Content Container -->
    <div class="container">
        <!-- Request Button inside the container -->
        <button class="create-button" id="openInspectionModal">Create</button>
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
            <div>
                <label for="filter-status">Status</label>
                <select id="filter-status">
                    <option value="">All</option>
                    <option>REQUESTED</option>
                    <option>PENDING</option>
                    <option>COMPLETED</option>
                    <option>PASSED</option>
                    <option>PASSED W/ FAILED</option>
                    <option>FOR RESCHEDULE</option>
                    <option>RESCHEDULED</option>
                    <option>REJECTED</option>
                    <option>FAILED</option>
                    <option>CANCELLED</option>
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
        <!-- pagination controls will go here -->
        <div class="immovable">
            <ul id="pagination" class="pagination"></ul>

            <div class="jump-to">
                Jump to:
                <div class="input-with-icon">
                    <input type="number" id="jump-page-input" min="1" placeholder="#" autocomplete="off">
                    <i class="fa-solid fa-magnifying-glass search-icon"></i>
                </div>
                page
            </div>
        </div>
    </div>


    <!-- Inspection Modal -->
    <div id="inspectionModal" class="inspection-modal">
        <!-- Inspection Request Content -->
        <div class="inspection-modal-content">
            <span class="close-btn">×</span>
            <div class="inspection-border">
                <div class="radio-container">
                    <div class="radio-column">
                        <input type="radio" id="rti" name="company" value="rti" style="width: auto;">
                        <label>RTI</label>
                    </div>
                    <div class="radio-column">
                        <input type="radio" id="ssd" name="company" value="ssd" style="width: auto;">
                        <label>SSD</label>
                    </div>
                </div>
                <label for="request-dropdown">Request:</label>
                <select id="request-dropdown" name="request-dropdown">
                    <option value="Final & Sub-Assembly Inspection">Final &amp; Sub-Assembly Inspection</option>
                    <option value="Incoming and Outgoing Inspection">Incoming &amp; Outgoing Inspection</option>
                    <option value="Dimensional Inspection">Dimensional Inspection</option>
                    <option value="Material Analysis">Material Analysis</option>
                    <option value="Calibration">Calibration</option>
                </select>
                <!-- WBS and Description Inputs -->
                <div class="input-container" id="general-wbs">
                    <div class="wbs-group">
                        <label for="wbs">WBS:</label>
                        <input type="text" id="wbs" placeholder="Enter WBS..." autocomplete="off">
                    </div>
                    <div class="description-group">
                        <label for="description">Description:</label>
                        <input type="text" id="description" name="description" placeholder="Enter description..."
                            autocomplete="off" />
                    </div>
                </div>

                <div class="incoming-input-container" id="incoming-wbs" style="display: none;">
                    <div class="icon-container">
                        <button class="plus-icon-btn" onclick="addInputRow()">+</button>
                        <button class="minus-icon-btn" onclick="removeInputRow()">-</button>
                    </div><br><br>
                    <div class="input-fields-top">
                        <div class="wbs-group">
                            <label for="doc-no-wbs">WBS:</label>
                            <input type="text" id="wbs-1" style="margin-bottom: 0;" placeholder="Enter WBS..."
                                autocomplete="off">
                        </div>
                        <div class="description-group">
                            <label for="title-description">Description:</label>
                            <input type="text" id="desc-1" style="margin-bottom: 0;" placeholder="Enter description..."
                                autocomplete="off">
                        </div>
                        <div class="qty-group">
                            <label for="quantity-incoming">Quantity:</label>
                            <input type="number" id="quantity-incoming" style="margin-bottom: 0;" placeholder="Enter Quantity">
                        </div>
                    </div>
                    <div class="additional-inputs"></div>
                </div>


                <!-- Single Column Layout for Inspection Options -->
                <div class="form-group single-column-layout">
                    <!-- Column 1: Final Inspection & Sub-Assembly -->
                    <div id="columnOne" class="column">
                        <div class="checkbox-container">
                            <div class="checkbox-group">
                                <input type="radio" id="final-inspection" name="inspection" class="custom-radio"
                                    value="final-inspection" />
                                <label for="final-inspection">Final Inspection</label>
                            </div>
                            <div class="checkbox-group">
                                <input type="radio" id="sub-assembly" name="inspection" class="custom-radio"
                                    value="sub-assembly" />
                                <label for="sub-assembly">Sub-Assembly</label>
                            </div>
                        </div>
                        <div class="vertical-options">
                            <div class="option-group">
                                <input type="radio" id="full" name="coverage" class="custom-radio" value="full" />
                                <label for="full">Full</label>
                            </div>
                            <div class="option-group">
                                <input type="radio" id="partial" name="coverage" class="custom-radio" value="partial" />
                                <label for="partial">Partial</label>
                            </div>
                            <div class="quantity-group">
                                <label for="quantity">Quantity:</label>
                                <input type="text" id="quantity" name="quantity" min="0" placeholder="Enter quantity" />
                            </div>
                            <div class="option-group testing-group">
                                <input type="radio" id="testing" name="testing" class="custom-radio" value="testing" />
                                <label for="testing" class="testing-label">Testing</label>
                            </div>
                            <div class="nested-options">
                                <div class="option-group">
                                    <input type="radio" id="internal-testing" name="type-of-testing"
                                        class="custom-radio" value="internal-testing" />
                                    <label for="internal-testing" class="nested-label">Internal Testing</label>
                                </div>
                                <div class="option-group">
                                    <input type="radio" id="rtiMQ" name="type-of-testing" class="custom-radio"
                                        value="rti-mq" />
                                    <label for="rtiMQ" class="nested-label">RTI MQ1 &amp; MQ2</label>
                                </div>
                            </div>
                            <div class="scope-group">
                                <label for="scope">Scope:</label>
                                <input type="text" id="scope" name="scope" placeholder="Enter Scope." />
                            </div>
                            <div class="scope-group">
                                <label for="location-of-item">Location of Item:</label>
                                <input type="text" id="location-of-item" name="location-of-item"
                                    placeholder="Enter Location of Item." />
                            </div>
                        </div>
                    </div>

                    <!-- Column 2: Incoming & Outgoing Inspection -->
                    <div id="columnTwo" class="column">
                        <div class="second-column">
                            <div class="incoming-inspection-group option-group">
                                <input type="radio" id="incoming-inspection" name="inspection-type" class="custom-radio"
                                    value="incoming" />
                                <label for="incoming-inspection" class="incoming-label">Incoming Inspection</label>
                            </div>
                            <div class="nested-incoming-options">
                                <div class="option-group">
                                    <input type="radio" id="raw-materials" name="incoming-options" class="custom-radio"
                                        value="raw-mats" />
                                    <label for="raw-materials" class="nested-label">Raw Materials (Steel)</label>
                                </div>
                                <div class="option-group">
                                    <input type="radio" id="fabricated-parts" name="incoming-options"
                                        class="custom-radio" value="fab-parts" />
                                    <label for="fabricated-parts" class="nested-label">Fabricated Parts / STD
                                        Parts</label>
                                </div>
                            </div>
                            <div class="outgoing-inspection-group option-group">
                                <input type="radio" id="outgoing-inspection" name="inspection-type" class="custom-radio"
                                    value="outgoing" />
                                <label for="outgoing-inspection" class="outgoing-label">Outgoing Inspection (For
                                    Subcon)</label>
                            </div>
                            <div class="nested-outgoing-options" style="display: none;">
                                <div class="option-group">
                                    <input type="radio" id="painting-inspection" name="outgoing-options"
                                        class="custom-radio" value="painting" />
                                    <label for="painting-inspection" class="painting-label">Painting</label>
                                </div>
                            </div>
                        </div>
                        <div class="details-column">
                            <div class="detail-group">
                                <label for="detail-quantity">Total Quantity:</label>
                                <input type="text" id="detail-quantity" name="detail-quantity"
                                    placeholder="Enter quantity" />
                            </div>
                            <div class="detail-group">
                                <label for="detail-scope">Scope:</label>
                                <input type="text" id="detail-scope" name="detail-scope" placeholder="Enter scope" />
                            </div>
                            <div class="detail-group">
                                <label for="vendor">Vendor:</label>
                                <input type="text" id="vendor" name="vendor" placeholder="Enter vendor" />
                            </div>
                            <div class="detail-group">
                                <label for="po">P.O. No.:</label>
                                <input type="text" id="po" name="po" placeholder="Enter P.O. No." />
                            </div>
                            <div class="detail-group">
                                <label for="dr">D.R. No.:</label>
                                <input type="text" id="dr" name="dr" placeholder="Enter D.R. No." />
                            </div>
                            <!-- Custom File Upload -->
                            <div class="detail-group file-upload-group" id="inspection-upload">
                                <label>Attachments:</label>
                                <div class="custom-file-upload">
                                    <button id="upload-file" type="button" class="upload-btn">
                                        <i class="fas fa-paperclip"></i> Upload File
                                    </button>
                                    <span class="file-name" id="file-name">No file chosen</span>
                                </div>
                            </div>

                            <!-- File Upload Modal -->
                            <div id="inspection-modal-upload" class="file-modal">
                                <div class="file-modal-content">
                                    <span class="file-close-btn">&times;</span>
                                    <h3>Upload Files</h3>
                                    <div id="inspection-drop-zone" class="drop-zone">Drag and drop files here or click
                                        to select</div>
                                    <input type="file" id="inspection-file-input" accept=".pdf,.jpg,.png" multiple
                                        style="display: none;" />
                                    <ul id="inspection-file-list"></ul>
                                    <button id="inspection-confirm-button">Confirm</button>
                                </div>
                            </div>

                            <!-- Hidden file input to hold selected files -->
                            <input type="file" id="inspection-file" name="inspection-file[]" accept=".pdf,.jpg,.png"
                                multiple style="display: none;" />
                        </div>
                        <div class="details-column">
                            <div class="detail-group">
                                <label for="incoming-location-of-item">Location of Item:</label>
                                <input type="text" id="incoming-location-of-item" name="incoming-location-of-item"
                                    placeholder="Enter Location of Item." />
                            </div>
                        </div>
                        <!-- Outgoing-only extra fields -->
                        <div id="outgoing-extra-fields" style="display:none; margin-top:.5rem;">
                            <!-- toolbar -->
                            <div class="outgoing-toolbar" style="display:flex; justify-content:flex-end; gap:.5rem; margin-bottom:.5rem;">
                                <button type="button" id="outgoing-add" class="plus-icon-btn" aria-label="Add item">+</button>
                                <button type="button" id="outgoing-remove" class="minus-icon-btn" aria-label="Remove item">−</button>
                            </div>

                            <!-- rows container -->
                            <div id="outgoing-rows">
                                <div class="outgoing-row">
                                    <div class="detail-group">
                                        <label for="outgoing-item-1">Item:</label>
                                        <input type="text" id="outgoing-item-1" name="outgoing-item[]" placeholder="Enter item" />
                                    </div>
                                    <div class="detail-group">
                                        <label for="outgoing-quantity-1">Quantity:</label>
                                        <input type="text" id="outgoing-quantity-1" name="outgoing-quantity[]" placeholder="Enter quantity" min="0" step="1" />
                                    </div>
                                </div>
                            </div>

                        </div>

                        <style>
                            /* Keep groups stacked internally and side-by-side per row */
                            #outgoing-rows .outgoing-row {
                                display: flex;
                                gap: 12px;
                                margin-bottom: 8px;
                                flex-wrap: wrap;
                                align-items: flex-start;
                            }

                            /* Stack label over input and reset text alignment */
                            #outgoing-rows .detail-group {
                                flex: 1 1 220px;
                                display: flex;
                                flex-direction: column;
                                text-align: left;
                                /* reset any parent centering */
                            }

                            #outgoing-rows .detail-group label {
                                margin-bottom: 4px;
                                text-align: left;
                                /* left-align the label text */
                                align-self: flex-start;
                                /* ignore any center alignments on the row */
                            }

                            /* Optional: ensure the input fills the width below the label */
                            #outgoing-rows .detail-group input {
                                width: 100%;
                                box-sizing: border-box;
                            }
                        </style>

                    </div>

                    <!-- Column 3: Dimensional Inspection -->
                    <div id="columnThree" class="column">
                        <div class="radio-group">
                            <input type="radio" id="dimensional-inspection" name="inspection-dimension"
                                value="dimensional" class="custom-radio" />
                            <label for="dimensional-inspection">Dimensional Inspection</label>
                        </div><br>
                        <br /><br />
                        <div class="inline-input-group">
                            <label for="notification">Notification:</label>
                            <input type="text" id="dimension-notification" name="dimension-notification"
                                placeholder="Enter Notification" />
                        </div>
                        <div class="inline-input-group">
                            <label for="part-name">Part Name:</label>
                            <input type="text" id="dimension-part-name" name="dimension-part-name"
                                placeholder="Enter Part Name" />
                        </div>
                        <div class="inline-input-group">
                            <label for="part-no">Part No.:</label>
                            <input type="text" id="dimension-part-no" name="dimension-part-no"
                                placeholder="Enter Part No." />
                        </div>
                        <div class="inline-input-group">
                            <label for="dimension-location-of-item">Location of Item:</label>
                            <input type="text" id="dimension-location-of-item" name="dimension-location-of-item"
                                placeholder="Enter Location of Item." />
                        </div>
                        <div class="inline-input-groups">
                            <label for="dimension-file" class="dimensional-custom-file-label"><i class="fa-solid fa-paperclip"></i> Attach File</label>
                            <input type="file" id="dimension-file" name="dimension-file[]" multiple hidden>
                            <ul id="dimensional-attachments-list"></ul>
                        </div>

                        <style>
                            /* Styled Label as Button */
                            .dimensional-custom-file-label {
                                display: inline-block;
                                background-color: #0350a1;
                                color: white;
                                border: 2px solid #07326a;
                                padding: 6px 12px;
                                font-size: 14px;
                                border-radius: 4px;
                                cursor: pointer;
                                transition: transform 0.3s ease, background-color 0.3s ease;
                                margin-top: 10px;
                            }

                            .dimensional-custom-file-label:hover {
                                background-color: #07326a;
                            }

                            /* File list */
                            #dimensional-attachments-list {
                                list-style: none;
                                padding-left: 0;
                                margin: 15px 0 0 0;
                            }

                            #dimensional-attachments-list li {
                                margin: 10px 0;
                                position: relative;
                            }

                            #dimensional-attachments-list li span {
                                display: block;
                                background-color: #4caf50;
                                color: white;
                                padding: 10px;
                                border-radius: 5px;
                                font-size: 16px;
                                width: 100%;
                                box-sizing: border-box;
                                overflow: hidden;
                                white-space: nowrap;
                                text-overflow: ellipsis;
                                padding-right: 35px;
                                /* give space for X */
                            }

                            /* X Button */
                            #dimensional-attachments-list .remove-btn {
                                position: absolute;
                                top: 50%;
                                right: 10px;
                                transform: translateY(-50%);
                                background: none;
                                border: none;
                                color: white;
                                font-size: 18px;
                                font-weight: bold;
                                cursor: pointer;
                                padding: 0;
                                line-height: 1;
                            }
                        </style>
                    </div>

                    <!-- Column 4: Material Analysis -->
                    <div id="columnFour" class="column">
                        <div class="radio-group">
                            <input type="radio" id="material-analysis-evaluation" name="inspection-material"
                                value="material" class="custom-radio" />
                            <label for="material-analysis-evaluation">Material Analysis / Evaluation</label>
                        </div>
                        <div class="indent">
                            <div class="radio-group">
                                <input type="radio" id="material-analysis-xrf" name="xrf" value="xrf"
                                    class="custom-radio" />
                                <label for="material-analysis-xrf">Material Analysis (XRF)</label>
                            </div><br>
                            <div class="radio-group">
                                <input type="radio" id="hardness-test" name="hardness" value="hardness"
                                    class="custom-radio" />
                                <label for="hardness-test">Hardness Test</label>
                            </div><br>

                            <div class="radio-group">
                                <input type="radio" id="allowed-grinding" name="grindingOption" value="allowed"
                                    class="custom-radio" />
                                <label for="allowed-grinding">Allowed Grinding</label>
                            </div><br>
                            <div class="radio-group">
                                <input type="radio" id="not-allowed-grinding" name="grindingOption" value="notAllowed"
                                    class="custom-radio" />
                                <label for="not-allowed-grinding">Not Allowed Grinding</label>
                            </div>

                        </div>
                        <br /><br />
                        <div class="inline-input-group">
                            <label for="notification">Notification:</label>
                            <input type="text" id="material-notification" name="material-notification"
                                placeholder="Enter Notification" />
                        </div>
                        <div class="inline-input-group">
                            <label for="part-name">Part Name:</label>
                            <input type="text" id="material-part-name" name="material-part-name"
                                placeholder="Enter Part Name" />
                        </div>
                        <div class="inline-input-group">
                            <label for="part-no">Part No.:</label>
                            <input type="text" id="material-part-no" name="material-part-no"
                                placeholder="Enter Part No." />
                        </div>
                        <div class="inline-input-group">
                            <label for="material-location-of-item">Location of Item:</label>
                            <input type="text" id="material-location-of-item" name="material-location-of-item"
                                placeholder="Enter Location of Item." />
                        </div>
                        <div class="inline-input-groups">
                            <label for="material-analysis-file" class="material-analysis-custom-file-label"><i class="fa-solid fa-paperclip"></i> Attach File</label>
                            <input type="file" id="material-analysis-file" name="material-analysis-file[]" multiple hidden>
                            <ul id="material-analysis-attachments-list"></ul>
                        </div>

                        <style>
                            /* Styled Label as Button */
                            .material-analysis-custom-file-label {
                                display: inline-block;
                                background-color: #0350a1;
                                color: white;
                                border: 2px solid #07326a;
                                padding: 6px 12px;
                                font-size: 14px;
                                border-radius: 4px;
                                cursor: pointer;
                                transition: transform 0.3s ease, background-color 0.3s ease;
                                margin-top: 10px;
                            }

                            .material-analysis-custom-file-label:hover {
                                background-color: #07326a;
                            }

                            /* File list */
                            #material-analysis-attachments-list {
                                list-style: none;
                                padding-left: 0;
                                margin: 15px 0 0 0;
                            }

                            #material-analysis-attachments-list li {
                                margin: 10px 0;
                                position: relative;
                            }

                            #material-analysis-attachments-list li span {
                                display: block;
                                background-color: #4caf50;
                                color: white;
                                padding: 10px;
                                border-radius: 5px;
                                font-size: 16px;
                                width: 100%;
                                box-sizing: border-box;
                                overflow: hidden;
                                white-space: nowrap;
                                text-overflow: ellipsis;
                                padding-right: 35px;
                                /* give space for X */
                            }

                            /* X Button */
                            #material-analysis-attachments-list .remove-btn {
                                position: absolute;
                                top: 50%;
                                right: 10px;
                                transform: translateY(-50%);
                                background: none;
                                border: none;
                                color: white;
                                font-size: 18px;
                                font-weight: bold;
                                cursor: pointer;
                                padding: 0;
                                line-height: 1;
                            }
                        </style>
                    </div>

                    <!-- Column 5: Empty Column -->
                    <div id="columnFive" class="column">
                        <div class="inline-input-group">
                            <label for="equipment-no">Equipment No.:</label>
                            <input type="text" id="equipment-no" name="equipment-no"
                                placeholder="Enter Equipment No." />
                        </div>
                        <div class="inline-input-group">
                            <label for="calibration-location-of-item">Location of Item:</label>
                            <input type="text" id="calibration-location-of-item" name="calibration-location-of-item"
                                placeholder="Enter Location of Item." />
                        </div>
                    </div>
                </div>

                <!-- Remarks Section -->
                <div class="form-group textarea-group remarks-content">
                    <label for="remarks">Remarks:</label>
                    <textarea id="remarks" name="remarks" placeholder="Enter additional information..."></textarea>
                </div>

                <!-- Footer Section -->
                <div class="align-footer">
                    <div class="left-footer">
                        <div class="form-group requestor-container">
                            <label for="requestor">Requestor:</label>
                            <input type="text" id="requestor" name="requestor"
                                value="<?php echo htmlspecialchars($current_user['name']); ?>" readonly />
                        </div>
                        <div class="form-group datetime-container">
                            <label for="date" style="margin-bottom: 12px;">Date/Time:</label>
                            <input type="text" id="current-time" readonly>
                        </div>
                    </div>
                    <div class="form-group submit-button-container">
                        <button id="submit-btn" class="btn-submit" type="submit">Submit</button>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- View Inspection Modal -->
    <div id="viewInspectionModal" class="inspection-modal">
        <div class="inspection-modal-content">
            <span id="view-close-button" class="close-btn">×</span>
            <div class="inspection-border">
                <div class="radio-container">
                    <div class="radio-column">
                        <input type="radio" id="view-rti" name="view-company" value="rti" style="width: auto;" disabled>
                        <label>RTI</label>
                    </div>
                    <div class="radio-column">
                        <input type="radio" id="view-ssd" name="view-company" value="ssd" style="width: auto;" disabled>
                        <label>SSD</label>
                    </div>
                </div>
                <label for="view-request-dropdown">Request:</label>
                <select id="view-request-dropdown" name="view-request-dropdown" disabled>
                    <option value="Final & Sub-Assembly Inspection">Final & Sub-Assembly Inspection</option>
                    <option value="Incoming and Outgoing Inspection">Incoming & Outgoing Inspection</option>
                    <option value="Dimensional Inspection">Dimensional Inspection</option>
                    <option value="Material Analysis">Material Analysis</option>
                    <option value="Calibration">Calibration</option>
                </select>
                <!-- WBS and Description Inputs -->
                <div class="input-container" id="view-wbs-section">
                    <div class="form-group wbs-group" id="view-wbs-group">
                        <label for="view-wbs">WBS:</label>
                        <input type="text" id="view-wbs" name="view-wbs" />
                    </div>
                    <div class="form-group description-group">
                        <label for="view-description">Description:</label>
                        <input type="text" id="view-description" name="view-description" />
                    </div>
                </div>

                <div class="incoming-input-container" id="view-incoming-wbs">
                    <div class="icon-container" id="for-rejected">
                        <button class="plus-icon-btn" onclick="addViewInputRow()">+</button>
                        <button class="minus-icon-btn" onclick="removeViewInputRow()">-</button>
                    </div>
                    <div class="input-fields-top">
                        <div class="wbs-group">
                            <label for="doc-no-wbs">WBS:</label>
                        </div>
                        <div class="description-group">
                            <label for="title-description">Description:</label>
                        </div>
                        <div class="wbs-quantity-group">
                            <label for="wbs-quantity">Quantity:</label>
                        </div>
                    </div>
                    <div class="additional-inputs" id="view-additional-input"></div>
                </div>

                <!-- Single Column Layout for Inspection Options -->
                <div class="form-group single-column-layout">
                    <!-- Column 1: Final Inspection & Sub-Assembly -->
                    <div id="view-columnOne" class="column">
                        <div class="checkbox-container">
                            <div class="checkbox-group">
                                <input type="radio" id="view-final-inspection" name="view-inspection"
                                    class="custom-radio" value="final-inspection" />
                                <label for="view-final-inspection">Final Inspection</label>
                            </div>
                            <div class="checkbox-group">
                                <input type="radio" id="view-sub-assembly" name="view-inspection" class="custom-radio"
                                    value="sub-assembly" />
                                <label for="view-sub-assembly">Sub-Assembly</label>
                            </div>
                        </div>
                        <div class="vertical-options">
                            <div class="option-group">
                                <input type="radio" id="view-full" name="view-coverage" class="custom-radio"
                                    value="full" />
                                <label for="view-full">Full</label>
                            </div>
                            <div class="option-group">
                                <input type="radio" id="view-partial" name="view-coverage" class="custom-radio"
                                    value="partial" />
                                <label for="view-partial">Partial</label>
                            </div>
                            <div class="quantity-group">
                                <label for="view-quantity">Quantity:</label>
                                <input type="text" id="view-quantity" name="view-quantity" />
                            </div>
                            <div class="option-group testing-group">
                                <input type="radio" id="view-testing" name="view-testing" class="custom-radio"
                                    value="testing" />
                                <label for="view-testing" class="testing-label">Testing</label>
                            </div>
                            <div class="nested-options">
                                <div class="option-group">
                                    <input type="radio" id="view-internal-testing" name="view-type-of-testing"
                                        class="custom-radio" value="internal-testing" />
                                    <label for="view-internal-testing" class="nested-label">Internal Testing</label>
                                </div>
                                <div class="option-group">
                                    <input type="radio" id="view-rtiMQ" name="view-type-of-testing" class="custom-radio"
                                        value="rti-mq" />
                                    <label for="view-rtiMQ" class="nested-label">RTI MQ1 & MQ2</label>
                                </div>
                            </div>
                            <div class="scope-group">
                                <label for="view-scope">Scope:</label>
                                <input type="text" id="view-scope" name="view-scope" />
                            </div>
                            <div class="scope-group">
                                <label for="view-location-of-item">Location of Item:</label>
                                <input type="text" id="view-location-of-item" name="view-location-of-item" />
                            </div>
                        </div>
                    </div>

                    <!-- Column 2: Incoming & Outgoing Inspection -->
                    <div id="view-columnTwo" class="column">
                        <div class="second-column">
                            <div class="incoming-inspection-group option-group">
                                <input type="radio" id="view-incoming-inspection" name="view-inspection-type"
                                    class="custom-radio" value="incoming" />
                                <label for="view-incoming-inspection" class="incoming-label">Incoming Inspection</label>
                            </div>
                            <div class="nested-incoming-options">
                                <div class="option-group">
                                    <input type="radio" id="view-raw-materials" name="view-incoming-options"
                                        class="custom-radio" value="raw-mats" />
                                    <label for="view-raw-materials" class="nested-label">Raw Materials (Steel)</label>
                                </div>
                                <div class="option-group">
                                    <input type="radio" id="view-fabricated-parts" name="view-incoming-options"
                                        class="custom-radio" value="fab-parts" />
                                    <label for="view-fabricated-parts" class="nested-label">Fabricated Parts / STD
                                        Parts</label>
                                </div>
                            </div>
                            <div class="outgoing-inspection-group option-group">
                                <input type="radio" id="view-outgoing-inspection" name="view-inspection-type"
                                    class="custom-radio" value="outgoing" />
                                <label for="view-outgoing-inspection" class="outgoing-label">Outgoing Inspection (For
                                    Subcon)</label>
                            </div>
                            <div class="nested-outgoing-options">
                                <div class="option-group">
                                    <input type="radio" id="view-painting-inspection" name="view-outgoing-options"
                                        class="custom-radio" value="painting" />
                                    <label for="view-painting-inspection" class="painting-label">Painting</label>
                                </div>
                            </div>
                        </div>
                        <div class="details-column">
                            <div class="detail-group">
                                <label for="view-detail-quantity">Total Quantity:</label>
                                <input type="text" id="view-detail-quantity" name="view-detail-quantity" />
                            </div>
                            <div class="detail-group">
                                <label for="view-detail-scope">Scope:</label>
                                <input type="text" id="view-detail-scope" name="view-detail-scope" />
                            </div>
                            <div class="detail-group">
                                <label for="view-vendor">Vendor:</label>
                                <input type="text" id="view-vendor" name="view-vendor" />
                            </div>
                            <div class="detail-group">
                                <label for="view-po">P.O. No.:</label>
                                <input type="text" id="view-po" name="view-po" />
                            </div>
                            <div class="detail-group">
                                <label for="view-dr">D.R. No.:</label>
                                <input type="text" id="view-dr" name="view-dr" />
                            </div>

                            <!-- Custom File Upload -->
                            <div class="detail-group file-upload-group" id="view-inspection-upload">
                                <label>Attachments:</label>
                                <div class="custom-file-upload">
                                    <button id="view-upload-file" type="button" class="upload-btn">
                                        <i class="fas fa-paperclip"></i> Upload File
                                    </button>
                                    <span class="file-name" id="view-file-name">No file chosen</span>
                                </div>
                            </div>

                            <!-- File Upload Modal -->
                            <div id="view-inspection-modal-upload" class="file-modal">
                                <div class="file-modal-content">
                                    <span class="file-close-btn">&times;</span>
                                    <h3>Upload Files</h3>
                                    <div id="view-inspection-drop-zone" class="drop-zone">Drag and drop files here or
                                        click to select</div>
                                    <input type="file" id="view-inspection-file-input" accept=".pdf,.jpg,.png" multiple
                                        style="display: none;" />
                                    <ul id="view-inspection-file-list"></ul>
                                    <button id="view-inspection-confirm-button">Confirm</button>
                                </div>
                            </div>

                            <!-- Hidden file input to hold selected files -->
                            <input type="file" id="view-inspection-file" name="view-inspection-file[]"
                                accept=".pdf,.jpg,.png" multiple style="display: none;" />

                            <div id="inspection-view-attachments">
                                <!-- File upload section omitted for simplicity; display attachment link if applicable -->
                                <div id="inspection-attachments" class="modal-container">
                                    <label class="medium-label" for="inspection-file"
                                        id="view-attachments-label">Attachments:</label>
                                    <div id="view_attachments">
                                        <!-- Attachments will be shown here -->
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="details-column">
                            <div class="detail-group">
                                <label for="view-incoming-location-of-item">Location of Item:</label>
                                <input type="text" id="view-incoming-location-of-item"
                                    name="view-incoming-location-of-item" />
                            </div>
                        </div>

                        <div id="view-outgoing-extra-fields" style="display:none; margin-top:.5rem;">

                            <!-- rows container -->
                            <div id="view-outgoing-rows">
                                <div class="outgoing-row">
                                    <div class="detail-group">
                                        <label for="view-outgoing-item-1">Item:</label>
                                        <input type="text" id="view-outgoing-item-1" name="outgoing-item[]" placeholder="Enter item" />
                                    </div>
                                    <div class="detail-group">
                                        <label for="view-outgoing-quantity-1">Quantity:</label>
                                        <input type="text" id="view-outgoing-quantity-1" name="outgoing-quantity[]" placeholder="Enter quantity" min="0" step="1" />
                                    </div>
                                </div>
                            </div>


                            <style>
                                /* Keep groups stacked internally and side-by-side per row */
                                #view-outgoing-rows .outgoing-row {
                                    display: flex;
                                    gap: 12px;
                                    margin-bottom: 8px;
                                    flex-wrap: wrap;
                                    align-items: flex-start;
                                }

                                /* Stack label over input and reset text alignment */
                                #view-outgoing-rows .detail-group {
                                    flex: 1 1 220px;
                                    display: flex;
                                    flex-direction: column;
                                    text-align: left;
                                    /* reset any parent centering */
                                }

                                #view-outgoing-rows .detail-group label {
                                    margin-bottom: 4px;
                                    text-align: left;
                                    /* left-align the label text */
                                    align-self: flex-start;
                                    /* ignore any center alignments on the row */
                                }

                                /* Optional: ensure the input fills the width below the label */
                                #view-outgoing-rows .detail-group input {
                                    width: 100%;
                                    box-sizing: border-box;
                                }
                            </style>
                        </div>


                    </div>

                    <!-- Column 3: Dimensional -->
                    <div id="view-columnThree" class="column">
                        <div class="radio-group">
                            <input type="radio" id="view-dimensional-inspection" name="view-inspection-dimension"
                                value="dimensional" class="custom-radio" />
                            <label for="view-dimensional-inspection">Dimensional Inspection</label>
                        </div><br>
                        <br /><br />
                        <div class="inline-input-group">
                            <label for="view-notification">Notification:</label>
                            <input type="text" id="view-dimension-notification" name="view-notification" />
                        </div>
                        <div class="inline-input-group">
                            <label for="view-part-name">Part Name:</label>
                            <input type="text" id="view-dimension-part-name" name="view-part-name" />
                        </div>
                        <div class="inline-input-group">
                            <label for="view-part-no">Part No.:</label>
                            <input type="text" id="view-dimension-part-no" name="view-part-no" />
                        </div>
                        <div class="inline-input-group">
                            <label for="view-dimension-location-of-item">Location of Item:</label>
                            <input type="text" id="view-dimension-location-of-item"
                                name="view-dimension-location-of-item" />
                        </div>
                        <div class="inline-input-group">
                            <label for="view-dimensional-attachments-list">Dimensional Attachment:</label>
                            <ul id="view-dimensional-attachments-list"></ul>
                        </div>

                        <style>
                            #view-dimensional-attachments-list {
                                margin-top: 20px;
                                padding-left: 0;
                                list-style: none;
                                border: 1px solid #e0e0e0;
                                color: white;
                                border-radius: 8px;
                                background: #4caf50;
                                min-height: 40px;
                                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.03);
                            }

                            #view-dimensional-attachments-list:hover {
                                opacity: 80%;
                            }

                            #view-dimensional-attachments-list li {
                                padding: 10px 16px;
                                border-bottom: 1px solid #e0e0e0;
                                color: white;
                                font-size: 15px;
                                display: flex;
                                align-items: center;
                                transition: background 0.2s;
                            }

                            #view-dimensional-attachments-list li:last-child {
                                border-bottom: none;
                            }

                            #view-dimensional-attachments-list li a {
                                color: #1976d2;
                                text-decoration: none;
                                color: white;
                                font-weight: 500;
                                transition: color 0.15s;
                                word-break: break-all;
                            }

                            #view-dimensional-attachments-list li a:hover {
                                color: #0d47a1;
                                text-decoration: underline;
                            }

                            #view-dimensional-attachments-list li:only-child {
                                text-align: center;
                                color: white;
                                font-style: italic;
                                font-size: 14px;
                            }
                        </style>
                    </div>



                    <!-- Column 5: Material Analysis -->
                    <div id="view-columnFour" class="column">
                        <div class="radio-group">
                            <input type="radio" id="view-material-analysis-evaluation" name="view-inspection-material"
                                value="material" class="custom-radio" />
                            <label for="view-material-analysis-evaluation">Material Analysis / Evaluation</label>
                        </div>
                        <div class="indent">
                            <div class="radio-group">
                                <input type="radio" id="view-xrf" name="view-xrf" value="xrf" class="custom-radio" />
                                <label for="view-material-analysis-xrf">Material Analysis (XRF)</label>
                            </div><br>
                            <div class="radio-group">
                                <input type="radio" id="view-hardness" name="view-hardness" value="hardness"
                                    class="custom-radio" />
                                <label for="view-hardness-test">Hardness Test</label>
                            </div><br>
                            <div class="radio-group">
                                <input type="radio" id="view-allowed-grinding" name="view-grindingOption"
                                    value="allowed" class="custom-radio" />
                                <label for="view-allowed-grinding">Allowed Grinding</label>
                            </div><br>
                            <div class="radio-group">
                                <input type="radio" id="view-not-allowed-grinding" name="view-grindingOption"
                                    value="notAllowed" class="custom-radio" />
                                <label for="view-not-allowed-grinding">Not Allowed Grinding</label>
                            </div>
                        </div>
                        <br /><br />
                        <div class="inline-input-group">
                            <label for="view-notification">Notification:</label>
                            <input type="text" id="view-material-notification" name="view-material-notification" />
                        </div>
                        <div class="inline-input-group">
                            <label for="view-part-name">Part Name:</label>
                            <input type="text" id="view-material-part-name" name="view-part-name" />
                        </div>
                        <div class="inline-input-group">
                            <label for="view-part-no">Part No.:</label>
                            <input type="text" id="view-material-part-no" name="view-part-no" />
                        </div>
                        <div class="inline-input-group">
                            <label for="view-material-location-of-item">Location of Item:</label>
                            <input type="text" id="view-material-location-of-item"
                                name="view-material-location-of-item" />
                        </div>
                        <div class="inline-input-group">
                            <label for="view-material-attachments-list">Material Analysis Attachment:</label>
                            <ul id="view-material-attachments-list"></ul>
                        </div>

                        <style>
                            #view-material-attachments-list {
                                margin-top: 20px;
                                padding-left: 0;
                                list-style: none;
                                border: 1px solid #e0e0e0;
                                color: white;
                                border-radius: 8px;
                                background: #4caf50;
                                min-height: 40px;
                                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.03);
                            }

                            #view-material-attachments-list:hover {
                                opacity: 80%;
                            }

                            #view-material-attachments-list li {
                                padding: 10px 16px;
                                border-bottom: 1px solid #e0e0e0;
                                color: white;
                                font-size: 15px;
                                display: flex;
                                align-items: center;
                                transition: background 0.2s;
                            }

                            #view-material-attachments-list li:last-child {
                                border-bottom: none;
                            }

                            #view-material-attachments-list li a {
                                color: #1976d2;
                                text-decoration: none;
                                color: white;
                                font-weight: 500;
                                transition: color 0.15s;
                                word-break: break-all;
                            }

                            #view-material-attachments-list li a:hover {
                                color: #0d47a1;
                                text-decoration: underline;
                            }

                            #view-material-attachments-list li:only-child {
                                text-align: center;
                                color: white;
                                font-style: italic;
                                font-size: 14px;
                            }
                        </style>
                    </div>

                    <!-- Column 4: Calibration -->
                    <div id="view-columnFive" class="column">
                        <div class="inline-input-group">
                            <label for="view-equipment-no">Equipment No.:</label>
                            <input type="text" id="view-equipment-no" name="view-equipment-no" />
                        </div>
                        <div class="inline-input-group">
                            <label for="view-calibration-location-of-item">Location of Item:</label>
                            <input type="text" id="view-calibration-location-of-item"
                                name="view-calibration-location-of-item" />
                        </div>
                    </div>

                </div>

                <!-- Remarks Section -->
                <div class="form-group textarea-group remarks-content">
                    <label for="view-remarks">Remarks:</label>
                    <textarea id="view-remarks" name="view-remarks"></textarea>
                </div>

                <!-- Completion Remarks -->
                <div id="request-completed" class="form-group textarea-group remarks-content" style="display: none;">
                    <label for="view-completed-remarks">Completion Remarks:</label>
                    <textarea id="view-completed-remarks" name="view-completed-remarks"></textarea>
                </div>

                <!-- Rejection Remarks -->
                <div id="request-rejected" style="display: none;">
                    <label for="request-rejected-remarks">Rejection Remarks:</label>
                    <textarea name="" id="request-rejected-remarks"></textarea>
                </div>

                <div id="rejected-attachments-section" class="form-group remarks-content" style="display: none;">
                    <label style="font-weight: bold;">Rejection Remarks Attachments:</label>
                    <ul id="rejected-attachments-list"></ul>
                </div>

                <style>
                    #rejected-attachments-list {
                        list-style: none;
                        padding-left: 0;
                        margin: 0;
                    }

                    #rejected-attachments-list li {
                        margin: 10px 0;
                    }

                    #rejected-attachments-list li a {
                        display: inline-block;
                        padding: 10px;
                        background-color: #4caf50;
                        color: white;
                        text-decoration: none;
                        border-radius: 5px;
                        font-size: 16px;
                        transition: background-color 0.3s;
                        width: 95%;
                        box-sizing: border-box;
                    }

                    #rejected-attachments-list li a:hover {
                        background-color: #43a047;
                        /* slightly darker green */
                    }
                </style>

                <!-- Footer Section -->
                <div class="align-footer">
                    <div class="left-footer">
                        <div class="form-group requestor-container">
                            <label for="view-requestor">Requestor:</label>
                            <input type="text" id="view-requestor" name="view-requestor" readonly />
                        </div>
                        <div class="form-group datetime-container">
                            <label for="view-current-time" style="margin-bottom: 12px;">Date/Time:</label>
                            <input type="text" id="view-current-time" readonly />
                        </div>
                    </div>
                    <!-- Submit button container removed -->
                </div>

                <div id="view-passed-failed-file" style="display: none;">
                    <label for="passed-failed-attachments">PASSED W/ FAILED Attachments</label>
                    <ul id="passed-failed-attachments"></ul>
                </div>

                <style>
                    #passed-failed-attachments {
                        list-style: none;
                        padding-left: 0;
                        margin: 0;
                    }

                    #passed-failed-attachments li {
                        margin: 18px 0;
                        border-radius: 12px;
                        background: #f5f5f5;
                        box-shadow: 0 2px 8px rgba(60, 80, 110, 0.07);
                        transition: box-shadow 0.2s;
                        position: relative;
                    }

                    #passed-failed-attachments li:hover {
                        box-shadow: 0 4px 18px rgba(60, 80, 110, 0.16);
                    }

                    #passed-failed-attachments li a {
                        display: inline-block;
                        padding: 10px 15px;
                        background-color: #388e3c;
                        color: white;
                        text-decoration: none;
                        border-radius: 6px;
                        font-size: 16px;
                        font-weight: bold;
                        transition: background-color 0.3s;
                        margin-bottom: 9px;
                        width: 100%;
                        box-sizing: border-box;
                    }

                    #passed-failed-attachments li a:hover {
                        background-color: #256029;
                    }

                    .attachment-info {
                        margin-top: 10px;
                        font-size: 15px;
                        color: #333;
                        padding-left: 5px;
                        letter-spacing: 0.01em;
                        /* Optional: more spacing */
                    }

                    .attachment-info strong {
                        color: #4caf50;
                        font-weight: 600;
                    }
                </style>

                <!-- Rejected Section -->
                <div id="rejected-section" class="form-group textarea-group remarks-content" style="display: none;">
                    <label for="view-reject">Remarks For Rejection</label><br>
                    <label id="view-rejected-by">Rejected By:</label>
                    <textarea id="view-reject" name="view-reject" readonly></textarea>
                </div>

                <!-- Reschedule Modal -->
                <?php include 'inspection-modal-reschedule.php' ?>

                <div id="remarks-section" class="modal-container">
                    <h3>Remarks For Reschedule</h3>
                    <table class="remarks-table" style="width:100%; border-collapse: collapse;">
                        <thead>
                            <tr>
                                <th style="border: 1px solid #ccc; padding: 8px;">Remarks By</th>
                                <th style="border: 1px solid #ccc; padding: 8px;">Date & Time</th>
                                <th style="border: 1px solid #ccc; padding: 8px;">Action</th>
                            </tr>
                        </thead>
                        <tbody id="remarks-tbody">
                        </tbody>
                    </table>
                </div><br>

                <div id="reschedule-section" class="modal-container">
                    <h3>Rescheduled by Requestor</h3>
                    <table class="remarks-table" style="width:100%; border-collapse: collapse;">
                        <thead>
                            <tr>
                                <th style="border: 1px solid #ccc; padding: 8px;">Rescheduled By</th>
                                <th style="border: 1px solid #ccc; padding: 8px;">Date & Time</th>
                            </tr>
                        </thead>
                        <tbody id="reschedule-tbody">
                        </tbody>
                    </table>
                </div><br>

                <div id="reschedule-request">
                    <div>
                        <label>Please select a date to reschedule:</label>
                        <input type="date" id="reschedule-date">
                    </div>
                    <button class="reschedule-button" id="reschedule-button"><i
                            class="fa-regular fa-clock icon-clock"></i>Reschedule</button><br><br>
                </div>
                <!-- Only show this if status is COMPLETED -->
                <div id="inspection-completed-attachments" class="modal-container">
                    <label class="medium-label">Attachments For Completion:</label><br>
                    <div class="two-column-completed">
                        <div class="field">
                            <label id="completed-by">Completed By:</label>
                        </div>
                        <div class="field">
                            <label id="acknowledged-by">Acknowledged By:</label>
                        </div>
                    </div>
                    <div class="completed-group">
                        <label class="document-no-label">Document No:</label>
                        <input type="text" id="completed-document-no" name="document-no" readonly>
                    </div>
                    <div id="view_completed-attachments">
                        <!-- Attachments will be shown here -->
                    </div>
                </div>
                <!-- Only show this if status is FAILED -->
                <div id="inspection-rejected-attachments" class="modal-container">
                    <label class="medium-label">Attachments For Failure:</label>
                    <label id="failed-by">Failed By:</label>
                    <div class="completed-group">
                        <label class="document-no-label">Document No:</label>
                        <input type="text" id="rejected-document-no" name="document-no" readonly>
                    </div>
                    <div id="view_rejected-attachments">
                        <!-- Attachments will be shown here -->
                    </div>
                </div>

                <div id="resubmit-section">
                    <div class="button-container">
                        <button class="btn-submit" id="cancel-button">Cancel</button>
                        <button class="btn-submit" id="resubmit-button">Resubmit</button>
                    </div>
                </div>
            </div>
        </div>
    </div>


    <!-- History Table Modal -->
    <?php include 'inspection-modal-history.php' ?>

    <!-- Front End JS -->
    <script src="current-date-time.js" type="text/javascript"></script>
    <script src="homepage.js" type="text/javascript"></script>
    <script src="inspection-css.js?v=4" type="text/javascript"></script>
    <script src="logout.js" type="text/javascript"></script>
    <script src="pagination.js" type="text/javascript"></script>
    <script src="sidebar.js" type="text/javascript"></script>

    <!-- Back End JS -->
    <script src="inspection-filter-table.js" type="text/javascript"></script>
    <script src="inspection-populate-elements.js?v=3.1" type="text/javascript"></script>
    <script src="inspection-data-retrieve.js?v=7.3" type="text/javascript"></script>
    <script src="inspection-data-retrive-history-dashboard.js" type="text/javascript"></script>
    <script src="inspection-data-retrieve-reject.js" type="text/javascript"></script>
    <script src="inspection-data-retrieve-remarks.js" type="text/javascript"></script>
    <script src="inspection-data-insert.js?v=9" type="text/javascript"></script>
    <script src="inspection-data-insert-history.js" type="text/javascript"></script>
    <script src="inspection-data-insert-rejected.js" type="text/javascript"></script>
    <script src="inspection-data-insert-rescheduled.js" type="text/javascript"></script>

    <!-- RCPA notif -->
    <script src="sidebar-notif.js"></script>

    <!-- CDN JS -->
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
</body>

</html>