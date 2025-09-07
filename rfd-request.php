<?php
include "navigation-bar.html";
include "custom-scroll-bar.html";
include "custom-elements.html";
include 'general-sidebar.html';
?>
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
    <link rel="stylesheet" href="style-rfd.css">
    <title>Request for Distribution</title>
</head>

<body>
    <div class="wrap-grid">
        <!-- Sidebar Section -->
    <nav id="sidebar">
        <ul class="sidebar-menu-list">
            <li class="not-selected">
                <a>Dashboard</a>
            </li>
            <li class="not-selected">
                <a>NCR</a>
            </li>
            <li class="not-selected">
                <a>MRB</a>
            </li>
            <li class="not-selected">
                <a>RCPA</a>
            </li>
            <li class="not-selected">
                <a>Request for Distribution</a>
            </li>
        </ul>
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
                <p class="greetings">Good Day, <?php echo $_SESSION['user']['name'] ?></p>
                <p id="date-time" class="date-time"><?php echo date('F d, Y g:i A'); ?></p>
            </div>
            <div class="profile-image">
                <i class="fa-solid fa-user user-icon"></i>
                <a href="logout.php" class="logout-button" id="logoutButton">Logout</a>
            </div>
        </div>
    </div>

    <div class="rfd-content-container">
        <h2>Request for Distribution</h2>

        <div class="rfd-content">
            <div class="rfd-container">
                <div class="input-container">
                    <div class="icon-container">
                        <button class="plus-icon-btn" onclick="addInputRow()">+</button>
                        <button class="minus-icon-btn" onclick="removeInputRow()">-</button>
                    </div>
                    <div class="input-fields-top">
                        <div class="input-group number-div">
                            <label for="numbering">No. of Request:</label>
                            <input type="text" id="numbering" class="custom-input short-input" value="1" readonly>
                        </div>
                        <div class="input-group title-group">
                            <label for="title-description">Title/Description:</label>
                            <input type="text" id="title-description" class="custom-input">
                        </div>
                        <div class="input-group">
                            <label for="doc-no-wbs">Doc No./WBS:</label>
                            <input type="text" id="doc-no-wbs" class="custom-input">
                        </div>
                    </div>
                    <div class="additional-inputs"></div>
                </div>
                <!-- Text Area -->
                <div class="text-area-container">
                    <textarea placeholder="Reason for request......."></textarea>
                </div>
                <!-- Checkboxes -->
                <div class="checkbox-container">
                    <div class="checkbox-group">
                        <label class="checkbox-label">
                            <input type="radio" id="hard-copy" class="custom-radio" name="type-of-copy">
                            Hard Copy
                        </label>
                        <label class="checkbox-label">
                            <input type="radio" id="soft-copy" class="custom-radio" name="type-of-copy">
                            Soft Copy
                        </label>
                    </div>
                    <button class="submit-btn">Submit</button>
                </div>
            </div>
        </div>
    </div>
</body>
<script src="rfd-css.js" type="text/javascript"></script>

</html>