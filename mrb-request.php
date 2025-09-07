<?php
include "navigation-bar.html";
include "custom-scroll-bar.html";
include "custom-radio-group.html";
include "custom-elements.html";
include 'general-sidebar.html';
?>
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link href="style-mrb.css" rel="stylesheet" />
    <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap" rel="stylesheet" />
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css" rel="stylesheet" />
    <title>MRB</title>
</head>

<body>
    <div class="wrap-grid">
        <nav id="sidebar">
            <div class="sidebar-header">
                <a href="homepage.php">
                    <p>RAMCAR TECHNOLOGY INC.</p>
                </a>
            </div>
            <ul class="sidebar-menu-list">
                <li class="not-selected">
                    <a href="ncr-admin.php">NCR<span class="notification-badge">8</span></a>
                </li>
                <li class="selected">
                    <a href="mrb-request.php">MRB<span class="notification-badge">3</span></a>
                </li>
                <li class="not-selected">
                    <a href="rcpa-request.php">RCPA<span class="notification-badge">5</span></a>
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

    <h2 class="mrb-header">MRB Request</h2>

    <div class="mrb-content-container">
        <div class="mrb-content">
            <div class="top-form-section">
                <!-- Row 1: Initiator and Department -->
                <div class="input-group">
                    <label for="initiator-name">Initiator:</label>
                    <input type="text" id="initiator-name" class="custom-input" value="Juan Dela" disabled>
                </div><br>
                <div class="input-group">
                    <label for="dept-name">Department:</label>
                    <input type="text" id="dept-name" class="custom-input" value="Quality" disabled>
                </div><br>

                <!-- Row 2: Company Selection -->
                <div class="input-group">
                    <div class="radio-group">
                        <label>
                            <input type="radio" name="company-selection" value="RTI" class="custom-radio-group"> RTI
                        </label>
                        <label>
                            <input type="radio" name="company-selection" value="SSD" class="custom-radio-group"> SSD
                        </label>
                    </div>
                </div>

                <!-- Row 3: Reason and Project Name -->
                <div class="input-group">
                    <label for="reason-select">Reason:</label>
                    <select id="reason-select" class="custom-input">
                        <option value="Non-Conformance">Non-Conformance</option>
                        <option value="Borrow">Borrow</option>
                        <option value="Management">Management</option>
                    </select>
                </div><br>
                <div class="input-group">
                    <label for="project-name-input">Project Name:</label>
                    <input type="text" id="project-name-input" class="custom-input">
                </div><br>

                <!-- Row 4: WBS/Job No. -->
                <div></div>
                <div class="input-group">
                    <label for="wbs-job-no">WBS/Job No.:</label>
                    <input type="text" id="wbs-job-no" class="custom-input">
                </div><br>

                <!-- Row 5: NCR No. -->
                <div></div>
                <div class="input-group">
                    <label for="ncr-no">NCR No.:</label>
                    <input type="text" id="ncr-no" class="custom-input">
                </div>
            </div><br>

            <!-- New Row: Non-Conformance Type Dropdown -->
            <div class="input-group">
                <label for="non-conformance-type">Non-Conformance Type:</label>
                <select id="non-conformance-type" class="custom-input">
                    <option value="" disabled selected>Select type</option>
                    <option value="Dimensional">Dimensional</option>
                    <option value="Appearance">Appearance</option>
                    <option value="Incomplete Parts">Incomplete Parts</option>
                </select>
            </div>
        </div>

        <!-- Non-Conformance Description -->
        <div class="text-area-container">
            <label for="non-conformance-desc">Non-Conformance:</label>
            <textarea id="non-conformance-desc" placeholder="Describe the non-conformance..."></textarea>
        </div>

        <!-- Requirement Description -->
        <div class="text-area-container">
            <label for="requirement-desc">Requirement:</label>
            <textarea id="requirement-desc" placeholder="Describe the requirement..."></textarea>
            <label class="group-label reason-label">Reason for initiating use of NC product</label>
        </div>

        <!-- Reason for NC Product Use -->
        <div class="checkbox-container">
            <div class="checkbox-group">
                <label class="checkbox-label">
                    <input type="radio" name="nc-use-reason" value="facilitate-product" class="custom-radio-group"> Facilitate Product
                </label>
                <label class="checkbox-label">
                    <input type="radio" name="nc-use-reason" value="for-conditional" class="custom-radio-group"> For Conditional
                </label>
                <label class="checkbox-label">
                    <input type="radio" name="nc-use-reason" value="temporary-use" class="custom-radio-group"> For Temporary Use
                </label>
                <label class="checkbox-label">
                    <input type="radio" name="nc-use-reason" value="final-inspection" class="custom-radio-group"> Facilitate Final Inspection
                </label>
                <label class="checkbox-label">
                    <input type="radio" name="nc-use-reason" value="facilitate" class="custom-radio-group"> Facilitate
                </label>
            </div>
        </div>

        <!-- Others Input -->
        <div class="input-fields-top others-section">
            <div class="input-group">
                <label class="others-label" for="others-input">Others:</label>
                <input type="text" id="others-input" class="custom-input">
            </div>
        </div>

        <!-- Possible Effects or Defects -->
        <div class="checkbox-container">
            <label class="group-label">Possible effects or defect</label>
            <div class="checkbox-group">
                <label class="checkbox-label">
                    <input type="radio" name="effect-reason" value="facilitate-product" class="custom-radio-group"> Facilitate Product
                </label>
                <label class="checkbox-label">
                    <input type="radio" name="effect-reason" value="for-conditional" class="custom-radio-group"> For Conditional
                </label>
                <label class="checkbox-label">
                    <input type="radio" name="effect-reason" value="temporary-use" class="custom-radio-group"> For Temporary Use
                </label>
                <label class="checkbox-label">
                    <input type="radio" name="effect-reason" value="final-inspection" class="custom-radio-group"> Facilitate Final Inspection
                </label>
            </div>
        </div>

        <!-- Additional Comments -->
        <div class="text-area-container">
            <textarea id="additional-comments-text" placeholder="Enter any additional comments..."></textarea>
        </div>

        <!-- Combined Customer Approval and Upload Approval Row -->
        <div class="input-fields-top">
            <!-- Customer Approval -->
            <div class="input-group">
                <label for="customer-approval-select">Customer Approval:</label>
                <select id="customer-approval-select" class="custom-input">
                    <option value="required">Required</option>
                    <option value="not-required">Not Required</option>
                </select>
            </div>

            <!-- Upload Approval (toggled via JS) -->
            <div class="input-group" id="uploadApprovalContainer">
                <label for="upload-approval-file">Upload Approval:</label>
                <div class="file-upload-container">
                    <span class="file-display">No file chosen</span>
                    <label for="upload-approval-file" class="file-upload-label">
                        <i class="fa-regular fa-square-caret-up caret"></i>
                    </label>
                    <input type="file" id="upload-approval-file" class="file-input" hidden onchange="updateFileName(this)">
                </div>
            </div>
        </div>

        <!-- Attachments -->
        <div class="input-group half-width">
            <label for="attachments-file">Attachments:</label>
            <div class="file-upload-container">
                <span class="file-display">No file chosen</span>
                <label for="attachments-file" class="file-upload-label">
                    <i class="fa-regular fa-square-caret-up caret"></i>
                </label>
                <input type="file" id="attachments-file" class="file-input" hidden onchange="updateFileName(this)">
            </div>
        </div>

        <!-- Submit Button -->
        <div class="submit-container">
            <button class="submit-btn">Submit</button>
        </div><br><br>
    </div>
</body>
<script src="mrb-script.js" type="text/javascript"></script>

</html>