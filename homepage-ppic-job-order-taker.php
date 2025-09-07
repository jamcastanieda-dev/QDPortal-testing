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
if (empty($user['privilege']) || $user['privilege'] !== 'Job-Order Taker') {
    header('Location: login.php');
    exit;
}

// You can now use $user or assign:
$current_user = $user;

include "navigation-bar.html";
include "custom-scroll-bar.html";
include 'general-sidebar.html';
date_default_timezone_set('Asia/Manila');
?>
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link href="style-homepage.css" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css" rel="stylesheet">
    <title>Home</title>
</head>

<body>
    <!-- Sidebar Section -->
    <nav id="sidebar">
        <div>
            <!-- Homepage Button Link -->
            <p class="home-selected">RAMCAR TECHNOLOGY INC.</p>
        </div>
        <!-- Sidebar Menu Button List -->
        <ul class="sidebar-menu-list">
            <li class="not-selected">
                <a href="ncr-request-initiator.php">NCR<span class="notification-badge">8</span></a>
            </li>
            <li class="not-selected">
                <a href="mrb-request.php">MRB<span class="notification-badge">3</span></a>
            </li>
            <li class="not-selected">
                <a href="rcpa-creation.php">RCPA<span class="notification-badge">5</span></a>
            </li>
            <li class="not-selected">
                <a href="rfd-request.php">Request for Distribution<span class="notification-badge">4</span></a>
            </li>
        </ul>
    </nav>

    <!-- Main Content Section -->
    <div class="main-content">
        <!-- Header with Logo and User Profile -->
        <div class="header">
            <div class="company-logo-image">
                <img src="images/RTI-Logo.png" alt="RAMCAR LOGO" class="company-logo">
                <label class="system-title">QUALITY PORTAL V1.1.3</label>
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

        <!-- Modules Section -->
        <div class="module">
            <div class="module-container">
                <label class="module-label">Procedures</label>
                <div class="short-indentation">
                    <div>
                        <label>Level I</label><br>
                        <div class="long-indentation">
                            <div class="level-label">
                                <label>QIP01.001</label>
                            </div>
                        </div>
                    </div>
                    <div>
                        <label>Level II</label><br>
                        <div class="long-indentation">
                            <div class="level-label">
                                <label>QIP02.001</label>
                            </div>
                            <div class="level-label">
                                <label>QIP02.002</label>
                            </div>
                            <div class="level-label">
                                <label>QIP03.001</label>
                            </div>
                        </div>
                    </div>
                    <div>
                        <label>Level III</label><br>
                        <div class="long-indentation">
                            <div class="level-label">
                                <label>D&E</label>
                            </div>
                            <div class="level-label">
                                <label>PPIC</label>
                            </div>
                        </div>
                    </div>
                    <div>
                        <label>Level IV</label><br>
                        <div class="long-indentation">
                            <div class="level-label">
                                <label>QIP01.001-A</label>
                            </div>
                            <div class="level-label">
                                <label>QIP01.002-A</label>
                            </div>
                            <div class="level-label">
                                <label>QIP03.004-V</label>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="module-container">
                <label class="module-label">Tasks</label><br><br>
                <div class="short-indentation">
                    <div class="task-label" data-task="NCR">
                        <label>NCR<span class="task-badge">2</span></label>
                    </div>
                    <div class="task-label" data-task="MRB">
                        <label>MRB<span class="task-badge">1</span></label>
                    </div>
                    <div class="task-label" data-task="RCPA">
                        <label>RCPA<span class="task-badge">3</span></label>
                    </div>
                    <div class="task-label" data-task="RFD">
                        <label>RFD<span class="task-badge">5</span></label>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Modal Structure -->
    <div id="taskModal" class="modal">
        <div class="modal-content">
            <h2 id="modalTitle"></h2>
            <div class="modal-buttons">
                <a id="receivedLink" class="modal-btn" href="#">Received</a>
                <a id="releasedLink" class="modal-btn" href="#">Released</a>
            </div>
        </div>
    </div>
    <script src="homepage.js" type="text/javascript"></script>
    <script src="homepage-job-order-taker.js" type="text/javascript"></script>
    <script src="logout.js" type="text/javascript"></script>
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
</body>

</html>