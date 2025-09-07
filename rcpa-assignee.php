<?php 
    include "navigation-bar.html";
    include "custom-scroll-bar.html";
    include "custom-elements.html";
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
    <link rel="stylesheet" href="style-rcpa.css">
    <title>RCPA</title>
</head>
<body>
    <div class="wrap-grid">
        <nav id="sidebar">
            <div class="sidebar-header">
                <a href="homepage.php"><p>RAMCAR TECHNOLOGY INC.</p></a>
            </div>
            <!-- Sidebar Menu Button List -->
            <ul class="sidebar-menu-list">
                <li class="not-selected">
                    <a href="ncr-admin.php">NCR<span class="notification-badge">8</span></a>
                </li>
                <li class="not-selected">
                    <a href="mrb-request.php">MRB<span class="notification-badge">3</span></a>
                </li>
                <li class="selected">
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
    </div>

    <div class="rcpa-content-container">
        <h2>Request For Corrective & Preventive Action</h2>
        <div class="inner-container">
            <!-- Bold label for RCPA type -->
            <label class="rcpa-label" for="rcpaType">Check RCPA type</label>
            <!-- First row -->
            <div class="row">
                <div class="column">
                    <input type="radio" id="externalQMSAudit" class="custom-radio top-position">
                    <label for="externalQMSAudit">External QMS Audit by</label>
                    <input type="text" class="underline-input input-width" name="externalQMSAuditBy">
                </div>
                <div class="column">
                    <input type="radio" id="firstSemesterYear" class="custom-radio top-position">
                    <label for="firstSemesterYear">1st Sem - Year:</label>
                    <select id="external-first-year-select"></select>
                </div>
                <div class="column">
                    <input type="radio" id="secondSemesterYear" class="custom-radio top-position">
                    <label for="secondSemesterYear">2nd Sem - Year:</label>
                    <select id="external-second-year-select"></select>
                </div>
            </div>
        
            <!-- Second row -->
            <div class="row">
                <div class="column">
                    <input type="radio" id="internalQualityAudit" class="custom-radio top-position">
                    <label for="internalQualityAudit">Internal Quality Audit:</label>
                </div>
                <div class="column">
                    <input type="radio" id="internalAuditFirstSemester" class="custom-radio top-position">
                    <label for="internalAuditFirstSemester">1st Sem - Year:</label>
                    <select id="internal-first-year-select"></select>
                </div>
                <div class="column">
                    <input type="radio" id="internalAuditSecondSemester" class="custom-radio top-position">
                    <label for="internalAuditSecondSemester">2nd Sem - Year:</label>
                    <select id="internal-second-year-select"></select>
                </div>
            </div>
        
            <!-- Third row -->
            <div class="row">
                <div class="column">
                    <input type="radio" id="deliveryTargetFailure" class="custom-radio top-position">
                    <label for="deliveryTargetFailure">Un-attainment of delivery target of Project</label>
                </div>
                <div class="column">
                    <label for="projectName" class="aligned-label">Project Name</label>
                    <input type="text" id="projectName" class="underline-input input-width" name="projectName">
                </div>
                <div class="column">
                    <label for="wbsNumber" class="aligned-label">WBS Number</label>
                    <input type="text" id="wbsNumber" class="underline-input input-width" name="wbsNumber">
                </div>
            </div>
        
            <!-- Fourth row -->
            <div class="row">
                <div class="column">
                    <div class="group-container">
                        <div>
                            <input type="radio" id="onlineProcessAudit" class="custom-radio top-position">
                            <label for="onlineProcessAudit">On-line</label>
                        </div>
                        <div>
                            <label for="auditYear" class="aligned-label">Year: </label>
                            <input type="text" id="onlineYear" name="onlineYear" value="<?php echo date('Y'); ?>" class="auto-year" readonly>
                        </div>
                    </div>
                </div>
                <div class="column"></div>
                <div class="column"></div>
            </div>
        
            <!-- Fifth row -->
            <div class="row">
                <div class="column">
                    <input type="radio" id="safetyAudit" class="custom-radio top-position">
                    <label for="safetyAudit">5S Audit / Health & Safety Concerns</label>
                </div>
                <div class="column">
                    <label for="monthOfAudit" class="aligned-label">For Month of:</label>
                    <select>
                        <option value="january">January</option>
                        <option value="february">February</option>
                        <option value="march">March</option>
                        <option value="april">April</option>
                        <option value="may">May</option>
                        <option value="june">June</option>
                        <option value="july">July</option>
                        <option value="august">August</option>
                        <option value="september">September</option>
                        <option value="october">October</option>
                        <option value="november">November</option>
                        <option value="december">December</option>
                    </select>
                </div>
                <div class="column">
                    <label for="auditYear" class="aligned-label">Year: </label>
                    <input type="text" id="5sYear" name="5sYear" value="<?php echo date('Y'); ?>" class="auto-year" readonly>
                </div>
            </div>
        
            <!-- Seventh row -->
            <div class="row">
                <div class="column">
                    <div class="group-container">
                        <div>
                            <input type="radio" id="managementObjective" class="custom-radio top-position">
                            <label for="managementObjective">Management Objective</label>
                        </div>
                        <div>
                            <label for="managementObjectiveYear" class="aligned-label">Year: </label>
                            <input type="text" id="auditYear" name="auditYear" value="<?php echo date('Y'); ?>" class="auto-year" readonly>
                        </div>
                    </div>
                </div>
                <div class="column">
                    <div class="group-container">
                        <div>
                            <input type="radio" id="firstQuarter" class="custom-radio top-position">
                            <label for="firstQuarter">1st Qtr</label>
                        </div>
                        <div>
                            <input type="radio" id="secondQuarter" class="custom-radio top-position">
                            <label for="secondQuarter">2nd Qtr</label>
                        </div>
                    </div>
                </div>
                <div class="column">
                    <div class="group-container">
                        <div>
                            <input type="radio" id="thirdQuarter" class="custom-radio top-position">
                            <label for="thirdQuarter">3rd Qtr</label>
                        </div>
                        <div>
                            <input type="radio" id="ytd" class="custom-radio top-position">
                            <label for="ytd">YTD</label>
                        </div>
                    </div>
                </div>
            </div><br>

            <!-- Category Row -->
            <div class="row">
                <div class="column">
                    <label for="categoryMajor" class="category-label">CATEGORY:</label>
                    <input type="radio" id="categoryMajor" name="category" class="custom-radio top-position">
                    <label for="categoryMajor" class="category-checkbox-label">Major</label>
                </div>
                <div class="column">
                    <input type="radio" id="categoryMinor" name="category" class="custom-radio top-position">
                    <label for="categoryMinor" class="category-checkbox-label">Minor</label>
                </div>
                <div class="column">
                    <input type="radio" id="categoryObservation" name="category" class="custom-radio top-position">
                    <label for="categoryObservation" class="category-checkbox-label">Observation</label>
                </div>
            </div>

            <!-- Border Container -->
            <div class="border-container">
                <div class="row">
                    <div class="column">
                        <label for="originatorName" class="rcpa-label">ORIGINATOR:</label>
                        <input type="text" id="originatorName" class="orginator-input" name="originatorName">
                    </div>
                    <div class="column">
                        <label for="positionDept" class="rcpa-label">Position / Dept.: </label>
                        <input type="text" id="positionDept" class="orginator-input" name="positionDept">
                    </div>
                    <div class="column">
                        <label for="originatorDate" class="rcpa-label">Date:</label>
                        <input type="date" id="originatorDate" name="originatorDate">
                    </div>
                </div>

                <!-- Description of Findings Row -->
                <div class="row">
                    <div class="column">
                        <label for="findingsDescription" class="rcpa-label">Description of Findings</label>
                    </div>
                    <div class="column">
                        <input type="radio" id="nonconformanceCheckbox" name="nonconformanceCheckbox" value="nonconformance" class="custom-radio">
                        <label for="nonconformanceCheckbox" class="rcpa-label">Nonconformance</label>
                    </div>
                    <div class="column">
                        <input type="radio" id="potentialNonconformanceCheckbox" name="nonconformanceCheckbox" value="potential" class="custom-radio">
                        <label for="potentialNonconformanceCheckbox" class="rcpa-label">Potential Nonconformance</label>
                    </div>
                </div>

                <div class="row">
                    <div class="column" style="width: 100%;">
                        <textarea id="findingsTextarea" class="custom-textarea" name="findingsTextarea" placeholder="Enter your findings here..."></textarea>
                    </div>
                </div><br>

                <!-- System / Std. Violated Row -->
                <div class="row">
                    <div class="column">
                        <label for="systemViolations" class="rcpa-label">System / Applicable Std. Violated:</label>
                        <input type="text" id="systemViolations" name="systemViolations">
                    </div>
                </div>

                <!-- Standard Clause Row -->
                <div class="row">
                    <div class="column">
                        <label for="standardClause" class="rcpa-label">Standard Clause Number(s):</label>
                        <input type="text" id="standardClause" name="standardClause">
                    </div>
                </div>

                <!-- Supervisor or Head Row -->
                <div class="row">
                    <div class="column">
                        <label for="supervisorName" class="rcpa-label">Originator Supervisor or Head:</label>
                        <input type="text" id="supervisorName" name="supervisorName">
                    </div>
                </div><br>

                <div class="row">
                    <div class="column">
                        <!-- Assignee -->
                        <div class="items-aligned">
                            <label for="assignee" class="rcpa-label">ASSIGNEE:</label>
                            <input type="text" id="assignee" name="assignee">
                        </div><br>
                        <!-- Validation -->
                        <label for="assignee" class="rcpa-label">VALIDATION OF RCPA by Assignee:</label><br><br>
                        <input type="radio" id="request-valid" name="request-valid" class="custom-radio top-position">
                        <label for="request-valid" class="rcpa-label">Request valid</label><br>
                        <!-- Cause of Findings -->
                        <div class="request-valid-indentation">  <!-- This creates the indentation -->
                            <label for="validationComments" class="rcpa-label">Cause of Findings</label><br>
                            <textarea id="validationComments" name="validationComments" class="custom-textarea-findings"></textarea>
                        </div><br>
                        <!-- For Nonconformance -->
                        <div class="request-valid-indentation">  <!-- This creates the indentation -->
                            <label for="validationComments" class="rcpa-label">For Nonconformance<br>Correction (immediate action)</label><br>
                            <textarea id="validationComments" name="validationComments" class="custom-textarea-findings"></textarea><br><br>
                            <div class="row">
                                <div class="column">
                                    <label class="rcpa-label">Target Date:</label>
                                    <input type="date" id="first-target-date" name="first-target-date">
                                </div>
                                <div class="column">
                                    <label class="rcpa-label">Date Completed:</label>
                                    <input type="date" id="first-date-completed" name="first-date-completed">
                                </div>
                            </div>
                        </div><br>
                        <div class="request-valid-indentation">  <!-- This creates the indentation -->
                            <label for="validationComments" class="rcpa-label">Corrective action (prevent recurrence)</label><br>
                            <textarea id="validationComments" name="validationComments" class="custom-textarea-findings"></textarea><br><br>
                            <div class="row">
                                <div class="column">
                                    <label class="rcpa-label">Target Date:</label>
                                    <input type="date" id="second-target-date" name="second-target-date">
                                </div>
                                <div class="column">
                                    <label class="rcpa-label">Date Completed:</label>
                                    <input type="date" id="second-date-completed" name="second-date-completed">
                                </div>
                            </div>
                        </div><br>
                        <div class="request-valid-indentation potential-nonconformance-section">
                            <label for="validationComments" class="rcpa-label">For Potential Nonconformance,<br>Preventitive action (prevent occurence)</label><br>
                            <textarea id="validationComments" name="validationComments" class="custom-textarea-findings"></textarea><br><br>
                            <div class="row">
                                <div class="column">
                                    <label class="rcpa-label">Target Date:</label>
                                    <input type="date" id="second-target-date" name="second-target-date">
                                </div>
                                <div class="column">
                                    <label class="rcpa-label">Date Completed:</label>
                                    <input type="date" id="second-date-completed" name="second-date-completed">
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</body>
<script src="rcpa-script.js" type="text/javascript"></script>
</html>
