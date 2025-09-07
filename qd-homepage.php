<?php 
    include "navigation-bar.html";
    include "process-tracker.html";
    include "custom-scroll-bar.html";
    date_default_timezone_set('Asia/Manila'); // Set the timezone to Asia/Manila
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>QD Interface</title>
  <link rel="stylesheet" href="style-qd-homepage.css">
  <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
</head>
<body>
  <!-- Sidebar Section -->
  <nav id="sidebar">
    <div>
      <p class="home-selected">RAMCAR TECHNOLOGY INC.</p>
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
        <li class="not-selected">
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

  <!-- Main Content Section -->
  <div class="main-content">
    <!-- Header with Logo and User Info -->
    <div class="header">
      <div class="logo-section">
        <img src="images/RTI-Logo.png" alt="RAMCAR LOGO" class="logo">
        <label class="logo-title">QUALITY PORTAL V1.0</label>
      </div>
      <div class="profile-section">
        <div class="profile">
          <p class="greetings">GOOD DAY JOSE</p>
          <p class="time"><?php echo date('F d, Y g:i A'); ?></p>
        </div>
        <div class="profile-image">
          <img src="images/idol.jpg" alt="USER" class="user">
        </div>
      </div>
    </div>

   <!-- Replace the existing module div with this -->
    <div class="module">
    <div class="border-module">
        <label class="sub-header">View Procedures</label>
        <div class="scrollable-content"> <!-- Added wrapper for scrollable area -->
            <div>
                <label class="labels">Level I</label>
                <div class="indent">
                    <div class="level-label">
                        <label>QIP01.001</label>
                    </div>
                    <div class="level-label">
                        <label>QIP01.002</label>
                    </div>
                    <div class="level-label">
                        <label>QIP01.003</label>
                    </div>
                </div>
            </div>
            <div>
                <label class="labels">Level II</label>
                <div class="indent">
                    <div class="level-label">
                        <label>QIP02.003</label>
                    </div>
                </div>
            </div>
            <div>
                <label class="labels">Level III</label>
                <div class="indent">
                    <div class="level-label">
                        <label>D&E</label>
                    </div>
                    <div class="level-label">
                        <label>PPIC</label>
                    </div>
                </div>
            </div>
            <div>
                <label class="labels">Level IV</label>
                <div class="indent">
                    <div class="level-label">
                        <label>QIP01.001-A</label>
                    </div>
                </div>
            </div>
        </div>
    </div>
        <div class="border-module">
            <label class="sub-header">Active Request</label>
            <label class="labels">NCR</label>
            <div class="ncr-columns">
                <div class="column">
                    <br>
                    <p>123456</p>
                </div>
                <div class="column">
                    <br>
                    <p>JA24-HP001</p>
                </div>
                <div class="column">
                    <br>
                    <p>QA</p>
                </div>
            </div>
        </div>
    </div>
    <br>
    <!-- PDF Preview -->
    <div class="previewDocument">
        <div class="tracking-container">
            <label class="sub-header">Status</label>
            <div class="tracking-node">
                <div class="node" data-name="Juan Dela"></div>
                <span class="node-label">Requested</span>
            </div>
            <div class="tracking-node">
                <div class="node" data-name="Terence Walker"></div>
                <span class="node-label">Route</span>
            </div>
            <div class="tracking-node">
                <div class="node" data-name="Josh Martinez"></div>
                <span class="node-label">Approved</span>
            </div>
            <div class="tracking-node">
                <div class="node" data-name="Carlo Cruz"></div>
                <span class="node-label">Released</span>
            </div>
            <div class="tracking-node">
                <div class="disconnected-node"></div>
                <span class="node-label">Replied</span>
            </div>
            <div class="tracking-node">
                <div class="disconnected-node"></div>
                <span class="node-label">Review</span>
            </div>
            <div class="tracking-node">
                <div class="disconnected-node"></div>
                <span class="node-label">Audit</span>
            </div>
            <div class="tracking-node">
                <div class="disconnected-node"></div>
                <span class="node-label">Closed</span>
            </div>
        </div>
        <label class="align-right">NCR: 123456</label>
        <iframe src="documents/sample.pdf" class="document">
    </div>
</body>
</html>
