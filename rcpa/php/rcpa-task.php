<?php include 'rcpa-cookie.php'; ?>
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link href="../../style-inspection.css" rel="stylesheet">
    <link href="../../style-inspection-homepage.css" rel="stylesheet">
    <link href="../css/rcpa-style.css" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@sweetalert2/theme-default@5/default.min.css">
    <title>RCPA Task</title>
</head>

<body>
    <nav id="sidebar">
        <ul class="sidebar-menu-list">
            <li class="not-selected">
                <a href="../homepage-dashboard-initiator.php">Dashboard</a>
            </li>
            <li class="not-selected">
                <a href="#">Inspection Request <i class="fa-solid fa-caret-right submenu-indicator"></i></a>
                <ul class="submenu">
                    <li class="not-selected"><a href="../../inspection-dashboard-qa-head.php">Dashboard</a></li>
                    <li class="not-selected"><a href="../../inspection-create-initiator.php">Request</a></li>
                </ul>
            </li>
            <li class="not-selected">
                <a href="#">NCR <i class="fa-solid fa-caret-right submenu-indicator"></i></a>
                <ul class="submenu">
                    <li class="not-selected"><a href="../../ncr/ncr-dashboard-initiator.php">Dashboard</a></li>
                    <li class="not-selected"><a href="../../ncr/ncr-request-initiator.php">Request</a></li>
                </ul>
            </li>
            <li class="not-selected">
                <a href="#">MRB <i class="fa-solid fa-caret-right submenu-indicator"></i></a>
                <ul class="submenu">
                    <li class="not-selected"><a href="mrb-dashboard.php">Dashboard</a></li>
                    <li class="not-selected"><a href="mrb-task.php">Tasks</a></li>
                </ul>
            </li>

            <li class="selected">
                <a href="#" class="has-badge">
                    RCPA
                    <span id="rcpa-parent-badge" class="notif-badge" hidden>0</span>
                    <i class="fa-solid fa-caret-right submenu-indicator"></i>
                </a>
                <ul class="submenu">
                    <li class="not-selected"><a href="rcpa-dashboard.php">Dashboard</a></li>
                    <li class="not-selected">
                        <a href="rcpa-request.php" class="has-badge">
                            Request
                            <span id="rcpa-request-badge" class="notif-badge" hidden>0</span>
                        </a>
                    </li>

                    <?php if (!empty($can_see_rcpa_approval) && $can_see_rcpa_approval): ?>
                        <li class="not-selected">
                            <a href="rcpa-approval.php" class="has-badge">
                                Approval
                                <span id="rcpa-approval-badge" class="notif-badge" hidden>0</span>
                            </a>
                        </li>
                    <?php endif; ?>
                    <li class="not-selected">
                        <a class="has-badge sublist-selected">
                            Tasks
                            <span id="rcpa-task-badge" class="notif-badge" hidden>0</span>
                        </a>
                    </li>
                </ul>
            </li>
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

    <h2><span>RCPA Tasks</span></h2>

    <!-- === Tasks panel === -->
    <div class="rcpa-container">
        <div class="rcpa-tasks-grid">
            <!-- QMS -->
            <!-- QMS -->
            <button type="button" class="btn-task btn--qms" id="btnQms"
                onclick="window.location.href='rcpa-task-qms-checking.php'">
                <i class="fa-solid fa-clipboard-check" aria-hidden="true"></i>
                <span>QMS TASKS</span>
                <span class="btn-badge" id="badgeQms" hidden>0</span>
            </button>

            <!-- Assignee Pending -->
            <button type="button" class="btn-task btn--assignee" id="btnAssignee"
                onclick="window.location.href='rcpa-task-assignee-pending.php'">
                <i class="fa-solid fa-user-clock" aria-hidden="true"></i>
                <span>ASSIGNEE TASKS</span>
                <span class="btn-badge" id="badgeAssignee" hidden>0</span>
            </button>

            <!-- QMS Approval (modal trigger) -->
            <button type="button" class="btn-task btn-approval btn--qms-approval" id="qmsApprovalBtn">
                <i class="fa-solid fa-check-circle" aria-hidden="true"></i>
                <span>QMS APPROVAL</span>
                <span class="btn-badge" id="badgeQmsApproval" hidden>0</span>
            </button>

            <!-- Assignee Approval (modal trigger) -->
            <button type="button" class="btn-task btn-approval btn--assignee-approval" id="approvalBtn">
                <i class="fa-solid fa-check-square" aria-hidden="true"></i>
                <span>ASSIGNEE APPROVAL</span>
                <span class="btn-badge" id="badgeApproval" hidden>0</span>
            </button>

            <!-- CLOSED -->
            <button type="button" class="btn-task btn--closed" id="btnClosed"
                onclick="window.location.href='rcpa-task-closed.php'">
                <i class="fa-solid fa-lock" aria-hidden="true"></i>
                <span>CLOSED</span>
                <span class="btn-badge" id="badgeClosed" hidden>0</span>
            </button>


        </div>
    </div>

    <!-- === Assignee Approval modal (as-is) === -->
    <div id="approval-modal" class="modal-overlay" aria-hidden="true">
        <div class="modal-content" role="dialog" aria-modal="true" aria-labelledby="approvalTitle">
            <button class="close-btn" id="approvalClose" aria-label="Close">&times;</button>

            <h3 class="rcpa-title" id="approvalTitle">Choose Approval Type</h3>

            <div class="approval-actions">
                <!-- REPLY APPROVAL -->
                <button type="button" class="btn-task btn-cta"
                    onclick="window.location.href='rcpa-task-assignee-approval-valid.php'">
                    <i class="fa-solid fa-check-double" aria-hidden="true"></i>
                    <span>REPLY APPROVAL</span>
                    <span class="btn-badge" id="badgeAssigneeReplyApproval" hidden>0</span>
                </button>

                <!-- FOR CLOSING APPROVAL -->
                <button type="button" class="btn-task"
                    onclick="window.location.href='rcpa-task-assignee-approval-corrective.php'">
                    <i class="fa-solid fa-ban" aria-hidden="true"></i>
                    <span>FOR CLOSING APPROVAL</span>
                    <span class="btn-badge" id="badgeAssigneeForClosingApproval" hidden>0</span>
                </button>
            </div>

        </div>
    </div>

    <!-- === QMS Approval modal (NEW) === -->
    <div id="qms-approval-modal" class="modal-overlay" aria-hidden="true">
        <div class="modal-content" role="dialog" aria-modal="true" aria-labelledby="qmsApprovalTitle">
            <button class="close-btn" id="qmsApprovalClose" aria-label="Close">&times;</button>

            <h3 class="rcpa-title" id="qmsApprovalTitle">Choose QMS Approval Type</h3>

            <div class="approval-actions">
                <button type="button" class="btn-task btn-cta"
                    onclick="window.location.href='rcpa-task-qms-approval-reply-invalid.php'">
                    <i class="fa-solid fa-reply" aria-hidden="true"></i>
                    <span>IN-VALIDATION REPLY APPROVAL</span>
                    <span class="btn-badge" id="badgeQmsReply" hidden>0</span>
                </button>

                <button type="button" class="btn-task"
                    onclick="window.location.href='rcpa-task-qms-approval-evidence.php'">
                    <i class="fa-solid fa-door-closed" aria-hidden="true"></i>
                    <span>EVIDENCE APPROVAL</span>
                    <span class="btn-badge" id="badgeQmsClosing" hidden>0</span>
                </button>
            </div>
        </div>
    </div>


    <!-- Front End JS -->
    <script src="../../current-date-time.js" type="text/javascript"></script>
    <script src="../../homepage.js" type="text/javascript"></script>
    <script src="../../logout.js" type="text/javascript"></script>
    <script src="../../pagination.js" type="text/javascript"></script>
    <script src="../../sidebar.js" type="text/javascript"></script>

    <script src="../js/rcpa-tasks.js"></script>
    <script src="../js/rcpa-notif-sub-menu-count.js"></script>


    <!-- CDN JS -->
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>

</body>

</html>