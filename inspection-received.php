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
            <button class="action-btn view-btn" id="accept-button">Accept</button>
            <button class="action-btn view-btn" id="reschedule-button">Reschedule</button>
        </div>
    </div>

    <!-- View Inspection Modal -->
    <div id="viewInspectionModal" class="inspection-modal">
        <div class="inspection-modal-content">
            <span id="view-close-button" class="close-btn">×</span>
            <div class="inspection-border">
                <label for="view-request-dropdown">Request:</label>
                <select id="view-request-dropdown" name="view-request-dropdown" disabled>
                    <option value="Final & Sub-Assembly Inspection">Final & Sub-Assembly Inspection</option>
                    <option value="Incoming and Outgoing Inspection">Incoming & Outgoing Inspection</option>
                    <option value="Dimensional Inspection">Dimensional Inspection</option>
                    <option value="Material Analysis">Material Analysis</option>
                    <option value="Calibration">Calibration</option>
                </select>
                <!-- WBS and Description Inputs -->
                <div class="input-container">
                    <div class="form-group wbs-group" id="view-wbs-group">
                        <label for="view-wbs">WBS:</label>
                        <input type="text" id="view-wbs" name="view-wbs" readonly />
                    </div>
                    <div class="form-group description-group">
                        <label for="view-description">Description:</label>
                        <input type="text" id="view-description" name="view-description" readonly />
                    </div>
                </div>

                <!-- Single Column Layout for Inspection Options -->
                <div class="form-group single-column-layout">
                    <!-- Column 1: Final Inspection & Sub-Assembly -->
                    <div id="view-columnOne" class="column">
                        <div class="checkbox-container">
                            <div class="checkbox-group">
                                <input type="radio" id="view-final-inspection" name="view-inspection" class="custom-radio" value="final-inspection" disabled />
                                <label for="view-final-inspection">Final Inspection</label>
                            </div>
                            <div class="checkbox-group">
                                <input type="radio" id="view-sub-assembly" name="view-inspection" class="custom-radio" value="sub-assembly" disabled />
                                <label for="view-sub-assembly">Sub-Assembly</label>
                            </div>
                        </div>
                        <div class="vertical-options">
                            <div class="option-group">
                                <input type="radio" id="view-full" name="view-coverage" class="custom-radio" value="full" disabled />
                                <label for="view-full">Full</label>
                            </div>
                            <div class="option-group">
                                <input type="radio" id="view-partial" name="view-coverage" class="custom-radio" value="partial" disabled />
                                <label for="view-partial">Partial</label>
                            </div>
                            <div class="quantity-group">
                                <label for="view-quantity">Quantity:</label>
                                <input type="number" id="view-quantity" name="view-quantity" readonly />
                            </div>
                            <div class="option-group testing-group">
                                <input type="radio" id="view-testing" name="view-testing" class="custom-radio" value="testing" disabled />
                                <label for="view-testing" class="testing-label">Testing</label>
                            </div>
                            <div class="nested-options">
                                <div class="option-group">
                                    <input type="radio" id="view-internal-testing" name="view-type-of-testing" class="custom-radio" value="internal-testing" disabled />
                                    <label for="view-internal-testing" class="nested-label">Internal Testing</label>
                                </div>
                                <div class="option-group">
                                    <input type="radio" id="view-rtiMQ" name="view-type-of-testing" class="custom-radio" value="rti-mq" disabled />
                                    <label for="view-rtiMQ" class="nested-label">RTI MQ1 & MQ2</label>
                                </div>
                            </div>
                            <div class="scope-group">
                                <label for="view-scope">Scope:</label>
                                <input type="text" id="view-scope" name="view-scope" readonly />
                            </div>
                            <div class="scope-group">
                                <label for="view-location-of-item">Location of Item:</label>
                                <input type="text" id="view-location-of-item" name="view-location-of-item" readonly />
                            </div>
                        </div>
                    </div>

                    <!-- Column 2: Incoming & Outgoing Inspection -->
                    <div id="view-columnTwo" class="column">
                        <div class="second-column">
                            <div class="incoming-inspection-group option-group">
                                <input type="radio" id="view-incoming-inspection" name="view-inspection-type" class="custom-radio" disabled />
                                <label for="view-incoming-inspection" class="incoming-label">Incoming Inspection</label>
                            </div>
                            <div class="nested-incoming-options">
                                <div class="option-group">
                                    <input type="radio" id="view-raw-materials" name="view-incoming-options" class="custom-radio" disabled />
                                    <label for="view-raw-materials" class="nested-label">Raw Materials (Steel)</label>
                                </div>
                                <div class="option-group">
                                    <input type="radio" id="view-fabricated-parts" name="view-incoming-options" class="custom-radio" disabled />
                                    <label for="view-fabricated-parts" class="nested-label">Fabricated Parts / STD Parts</label>
                                </div>
                            </div>
                            <div class="outgoing-inspection-group option-group">
                                <input type="radio" id="view-outgoing-inspection" name="view-inspection-type" class="custom-radio" disabled />
                                <label for="view-outgoing-inspection" class="outgoing-label">Outgoing Inspection (For Subcon)</label>
                            </div>
                        </div>
                        <div class="details-column">
                            <div class="detail-group">
                                <label for="view-detail-quantity">Total Quantity:</label>
                                <input type="number" id="view-detail-quantity" name="view-detail-quantity" readonly />
                            </div>
                            <div class="detail-group">
                                <label for="view-detail-scope">Scope:</label>
                                <input type="text" id="view-detail-scope" name="view-detail-scope" readonly />
                            </div>
                            <div class="detail-group">
                                <label for="view-vendor">Vendor:</label>
                                <input type="text" id="view-vendor" name="view-vendor" readonly />
                            </div>
                            <div class="detail-group">
                                <label for="view-po">P.O. No.:</label>
                                <input type="text" id="view-po" name="view-po" readonly />
                            </div>
                            <div class="detail-group">
                                <label for="view-dr">D.R. No.:</label>
                                <input type="text" id="view-dr" name="view-dr" readonly />
                            </div>
                            <!-- File upload section omitted for simplicity; display attachment link if applicable -->
                            <div id="inspection-attachments" class="modal-container">
                                <label class="medium-label" for="inspection-file">Attachments:</label>
                                <div id="view_attachments">
                                    <!-- Attachments will be shown here -->
                                </div>
                            </div>
                        </div>
                        <div class="details-column">
                            <div class="detail-group">
                                <label for="view-incoming-location-of-item">Location of Item:</label>
                                <input type="text" id="view-incoming-location-of-item" name="view-incoming-location-of-item" readonly />
                            </div>
                        </div>
                    </div>

                    <!-- Column 3: Dimensional -->
                    <div id="view-columnThree" class="column">
                        <div class="radio-group">
                            <input type="radio" id="view-dimensional-inspection" name="view-inspection-dimension" value="dimensional" class="custom-radio" disabled />
                            <label for="view-dimensional-inspection">Dimensional Inspection</label>
                        </div><br>
                        <br /><br />
                        <div class="inline-input-group">
                            <label for="view-notification">Notification:</label>
                            <input type="text" id="view-dimension-notification" name="view-notification" readonly />
                        </div>
                        <div class="inline-input-group">
                            <label for="view-part-name">Part Name:</label>
                            <input type="text" id="view-dimension-part-name" name="view-part-name" readonly />
                        </div>
                        <div class="inline-input-group">
                            <label for="view-part-no">Part No.:</label>
                            <input type="text" id="view-dimension-part-no" name="view-part-no" readonly />
                        </div>
                        <div class="inline-input-group">
                            <label for="view-dimension-location-of-item">Location of Item:</label>
                            <input type="text" id="view-dimension-location-of-item" name="view-dimension-location-of-item" readonly />
                        </div>
                    </div>

                    <!-- Column 5: Material Analysis -->
                    <div id="view-columnFour" class="column">
                        <div class="radio-group">
                            <input type="radio" id="view-material-analysis-evaluation" name="view-inspection-material" value="material" class="custom-radio" disabled />
                            <label for="view-material-analysis-evaluation">Material Analysis / Evaluation</label>
                        </div>
                        <div class="indent">
                            <div class="radio-group">
                                <input type="radio" id="view-xrf" name="view-xrf" value="xrf" class="custom-radio" disabled />
                                <label for="view-material-analysis-xrf">Material Analysis (XRF)</label>
                            </div><br>
                            <div class="radio-group">
                                <input type="radio" id="view-hardness" name="view-hardness" value="hardness" class="custom-radio" disabled />
                                <label for="view-hardness-test">Hardness Test</label>
                            </div>
                            <div class="indent">
                                <div class="radio-group">
                                    <input type="radio" id="view-allowed-grinding" name="view-grindingOption" value="allowed" class="custom-radio" disabled />
                                    <label for="view-allowed-grinding">Allowed Grinding</label>
                                </div><br>
                                <div class="radio-group">
                                    <input type="radio" id="view-not-allowed-grinding" name="view-grindingOption" value="notAllowed" class="custom-radio" disabled />
                                    <label for="view-not-allowed-grinding">Not Allowed Grinding</label>
                                </div>
                            </div>
                        </div>
                        <br /><br />
                        <div class="inline-input-group">
                            <label for="view-notification">Notification:</label>
                            <input type="text" id="view-material-notification" name="view-material-notification" readonly />
                        </div>
                        <div class="inline-input-group">
                            <label for="view-part-name">Part Name:</label>
                            <input type="text" id="view-material-part-name" name="view-part-name" readonly />
                        </div>
                        <div class="inline-input-group">
                            <label for="view-part-no">Part No.:</label>
                            <input type="text" id="view-material-part-no" name="view-part-no" readonly />
                        </div>
                        <div class="inline-input-group">
                            <label for="view-material-location-of-item">Location of Item:</label>
                            <input type="text" id="view-material-location-of-item" name="view-material-location-of-item" readonly />
                        </div>
                    </div>

                    <!-- Column 4: Calibration -->
                    <div id="view-columnFive" class="column">
                        <div class="inline-input-group">
                            <label for="view-equipment-no">Equipment No.:</label>
                            <input type="text" id="view-equipment-no" name="view-equipment-no" readonly />
                        </div>
                        <div class="inline-input-group">
                            <label for="view-calibration-location-of-item">Location of Item:</label>
                            <input type="text" id="view-calibration-location-of-item" name="view-calibration-location-of-item" readonly />
                        </div>
                    </div>
                </div>

                <!-- Remarks Section -->
                <div class="form-group textarea-group remarks-content">
                    <label for="view-remarks">Remarks:</label>
                    <textarea id="view-remarks" name="view-remarks" readonly></textarea>
                </div>

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
            </div>
        </div>
    </div>

    <!-- Remarks Modal -->
    <?php include 'remarks-modal.php' ?>

    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
    <script src="homepage.js" type="text/javascript"></script>
    <script src="inspection-qa-data-received.js" type="text/javascript"></script>
    <script src="inspection-populate-elements.js?v=3.1" type="text/javascript"></script>
    <script src="inspection-remarks-modal.js" type="text/javascript"></script>
    <script src="inspection-update-status.js?v=3" type="text/javascript"></script>
    <script src="logout.js" type="text/javascript"></script>
</body>

</html>