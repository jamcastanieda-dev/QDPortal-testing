<?php include 'ncr-cookie.php'; ?>
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
        <div class="ncr-request-btn-container">

            <div class="ncr-filters">
                <select id="ncr-filter-status" class="u-line">
                    <option value="">All Status</option>
                    <option value="">AGUTUSUSUSUSUSUS</option>
                </select>

                <select id="ncr-filter-type" class="u-line">
                    <option value="">All Types</option>
                </select>
            </div>

            <button class="ncr-request-btn" id="ncr-req-btn">Request</button>
        </div>

        <!-- NCR Requests Card -->
        <section class="ncr-card">
            <header class="ncr-table-toolbar"></header>

            <div class="ncr-table-wrap">
                <table id="ncr-table" class="ncr-table">
                    <thead>
                        <tr>
                            <th>NCR No.</th>
                            <th>NCR Type</th>
                            <th>Category</th>
                            <th>Date Request</th>
                            <th>Closing due date</th>
                            <th>Status</th>
                            <th>Originator</th>
                            <th>Assignee</th>
                            <th>Actions</th>
                            <th>History</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <!-- total columns now 10 -->
                            <td colspan="10" class="ncr-empty">Loading…</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <footer class="ncr-table-footer">
                <div class="ncr-paging">
                    <button id="ncr-prev" class="ncr-btn" type="button" disabled>Prev</button>
                    <span id="ncr-page-info" class="ncr-muted">Page 1</span>
                    <button id="ncr-next" class="ncr-btn" type="button" disabled>Next</button>
                </div>
                <div class="ncr-total" id="ncr-total">0 records</div>
            </footer>
        </section>
    </div>

    <!-- CREATE NCR MODAL -->
    <div class="modal-overlay" id="ncr-modal" aria-hidden="true">
        <div class="modal-content" role="dialog" aria-modal="true" aria-labelledby="ncr-modal-title">
            <button type="button" class="close-btn" id="ncr-modal-close" aria-label="Close">&times;</button>
            <h2 id="ncr-modal-title" class="modal-title">NON-CONFORMANCE REPORT</h2>

            <!-- Hard-copy style table, modernized -->
            <div class="ncr-form-table" role="group" aria-labelledby="ncr-form-title">
                <!-- Header band -->
                <div class="ncr-form-header ncr-left-head">To be completed by Initiator / Auditor</div>
                <div class="ncr-form-header ncr-right-head">Verified by Supervisor/Immediate Superior:</div>

                <!-- Row 1 -->
                <div class="ncr-cell ncr-label">Initiator:</div>
                <div class="ncr-cell"><input class="ncr-input-line" type="text" placeholder="R. ARINGO"></div>

                <div class="ncr-cell ncr-label">Department:</div>
                <div class="ncr-cell"><input class="ncr-input-line" type="text" placeholder="TSD"></div>
                <div class="ncr-cell ncr-label ncr-date">Date :</div>
                <div class="ncr-cell"><input class="ncr-input-line" type="date"></div>

                <!-- Row 2 -->
                <div class="ncr-cell ncr-label">Assignee / Workcenter:</div>
                <div class="ncr-cell"><input class="ncr-input-line" type="text" placeholder="TSD"></div>

                <div class="ncr-cell ncr-label">Department:</div>
                <div class="ncr-cell"><input class="ncr-input-line" type="text" placeholder="TSD"></div>
                <div class="ncr-cell ncr-label ncr-date">Date :</div>
                <div class="ncr-cell"><input class="ncr-input-line" type="date"></div>
            </div>

            <!-- ===== Items / Quantities table — fixed 3 rows ===== -->
            <div class="ncr-items-table">
                <!-- Header row -->
                <div class="hdr item">Item / Part No.</div>
                <div class="hdr project">Project Name</div>
                <div class="hdr part">Part Name</div>
                <div class="hdr order" aria-label="Order / Delivery Qty">
                    <span>Order / Delivery Qty</span>
                    <div class="order-sub">
                        <div>Full</div>
                        <div>Partial</div>
                        <div>Bal</div>
                    </div>
                </div>
                <div class="hdr nonconf">Non-Conforming Qty</div>
                <div class="hdr scrap">Final Scrap Qty.</div>

                <!-- Row 1 -->
                <div class="cell"><input class="ncr-input-line" type="text" placeholder="B01"></div>
                <div class="cell"><input class="ncr-input-line" type="text" placeholder="S45B CONCAST SHOE"></div>
                <div class="cell"><input class="ncr-input-line" type="text" placeholder="CONCAST SHOE"></div>
                <div class="cell order-wrap">
                    <input class="ncr-input-line" type="number" min="0" step="1">
                    <input class="ncr-input-line" type="number" min="0" step="1">
                    <input class="ncr-input-line" type="number" min="0" step="1">
                </div>
                <div class="cell"><input class="ncr-input-line" type="number" min="0" step="1" placeholder="1"></div>
                <div class="cell"><input class="ncr-input-line" type="number" min="0" step="1"></div>

                <!-- Row 2 -->
                <div class="cell"><input class="ncr-input-line" type="text"></div>
                <div class="cell"><input class="ncr-input-line" type="text"></div>
                <div class="cell"><input class="ncr-input-line" type="text"></div>
                <div class="cell order-wrap">
                    <input class="ncr-input-line" type="number" min="0" step="1">
                    <input class="ncr-input-line" type="number" min="0" step="1">
                    <input class="ncr-input-line" type="number" min="0" step="1">
                </div>
                <div class="cell"><input class="ncr-input-line" type="number" min="0" step="1"></div>
                <div class="cell"><input class="ncr-input-line" type="number" min="0" step="1"></div>

                <!-- Row 3 -->
                <div class="cell"><input class="ncr-input-line" type="text"></div>
                <div class="cell"><input class="ncr-input-line" type="text"></div>
                <div class="cell"><input class="ncr-input-line" type="text"></div>
                <div class="cell order-wrap">
                    <input class="ncr-input-line" type="number" min="0" step="1">
                    <input class="ncr-input-line" type="number" min="0" step="1">
                    <input class="ncr-input-line" type="number" min="0" step="1">
                </div>
                <div class="cell"><input class="ncr-input-line" type="number" min="0" step="1"></div>
                <div class="cell"><input class="ncr-input-line" type="number" min="0" step="1"></div>
            </div>

            <!-- ===== Part Identification & Status (Check One) ===== -->
            <section class="ncr-checks">
                <div class="ncr-band">Part Identification &amp; Status (Check One)</div>

                <div class="ncr-checks-row">
                    <label class="ncr-check">
                        <input type="checkbox" id="chk-incoming">
                        <span>Incoming</span>
                    </label>

                    <label class="ncr-check">
                        <input type="checkbox" id="chk-inprocess">
                        <span>In-process</span>
                    </label>

                    <label class="ncr-check">
                        <input type="checkbox" id="chk-final">
                        <span>Final Inspection</span>
                    </label>

                    <label class="ncr-check ncr-check-test" for="chk-testing">
                        <input type="checkbox" id="chk-testing">
                        <span>Product Testing (No:</span>
                        <input type="text" class="ncr-input-line ncr-input-inline" aria-label="Product Testing Number">
                        <span>)</span>
                    </label>

                    <label class="ncr-check">
                        <input type="checkbox" id="chk-complaint">
                        <span>Customer Complaint</span>
                    </label>
                </div>
            </section>


        </div>
    </div>

    <!-- Front End JS -->
    <script src="../../current-date-time.js" type="text/javascript"></script>
    <script src="../../homepage.js" type="text/javascript"></script>
    <script src="../../logout.js" type="text/javascript"></script>
    <script src="../../pagination.js" type="text/javascript"></script>
    <script src="../../sidebar.js" type="text/javascript"></script>

    <!-- ncr js -->
    <script src="../js/ncr-request.js"></script>

    <!-- notif if sidebar -->
    <script src="../../sidebar-notif-with-folder.js"></script>

    <!-- CDN JS -->
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>

</body>

</html>