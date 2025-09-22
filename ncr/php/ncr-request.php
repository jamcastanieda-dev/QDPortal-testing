<?php include 'rcpa-cookie.php'; ?>
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link href="../../style-inspection.css" rel="stylesheet">
    <link href="../../style-inspection-homepage.css" rel="stylesheet">
    <link href="../css/ncr-style.css" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@sweetalert2/theme-default@5/default.min.css">
    <link href="../../rcpa-notif.css" rel="stylesheet">
    <link href="../css/ncr-style.css">

    <title>NCR Request</title>
</head>

<body>

    <nav id="sidebar">
        <ul class="sidebar-menu-list">
            <?php
            // Decide homepage by privilege (set in rcpa-cookie.php)
            $priv = trim($employee_privilege ?? '');
            if ($priv === 'QA-Respondent') {
                $homeHref = '../../homepage-dashboard-qa.php';
            } elseif ($priv === 'QA-Head-Inspection') {
                $homeHref = '../../homepage-dashboard-qa-head.php';
            } else {
                $homeHref = '../../homepage-dashboard-initiator.php'; // default
            }
            ?>
            <li class="not-selected">
                <a href="<?= htmlspecialchars($homeHref, ENT_QUOTES, 'UTF-8'); ?>">Dashboard</a>
            </li>

            <li class="not-selected">
                <a href="#">Inspection Request <i class="fa-solid fa-caret-right submenu-indicator"></i></a>
                <ul class="submenu">
                    <?php
                    $priv = trim($employee_privilege ?? '');
                    if ($priv === 'QA-Respondent') {
                        // QA Respondent view
                        echo '<li class="not-selected"><a href="../../inspection-dashboard-qa.php">Dashboard</a></li>';
                        echo '<li class="not-selected"><a href="../../inspection-tasks-qa.php">Tasks</a></li>';
                    } elseif ($priv === 'QA-Head-Inspection') {
                        // QA Head-Inspection view
                        echo '<li class="not-selected"><a href="../../inspection-dashboard-qa-head.php">Dashboard</a></li>';
                        echo '<li class="not-selected"><a href="../../inspection-tasks-qa-head.php">Tasks</a></li>';
                    } else {
                        // Default (Initiator) view
                        echo '<li class="not-selected"><a href="../../inspection-dashboard-initiator.php">Dashboard</a></li>';
                        echo '<li class="not-selected"><a href="../../inspection-create-initiator.php">Request</a></li>';
                    }
                    ?>
                </ul>
            </li>

            <li class="selected">
                <a href="#">NCR <i class="fa-solid fa-caret-right submenu-indicator"></i></a>
                <ul class="submenu">
                    <li class="not-selected"><a href="ncr-dashboard">Dashboard</a></li>
                    <li class="not-selected"><a class="sublist-selected">Request</a></li>
                </ul>
            </li>

            <!-- <li class="not-selected">
                <a href="#">MRB <i class="fa-solid fa-caret-right submenu-indicator"></i></a>
                <ul class="submenu">
                    <li class="not-selected"><a href="mrb-dashboard.php">Dashboard</a></li>
                    <li class="not-selected"><a href="mrb-task.php">Tasks</a></li>
                </ul>
            </li> -->

            <li class="not-selected">
                <a href="#" class="has-badge">
                    RCPA
                    <span id="rcpa-parent-badge" class="notif-badge" hidden>0</span>
                    <i class="fa-solid fa-caret-right submenu-indicator"></i>
                </a>
                <ul class="submenu">
                    <li class="not-selected"><a href="../../rcpa/php/rcpa-dashboard.php">Dashboard</a></li>
                    <li class="not-selected">
                        <a href="../../rcpa/php/rcpa-request.php" class="has-badge">
                            Request
                            <span id="rcpa-request-badge" class="notif-badge" hidden>0</span>
                        </a>
                    </li>

                    <?php if (!empty($can_see_rcpa_approval) && $can_see_rcpa_approval): ?>
                        <li class="not-selected">
                            <a href="../../rcpa/php/rcpa-approval.php" class="has-badge">
                                Approval
                                <span id="rcpa-approval-badge" class="notif-badge" hidden>0</span>
                            </a>
                        </li>
                    <?php endif; ?>

                    <li class="not-selected">
                        <a href="../../rcpa/php/rcpa-task.php" class="has-badge">
                            Tasks
                            <span id="rcpa-task-badge" class="notif-badge" hidden>0</span>
                        </a>
                    </li>
                </ul>
            </li>

            <!--
            <li class="not-selected">
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
                <img src="../../images/RTI-Logo.png" alt="RAMCAR LOGO" class="company-logo">
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
                <a href="../logout.php" class="logout-button" id="logoutButton">Logout</a>
            </div>
        </div>
    </div>

    <h2><span>NCR Request</span></h2>

    <div class="ncr-container">

    </div>



    <!-- Front End JS -->
    <script src="../../current-date-time.js" type="text/javascript"></script>
    <script src="../../homepage.js" type="text/javascript"></script>
    <script src="../../logout.js" type="text/javascript"></script>
    <script src="../../pagination.js" type="text/javascript"></script>
    <script src="../../sidebar.js" type="text/javascript"></script>


    <script src="../../sidebar-notif-with-folder.js"></script>

    <!-- CDN JS -->
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>

</body>

</html>