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

    <title>RCPA Request</title>
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
                        <a class="sublist-selected" class="has-badge">
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
                        <a href="rcpa-task.php" class="has-badge">
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

    <h2><span>RCPA Request</span></h2>

    <div class="rcpa-container">
        <div class="rcpa-request-btn-container">

            <div class="rcpa-filters">
                <select id="rcpa-filter-status" class="u-line">
                    <option value="">All Status</option>
                    <option value="QMS CHECKING">QMS CHECKING</option>
                    <option value="FOR APPROVAL OF SUPERVISOR">FOR APPROVAL OF SUPERVISOR</option>
                    <option value="FOR APPROVAL OF MANAGER">FOR APPROVAL OF MANAGER</option>
                    
                    <option value="REJECTED">REJECTED</option>
                    <option value="ASSIGNEE PENDING">ASSIGNEE PENDING</option>
                    <option value="VALID APPROVAL">VALID APPROVAL</option>
                    <option value="IN-VALID APPROVAL">IN-VALID APPROVAL</option>
                    <option value="IN-VALIDATION REPLY">IN-VALIDATION REPLY</option>
                    <option value="VALIDATION REPLY">VALIDATION REPLY</option>
                    <option value="VALIDATION REPLY APPROVAL">VALIDATION REPLY APPROVAL</option>
                    <option value="IN-VALIDATION REPLY APPROVAL">IN-VALIDATION REPLY APPROVAL</option>
                    <option value="FOR CLOSING">FOR CLOSING</option>
                    <option value="FOR CLOSING APPROVAL">FOR CLOSING APPROVAL</option>
                    <option value="EVIDENCE CHECKING">EVIDENCE CHECKING</option>
                    <option value="EVIDENCE CHECKING APPROVAL">EVIDENCE CHECKING APPROVAL</option>
                    <option value="EVIDENCE APPROVAL">EVIDENCE APPROVAL</option>
                    <option value="CLOSED (VALID)">CLOSED (VALID)</option>
                    <option value="CLOSED (IN-VALID)">CLOSED (IN-VALID)</option>
                    <option value="REPLY CHECKING - ORIGINATOR">REPLY CHECKING - ORIGINATOR</option>
                    <option value="EVIDENCE CHECKING - ORIGINATOR">EVIDENCE CHECKING - ORIGINATOR</option>
                    <option value="IN-VALID APPROVAL - ORIGINATOR">IN-VALID APPROVAL - ORIGINATOR</option>

                </select>

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
            <button class="rcpa-request-btn" id="rcpa-req-btn">Request</button>
        </div>

        <!-- RCPA Requests Card -->
        <section class="rcpa-card">
            <header class="rcpa-table-toolbar">

            </header>

            <div class="rcpa-table-wrap">
                <table id="rcpa-table" class="rcpa-table">
                    <thead>
                        <tr>
                            <th>RCPA No.</th>
                            <th>RCPA Type</th>
                            <th>Category</th>
                            <th>Date Request</th>
                            <th>Closing due date</th> <!-- NEW -->
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
                            <td colspan="10" class="rcpa-empty">Loading…</td>
                        </tr>
                    </tbody>
                </table>
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

    <!-- Create RCPA modal -->
    <div class="modal-overlay" id="rcpa-request-modal">
        <div class="modal-content">
            <span class="close-btn" id="rcpa-close-modal">&times;</span>
            <h2 class="rcpa-title">REQUEST FOR CORRECTIVE &amp; PREVENTIVE ACTION</h2>

            <form class="rcpa-form" action="#" method="post" novalidate enctype="multipart/form-data">
                <!-- LEFT: Check RCPA Type -->
                <fieldset class="rcpa-type">
                    <legend>RCPA Type</legend>

                    <!-- Type selector -->
                    <label class="stack">
                        <span>Select type *</span>
                        <select id="rcpa-type" name="rcpa_type" class="u-line select-like type-select" required>
                            <option value="" selected disabled>Choose…</option>
                            <option value="external">External QMS Audit</option>
                            <option value="internal">Internal Quality Audit</option>
                            <option value="unattain">Un-attainment of delivery target of Project</option>
                            <option value="online">On-Line</option>
                            <option value="5s">5S Audit / Health &amp; Safety Concerns</option>
                            <option value="mgmt">Management Objective</option>
                        </select>
                    </label>

                    <!-- External QMS -->
                    <div class="type-conditional cond-3" id="type-external" hidden>
                        <label class="field sem-field">
                            <span class="sem-title">
                                <input type="checkbox" name="external_sem1_pick" class="sem-pick">
                                <span>1st Sem – Year</span>
                            </span>
                            <input class="u-line u-xs" type="text" name="external_sem1_year" inputmode="numeric" readonly>
                        </label>
                        <label class="field sem-field">
                            <span class="sem-title">
                                <input type="checkbox" name="external_sem2_pick" class="sem-pick">
                                <span>2nd Sem – Year</span>
                            </span>
                            <input class="u-line u-xs" type="text" name="external_sem2_year" inputmode="numeric" readonly>
                        </label>
                    </div>

                    <!-- Internal Quality -->
                    <div class="type-conditional cond-3" id="type-internal" hidden>
                        <label class="field sem-field">
                            <span class="sem-title">
                                <input type="checkbox" name="internal_sem1_pick" class="sem-pick">
                                <span>1st Sem – Year</span>
                            </span>
                            <input class="u-line u-xs" type="text" name="internal_sem1_year" inputmode="numeric" readonly>
                        </label>
                        <label class="field sem-field">
                            <span class="sem-title">
                                <input type="checkbox" name="internal_sem2_pick" class="sem-pick">
                                <span>2nd Sem – Year</span>
                            </span>
                            <input class="u-line u-xs" type="text" name="internal_sem2_year" inputmode="numeric" readonly>
                        </label>
                    </div>

                    <!-- Un-attainment -->
                    <div class="type-conditional cond-2" id="type-unattain" hidden>
                        <label class="field">
                            <span>Project Name</span>
                            <input class="u-line" type="text" name="project_name">
                        </label>
                        <label class="field">
                            <span>WBS Number</span>
                            <input class="u-line" type="text" name="wbs_number">
                        </label>
                    </div>

                    <!-- On-Line -->
                    <div class="type-conditional cond-1" id="type-online" hidden>
                        <label class="field">
                            <span>Year</span>
                            <input class="u-line u-xs" type="text" name="online_year" inputmode="numeric">
                        </label>
                    </div>

                    <!-- 5S / HS Concerns -->
                    <div class="type-conditional cond-2" id="type-hs" hidden>
                        <label class="field">
                            <span>For Month of</span>
                            <select class="u-line" name="hs_month" id="hs_month">
                                <option value="" selected disabled hidden>— Select month —</option>
                                <option>January</option>
                                <option>February</option>
                                <option>March</option>
                                <option>April</option>
                                <option>May</option>
                                <option>June</option>
                                <option>July</option>
                                <option>August</option>
                                <option>September</option>
                                <option>October</option>
                                <option>November</option>
                                <option>December</option>
                            </select>
                        </label>
                        <label class="field">
                            <span>Year</span>
                            <input class="u-line u-xs" type="text" name="hs_year" inputmode="numeric" readonly>
                        </label>
                    </div>


                    <!-- Management Objective -->
                    <div class="type-conditional cond-2" id="type-mgmt" hidden>
                        <label class="field">
                            <span>Year</span>
                            <input class="u-line u-xs" type="text" name="mgmt_year" inputmode="numeric">
                        </label>

                        <fieldset class="field quarters-inline">
                            <legend>Quarters</legend>
                            <label><input type="checkbox" name="mgmt_q1"> 1st Qtr</label>
                            <label><input type="checkbox" name="mgmt_q2"> 2nd Qtr</label>
                            <label><input type="checkbox" name="mgmt_q3"> 3rd Qtr</label>
                            <label><input type="checkbox" name="mgmt_ytd"> YTD</label>
                        </fieldset>
                    </div>

                </fieldset>

                <!-- CATEGORY -->
                <fieldset class="category">
                    <legend>CATEGORY</legend>
                    <label><input type="checkbox" name="cat_major" /> Major</label>
                    <label><input type="checkbox" name="cat_minor" /> Minor</label>
                    <label><input type="checkbox" name="cat_observation" /> Observation</label>
                </fieldset>

                <!-- ORIGINATOR -->
                <fieldset class="originator">
                    <legend>ORIGINATOR</legend>

                    <div class="originator-top">
                        <label class="field">
                            <span>Name</span>
                            <input class="u-line" type="text" name="originator_name" readonly />
                        </label>
                        <label class="field">
                            <span>Position / Dept.</span>
                            <input class="u-line" type="text" name="originator_dept" readonly />
                        </label>
                        <label class="field">
                            <span>Date</span>
                            <!-- was: type="date" -->
                            <!-- was: class="u-line u-sm" type="date" -->
                            <!-- Date (read-only, shows seconds) -->
                            <input class="u-line u-dt" type="datetime-local" name="originator_date" readonly step="1" />

                        </label>
                    </div>

                    <div class="desc-header">
                        <span class="desc-title">
                            Description of Findings <em>(please attach evidence)</em>
                        </span>
                        <div class="desc-flags">
                            <label><input type="checkbox" name="nc_flag" /> Non-conformance</label>
                            <label><input type="checkbox" name="pnc_flag" /> Potential Non-conformance</label>
                        </div>
                    </div>

                    <!-- Description textarea with bare paperclip -->
                    <div class="attach-wrap">
                        <textarea class="u-area" id="finding_description" name="finding_description" rows="5" required></textarea>

                        <!-- hidden file input -->
                        <input type="file" id="finding_files" name="finding_files[]" class="visually-hidden" multiple required>

                        <!-- clickable paperclip -->
                        <label for="finding_files" class="attach-icon" title="Attach files">
                            <i class="fa-solid fa-paperclip" aria-hidden="true"></i>
                            <span class="sr-only">Attach files</span>
                        </label>

                        <!-- small count badge -->
                        <span class="attach-badge" id="attach_count" hidden>0</span>
                    </div>

                    <!-- files show up here -->
                    <div class="attach-list" id="attach_list" aria-live="polite"></div>

                    <div class="originator-lines">
                        <label class="field">
                            <span>System / Applicable Std. Violated</span>
                            <input class="u-line" type="text" name="system_violated" placeholder="Enter your System / Applicable Std. Violated..." />
                        </label>
                        <label class="field">
                            <span>Standard Clause Number(s)</span>
                            <input class="u-line" type="text" name="clause_numbers" placeholder="Enter your Standard Clause Number(s)..." />
                        </label>
                        <label class="field" for="originatorSupervisor">
                            <span>Originator Supervisor or Head *</span>
                        </label>
                        <select class="u-line" id="originatorSupervisor" name="originator_supervisor" required>
                            <option value="" disabled selected hidden>— Select —</option>
                        </select>
                    </div>
                </fieldset>

                <!-- ASSIGNEE -->
                <fieldset class="assignee">
                    <legend>ASSIGNEE</legend>
                    <label class="field">
                        <span>Department *</span>
                        <!-- was: <input class="u-line" type="text" name="assignee" /> -->
                        <select class="u-line" id="assigneeSelect" name="assignee" required>
                            <option value="" disabled selected hidden>— Select —</option>
                        </select>
                    </label>
                </fieldset>


                <div class="actions">
                    <button type="submit" id="rcpa-submit-request">Submit</button>
                </div>
            </form>
        </div>
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
                <fieldset class="validation">
                    <legend>VALIDATION OF RCPA BY ASSIGNEE</legend>

                    <!-- These three are shown only for Non-conformance -->
                    <label class="inline-check val-nc-only">
                        <input type="checkbox" id="rcpa-view-findings-valid">
                        <span>Findings Valid</span>
                    </label>

                    <label class="field field-rootcause val-nc-only">
                        <span>Root Cause of Findings (based on Cause and Effect Diagram)</span>
                        <textarea class="u-area" id="rcpa-view-root-cause" rows="3" readonly></textarea>
                    </label>

                    <div class="attach-wrap val-nc-only" id="rcpa-view-valid-attach">
                        <div class="desc-title" style="margin-bottom:.25rem;">Attachments (Validation)</div>
                        <div class="attach-list" id="rcpa-view-valid-attach-list" aria-live="polite"></div>
                    </div>

                    <!-- NC-only -->
                    <label class="inline-check checkbox-for-non-conformance">
                        <input type="checkbox" id="rcpa-view-for-nc-valid">
                        <span>For Non-conformance</span>
                    </label>

                    <!-- NC-only -->
                    <div class="correction-grid">
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

                    <!-- NC-only -->
                    <div class="correction-grid corrective-grid">
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

                    <!-- PNC-only -->
                    <label class="inline-check checkbox-for-potential-non-conformance">
                        <input type="checkbox" id="rcpa-view-for-pnc">
                        <span>For Potential Non-conformance</span>
                    </label>

                    <!-- PNC-only -->
                    <div class="correction-grid preventive-grid">
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
                </fieldset>

                <!-- FINDINGS IN-VALIDATION REPLY (no legend) -->
                <fieldset class="validation validation-invalid">
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

                <!-- Verification of Implementation on Correction, Corrective Action, Preventive Action -->
                <fieldset class="evidence-checking" id="rcpa-view-evidence" hidden>
                    <legend>Verification of Implementation on Correction, Corrective Action, Preventive Action</legend>

                    <label class="field">
                        <div class="ev-action-row" role="group" aria-labelledby="ev-action-title">
                            <span id="ev-action-title" class="ev-action-title">Action Done</span>

                            <div class="inline-bools" id="rcpa-view-ev-action">
                                <label class="ev-action-opt">
                                    <input type="checkbox" id="rcpa-view-ev-action-yes">
                                    <span>Yes</span>
                                </label>

                                <label class="ev-action-opt" style="margin-left:.75rem;">
                                    <input type="checkbox" id="rcpa-view-ev-action-no">
                                    <span>No</span>
                                </label>
                            </div>
                        </div>
                    </label>

                    <label class="field">
                        <span>Remarks</span>
                        <textarea class="u-area" id="rcpa-view-ev-remarks" rows="3" readonly></textarea>
                    </label>

                    <div class="attach-wrap" id="rcpa-view-ev-attach">
                        <div class="desc-title" style="margin-bottom:.25rem;">Attachments (Evidence Checking)</div>
                        <div class="attach-list" id="rcpa-view-ev-attach-list" aria-live="polite"></div>
                    </div>
                </fieldset>

                <!-- FOLLOW-UP FOR EFFECTIVENESS -->
                <fieldset class="follow-up" id="rcpa-view-followup" hidden>
                    <legend>Follow up for Effectiveness of Action Taken</legend>

                    <label class="field compact">
                        <span>Target Date</span>
                        <input class="u-line u-dt" type="date" id="rcpa-view-followup-date" readonly>
                    </label>

                    <label class="field">
                        <span>Remarks</span>
                        <textarea class="u-area" id="rcpa-view-followup-remarks" rows="3" readonly></textarea>
                    </label>

                    <div class="attach-wrap" id="rcpa-view-followup-attach">
                        <div class="desc-title" style="margin-bottom:.25rem;">Attachments (Follow-up)</div>
                        <div class="attach-list" id="rcpa-view-followup-attach-list" aria-live="polite"></div>
                    </div>
                </fieldset>

                <!-- CORRECTIVE ACTION EVIDENCE -->
                <fieldset class="corrective-evidence">
                    <legend>CORRECTIVE ACTION EVIDENCE</legend>

                    <label class="field">
                        <span>Remarks</span>
                        <textarea class="u-area" id="rcpa-view-corrective-remarks" rows="3" readonly></textarea>
                    </label>

                    <div class="attach-wrap" id="rcpa-view-corrective-attach">
                        <div class="desc-title" style="margin-bottom:.25rem;">Attachments (Corrective Evidence)</div>
                        <div class="attach-list" id="rcpa-view-corrective-attach-list" aria-live="polite"></div>
                    </div>
                </fieldset>

                <!-- APPROVALS -->
                <fieldset class="approvals">
                    <legend>APPROVAL REMARKS</legend>
                    <table id="rcpa-approvals-table" class="rcpa-table">
                        <thead>
                            <tr>
                                <th>Type</th>
                                <th>Date &amp; Time</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td class="rcpa-empty" colspan="3">No records found</td>
                            </tr>
                        </tbody>
                    </table>
                </fieldset>

                <!-- REJECTIONS -->
                <fieldset class="rejects">
                    <legend>DISAPPROVAL REMARKS</legend>
                    <table id="rcpa-rejects-table" class="rcpa-table">
                        <thead>
                            <tr>
                                <th>Disapprove Type</th>
                                <th>Date &amp; Time</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td class="rcpa-empty" colspan="3">No records found</td>
                            </tr>
                        </tbody>
                    </table>
                </fieldset>

                <!-- ORIGINATOR ACTIONS (shown only when status = REPLY CHECKING - ORIGINATOR) -->
                <div id="rcpa-originator-actions" class="rcpa-actions" hidden>
                    <button type="button" id="rcpa-disapprove-btn" class="rcpa-btn disapprove">Disapprove</button>
                    <button type="button" id="rcpa-approve-btn" class="rcpa-btn approve">Approve</button>
                </div>
            </form>
        </div>
    </div>

    <!-- NEW: Reject Remarks Modal -->
    <div id="reject-remarks-modal" class="modal-overlay" aria-hidden="true">
        <div class="modal-content">
            <button type="button" class="close-btn" id="reject-remarks-close" aria-label="Close">&times;</button>

            <h3 class="rcpa-title" style="text-transform:none;margin:0 0 12px;">Disapproval Remarks</h3>

            <div class="stack">
                <span>Remarks</span>
                <textarea id="reject-remarks-text" class="u-area" readonly></textarea>
            </div>

            <div class="attach-list" id="reject-remarks-files" aria-live="polite"></div>

        </div>
    </div>

    <!-- Viewer for a single approval remark -->
    <div class="modal-overlay" id="approve-remarks-modal" aria-hidden="true">
        <div class="modal-content">
            <button type="button" class="close-btn" id="approve-remarks-close" aria-label="Close">&times;</button>
            <h3 class="rcpa-title" style="text-transform:none;margin:0 0 12px;">Approval Remarks</h3>

            <div class="stack">
                <span>Remarks</span>
                <textarea id="approve-remarks-text" class="u-area" readonly></textarea>
            </div>

            <div class="stack" style="margin-top:10px;">
                <span>Attachments</span>
                <!-- will be injected if missing -->
                <div class="attach-list" id="approve-remarks-files"></div>
            </div>
        </div>
    </div>

    <div class="modal-overlay" id="rcpa-reject-modal" hidden>
        <div class="modal-content" id="rcpa-reject-content">
            <button type="button" class="close-btn" id="rcpa-reject-close" aria-label="Close">&times;</button>
            <h3>Return to QMS/QA Team — Reason</h3>

            <form id="rcpa-reject-form" novalidate enctype="multipart/form-data">
                <label class="field" style="display:block;margin-top:8px;">
                    <div class="reject-attach-wrap">
                        <textarea id="rcpa-reject-remarks" class="u-area" rows="6"
                            placeholder="Please provide the reason..." required></textarea>

                        <!-- paperclip button (icon only) -->
                        <button type="button" class="attach-icon reject-attach-icon"
                            id="rcpa-reject-clip" title="Attach files">
                            <i class="fa-solid fa-paperclip" aria-hidden="true"></i>
                        </button>

                        <!-- count badge -->
                        <span class="attach-badge reject-attach-badge" id="rcpa-reject-attach-count" hidden>0</span>

                        <!-- hidden file input (allow ALL file types) -->
                        <input id="rcpa-reject-files" name="attachments[]" type="file" multiple class="visually-hidden">
                    </div>
                </label>

                <!-- list of selected files -->
                <div class="reject-files-list" id="rcpa-reject-files-list"></div>

                <div class="actions" style="margin-top:12px; display:flex; gap:8px;">
                    <button type="button" id="rcpa-reject-cancel">Cancel</button>
                    <button type="submit" id="rcpa-reject-submit">Submit</button>
                </div>
            </form>
        </div>
    </div>

    <!-- Simple History Modal -->
    <!-- History Modal -->
    <div id="rcpa-history-modal" class="modal-overlay" aria-hidden="true">
        <div class="modal-content" role="dialog" aria-modal="true" aria-labelledby="rcpa-history-title">
            <header class="rcpa-modal-header">
                <h3>History for RCPA #<span id="rcpa-history-title"></span></h3>
                <button id="rcpa-history-close" type="button" class="close-btn" aria-label="Close">&times;</button>
            </header>
            <div id="rcpa-history-body" class="rcpa-modal-body"></div>
        </div>
    </div>

    <!-- Front End JS -->
    <script src="../../current-date-time.js" type="text/javascript"></script>
    <script src="../../homepage.js" type="text/javascript"></script>
    <script src="../../logout.js" type="text/javascript"></script>
    <script src="../../pagination.js" type="text/javascript"></script>
    <script src="../../sidebar.js" type="text/javascript"></script>

    <script src="../js/rcpa-request.js"></script>
    <script src="../js/rcpa-notif-sub-menu-count.js"></script>


    <!-- CDN JS -->
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
    <!-- Choices.js (no jQuery) -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/choices.js/public/assets/styles/choices.min.css">
    <script src="https://cdn.jsdelivr.net/npm/choices.js/public/assets/scripts/choices.min.js"></script>
</body>

</html>