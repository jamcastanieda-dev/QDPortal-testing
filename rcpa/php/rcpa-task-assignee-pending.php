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
            <!-- <li class="not-selected">
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
            </li> -->

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

    <h2><span>RCPA Task (ASSIGNEE PENDING)</span></h2>

    <div class="rcpa-container">

        <div class="rcpa-back-btn-container">
            <button type="button" class="rcpa-back-btn" onclick="window.location.href='rcpa-task.php'"><i class="fa-solid fa-arrow-left"></i> Back</button>
        </div>
        <!-- RCPA Requests Card -->
        <section class="rcpa-card">
            <header class="rcpa-table-toolbar">

                <!-- rcpa-task-assignee-pending.php -->
                <!-- New top buttons -->
                <div class="rcpa-tabs" role="group" aria-label="RCPA views">
                    <a class="rcpa-tab is-active" aria-current="page" href="rcpa-task-assignee-pending.php">
                        ASSIGNEE PENDING
                    </a>
                    <a class="rcpa-tab" href="rcpa-task-assignee-corrective.php">
                        FOR CLOSING
                    </a>
                </div>


                <div class="rcpa-filters">
                    <select id="rcpa-filter-type" class="u-line">
                        <option value="">All Types</option>
                        <option value="external">External QMS Audit</option>
                        <option value="internal">Internal Quality Audit</option>
                        <option value="unattain">Un-attainment</option>
                        <option value="online">On-Line</option>
                        <option value="5s">5S / HS</option>
                        <option value="mgmt">Management Objective</option>
                    </select>
                </div>
            </header>

            <div class="rcpa-table-wrap">
                <table id="rcpa-table" class="rcpa-table">
                    <thead>
                        <tr>
                            <th>RCPA No.</th>
                            <th>RCPA Type</th>
                            <th>Category</th>
                            <th>Date Request</th>
                            <th>Reply due date</th> <!-- ⬅️ new -->
                            <th>Status</th>
                            <th>Originator</th>
                            <th>Assignee</th>
                            <th class="rcpa-col-actions">Actions</th>
                            <th class="rcpa-col-history">History</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <!-- total columns now 9 -->
                            <td colspan="10" class="rcpa-empty">Loading…</td>
                        </tr>
                    </tbody>
                </table>
            </div>


            <div id="action-container" class="action-container hidden">
                <button class="action-btn view-btn" id="view-button">View</button>
                <button class="action-btn view-btn" id="valid-button">Valid</button>
                <button class="action-btn view-btn" id="not-valid-button">Not Valid</button>
            </div>



            <footer class="rcpa-table-footer">
                <div class="rcpa-paging">
                    <button id="rcpa-prev" class="rcpa-btn" type="button" disabled>Prev</button>
                    <span id="rcpa-page-info" class="rcpa-muted">Page 1</span>
                    <button id="rcpa-next" class="rcpa-btn" type="button" disabled>Next</button>
                </div>
                <div class="rcpa-total" id="rcpa-total">0 records</div>
            </footer>
        </section>
    </div>

    <!-- view RCPA modal -->
    <div class="modal-overlay" id="rcpa-view-modal" hidden>
        <div class="modal-content">
            <span class="close-btn" id="rcpa-view-close">&times;</span>
            <h2 class="rcpa-title">REQUEST FOR CORRECTIVE &amp; PREVENTIVE ACTION</h2>

            <!-- Keep the same form class for identical look -->
            <form class="rcpa-form" action="#" method="post" novalidate>
                <!-- BASIC INFO / TYPE -->
                <fieldset class="rcpa-type">
                    <legend>RCPA Type</legend>

                    <!-- Type (read-only display) -->
                    <label class="stack">
                        <span>Type</span>
                        <input id="rcpa-view-type" class="u-line select-like type-select" type="text" readonly>
                    </label>

                    <!-- External QMS (VIEW) -->
                    <div class="type-conditional cond-3" id="v-type-external" hidden>
                        <label class="field sem-field">
                            <span class="sem-title">
                                <input type="checkbox" id="v-external-sem1-pick" class="sem-pick">
                                <span>1st Sem – Year</span>
                            </span>
                            <input class="u-line u-xs" type="text" id="v-external-sem1-year" inputmode="numeric" readonly>
                        </label>
                        <label class="field sem-field">
                            <span class="sem-title">
                                <input type="checkbox" id="v-external-sem2-pick" class="sem-pick">
                                <span>2nd Sem – Year</span>
                            </span>
                            <input class="u-line u-xs" type="text" id="v-external-sem2-year" inputmode="numeric" readonly>
                        </label>
                    </div>

                    <!-- Internal Quality (VIEW) -->
                    <div class="type-conditional cond-3" id="v-type-internal" hidden>
                        <label class="field sem-field">
                            <span class="sem-title">
                                <input type="checkbox" id="v-internal-sem1-pick" class="sem-pick">
                                <span>1st Sem – Year</span>
                            </span>
                            <input class="u-line u-xs" type="text" id="v-internal-sem1-year" inputmode="numeric" readonly>
                        </label>
                        <label class="field sem-field">
                            <span class="sem-title">
                                <input type="checkbox" id="v-internal-sem2-pick" class="sem-pick">
                                <span>2nd Sem – Year</span>
                            </span>
                            <input class="u-line u-xs" type="text" id="v-internal-sem2-year" inputmode="numeric" readonly>
                        </label>
                    </div>

                    <!-- Un-attainment (VIEW) -->
                    <div class="type-conditional cond-2" id="v-type-unattain" hidden>
                        <label class="field">
                            <span>Project Name</span>
                            <input class="u-line" type="text" id="v-project-name" readonly>
                        </label>
                        <label class="field">
                            <span>WBS Number</span>
                            <input class="u-line" type="text" id="v-wbs-number" readonly>
                        </label>
                    </div>

                    <!-- On-Line (VIEW) -->
                    <div class="type-conditional cond-1" id="v-type-online" hidden>
                        <label class="field">
                            <span>Year</span>
                            <input class="u-line u-xs" type="text" id="v-online-year" inputmode="numeric" readonly>
                        </label>
                    </div>

                    <!-- 5S / HS Concerns (VIEW) -->
                    <div class="type-conditional cond-2" id="v-type-hs" hidden>
                        <label class="field">
                            <span>For Month of</span>
                            <input class="u-line" type="text" id="v-hs-month" readonly>
                        </label>
                        <label class="field">
                            <span>Year</span>
                            <input class="u-line u-xs" type="text" id="v-hs-year" inputmode="numeric" readonly>
                        </label>
                    </div>

                    <!-- Management Objective (VIEW) -->
                    <div class="type-conditional cond-2" id="v-type-mgmt" hidden>
                        <label class="field">
                            <span>Year</span>
                            <input class="u-line u-xs" type="text" id="v-mgmt-year" inputmode="numeric" readonly>
                        </label>

                        <fieldset class="field quarters-inline">
                            <legend>Quarters</legend>
                            <label><input type="checkbox" id="rcpa-view-mgmt-q1"> 1st Qtr</label>
                            <label><input type="checkbox" id="rcpa-view-mgmt-q2"> 2nd Qtr</label>
                            <label><input type="checkbox" id="rcpa-view-mgmt-q3"> 3rd Qtr</label>
                            <label><input type="checkbox" id="rcpa-view-mgmt-ytd"> YTD</label>
                        </fieldset>
                    </div>
                </fieldset>

                <!-- STATUS FLOW -->
                <fieldset id="rcpa-status-flow" aria-live="polite">
                    <legend>STATUS FLOW</legend>
                    <ol id="rcpa-flow" class="rcpa-flow">
                        <li class="flow-step" data-key="REQUESTED">
                            <div class="flow-top"><span class="flow-name">—</span><span class="flow-date">—</span></div>
                            <div class="flow-node" aria-hidden="true"></div>
                            <div class="flow-label">REQUESTED</div>
                        </li>
                        <li class="flow-step" data-key="APPROVAL">
                            <div class="flow-top"><span class="flow-name">—</span><span class="flow-date">—</span></div>
                            <div class="flow-node" aria-hidden="true"></div>
                            <div class="flow-label">APPROVAL</div>
                        </li>
                        <li class="flow-step" data-key="QMS CHECKING">
                            <div class="flow-top"><span class="flow-name">—</span><span class="flow-date">—</span></div>
                            <div class="flow-node" aria-hidden="true"></div>
                            <div class="flow-label">QMS CHECKING</div>
                        </li>
                        <li class="flow-step" data-key="ASSIGNEE PENDING">
                            <div class="flow-top"><span class="flow-name">—</span><span class="flow-date">—</span></div>
                            <div class="flow-node" aria-hidden="true"></div>
                            <div class="flow-label">ASSIGNEE PENDING</div>
                        </li>
                    </ol>
                </fieldset>

                <!-- CATEGORY -->
                <fieldset class="category">
                    <legend>CATEGORY</legend>
                    <label><input type="checkbox" id="rcpa-view-cat-major"> Major</label>
                    <label><input type="checkbox" id="rcpa-view-cat-minor"> Minor</label>
                    <label><input type="checkbox" id="rcpa-view-cat-obs"> Observation</label>
                </fieldset>

                <!-- ORIGINATOR -->
                <fieldset class="originator">
                    <legend>ORIGINATOR</legend>

                    <div class="originator-top">
                        <label class="field">
                            <span>Name</span>
                            <input class="u-line" type="text" id="rcpa-view-originator-name" readonly>
                        </label>
                        <label class="field">
                            <span>Position / Dept.</span>
                            <input class="u-line" type="text" id="rcpa-view-originator-dept" readonly>
                        </label>
                        <label class="field">
                            <span>Date</span>
                            <input class="u-line u-dt" type="text" id="rcpa-view-date" readonly>
                        </label>
                    </div>

                    <!-- ORIGINATOR header flags (same place as request modal) -->
                    <div class="desc-header">
                        <span class="desc-title">Description of Findings</span>
                        <div class="desc-flags">
                            <label><input type="checkbox" id="rcpa-view-flag-nc"> Non-conformance</label>
                            <label><input type="checkbox" id="rcpa-view-flag-pnc"> Potential Non-conformance</label>
                        </div>
                    </div>

                    <div class="attach-wrap">
                        <textarea class="u-area" id="rcpa-view-remarks" rows="5" readonly></textarea>
                    </div>

                    <!-- files appear here -->
                    <div class="attach-list" id="rcpa-view-attach-list" aria-live="polite"></div>

                    <div class="originator-lines">
                        <label class="field">
                            <span>System / Applicable Std. Violated</span>
                            <input class="u-line" type="text" id="rcpa-view-system" readonly>
                        </label>
                        <label class="field">
                            <span>Standard Clause Number(s)</span>
                            <input class="u-line" type="text" id="rcpa-view-clauses" readonly>
                        </label>
                        <label class="field">
                            <span>Originator Supervisor or Head</span>
                            <input class="u-line" type="text" id="rcpa-view-supervisor" readonly>
                        </label>
                    </div>
                </fieldset>

                <!-- ASSIGNEE / STATUS -->
                <fieldset class="assignee">
                    <legend>ASSIGNEE</legend>
                    <label class="field">
                        <span>Department / Person</span>
                        <input class="u-line" type="text" id="rcpa-view-assignee" readonly>
                    </label>
                    <label class="field">
                        <span>Status</span>
                        <input class="u-line" type="text" id="rcpa-view-status" readonly>
                    </label>
                    <label class="field">
                        <span>Conformance</span>
                        <input class="u-line" type="text" id="rcpa-view-conformance" readonly>
                    </label>
                </fieldset>

                <!-- VALIDATION OF RCPA BY ASSIGNEE -->
                <fieldset class="validation" id="rcpa-view-valid-fieldset" hidden>
                    <legend>VALIDATION OF RCPA BY ASSIGNEE</legend>

                    <!-- Checkbox -->
                    <label class="inline-check">
                        <input type="checkbox" id="rcpa-view-findings-valid">
                        <span>Findings Valid</span>
                        <button type="button" id="rcpa-view-open-why" class="rcpa-btn rcpa-btn-secondary" style="margin-left:8px;">
                            Why-Why Analysis
                        </button>
                    </label>


                    <!-- Root cause textarea -->
                    <label class="field field-rootcause">
                        <span>Root Cause of Findings (based on Cause and Effect Diagram)</span>
                        <textarea class="u-area" id="rcpa-view-root-cause" rows="3" readonly></textarea>
                    </label>

                    <!-- Validation attachments (assignee) -->
                    <div class="attach-wrap" id="rcpa-view-valid-attach">
                        <div class="desc-title" style="margin-bottom:.25rem;">Attachments (Validation)</div>
                        <div class="attach-list" id="rcpa-view-valid-attach-list" aria-live="polite"></div>
                    </div>

                    <!-- For Non-conformance -->
                    <label class="inline-check checkbox-for-non-conformance">
                        <input type="checkbox" id="rcpa-view-for-nc-valid">
                        <span>For Non-conformance</span>
                    </label>

                    <!-- Correction (immediate action) + inline dates -->
                    <div class="correction-grid" id="rcpa-valid-nc-grid">
                        <label class="field field-correction">
                            <span>Correction (immediate action)</span>
                            <textarea class="u-area" id="rcpa-view-correction" rows="3" readonly></textarea>
                        </label>

                        <label class="field compact">
                            <span>Target Date</span>
                            <input class="u-line u-dt" type="date" id="rcpa-view-correction-target" readonly>
                        </label>

                        <label class="field compact">
                            <span>Date Completed</span>
                            <input class="u-line u-dt" type="date" id="rcpa-view-correction-done" readonly>
                        </label>
                    </div>

                    <!-- Corrective Action + inline dates -->
                    <div class="correction-grid corrective-grid" id="rcpa-valid-corrective-grid">
                        <label class="field field-correction">
                            <span>Corrective Action (prevent recurrence)</span>
                            <textarea class="u-area" id="rcpa-view-corrective" rows="3" readonly></textarea>
                        </label>

                        <label class="field compact">
                            <span>Target Date</span>
                            <input class="u-line u-dt" type="date" id="rcpa-view-corrective-target" readonly>
                        </label>

                        <label class="field compact">
                            <span>Date Completed</span>
                            <input class="u-line u-dt" type="date" id="rcpa-view-corrective-done" readonly>
                        </label>
                    </div>

                    <!-- For Potential Non-conformance -->
                    <label class="inline-check checkbox-for-potential-non-conformance">
                        <input type="checkbox" id="rcpa-view-for-pnc">
                        <span>For Potential Non-conformance</span>
                    </label>

                    <!-- Preventive Action + inline dates -->
                    <div class="correction-grid preventive-grid" id="rcpa-valid-pnc-grid">
                        <label class="field field-correction">
                            <span>Preventive Action</span>
                            <textarea class="u-area" id="rcpa-view-preventive" rows="3" readonly></textarea>
                        </label>

                        <label class="field compact">
                            <span>Target Date</span>
                            <input class="u-line u-dt" type="date" id="rcpa-view-preventive-target" readonly>
                        </label>

                        <label class="field compact">
                            <span>Date Completed</span>
                            <input class="u-line u-dt" type="date" id="rcpa-view-preventive-done" readonly>
                        </label>
                    </div>

                    <!-- Sign-offs -->
                    <!-- <div class="signatures-row">
                        <div class="signature-block">
                            <input class="u-line u-sign" type="text" id="rcpa-view-assignee-sign" readonly>
                            <div class="signature-caption">Assignee / Date</div>
                        </div>

                        <div class="signature-block">
                            <input class="u-line u-sign" type="text" id="rcpa-view-assignee-sup-sign" readonly>
                            <div class="signature-caption">Assignee Supervisor/Head/ Date</div>
                        </div>
                    </div> -->
                </fieldset>

                <!-- FINDINGS INVALIDATION REPLY (no legend) -->
                <fieldset class="validation validation-invalid" hidden>
                    <label class="inline-check checkbox-invalid">
                        <input type="checkbox" id="rcpa-view-findings-not-valid">
                        <span>Findings not valid, reason for non-validity</span>
                    </label>

                    <label class="field field-nonvalid">
                        <span class="sr-only">Reason for non-validity</span>
                        <textarea class="u-area" id="rcpa-view-not-valid-reason" rows="3" readonly></textarea>
                    </label>

                    <!-- Not-valid attachments appear here -->
                    <div class="attach-list" id="rcpa-view-not-valid-attach-list" aria-live="polite"></div>

                    <!-- <div class="signatures-row signatures-row-4">
                        <div class="signature-block">
                            <input class="u-line u-sign" type="text" id="rcpa-view-invalid-assignee-sign" readonly>
                            <div class="signature-caption">Assignee/Date</div>
                        </div>

                        <div class="signature-block">
                            <input class="u-line u-sign" type="text" id="rcpa-view-invalid-assignee-sup-sign" readonly>
                            <div class="signature-caption">Assignee Supervisor/Head/ Date</div>
                        </div>

                        <div class="signature-block">
                            <input class="u-line u-sign" type="text" id="rcpa-view-invalid-qms-sign" readonly>
                            <div class="signature-caption">QMS Team / Date</div>
                        </div>

                        <div class="signature-block">
                            <input class="u-line u-sign" type="text" id="rcpa-view-invalid-originator-sign" readonly>
                            <div class="signature-caption">Originator / Date</div>
                        </div>
                    </div> -->
                </fieldset>

                <!-- DISAPPROVE REMARKS -->
                <fieldset class="reject-remarks">
                    <legend>Disapprove Remarks</legend>
                    <div class="rcpa-table-wrap">
                        <table id="rcpa-rejects-table" aria-label="Disapprove remarks">
                            <thead>
                                <tr>
                                    <th>Type</th>
                                    <th>Date</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td class="rcpa-empty" colspan="3">No records found</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </fieldset>

            </form>
        </div>
    </div>

    <div class="modal-overlay" id="rcpa-why-view-modal" hidden aria-modal="true" role="dialog" aria-labelledby="rcpa-why-view-title">
        <div class="modal-content">
            <button type="button" class="close-btn" id="rcpa-why-view-close" aria-label="Close">×</button>
            <h2 id="rcpa-why-view-title" style="margin-top:0;">Why-Why Analysis</h2>

            <label for="rcpa-why-view-desc">Description of Findings</label>
            <div class="textarea-wrap" style="position:relative; margin-top:8px; margin-bottom: 16px;">
                <textarea id="rcpa-why-view-desc" readonly style="width:100%; min-height:110px; padding:10px; resize:vertical;"></textarea>
            </div>

            <div id="rcpa-why-view-list" style="display:flex; flex-direction:column; gap:12px;"></div>

            <div style="display:flex; gap:8px; justify-content:flex-end; margin-top:14px;">
                <button type="button" class="rcpa-btn" id="rcpa-why-view-ok">Close</button>
            </div>
        </div>
    </div>

    <!-- Viewer for a single disapproval remark -->
    <div class="modal-overlay" id="reject-remarks-modal" hidden>
        <div class="modal-content">
            <button type="button" class="close-btn" id="reject-remarks-close" aria-label="Close">&times;</button>
            <h3 class="rcpa-title" style="text-transform:none;margin:0 0 12px;">Disapproval Remarks</h3>

            <div class="stack">
                <span>Remarks</span>
                <textarea id="reject-remarks-text" class="u-area" readonly></textarea>
            </div>

            <div class="stack" style="margin-top:10px;">
                <span>Attachments</span>
                <div class="attach-list" id="reject-remarks-attach-list"></div>
            </div>
        </div>
    </div>

    <!-- History Modal -->
    <div id="rcpa-history-modal" class="modal-overlay" aria-hidden="true">
        <div class="modal-content modal-content--history" role="dialog" aria-modal="true" aria-labelledby="rcpa-history-title">
            <header class="rcpa-modal-header">
                <h3>History for RCPA #<span id="rcpa-history-title"></span></h3>
                <button id="rcpa-history-close" type="button" class="close-btn" aria-label="Close">&times;</button>
            </header>
            <div id="rcpa-history-body" class="rcpa-modal-body"></div>
        </div>
    </div>

    <!-- Why-Why Analysis Modal -->
    <div id="rcpa-why-modal" class="modal-overlay" hidden aria-modal="true" role="dialog" aria-labelledby="rcpa-why-title">
        <div class="modal-content">
            <button type="button" class="close-btn" id="rcpa-why-close" aria-label="Close">×</button>

            <h2 id="rcpa-why-title" style="margin-top:0;">Why-Why Analysis</h2>

            <label for="rcpa-why-text">Description of Findings</label>
            <div class="textarea-wrap" style="position:relative; margin-top:8px; margin-bottom: 16px;">
                <textarea
                    id="rcpa-why-text"
                    readonly
                    style="width:100%; min-height:120px; padding:10px; resize:vertical;"></textarea>
            </div>

            <div id="rcpa-why-chains-container" style="display: flex; flex-direction: row; flex-wrap: wrap; gap: 16px; align-items: flex-start;">
            </div>

            <button type="button" id="rcpa-why-add-chain" class="rcpa-btn rcpa-btn-secondary" hidden style="margin-bottom: 16px;">
                <i class="fa-solid fa-plus" style="margin-right: 6px;"></i> Add New Analysis
            </button>


            <small id="rcpa-why-error" style="display:block; color:#b91c1c; margin-top:16px; text-align:right;"></small>

            <div style="display:flex; gap:8px; justify-content:flex-end; margin-top:8px;">
                <button type="button" id="rcpa-why-next" class="rcpa-btn">Next</button>
            </div>
        </div>
    </div>

    <!-- Findings VALID Modal -->
    <div id="rcpa-valid-modal" class="modal-overlay" hidden aria-modal="true" role="dialog" aria-labelledby="rcpa-valid-title">
        <div class="modal-content">
            <button type="button" class="close-btn" id="rcpa-valid-close" aria-label="Close">×</button>

            <h2 id="rcpa-valid-title" style="margin-top:0;">Findings Valid</h2>

            <form id="rcpa-valid-form">
                <!-- Root cause (always shown) -->
                <label for="valid-root-cause" style="font-weight:600; margin:0 0 6px 0;">
                    Root Cause of Findings (based on Cause and Effect Diagram)
                </label>

                <div class="textarea-wrap" style="position:relative; margin-bottom:6px;">
                    <textarea
                        id="valid-root-cause"
                        placeholder="Describe the root cause…"
                        style="width:100%; min-height:120px; padding:10px; padding-left:48px; padding-bottom:48px; resize:vertical;" readonly></textarea>

                    <!-- Paperclip inside textarea (bottom-left) -->
                    <i
                        id="valid-attach-trigger"
                        class="fa-solid fa-paperclip attach-icon"
                        role="button"
                        tabindex="0"
                        aria-label="Attach files"></i>

                    <!-- Hidden input for files -->
                    <input
                        id="valid-attachments"
                        type="file"
                        multiple
                        hidden />
                </div>

                <!-- Selected attachments preview -->
                <div id="valid-attach-list" style="margin-top:8px; display:flex; flex-wrap:wrap; gap:8px;"></div>

                <!-- NON-CONFORMANCE SECTION (shown when conformance = Non-conformance) -->
                <div id="valid-nc-section" hidden style="margin-top:16px;">
                    <div style="font-weight:700; margin-bottom:8px;">For Non-conformance</div>

                    <!-- Correction (immediate action) -->
                    <div class="valid-grid">
                        <div class="col">
                            <label class="field-title" for="valid-correction">Correction (immediate action)</label>
                            <textarea id="valid-correction" style="width:100%; min-height:100px; padding:10px; resize:vertical;"></textarea>
                        </div>
                        <div class="col">
                            <label class="field-title" for="valid-correction-target">Target Date</label>
                            <input type="date" id="valid-correction-target" />
                        </div>
                        <div class="col">
                            <label class="field-title" for="valid-correction-completed">Date Completed</label>
                            <input type="date" id="valid-correction-completed" />
                        </div>
                    </div>

                    <!-- Corrective Action (prevent recurrence) -->
                    <div class="valid-grid" style="margin-top:12px;">
                        <div class="col">
                            <label class="field-title" for="valid-corrective">Corrective Action (prevent recurrence)</label>
                            <textarea id="valid-corrective" style="width:100%; min-height:100px; padding:10px; resize:vertical;"></textarea>
                        </div>
                        <div class="col">
                            <label class="field-title" for="valid-corrective-target">Target Date</label>
                            <input type="date" id="valid-corrective-target" />
                        </div>
                        <div class="col">
                            <label class="field-title" for="valid-corrective-completed">Date Completed</label>
                            <input type="date" id="valid-corrective-completed" />
                        </div>
                    </div>
                </div>

                <!-- POTENTIAL NON-CONFORMANCE SECTION (shown when conformance = Potential Non-conformance) -->
                <div id="valid-pnc-section" hidden style="margin-top:16px;">
                    <div style="font-weight:700; margin-bottom:8px;">For Potential Non-conformance</div>
                    <div class="valid-grid">
                        <div class="col">
                            <label class="field-title" for="valid-pnc-text">Preventive Action</label>
                            <textarea id="valid-pnc-text" style="width:100%; min-height:100px; padding:10px; resize:vertical;"></textarea>
                        </div>
                        <div class="col">
                            <label class="field-title" for="valid-pnc-target">Target Date</label>
                            <input type="date" id="valid-pnc-target" />
                        </div>
                        <div class="col">
                            <label class="field-title" for="valid-pnc-completed">Date Completed</label>
                            <input type="date" id="valid-pnc-completed" />
                        </div>
                    </div>
                </div>

                <small id="rcpa-valid-error" style="display:block; color:#b91c1c; margin-top:8px;"></small>

                <!-- inside #rcpa-valid-form footer -->
                <div style="display:flex; gap:8px; justify-content:flex-end; margin-top:14px;">
                    <button type="button" id="rcpa-valid-back" class="rcpa-btn rcpa-btn-secondary">Back</button>
                    <button type="submit" id="rcpa-valid-submit" class="rcpa-btn">Submit</button>
                </div>
            </form>
        </div>
    </div>

    <!-- Findings INVALIDATION REPLY Modal -->
    <div id="rcpa-not-valid-modal" class="modal-overlay" hidden aria-modal="true" role="dialog" aria-labelledby="rcpa-not-valid-title">
        <div class="modal-content">
            <button type="button" class="close-btn" id="rcpa-not-valid-close" aria-label="Close">×</button>

            <h3 id="rcpa-not-valid-title" style="margin-top:0;">
                Findings not valid, reason for non-validity (please attached evidence)
            </h3>

            <form id="rcpa-not-valid-form">
                <label for="not-valid-reason" style="display:block; font-weight:600; margin-bottom:6px;">
                    Reason for non-validity
                </label>

                <!-- Textarea + paperclip inside -->
                <div class="textarea-wrap" style="position:relative; margin-bottom:6px;">
                    <textarea
                        id="not-valid-reason"
                        placeholder="Explain why the findings are not valid…"
                        style="width:100%; min-height:140px; padding:10px; padding-left:48px; padding-bottom:48px; resize:vertical;"></textarea>

                    <!-- Paperclip icon (inside, bottom-left) -->
                    <i
                        id="not-valid-attach-trigger"
                        class="fa-solid fa-paperclip attach-icon"
                        role="button"
                        tabindex="0"
                        aria-label="Attach evidence"></i>

                    <!-- Hidden input for files -->
                    <input id="not-valid-files" type="file" multiple hidden accept="'pdf', 'png', 'jpg', 'jpeg', 'webp', 'heic', 'doc', 'docx', 'xls', 'xlsx', 'txt'" />
                </div>

                <!-- Preview chips (optional but useful) -->
                <div id="not-valid-attach-list" style="margin-top:8px; display:flex; flex-wrap:wrap; gap:8px;"></div>

                <small id="rcpa-not-valid-error" style="display:block; color:#b91c1c; margin-top:6px;"></small>

                <div style="display:flex; gap:8px; justify-content:flex-end; margin-top:14px;">
                    <button type="submit" id="rcpa-not-valid-submit" class="rcpa-btn">Submit</button>
                </div>
            </form>
        </div>
    </div>

    <!-- Front End JS -->
    <script src="../../current-date-time.js" type="text/javascript"></script>
    <script src="../../homepage.js" type="text/javascript"></script>
    <script src="../../logout.js" type="text/javascript"></script>
    <script src="../../pagination.js" type="text/javascript"></script>
    <script src="../../sidebar.js" type="text/javascript"></script>

    <script src="../js/rcpa-task-assignee-pending.js"></script>
    <script src="../js/rcpa-notif-sub-menu-count.js"></script>


    <!-- CDN JS -->
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
</body>

</html>