<?php
include "navigation-bar.html";
include "custom-scroll-bar.html";
include "custom-elements.html";
date_default_timezone_set('Asia/Manila'); // Change to your desired timezone
?>
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <!-- Google Fonts -->
    <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap" rel="stylesheet" />
    <!-- Font Awesome -->
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css" rel="stylesheet" />
    <!-- Main CSS -->
    <link href="style-inspection.css" rel="stylesheet" />
    <title>Inspection</title>
</head>

<body>
    <!-- Sidebar -->
    <div class="wrap-grid">
        <nav id="sidebar">
            <div class="sidebar-header">
                <a href="homepage.php">
                    <p>RAMCAR TECHNOLOGY INC.</p>
                </a>
            </div>
            <!-- Sidebar Menu Button List -->
            <ul class="sidebar-menu-list">
                <li class="not-selected">
                    <a href="ncr-admin.php">NCR<span class="notification-badge">8</span></a>
                </li>
                <li class="not-selected">
                    <a href="mrb-request.php">MRB<span class="notification-badge">3</span></a>
                </li>
                <li class="not-selected">
                    <a href="rcpa-request.php">RCPA<span class="notification-badge">5</span></a>
                </li>
                <li class="selected">
                    <a href="inspection-request.php">Inspection<span class="notification-badge">6</span></a>
                </li>
                <li class="not-selected">
                    <a href="rfd-request.php">Request for Distribution<span class="notification-badge">4</span></a>
                </li>
            </ul>
            <!-- Footer with Profile Picture and Logout -->
            <div class="sidebar-footer">
                <div class="profile-pic">
                    <img src="images/idol.jpg" alt="Profile Picture" class="sidebar-profile-img">
                </div>
                <div class="logout-section">
                    <a href="logout.php" class="logout-link">LOGOUT</a>
                </div>
            </div>
        </nav>
    </div>

    <!-- Inspection Request Content -->
    <div class="inspection-request-content">
        <h2>Inspection Request</h2>
        <div class="inspection-border">
            <!-- WBS and Description Inputs -->
            <div class="input-container">
                <div class="form-group wbs-group">
                    <label for="wbs">WBS:</label>
                    <input type="text" id="wbs" name="wbs" placeholder="Enter WBS" />
                    <label for="request-dropdown">Request:</label>
                    <select id="request-dropdown" name="request-dropdown">
                        <option value="final">Final &amp; Sub-Assembly Inspection</option>
                        <option value="incoming">Incoming &amp; Outgoing Inspection</option>
                        <option value="dimensional">Dimensional Inspection</option>
                        <option value="calibration">Calibration</option>
                    </select>
                </div>
                <div class="form-group description-group">
                    <label for="description">Description:</label>
                    <input type="text" id="description" name="description" placeholder="Enter Description" />
                </div>
            </div>

            <!-- Single Column Layout for Inspection Options -->
            <div class="form-group single-column-layout">
                <!-- Column 1: Final Inspection & Sub-Assembly -->
                <div id="columnOne" class="column">
                    <div class="checkbox-container">
                        <div class="checkbox-group">
                            <input type="radio" id="final-inspection" name="inspection" class="custom-radio" />
                            <label for="final-inspection">Final Inspection</label>
                        </div>
                        <div class="checkbox-group">
                            <input type="radio" id="sub-assembly" name="inspection" class="custom-radio" />
                            <label for="sub-assembly">Sub-Assembly</label>
                        </div>
                    </div>
                    <div class="vertical-options">
                        <div class="option-group">
                            <input type="radio" id="full" name="coverage" class="custom-radio" />
                            <label for="full">Full</label>
                        </div>
                        <div class="option-group">
                            <input type="radio" id="partial" name="coverage" class="custom-radio" />
                            <label for="partial">Partial</label>
                        </div>
                        <div class="quantity-group">
                            <label for="quantity">Quantity:</label>
                            <input type="number" id="quantity" name="quantity" min="0" placeholder="Enter quantity" />
                        </div>
                        <div class="option-group testing-group">
                            <input type="radio" id="testing" name="testing" class="custom-radio" />
                            <label for="testing" class="testing-label">Testing</label>
                        </div>
                        <div class="nested-options">
                            <div class="option-group">
                                <input type="radio" id="internal-testing" name="type-of-testing" class="custom-radio" />
                                <label for="internal-testing" class="nested-label">Internal Testing</label>
                            </div>
                            <div class="option-group">
                                <input type="radio" id="rtiMQ" name="type-of-testing" class="custom-radio" />
                                <label for="rtiMQ" class="nested-label">RTI MQ1 &amp; MQ2</label>
                            </div>
                        </div>
                        <div class="scope-group">
                            <label for="scope">Scope:</label>
                            <input type="text" id="scope" name="scope" placeholder="Enter scope" />
                        </div>
                    </div>
                </div>

                <!-- Column 2: Incoming & Outgoing Inspection -->
                <div id="columnTwo" class="column">
                    <div class="second-column">
                        <div class="incoming-inspection-group option-group">
                            <input type="radio" id="incoming-inspection" name="inspection-type" class="custom-radio" />
                            <label for="incoming-inspection" class="incoming-label">Incoming Inspection</label>
                        </div>
                        <div class="nested-incoming-options">
                            <div class="option-group">
                                <input type="radio" id="raw-materials" name="incoming-options" class="custom-radio" />
                                <label for="raw-materials" class="nested-label">Raw Materials (Steel)</label>
                            </div>
                            <div class="option-group">
                                <input type="radio" id="fabricated-parts" name="incoming-options" class="custom-radio" />
                                <label for="fabricated-parts" class="nested-label">Fabricated Parts / STD Parts</label>
                            </div>
                        </div>
                        <div class="outgoing-inspection-group option-group">
                            <input type="radio" id="outgoing-inspection" name="inspection-type" class="custom-radio" />
                            <label for="outgoing-inspection" class="outgoing-label">Outgoing Inspection (For Subcon)</label>
                        </div>
                    </div>
                    <div class="details-column">
                        <div class="detail-group">
                            <label for="detail-quantity">Total Quantity:</label>
                            <input type="number" id="detail-quantity" name="detail-quantity" placeholder="Enter quantity" />
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
                        <div class="detail-group file-upload-group" id="file-upload-container" style="display: none;">
                            <label for="dr-file">Attachments:</label>
                            <div class="custom-file-upload">
                                <input type="file" id="dr-file" name="dr-file" accept=".pdf,.doc,.docx,.jpg,.png" style="display: none;" />
                                <button type="button" class="upload-btn">
                                    <i class="fas fa-caret-up"></i>Upload
                                </button>
                                <span class="file-name" id="file-name">No file chosen</span>
                                <button type="button" class="clear-btn" id="clear-file" style="display: none;">
                                    <i class="fas fa-times"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Column 3: Dimensional & Material Analysis/Evaluation -->
                <div id="columnThree" class="column">
                    <div class="radio-group">
                        <input type="radio" id="dimensional-inspection" name="inspectionThird" value="dimensional" class="custom-radio" />
                        <label for="dimensional-inspection">Dimensional Inspection</label>
                    </div><br>
                    <div class="radio-group">
                        <input type="radio" id="material-analysis-evaluation" name="inspectionThird" value="material" class="custom-radio" />
                        <label for="material-analysis-evaluation">Material Analysis / Evaluation</label>
                    </div>
                    <div class="indent">
                        <div class="radio-group">
                            <input type="radio" id="material-analysis-xrf" name="materialAnalysisOption" value="xrf" class="custom-radio" />
                            <label for="material-analysis-xrf">Material Analysis (XRF)</label>
                        </div><br>
                        <div class="radio-group">
                            <input type="radio" id="hardness-test" name="materialAnalysisOption" value="hardness" class="custom-radio" />
                            <label for="hardness-test">Hardness Test</label>
                        </div>
                        <div class="indent">
                            <div class="radio-group">
                                <input type="radio" id="allowed-grinding" name="grindingOption" value="allowed" class="custom-radio" />
                                <label for="allowed-grinding">Allowed Grinding</label>
                            </div><br>
                            <div class="radio-group">
                                <input type="radio" id="not-allowed-grinding" name="grindingOption" value="notAllowed" class="custom-radio" />
                                <label for="not-allowed-grinding">Not Allowed Grinding</label>
                            </div>
                        </div>
                    </div>
                    <br /><br />
                    <div class="inline-input-group">
                        <label for="notification">Notification:</label>
                        <input type="text" id="notification" name="notification" placeholder="Enter Notification" />
                    </div>
                    <div class="inline-input-group">
                        <label for="part-name">Part Name:</label>
                        <input type="text" id="part-name" name="part-name" placeholder="Enter Part Name" />
                    </div>
                    <div class="inline-input-group">
                        <label for="part-no">Part No.:</label>
                        <input type="text" id="part-no" name="part-no" placeholder="Enter Part No." />
                    </div>
                </div>

                <!-- Column 4: Empty Column -->
                <div id="columnFour" class="column"></div>
            </div>

            <!-- Remarks Section -->
            <div class="form-group textarea-group remarks-content">
                <label for="additional-info">Remarks:</label>
                <textarea id="additional-info" name="additional-info" placeholder="Enter additional information..."></textarea>
            </div>

            <!-- Footer Section -->
            <div class="align-footer">
                <div class="left-footer">
                    <div class="form-group requestor-container">
                        <label for="requestor">Requestor:</label>
                        <input type="text" id="requestor" name="requestor" value="Juan Dela" disabled />
                    </div>
                    <div class="form-group datetime-container">
                        <label for="date" style="margin-bottom: 12px;">Date/Time:</label>
                        <span id="current-time"></span>
                    </div>
                </div>
                <div class="form-group submit-button-container">
                    <button class="btn-submit" type="submit">Submit</button>
                </div>
            </div>
        </div>
    </div>
    <script src="inspection-css.js?v=4" type="text/javascript"></script>
</body>

</html>