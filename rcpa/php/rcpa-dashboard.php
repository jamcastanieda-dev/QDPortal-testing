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
    <title>RCPA Dashboard</title>

    <style>
         /* ======= Base Dashboard ======= */
        .rcpa-dashboard{display:flex;flex-direction:column;gap:14px; margin: 20px 20px;}
        body {overflow-y: auto;}

        .rcpa-toolbar{display:grid;grid-template-columns:auto repeat(3,1fr);gap:12px;align-items:stretch}
        .rcpa-toolbar .dash-btn{display:flex;align-items:center;justify-content:center;gap:10px;padding:18px 20px;border:1px solid var(--rcpa-border);border-radius:12px;background:var(--rcpa-accent);color:#fff;font-weight:800;letter-spacing:.3px;text-transform:uppercase;cursor:pointer;box-shadow:0 10px 22px rgba(3,80,161,.20);transition:transform .1s,box-shadow .18s,background-color .18s}
        .rcpa-toolbar .dash-btn:hover{background:var(--rcpa-accent-600);transform:translateY(-1px);box-shadow:0 12px 26px rgba(3,80,161,.28)}
        .rcpa-toolbar>button.dash-btn:nth-of-type(2){background:#f59e0b;box-shadow:0 10px 22px rgba(245,158,11,.20)}
        .rcpa-toolbar>button.dash-btn:nth-of-type(2):hover{background:#d97706;box-shadow:0 12px 26px rgba(217,119,6,.28)}
        .rcpa-toolbar>button.dash-btn:nth-of-type(3){background:#0e7490;box-shadow:0 10px 22px rgba(14,116,144,.20)}
        .rcpa-toolbar>button.dash-btn:nth-of-type(3):hover{background:#0b5f75;box-shadow:0 12px 26px rgba(11,95,117,.28)}
        .filters-group{display:flex;align-items:stretch;gap:8px}
        .toolbar-filter{display:flex;align-items:center}
        .toolbar-filter select{appearance:none;height:56px;padding:0 14px;border:1px solid var(--rcpa-border);border-radius:12px;background:#fff;cursor:pointer;font-weight:800;color:var(--rcpa-text);box-shadow:0 3px 10px rgba(2,6,23,.06)}
        .toolbar-filter select:focus{outline:0;border-color:var(--rcpa-accent);box-shadow:inset 0 0 0 2px var(--rcpa-accent),0 3px 10px rgba(2,6,23,.10)}
        .rcpa-chart-grid{display:grid;grid-template-columns:2fr 1fr;gap:12px;flex:1 1 auto;}
        .chart-card{background:#fff;border:1px solid var(--rcpa-border);border-radius:12px;box-shadow:var(--rcpa-shadow);padding:12px 14px;display:flex;flex-direction:column;min-height:0}
        .chart-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:8px}
        .chart-title{font-weight:800;letter-spacing:.3px;color:var(--rcpa-text);display:flex;align-items:center;gap:10px; justify-content: center;}
        .chart-sub{color:var(--rcpa-muted);font-size:.85rem;font-weight:600}
        .span-2{grid-column:1/-1}
        .two-up{display:grid;grid-template-columns:1fr 1fr;gap:10px}
        .mini-card .apex-wrap{min-height:220px}
        .mini-card .apexcharts-legend{justify-content:center!important;flex-wrap:wrap}
        .apex-wrap,.apex-wrap>div,.apexcharts-canvas,.apexcharts-svg{max-width:100%!important}
        @media (max-width:900px){.rcpa-chart-grid{grid-template-columns:1fr}.two-up{grid-template-columns:1fr}}
        @media (max-width:700px){.rcpa-toolbar{grid-template-columns:1fr}.filters-group{flex-wrap:wrap}.toolbar-filter select{width:100%}}
        @media (max-width: 1100px) {
        .rcpa-chart-grid { grid-template-columns: 1fr;}}
        @media (max-width: 900px) {.two-up {grid-template-columns: 1fr;}}
        @media (max-width: 700px) {.rcpa-toolbar { grid-template-columns: 1fr;}
        .filters-group {flex-wrap: wrap;}.toolbar-filter select { width: 100%;}}

        /* ======= Modal ======= */
        /* JS fallback class if you ever add it */
        body.no-scroll{overflow:hidden}

        /* ======= Calendar Layout (List left + Calendar right) ======= */
        .rcpa-calendar-wrap{display:flex;gap:16px;padding:16px;align-items:flex-start}
        .rcpa-nw-list{width:260px;border-right:1px solid #eee;padding-right:16px}
        .nw-head{margin-bottom:8px}
        .nw-title{font-weight:600}
        .nw-sub{font-size:12px;color:#777}
        .nw-scroll{max-height:480px;overflow:auto;border:1px solid #eee;border-radius:8px;padding:8px;background:#fff}
        .nw-item{display:flex;align-items:center;justify-content:space-between;padding:6px 8px;border-radius:6px;margin-bottom:6px;border:1px dashed #bcd;background:#f7fbff;font-size:13px}

        /* Filters (left list) */
        .nw-filters{display:flex;gap:8px;margin:0 0 10px 0}
        .nw-filters select{appearance:none;height:36px;padding:0 10px;border:1px solid var(--rcpa-border);border-radius:10px;background:#fff;cursor:pointer;font-weight:700;color:var(--rcpa-text);box-shadow:0 2px 6px rgba(2,6,23,.05);max-width:50%}
        .nw-filters select:focus{outline:0;border-color:var(--rcpa-accent);box-shadow:inset 0 0 0 2px var(--rcpa-accent),0 2px 8px rgba(2,6,23,.10)}

        /* ======= Calendar Card ======= */
        .rcpa-calendar{--accent:var(--rcpa-accent,#0350A1);--accent-600:var(--rcpa-accent-600,#024389);--muted:var(--rcpa-muted,#64748b);--card:var(--rcpa-card,#f8fafc);--ring:var(--rcpa-border,#e5e7eb);flex:1 1 auto;min-width:520px;border:1px solid var(--ring);border-radius:12px;box-shadow:var(--rcpa-shadow,0 10px 25px rgba(2,6,23,.1));background:#fff;overflow:hidden}
        .cal-header{display:flex;align-items:center;justify-content:center;gap:8px;padding:10px 12px;background:linear-gradient(to bottom,#fff,var(--card));border-bottom:1px solid var(--ring)}
        .cal-title{display:flex;align-items:baseline;gap:8px;text-align:center;line-height:1.1}
        .cal-month{font-weight:800;font-size:1.1rem}
        .cal-year{color:var(--muted);font-weight:700;letter-spacing:.02em}
        .cal-nav{background:transparent;border:1px solid transparent;border-radius:10px;width:36px;height:36px;font-size:18px;line-height:1;cursor:pointer;color:var(--muted);transition:background-color .2s,color .2s,transform .08s,border-color .2s}
        .cal-nav:hover{background:var(--card);color:var(--accent);border-color:var(--ring)}
        .cal-nav:active{transform:scale(.96)}
        .cal-toolbar{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:10px 12px;border-bottom:1px dashed var(--ring)}
        .cal-selected{display:none}
        .cal-today{background:var(--accent);color:#fff;border:0;border-radius:10px;padding:8px 12px;font-weight:800;cursor:pointer;transition:transform .08s,filter .15s}
        .cal-today:hover{filter:brightness(1.05)}
        .cal-today:active{transform:scale(.97)}
        /* toolbar right section (Today + legend) */
        .cal-toolbar-right{display:flex;align-items:center;gap:10px}
        .cal-legend{display:flex;align-items:center;gap:8px;font-weight:700;color:var(--rcpa-text)}
        .cal-legend span{display:inline-flex;align-items:center}
        .lg-dot{width:10px;height:10px;border-radius:50%}
        .lg-dot.lg-sun{background:#6366f1}  /* indigo = No work (Sunday) */
        .lg-dot.lg-nw{background:#e53935}   /* red = Not working (manual) */

        /* Grid */
        .cal-grid{display:grid;grid-template-columns:repeat(7,minmax(44px,1fr));gap:6px;padding:12px}
        .cal-weekday{text-transform:uppercase;font-size:.7rem;font-weight:800;letter-spacing:.08em;color:var(--muted);text-align:center;padding:8px 0 2px}

        /* Day cells */
        .cal-day{position:relative;display:flex;align-items:center;justify-content:center;aspect-ratio:1/1;border-radius:12px;border:1px solid var(--ring);background:#fff;cursor:pointer;user-select:none;font-weight:800;transition:transform .08s,background-color .15s,border-color .15s,box-shadow .15s,color .15s}
        .cal-day:hover{transform:translateY(-1px);border-color:#d1d5db;box-shadow:0 2px 10px rgba(2,6,23,.06)}
        .cal-day:active{transform:translateY(0) scale(.98)}
        .cal-day.is-muted{color:#9ca3af;background:#fafafa}
        .cal-day.is-selected{outline:none!important;box-shadow:none!important} /* no visual selected */

        /* Variants */
        .cal-day.is-today{background:#1976d2;color:#fff;border-color:#1976d2}     /* today = blue */
        .cal-day.is-not-working{background:#ffe9e9;border-color:#e53935;color:#c62828} /* manual not working (red) */
        .cal-day.is-not-working.is-today{background:linear-gradient(0deg,rgba(25,118,210,.9),rgba(25,118,210,.9)),#ffe9e9;color:#fff;border-color:#1976d2}

        /* Sundays = auto No work (indigo) */
        .cal-day.is-sunday-off{background:#eef2ff;border-color:#6366f1;color:#111827;cursor:not-allowed}
        .cal-day.is-sunday-off:hover{transform:none;box-shadow:none;border-color:#6366f1}
        .cal-day.is-sunday-off.is-today{background:#1976d2;color:#fff;border-color:#1976d2}

        /* Date number */
        .cal-num{font-weight:600;font-size:14px}

        /* Compact mobile */
        @media (max-width:420px){.modal-content{width:100%;border-radius:0}.cal-grid{gap:4px;padding:10px}.cal-day{border-radius:10px}}

        /* Modal table polish */
        .rcpa-table-wrap { overflow: auto;border: 1px solid var(--rcpa-border, #e5e7eb); border-radius: 12px;background: #fff; max-height: 74vh;height: 100%;}
        .rcpa-table-wrap{overflow-x: auto;max-width: 100%;}
        #rcpaListModal .modal-content{ max-width: 97vw;height: 100%;max-height: 97vh;}

        #rcpaListModal{padding: 0px;}
        .rcpa-table-list {width: 100%;border-collapse: separate;border-spacing: 0;font-size: 13px;}
        .rcpa-table-list thead th {position: sticky; top: 0;z-index: 2; background: #f8fafc;color: #0f172a;text-align: left;font-weight: 800;padding: 10px 12px;border-bottom: 1px solid #e5e7eb;white-space: nowrap;}

        .rcpa-table-list tbody td { padding: 10px 12px;border-bottom: 1px solid #eef2f7;vertical-align: top;}

        .rcpa-table-list tbody tr:nth-child(even) td {background: #fbfdff;}

        .rcpa-table-list tbody tr:hover td {background: #f1f5f9;}

        .rcpa-table-list td:nth-child(2),
        .rcpa-table-list td:nth-child(10),
        .rcpa-table-list td:nth-child(13) {text-align: center; /* id, no_days_reply, no_days_close */}

        /* Narrow date-only columns:
            9  = reply_received
            11 = reply_date
            12 = reply_due_date
            14 = close_date
            15 = close_due_date
        */
            /* widen col 3 and 4 */
        .rcpa-table-list thead th:nth-child(3),
        .rcpa-table-list tbody td:nth-child(3){ min-width: 220px; white-space: nowrap; }

        .rcpa-table-list thead th:nth-child(5),
        .rcpa-table-list tbody td:nth-child(5){ min-width: 160px;     /* adjust as needed */ white-space: nowrap;}

        .rcpa-table-list thead th:nth-child(9),
        .rcpa-table-list thead th:nth-child(11),
        .rcpa-table-list thead th:nth-child(12),
        .rcpa-table-list thead th:nth-child(14),
        .rcpa-table-list thead th:nth-child(15),
        .rcpa-table-list tbody td:nth-child(9),
        .rcpa-table-list tbody td:nth-child(11),
        .rcpa-table-list tbody td:nth-child(12),
        .rcpa-table-list tbody td:nth-child(14),
        .rcpa-table-list tbody td:nth-child(15) {width: 120px; max-width: 120px; white-space: nowrap;text-align: center;}

        .rcpa-table-list thead th:nth-child(9),
        .rcpa-table-list tbody td:nth-child(9){max-width: 130px; }

        .rcpa-table-list thead th:nth-child(12),
        .rcpa-table-list tbody td:nth-child(12),
        .rcpa-table-list thead th:nth-child(15),
        .rcpa-table-list tbody td:nth-child(15){ max-width: 150px;}

        .rcpa-table-list thead th:nth-child(16),
        .rcpa-table-list tbody td:nth-child(16),
        .rcpa-table-list thead th:nth-child(17),
        .rcpa-table-list tbody td:nth-child(17) {text-align: center;vertical-align: middle;}

        /* Small status pill */
        .rcpa-pill {display: inline-flex;align-items: center;padding: 2px 8px;border-radius: 999px;border: 1px solid #e2e8f0;background: #f8fafc;font-weight: 800;font-size: 11px;color: #334155;}
        /* lock page scroll when any modal is open */

        html.no-scroll,
        body.no-scroll {overflow: hidden !important;height: 100% !important;}
        /* optional: prevent content jump when hiding scrollbar */
        body.no-scroll { position: fixed;width: 100%;top: var(--lock-top, 0);}

        /* #gradeModal .modal-content{
           max-width: 99vw;height: 100%;max-height: 97vh; width: 100%;
        } */

        .grade-table th, .grade-table td {
        border: 1px solid #9aa1a9; /* was #dcdcdc – darker for visibility */
        padding: 6px 10px;
        font-size: 13px;
        text-align: center;
        white-space: nowrap;
        }
        .grade-table th { background: #f7f7f7; font-weight: 700; }
        .grade-table th.left, .grade-table td.left { text-align: left; white-space: normal; }

        .grade-table .band-title {
        background: #eaf4e6; font-weight: 700; text-transform: uppercase;
        border-top: 2px solid #6b7280; /* stronger band separator */
        }
        .grade-table .hdr-dept   { background: #ffe8a6; font-weight: 700; }
        .grade-table .row-subhead{ background: #f1f8ee; }
        .grade-table .no-rcpa    { color: #777; font-style: italic; }

        .grade-table th.total {
        background: #567fb6; font-weight: 700;
        border-left: 2px solid #6b7280; /* stronger divider before Total column */
        }
        .grade-table td.total { background: #e1e8f6; font-weight: 400; }

        /* Optional: a bit darker on the month/YTD “TOTAL RCPA” rows */
        .grade-table tr.total-row td.col-total{
        background:#b9cae6;     /* mid blue-gray */
        }

        .grade-table tr.total-row {
        background-color: #ffe8a6;
        }

        /* MONTH column style */
        .grade-table .month-col { background: #cfe2ff; font-weight: 600; }

        /* Yellow "TOTAL RCPA" label cell */
        .grade-table th.hdr-rcpa-label {
        background: #ffe8a6;
        font-style: italic;
        font-weight: 700;
        text-align: center;
        padding: 3px 8px;
        line-height: 1.1;
        }

        /* Sticky headers (two rows). --hdr1-h is set by JS after build */
        .grade-table { --hdr1-h: 32px; }
        .grade-table thead tr:first-child th.sticky-top { position: sticky; top: 0; z-index: 6; border-bottom: 2px solid #6b7280; } /* clearer edge */
        .grade-table thead tr:nth-child(2) th.sticky-top { position: sticky; top: var(--hdr1-h, 32px); z-index: 5; border-bottom: 2px solid #9aa1a9; }

        /* Sticky DEPARTMENT column (header + body) on horizontal scroll */
        /* Sticky DEPARTMENT header cell */
        .grade-table th.sticky-left {
        position: sticky;
        left: 0;
        z-index: 7;          /* above other headers */
        background: #f7f7f7; /* restore header background */
        }

        /* (If you ever make body cells sticky-left) keep their original bg */
        .grade-table td.sticky-left {
        position: sticky;
        left: 0;
        z-index: 4;
        background: inherit;
        }

        /* header cell over the REPLY/CLOSING band */
        .grade-table th.band-head { background: #eaf4e6; }

        .grade-table .ytd-col { background: #f8d27a; font-weight: 700; } /* soft amber */

        /* YTD month column style (matches the amber look in your mock) */
        .grade-table .ytd-col {
        background: #f6c667;   /* soft amber */
        color: #000;
        font-weight: 700;
        border-right: 2px solid #b0892b; /* stronger edge, optional */
        }

        /* subtle gap before YTD block */
        .grade-table .ytd-sep td {
        height: 32px;           /* bump this value to make the gap larger/smaller */
        padding: 0;
        border: 0 !important;
        background: transparent;
        }

        .btn.small { padding:6px 10px; border:1px solid #ddd; border-radius:6px; background:#fafafa; cursor:pointer; }
        .btn.small:hover { background:#f0f0f0; }
        /* You already had this for colorizing TOTAL RCPA */
        .grade-table tr.total-row { background:#ffe8a6; }

        .btn.small[disabled] { opacity:.5; cursor:not-allowed; }
        .grade-table tr.total-row { background:#ffe8a6; } /* your highlight */

        /* RCPA List Modal – filter row fixes */
        #rcpaListModal .rcpa-modal-head {
        flex-wrap: wrap;                /* allow the whole header row to wrap */
        }

        #rcpaListModal .rcpa-modal-controls {
        flex-wrap: wrap;                /* allow controls to move to next line */
        }

        #rcpaListModal .rcpa-modal-controls label {
        white-space: nowrap;            /* keep "Type Of RCPA" on one line */
        }

        #rcpaListModal .rcpa-modal-controls select {
        flex-shrink: 0;                 /* don't let selects get squished */
        width: auto;                    /* size to content */
        white-space: nowrap;            /* keep option text on one line */
        min-width: 20ch;                /* sensible default width */
        }

        /* Give the Type filter extra room for long values */
        #rcpaListTypeFilter {
        min-width: 36ch;                /* tweak to taste (32–40ch works well) */
        }

        /* Let filter row wrap and keep inputs readable */
        #rcpaListModal .rcpa-modal-controls { flex-wrap: wrap; gap: 8px; }
        #rcpaListModal .rcpa-modal-controls label { white-space: nowrap; }
        #rcpaListModal .rcpa-modal-controls input[type="search"],
        #rcpaListModal .rcpa-modal-controls select {
        flex-shrink: 0;
        width: auto;
        white-space: nowrap;
        }

        #rcpaListTypeFilter { min-width: 36ch; }  /* long Type strings */
    </style>

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
                    <li class="not-selected"><a class="sublist-selected">Dashboard</a></li>
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

    <h2><span>RCPA Dashboard</span></h2>

    <div class="rcpa-dashboard">
        <!-- Top buttons + global dataset switch -->
        <div class="rcpa-toolbar">
            <!-- LEFT: filters grouped together -->
            <div class="filters-group">
                <div class="toolbar-filter">
                    <select id="siteSelect" aria-label="Dataset">
                        <option value="RTI" selected>RTI</option>
                        <option value="SSD">SSD</option>
                    </select>
                </div>
                <div class="toolbar-filter">
                    <select id="yearSelect" aria-label="Year">
                        <option value="2024" selected>2024</option>
                        <option value="2025">2025</option>
                    </select>
                </div>
            </div>

            <!-- RIGHT: your three action buttons -->
            <button class="dash-btn" id="openRcpaListBtn"><i class="fa-solid fa-clipboard-check"></i> RCPA</button>
            <button class="dash-btn" id="openGradeBtn">
                <i class="fa-solid fa-ranking-star"></i> GRADE
            </button>
            <!-- Change your existing CALENDAR button -->
            <button class="dash-btn" id="openCalendarBtn">
                <i class="fa-solid fa-calendar-days"></i> CALENDAR
            </button>
        </div>


        <!-- Charts -->
        <div class="rcpa-chart-grid">
            <section class="chart-card span-2">
                <div class="chart-head">
                    <div class="chart-title">Number of RCPA per Assignee</div>
                </div>
                <div id="chart-assignee" class="apex-wrap"></div>
            </section>

            <section class="chart-card">
                <div class="chart-head">
                    <div class="chart-title">Number of RCPA per Month</div>
                </div>
                <div id="chart-monthly" class="apex-wrap"></div>
            </section>

            <section class="chart-card">
                <div class="two-up">
                    <div class="mini-card">
                        <div class="chart-title" style="margin-bottom:4px;">Status of Reply</div>
                        <div id="chart-reply" class="apex-wrap" style="height:220px;"></div>
                    </div>
                    <div class="mini-card">
                        <div class="chart-title" style="margin-bottom:4px;">Status of Closing</div>
                        <div id="chart-closing" class="apex-wrap" style="height:220px;"></div>
                    </div>
                </div>
            </section>
        </div>
    </div>

    <!-- MUST exist for the JS to work -->
    <div class="modal-overlay" id="calendarModal" aria-hidden="true" role="dialog" aria-modal="true">
        <div class="modal-content" role="document" style="max-width: 860px; padding: 0;">
            <button class="close-btn" id="closeCalendarBtn" aria-label="Close calendar" title="Close">×</button>

            <div class="rcpa-calendar-wrap">
                <!-- LEFT: Not working list -->
                <aside class="rcpa-nw-list">
                    <div class="nw-head">
                        <div class="nw-title">Non-Working Dates</div>
                        <div class="nw-sub">(from database)</div>
                    </div>

                    <!-- NEW: filters -->
                    <div class="nw-filters">
                        <select id="nwYearFilter" aria-label="Filter by year"></select>
                        <select id="nwMonthFilter" aria-label="Filter by month"></select>
                    </div>

                    <div id="nwList" class="nw-scroll"></div>
                </aside>

                <!-- RIGHT: Calendar -->
                <div class="rcpa-calendar">
                    <div class="cal-header">
                        <button class="cal-nav" id="calPrevBtn" aria-label="Previous month">‹</button>
                        <div class="cal-title">
                            <div class="cal-month" id="calMonth">Month</div>
                            <div class="cal-year" id="calYear">Year</div>
                        </div>
                        <button class="cal-nav" id="calNextBtn" aria-label="Next month">›</button>
                    </div>

                    <div class="cal-toolbar">
                        <div id="calSelected" class="cal-selected" style="display:none;"></div>
                        <div class="cal-toolbar-right">
                            <button class="cal-today" id="calTodayBtn">Today</button>
                            <!-- Legend -->
                            <div class="cal-legend">
                                <span class="lg-dot lg-sun" aria-hidden="true"></span><span>Sunday</span>
                                <span class="lg-dot lg-nw" aria-hidden="true"></span><span>Non-working</span>
                            </div>
                        </div>
                    </div>


                    <div class="cal-grid" id="calGrid" role="grid" aria-label="Calendar"></div>
                </div>
            </div>
        </div>
    </div>

    <!-- GRADE modal -->
    <div class="modal-overlay" id="gradeModal" aria-hidden="true" role="dialog" aria-modal="true" style="padding:0;">
        <div class="modal-content" role="document"
            style="position:relative; max-width:99vw; width:100%; height:96vh; max-height:96vh; padding:0; display:flex; flex-direction:column; box-sizing:border-box;">
            <!-- keep close button above header content -->
            <button class="close-btn" id="closeGradeBtn" aria-label="Close grade modal" title="Close"
                style="position:absolute; top:8px; right:8px; z-index:20;">×</button>

            <!-- your grade content -->
            <div class="rcpa-grade-wrap" style="padding:0; flex:1 1 auto; display:flex; flex-direction:column; min-height:0;">

                <!-- header: title left, buttons perfectly centered -->
                <div class="rcpa-modal-head"
                    style="padding:12px 16px; border-bottom:1px solid #eee; display:grid; grid-template-columns:1fr auto 1fr; align-items:center; gap:8px;">
                    <div style="font-weight:600;">GRADE <span style="font-weight:600;">2025</span></div>

                    <div style="justify-self:center; display:flex; gap:8px;">
                        <button id="dlXlsxBtn" class="btn small">Excel (.xlsx)</button>
                        <button id="dlPdfBtn" class="btn small">PDF</button>
                    </div>

                    <div></div> <!-- right spacer so center stays centered -->
                </div>

                <!-- scrollable grid area -->
                <div id="gradeTableWrap" style="overflow:auto; flex:1 1 auto; min-height:0;">
                    <table id="gradeTable" class="grade-table"
                        style="border-collapse:separate; border-spacing:0; width:100%; min-width:900px;">
                        <!-- built by JS -->
                    </table>
                </div>
            </div>
        </div>
    </div>

    <!-- RCPA LIST MODAL -->
    <div class="modal-overlay" id="rcpaListModal" aria-hidden="true" role="dialog" aria-modal="true">
        <div class="modal-content" role="document">
            <button class="close-btn" id="closeRcpaListBtn" aria-label="Close RCPA list" title="Close">×</button>

            <div class="rcpa-modal-head" style="display:flex;align-items:center;gap:12px;padding:12px 16px;">


                <!-- in-modal Year filter -->
                <div class="rcpa-modal-controls" style="display:flex;align-items:center;gap:8px;">

                <!-- Global search -->
                    <label for="rcpaListSearch" style="font-weight:800;color:#334155;">Search</label>
                    <input id="rcpaListSearch" type="search" placeholder="Search RCPA no., type, names, status…"
                        style="height:40px;padding:0 12px;border:1px solid var(--rcpa-border,#e5e7eb);border-radius:10px;background:#fff;cursor:text;font-weight:800;color:var(--rcpa-text,#0f172a);box-shadow:0 2px 6px rgba(2,6,23,.05);min-width:28ch;">


                    <!-- Company filter -->
                    <label for="rcpaListCompanyFilter" style="font-weight:800;color:#334155;">Company</label>
                    <select id="rcpaListCompanyFilter"
                        style="appearance:none;height:40px;padding:0 12px;border:1px solid var(--rcpa-border,#e5e7eb);border-radius:10px;background:#fff;cursor:pointer;font-weight:800;color:var(--rcpa-text,#0f172a);box-shadow:0 2px 6px rgba(2,6,23,.05);">
                        <option value="all" selected>All</option>
                        <option value="RTI">RTI</option>
                        <option value="SSD">SSD</option>
                    </select>

                    <!-- year filter -->
                    <label for="rcpaListYearFilter" style="font-weight:800;color:#334155;">Year</label>
                    <select id="rcpaListYearFilter" style="appearance:none;height:40px;padding:0 12px;border:1px solid var(--rcpa-border,#e5e7eb);border-radius:10px;background:#fff;cursor:pointer;font-weight:800;color:var(--rcpa-text,#0f172a);box-shadow:0 2px 6px rgba(2,6,23,.05);">
                        <option value="all" selected>All</option>
                    </select>

                    <!-- Type Of RCPA filter -->
                    <label for="rcpaListTypeFilter" style="font-weight:800;color:#334155;">Type Of RCPA</label>
                    <select id="rcpaListTypeFilter"
                        style="appearance:none;height:40px;padding:0 12px;border:1px solid var(--rcpa-border,#e5e7eb);border-radius:10px;background:#fff;cursor:pointer;font-weight:800;color:var(--rcpa-text,#0f172a);box-shadow:0 2px 6px rgba(2,6,23,.05);">
                        <option value="all" selected>All</option>
                    </select>

                    <!-- Status filter -->
                    <label for="rcpaListStatusFilter" style="font-weight:800;color:#334155;">Status</label>
                    <select id="rcpaListStatusFilter"
                            style="appearance:none;height:40px;padding:0 12px;border:1px solid var(--rcpa-border,#e5e7eb);border-radius:10px;background:#fff;cursor:pointer;font-weight:800;color:var(--rcpa-text,#0f172a);box-shadow:0 2px 6px rgba(2,6,23,.05);">
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

                </div>
            </div>


            <div class="rcpa-table-wrap">
                <table class="rcpa-table-list" id="rcpaListTable">
                    <thead>
                        <tr>
                            <th>Company</th>
                            <th>RCPA No.</th>
                            <th>Type Of RCPA</th>
                            <th>Category</th>
                            <th>Originator</th>
                            <th>Assignee</th>
                            <th>Date Requested</th>
                            <th>Status</th>
                            <th>Date Assignee Received</th>
                            <th>No. of Days (5 days Reply)</th>
                            <th>Actual date of reply</th>
                            <th>Due Date (5 days reply)</th>
                            <th>No. of Days (30 days Closing)</th>
                            <th>Actual date of closing</th>
                            <th>Due date of (30 days closing)</th>
                            <th>Action</th> <!-- existing -->
                            <th>History</th> <!-- moved: now last -->
                        </tr>
                    </thead>
                    <tbody id="rcpaListTbody">
                        <tr>
                            <td colspan="17" class="rcpa-empty">Loading…</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <footer class="rcpa-table-footer">
                <div class="rcpa-paging">
                    <button id="rcpaListPrev" class="rcpa-btn" type="button" disabled>Prev</button>
                    <span id="rcpaListPageInfo" class="rcpa-muted">Page 1</span>
                    <button id="rcpaListNext" class="rcpa-btn" type="button" disabled>Next</button>
                </div>
                <div class="rcpa-total" id="rcpaListTotal">0 records</div>
            </footer>
        </div>
    </div>

    <!-- view modal -->
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

                    <!-- Checkbox -->
                    <label class="inline-check">
                        <input type="checkbox" id="rcpa-view-findings-valid">
                        <span>Findings Valid</span>
                        <!-- NEW -->
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

                    <!-- NEW: For Non-conformance checkbox -->
                    <label class="inline-check checkbox-for-non-conformance">
                        <input type="checkbox" id="rcpa-view-for-nc-valid">
                        <span>For Non-conformance</span>
                    </label>

                    <!-- NEW: Correction (immediate action) + inline dates -->
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

                    <!-- NEW: Corrective Action + inline dates -->
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

                    <!-- NEW: For Non-conformance checkbox -->
                    <label class="inline-check checkbox-for-potential-non-conformance">
                        <input type="checkbox" id="rcpa-view-for-pnc">
                        <span>For Potential Non-conformance</span>
                    </label>

                    <!-- NEW: Preventive Action + inline dates -->
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

                <!-- FINDINGS IN-VALIDATION REPLY (no legend) -->
                <fieldset class="validation validation-invalid" id="rcpa-view-invalid-section" hidden>
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

                <!-- APPROVAL REMARKS (hidden when empty) -->
                <fieldset class="approve-remarks" id="rcpa-approvals-fieldset" hidden>
                    <legend>Approval Remarks</legend>
                    <div class="rcpa-card">
                        <table id="rcpa-approvals-table" class="rcpa-table--compact">
                            <thead>
                                <tr>
                                    <th>Type</th>
                                    <th>Date/Time</th>
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

                <!-- DISAPPROVAL REMARKS -->
                <fieldset class="reject-remarks">
                    <legend>Disapproval Remarks</legend>
                    <div class="rcpa-card">
                        <table id="rcpa-rejects-table" class="rcpa-table--compact">
                            <thead>
                                <tr>
                                    <th>Type</th>
                                    <th>Date/Time</th>
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
            </form>
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

    <!-- Approval Remarks quick viewer -->
    <div class="modal-overlay" id="approve-remarks-modal" hidden>
        <div class="modal-content">
            <button type="button" class="close-btn" id="approve-remarks-close" aria-label="Close">×</button>
            <h3 class="rcpa-title" style="text-transform:none;margin:0 0 12px;">Approval Remarks</h3>

            <label class="field">
                <span>Remarks</span>
                <textarea id="approve-remarks-text" class="u-area" rows="6" readonly></textarea>
            </label>

            <div class="attach-wrap" style="margin-top:.75rem;">
                <div class="desc-title" style="margin-bottom:.25rem;">Attachments</div>
                <div class="attach-list" id="approve-remarks-files" aria-live="polite"></div>
            </div>
        </div>
    </div>

    <!-- Why-Why Analysis (VIEW) -->
    <div class="modal-overlay" id="rcpa-why-view-modal" hidden aria-modal="true" role="dialog" aria-labelledby="rcpa-why-view-title">
        <div class="modal-content">
            <button type="button" class="close-btn" id="rcpa-why-view-close" aria-label="Close">×</button>
            <h2 id="rcpa-why-view-title" style="margin-top:0;">Why-Why Analysis</h2>

            <label for="rcpa-why-view-desc">Description of Findings</label>
            <div class="textarea-wrap" style="position:relative; margin-top:8px; margin-bottom:16px;">
                <textarea id="rcpa-why-view-desc" readonly style="width:100%; min-height:110px; padding:10px; resize:vertical;"></textarea>
            </div>

            <div id="rcpa-why-view-list" style="display:flex; flex-direction:column; gap:12px;"></div>

            <div style="display:flex; gap:8px; justify-content:flex-end; margin-top:14px;">
                <button type="button" class="rcpa-btn" id="rcpa-why-view-ok">Close</button>
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

    <!-- Front End JS -->
    <script src="../../current-date-time.js" type="text/javascript"></script>
    <script src="../../homepage.js" type="text/javascript"></script>
    <script src="../../logout.js" type="text/javascript"></script>
    <script src="../../pagination.js" type="text/javascript"></script>
    <script src="../../sidebar.js" type="text/javascript"></script>

    <!-- ApexCharts CDN -->
    <script src="https://cdn.jsdelivr.net/npm/apexcharts"></script>

    <!-- BACKEND JS -->
    <script src="../js/rcpa-dashboard.js"></script>
    <script src="../js/rcpa-notif-sub-menu-count.js"></script>

    <!-- CDN JS -->
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>

    <!-- SheetJS for Excel -->
    <script src="https://cdn.jsdelivr.net/npm/xlsx@0.17.0/dist/xlsx.full.min.js"></script>
    <!-- jsPDF + AutoTable for PDF -->
    <script src="https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.1/dist/jspdf.plugin.autotable.min.js"></script>

</body>

</html>