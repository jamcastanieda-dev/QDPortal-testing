/* =========================================================
 * RCPA DASHBOARD (charts + toolbar) — IIFE #1
 * =======================================================*/
(() => {
  'use strict';

  if (document.readyState !== 'loading') init();
  else document.addEventListener('DOMContentLoaded', init);

  function init() {
    /* ------- THEME TOKENS ------- */
    const css = getComputedStyle(document.documentElement);
    const TOKENS = {
      ACCENT: css.getPropertyValue('--rcpa-accent').trim() || '#0350A1',
      ACCENT600: css.getPropertyValue('--rcpa-accent-600').trim() || '#024389',
      MUTED: css.getPropertyValue('--rcpa-muted').trim() || '#64748b',
      CARD: css.getPropertyValue('--rcpa-card').trim() || '#f8fafc',
      RING: css.getPropertyValue('--rcpa-border').trim() || '#e5e7eb'
    };

    /* ------- (static sample data kept only for initial state/site) ------- */
    const MONTHS_12 = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const DATASETS = {
      SSD: {
        years: {
          2024: { monthly: [1, 2, 0, 5, 4, 6, 5, 1, 0, 0, 0, 0], assignees: [1, 1, 1, 1, 1, 1, 1, 1, 2, 3, 3, 7], reply: 100, closing: [87, 9, 4] },
          2025: { monthly: [2, 1, 1, 4, 5, 5, 4, 2, 1, 0, 0, 0], assignees: [0, 1, 1, 1, 1, 2, 1, 1, 2, 2, 3, 5], reply: 98, closing: [82, 12, 6] }
        }
      },
      RTI: {
        years: {
          2024: { monthly: [0, 1, 2, 3, 2, 4, 3, 2, 1, 1, 0, 0], assignees: [0, 1, 0, 1, 1, 2, 1, 0, 1, 2, 1, 3], reply: 96, closing: [78, 15, 7] },
          2025: { monthly: [1, 1, 2, 2, 3, 3, 2, 2, 1, 1, 0, 0], assignees: [1, 1, 1, 1, 1, 1, 1, 0, 1, 2, 1, 2], reply: 97, closing: [80, 14, 6] }
        }
      }
    };

    /* ------- DOM ------- */
    const els = {
      siteSelect: document.getElementById('siteSelect'),
      yearSelect: document.getElementById('yearSelect'),
      chartAssignee: document.querySelector('#chart-assignee'),
      chartMonthly: document.querySelector('#chart-monthly'),
      chartReply: document.querySelector('#chart-reply'),
      chartClosing: document.querySelector('#chart-closing')
    };

    /* ------- STATE ------- */
    const INIT_SITE = els.siteSelect?.value || 'SSD';
    const INIT_YEAR = els.yearSelect?.value || Object.keys(DATASETS[INIT_SITE].years)[0];
    const state = {
      site: INIT_SITE,
      year: INIT_YEAR
    };

    /* ------- UTILS ------- */
    const int = v => String(Math.round(Number(v)));

    // Backend: assignee counts per department (optionally by year)
    // Backend: assignee counts per department (by year AND site)
    async function fetchAssigneeByDept(year, site) {
      const q = new URLSearchParams();
      if (year) q.set('year', year);
      if (site) q.set('site', site);
      const url = `../php-backend/rcpa-assignee-by-dept.php?${q.toString()}`;
      const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
      if (!res.ok) throw new Error(`Assignee-by-dept HTTP ${res.status}`);
      return res.json(); // { labels, data:[{x,y}], total, max, year, site }
    }


    // Backend: monthly data
    async function fetchMonthly(year) {
      const url = `../php-backend/rcpa-monthly.php?year=${encodeURIComponent(year)}`;
      const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
      if (!res.ok) throw new Error(`Monthly data HTTP ${res.status}`);
      return res.json();
    }

    // Backend: distinct years (from date_request)
    async function fetchYears() {
      const url = `../php-backend/rcpa-years.php`;
      const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
      if (!res.ok) throw new Error(`Years HTTP ${res.status}`);
      return res.json();
    }

    // Backend: reply & closing pies
    async function fetchReplyStatus(year) {
      const url = `../php-backend/rcpa-reply-status.php?year=${encodeURIComponent(year)}`;
      const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
      if (!res.ok) throw new Error(`Reply status HTTP ${res.status}`);
      return res.json(); // { labels, series, total, year }
    }
    async function fetchClosingStatus(year) {
      const url = `../php-backend/rcpa-closing-status.php?year=${encodeURIComponent(year)}`;
      const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
      if (!res.ok) throw new Error(`Closing status HTTP ${res.status}`);
      return res.json(); // { labels, series, total, year }
    }

    const safeArray12 = arr => {
      const a = Array.isArray(arr) ? arr.slice(0, 12) : [];
      while (a.length < 12) a.push(0);
      return a.map(n => (Number.isFinite(+n) ? +n : 0));
    };

    // Populate the Year <select> only with years that exist in DB
    async function initYearOptions() {
      try {
        const payload = await fetchYears();
        const years = Array.isArray(payload.years) ? payload.years : [];
        if (!els.yearSelect) return;

        if (years.length) {
          els.yearSelect.innerHTML = '';
          years.forEach(y => {
            const opt = document.createElement('option');
            opt.value = String(y);
            opt.textContent = String(y);
            els.yearSelect.appendChild(opt);
          });
          const desired = years.includes(+state.year) ? String(state.year) : String(years[0]);
          els.yearSelect.value = desired;
          state.year = desired;
        } else {
          console.warn('No years returned by backend; keeping existing year dropdown.');
        }
      } catch (e) {
        console.error('Failed to load years:', e);
      }
    }

    /* ------- CHARTS ------- */
    const CHART_ANIMS = {
      enabled: true, easing: 'easeinout', speed: 700,
      animateGradually: { enabled: true, delay: 120 },
      dynamicAnimation: { enabled: true, speed: 450 }
    };

    const charts = { assignee: null, monthly: null, reply: null, closing: null };

    function createCharts() {
      // ASSIGNEE (dynamic: departments from system_users vs rcpa_request.assignee)
      charts.assignee = new ApexCharts(els.chartAssignee, {
        chart: { type: 'bar', height: 260, toolbar: { show: false }, animations: CHART_ANIMS },
        series: [{ name: 'RCPA', data: [] }], // filled by loadAssignee(...)
        plotOptions: { bar: { horizontal: true, borderRadius: 6, barHeight: '60%' } },
        yaxis: { labels: { style: { colors: TOKENS.MUTED, fontWeight: 600 } } },
        xaxis: {
          min: 0,
          tickAmount: 2,
          decimalsInFloat: 0,
          title: { text: 'Count', style: { color: TOKENS.MUTED, fontWeight: 700 } },
          labels: { style: { colors: TOKENS.MUTED }, formatter: int }
        },
        grid: { borderColor: TOKENS.RING },
        dataLabels: { enabled: true, style: { fontWeight: 800 }, formatter: int },
        colors: [TOKENS.ACCENT],
        fill: { opacity: .95 },
        states: { active: { filter: { type: 'none' } } },
        tooltip: { theme: 'light', y: { formatter: int } }
      });
      charts.assignee.render().then(() => loadAssignee(state.year, state.site));

      // MONTHLY (start empty; load via backend)
      charts.monthly = new ApexCharts(els.chartMonthly, {
        chart: { type: 'line', height: 220, toolbar: { show: false }, zoom: { enabled: false }, animations: CHART_ANIMS },
        series: [{ name: 'RCPA', data: [] }],
        xaxis: { categories: MONTHS_12, labels: { rotate: -45, style: { colors: TOKENS.MUTED } } },
        yaxis: { min: 0, tickAmount: 2, decimalsInFloat: 0, labels: { style: { colors: TOKENS.MUTED }, formatter: int } },
        stroke: { width: 4, curve: 'smooth' },
        markers: { size: 6, strokeWidth: 3 },
        colors: [TOKENS.ACCENT],
        grid: { borderColor: TOKENS.RING, row: { colors: [TOKENS.CARD, 'transparent'] } },
        dataLabels: { enabled: false },
        tooltip: { y: { formatter: v => `${int(v)} reports` } }
      });
      charts.monthly.render().then(() => loadMonthly(state.year));

      // REPLY (3-slice donut: Hit / Missed / On-going reply)
      charts.reply = new ApexCharts(els.chartReply, {
        chart: { type: 'donut', height: 220, toolbar: { show: false }, animations: CHART_ANIMS },
        series: [], // loaded from backend
        labels: ['Hit', 'Missed', 'On-going reply'],
        colors: [TOKENS.ACCENT, '#ef4444', '#9ca3af'],
        dataLabels: {
          enabled: true,
          style: { fontSize: '11px', fontWeight: 700 },
          formatter: (val) => `${val.toFixed(0)}%`
        },
        legend: { show: true, position: 'bottom', horizontalAlign: 'center', fontWeight: 700, labels: { colors: TOKENS.MUTED } },
        stroke: { width: 0 },
        plotOptions: {
          pie: {
            donut: {
              size: '68%',
              labels: {
                show: true,
                total: {
                  show: true,
                  label: 'Total',
                  fontSize: '14px',
                  fontWeight: 700,
                  formatter: (w) => {
                    const s = w.globals.seriesTotals?.reduce((a, b) => a + b, 0) || 0;
                    return String(s);
                  }
                }
              }
            }
          }
        },
        tooltip: {
          y: {
            formatter: (v, { w, seriesIndex }) => {
              const total = w.globals.seriesTotals.reduce((a, b) => a + b, 0) || 0;
              const label = w.globals.labels[seriesIndex];
              return `${label}: ${v} (${total ? Math.round((v / total) * 100) : 0}%)`;
            }
          }
        }
      });
      charts.reply.render();

      // CLOSING (3-slice donut: Hit / Missed / On-going closing)
      charts.closing = new ApexCharts(els.chartClosing, {
        chart: { type: 'donut', height: 220, toolbar: { show: false }, animations: CHART_ANIMS },
        series: [], // loaded from backend
        labels: ['Hit', 'Missed', 'On-going closing'],
        colors: [TOKENS.ACCENT, '#ef4444', '#9ca3af'],
        dataLabels: {
          enabled: true,
          style: { fontSize: '11px', fontWeight: 700 },
          formatter: (val) => `${val.toFixed(0)}%`
        },
        legend: { show: true, position: 'bottom', horizontalAlign: 'center', fontWeight: 700, labels: { colors: TOKENS.MUTED } },
        stroke: { width: 0 },
        plotOptions: {
          pie: {
            donut: {
              size: '68%',
              labels: {
                show: true,
                total: {
                  show: true,
                  label: 'Total',
                  fontSize: '14px',
                  fontWeight: 700,
                  formatter: (w) => {
                    const s = w.globals.seriesTotals?.reduce((a, b) => a + b, 0) || 0;
                    return String(s);
                  }
                }
              }
            }
          }
        },
        tooltip: {
          y: {
            formatter: (v, { w, seriesIndex }) => {
              const total = w.globals.seriesTotals.reduce((a, b) => a + b, 0) || 0;
              const label = w.globals.labels[seriesIndex];
              return `${label}: ${v} (${total ? Math.round((v / total) * 100) : 0}%)`;
            }
          }
        }
      });
      charts.closing.render();

      // Initial load for pies
      loadReplyAndClosing(state.year);
    }

    function loadAssignee(year, site) {
      fetchAssigneeByDept(year, site).then(payload => {
        const seriesData = Array.isArray(payload.data) ? payload.data : [];
        const maxVal = Math.max(0, payload.max || 0);

        const STEP = 5;
        const xMax = Math.max(STEP, STEP * Math.ceil(maxVal / STEP));
        const tickAmount = Math.max(2, xMax / STEP);

        if (!charts.assignee) return;

        charts.assignee.updateOptions({
          chart: { animations: CHART_ANIMS },
          xaxis: {
            min: 0, max: xMax, tickAmount,
            decimalsInFloat: 0,
            title: { text: 'Count', style: { color: TOKENS.MUTED, fontWeight: 700 } },
            labels: { style: { colors: TOKENS.MUTED }, formatter: int }
          },
          yaxis: { labels: { style: { colors: TOKENS.MUTED, fontWeight: 600 } } }
        }, false, true);

        charts.assignee.updateSeries([{ name: 'RCPA', data: seriesData }], true);
      }).catch(err => {
        console.error('Failed to load assignee-by-dept:', err);
        if (charts.assignee) {
          charts.assignee.updateSeries([{ name: 'RCPA', data: [] }], true);
        }
      });
    }

    function loadMonthly(year) {
      fetchMonthly(year).then(d => {
        const data = safeArray12(d.monthly);

        // --- Y-axis: show 5, 10, 15, 20... ---
        const STEP = 5;
        const maxVal = Math.max(0, ...data);
        const yMax = Math.max(STEP, STEP * Math.ceil(maxVal / STEP));
        const tickAmount = yMax / STEP;

        if (!charts.monthly || typeof charts.monthly.updateOptions !== 'function') return;

        charts.monthly.updateOptions({
          chart: { animations: CHART_ANIMS },
          yaxis: {
            min: 0,
            max: yMax,
            tickAmount,
            decimalsInFloat: 0,
            labels: {
              style: { colors: TOKENS.MUTED },
              formatter: v => (v % STEP === 0 ? String(v === 0 ? '' : v) : '')
            }
          }
        }, false, true);

        charts.monthly.updateSeries([{ name: `RCPA (${year})`, data }], true);
      }).catch(err => {
        console.error('Failed to load monthly data:', err);
        if (!charts.monthly || typeof charts.monthly.updateSeries !== 'function') return;
        charts.monthly.updateSeries([{ name: `RCPA (${year})`, data: Array(12).fill(0) }], true);
      });
    }

    // Load pies for reply & closing
    function loadReplyAndClosing(year) {
      fetchReplyStatus(year).then(d => {
        charts.reply.updateOptions({ labels: d.labels }, false, true);
        charts.reply.updateSeries(d.series, true);
      }).catch(err => {
        console.error('Failed to load reply status:', err);
        charts.reply.updateSeries([0, 0, 0], true);
      });

      fetchClosingStatus(year).then(d => {
        charts.closing.updateOptions({ labels: d.labels }, false, true);
        charts.closing.updateSeries(d.series, true);
      }).catch(err => {
        console.error('Failed to load closing status:', err);
        charts.closing.updateSeries([0, 0, 0], true);
      });
    }

    function updateCharts() {
      // Monthly & pies remain year-only (unchanged)
      loadMonthly(state.year);
      loadReplyAndClosing(state.year);

      // Assignee now depends on year + site
      loadAssignee(state.year, state.site);
    }

    /* ------- TOOLBAR BINDING ------- */
    if (els.siteSelect) {
      els.siteSelect.addEventListener('change', () => {
        state.site = els.siteSelect.value;
        updateCharts();
      });
    }
    if (els.yearSelect) {
      els.yearSelect.addEventListener('change', () => { state.year = els.yearSelect.value; updateCharts(); });
    }

    // 1) Load dynamic year options, 2) then render charts
    initYearOptions().finally(() => {
      createCharts();
    });
  }
})();


/* =========================================================
 * CALENDAR MODAL (modal + calendar) — IIFE #2
 * =======================================================*/
(() => {
  'use strict';

  if (document.readyState !== 'loading') init();
  else document.addEventListener('DOMContentLoaded', init);

  function init() {
    /* ------- DOM ------- */
    const els = {
      openBtn: document.getElementById('openCalendarBtn'),
      modal: document.getElementById('calendarModal'),
      closeBtn: document.getElementById('closeCalendarBtn'),
      monthEl: document.getElementById('calMonth'),
      yearEl: document.getElementById('calYear'),
      gridEl: document.getElementById('calGrid'),
      prevBtn: document.getElementById('calPrevBtn'),
      nextBtn: document.getElementById('calNextBtn'),
      todayBtn: document.getElementById('calTodayBtn'),
      selectedEl: document.getElementById('calSelected'),
      nwList: document.getElementById('nwList'),
      nwYearFilter: document.getElementById('nwYearFilter'),
      nwMonthFilter: document.getElementById('nwMonthFilter')
    };

    if (!els.modal) return;
    if (els.selectedEl) els.selectedEl.style.display = 'none';

    /* ------- CONFIG ------- */
    const API_URL = '../php-backend/rcpa-not-working-calendar.php';

    /* ------- STATE ------- */
    const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    let viewDate = stripTime(new Date());
    let selectedDate = null;

    // DB rows (all) + filtered rows for the left list
    let notWorkingRowsAll = [];
    let notWorkingRows = [];
    // Set of ISO dates (YYYY-MM-DD) from DB for calendar highlighting
    let notWorkingSet = new Set();

    // Filters
    let filterYear = 'all';
    let filterMonth = 'all';

    // Permission flag (NEW)
    let canEdit = true;

    /* ------- Utils ------- */
    function stripTime(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
    function fmtISO(d) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${dd}`;
    }
    function prettyLongISO(iso) {
      const [y, m, d] = iso.split('-').map(Number);
      const date = new Date(y, m - 1, d);
      return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }); // "August 23, 2025"
    }

    /* ------- SweetAlert helpers ------- */
    async function swalConfirmSet(iso) {
      const { isConfirmed } = await Swal.fire({
        title: 'Set as non working?',
        text: prettyLongISO(iso),
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Yes',
        cancelButtonText: 'No'
      });
      return isConfirmed;
    }

    async function swalConfirmUnset(iso) {
      const { isConfirmed } = await Swal.fire({
        title: 'Un-set this not working date?',
        text: prettyLongISO(iso),
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes',
        cancelButtonText: 'No'
      });
      return isConfirmed;
    }

    async function swalError(msg) {
      await Swal.fire({ icon: 'error', title: 'Oops', text: msg || 'Something went wrong.' });
    }

    /* ------- Filters: populate & apply ------- */
    function populateYearOptions(rows) {
      if (!els.nwYearFilter) return;
      const years = Array.from(new Set(rows.map(r => r.date.slice(0, 4)))).sort();
      els.nwYearFilter.innerHTML = [
        `<option value="all">All years</option>`,
        ...years.map(y => `<option value="${y}">${y}</option>`)
      ].join('');
      if (!years.includes(filterYear)) filterYear = 'all';
      els.nwYearFilter.value = filterYear;
    }
    function populateMonthOptions() {
      if (!els.nwMonthFilter) return;
      const opts = MONTHS.map((name, i) => `<option value="${String(i + 1).padStart(2, '0')}">${name}</option>`);
      els.nwMonthFilter.innerHTML = `<option value="all">All months</option>${opts.join('')}`;
      els.nwMonthFilter.value = filterMonth;
    }
    function applyFilters() {
      notWorkingRows = notWorkingRowsAll.filter(r => {
        const y = r.date.slice(0, 4);
        const m = r.date.slice(5, 7);
        const okY = (filterYear === 'all') || (y === filterYear);
        const okM = (filterMonth === 'all') || (m === filterMonth);
        return okY && okM;
      });
      renderList();
    }

    /* ------- API ------- */
    async function fetchNotWorkingDates() {
      const res = await fetch(API_URL, { method: 'GET', credentials: 'same-origin' });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Failed to load');

      // NEW: permission from backend
      canEdit = !!data.can_edit;

      notWorkingRowsAll = data.data || [];
      notWorkingSet = new Set(notWorkingRowsAll.map(r => r.date));

      populateYearOptions(notWorkingRowsAll);
      populateMonthOptions();
      applyFilters();  // updates left list
      render();        // repaints calendar
    }
    async function addNotWorkingDate(isoDate) {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ action: 'add', date: isoDate })
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Failed to save');
      return data;
    }
    async function removeNotWorkingDate(isoDate) {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ action: 'delete', date: isoDate })
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Failed to delete');
      return data;
    }

    /* ------- LEFT LIST ------- */
    function renderList() {
      if (!els.nwList) return;
      if (!notWorkingRows.length) {
        els.nwList.innerHTML = `<div style="padding:8px;color:#777;">No dates yet.</div>`;
        return;
      }
      els.nwList.innerHTML = notWorkingRows
        .map(r => `<div class="nw-item" data-id="${r.id}"><span>${prettyLongISO(r.date)}</span></div>`)
        .join('');
    }

    /* ------- CALENDAR ------- */
    function render() {
      const y = viewDate.getFullYear();
      const m = viewDate.getMonth();
      els.monthEl.textContent = MONTHS[m];
      els.yearEl.textContent = y;

      let html = WEEKDAYS.map(d => `<div class="cal-weekday" role="columnheader" aria-label="${d}">${d}</div>`).join('');

      const firstOfMonth = new Date(y, m, 1);
      const startDay = firstOfMonth.getDay();
      const daysInMonth = new Date(y, m + 1, 0).getDate();
      const daysInPrev = new Date(y, m, 0).getDate();
      const totalCells = 42;
      const today = stripTime(new Date());

      for (let i = 0; i < totalCells; i++) {
        const cellIndex = i - startDay + 1;
        let d, muted = false;

        if (cellIndex <= 0) { d = stripTime(new Date(y, m - 1, daysInPrev + cellIndex)); muted = true; }
        else if (cellIndex > daysInMonth) { d = stripTime(new Date(y, m + 1, cellIndex - daysInMonth)); muted = true; }
        else { d = stripTime(new Date(y, m, cellIndex)); }

        const iso = fmtISO(d);
        const isToday = d.getTime() === today.getTime();
        const isSunday = d.getDay() === 0;                 // auto No work
        const isManualNW = notWorkingSet.has(iso);         // from DB

        // Build class list:
        const cls = ['cal-day'];
        if (muted) cls.push('is-muted');
        if (isToday) cls.push('is-today');
        if (isSunday) cls.push('is-sunday-off');           // indigo style
        if (isManualNW) cls.push('is-not-working');        // red style

        // Disable Sundays OR disable everything for non-QA/QMS
        const disabledAll = !canEdit;
        const isDisabled = isSunday || disabledAll;
        const disabledAttrs = isDisabled ? 'disabled aria-disabled="true" tabindex="-1" style="cursor:not-allowed;"' : '';

        html += `
          <button
            class="${cls.join(' ')}"
            role="gridcell"
            aria-label="${d.toDateString()}"
            aria-pressed="false"
            data-date="${iso}"
            title="${isDisabled ? (disabledAll ? 'Not allowed' : 'No work (Sunday)') : (isManualNW ? 'Non working' : '')}"
            ${disabledAttrs}
          ><span class="cal-num">${d.getDate()}</span></button>`;
      }

      els.gridEl.innerHTML = html;

      // Do not attach click handlers if user cannot edit
      if (!canEdit) return;

      // Click handlers (toggle add/remove) — skip disabled
      els.gridEl.querySelectorAll('.cal-day:not([disabled])').forEach(btn => {
        btn.addEventListener('click', async () => {
          const iso = btn.getAttribute('data-date');
          const [yy, mm, dd] = iso.split('-').map(Number);
          const picked = stripTime(new Date(yy, mm - 1, dd));
          const isMuted = btn.classList.contains('is-muted');
          const alreadyNW = notWorkingSet.has(iso);

          selectedDate = picked;
          if (isMuted) viewDate = new Date(yy, mm - 1, 1);

          try {
            if (alreadyNW) {
              if (!(await swalConfirmUnset(iso))) return;
              await removeNotWorkingDate(iso);
            } else {
              if (!(await swalConfirmSet(iso))) return;
              await addNotWorkingDate(iso);
            }
            await fetchNotWorkingDates(); // refresh filters, list, highlights, calendar
          } catch (err) {
            console.error(err);
            swalError('Action failed. Please try again.');
          }
        });
      });
    }

    /* ------- MODAL ------- */
    const open = () => {
      els.modal.classList.add('show');
      els.modal.setAttribute('aria-hidden', 'false');
      document.body.classList.add('no-scroll');
      els.todayBtn?.focus();
      fetchNotWorkingDates().catch(console.error);
    };
    const close = () => {
      els.modal.classList.remove('show');
      els.modal.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('no-scroll');
      els.openBtn?.focus();
    };

    els.openBtn?.addEventListener('click', open);
    els.closeBtn?.addEventListener('click', close);
    els.modal?.addEventListener('click', (e) => { if (e.target === els.modal) close(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && els.modal.classList.contains('show')) close(); });

    // Navigation
    els.prevBtn?.addEventListener('click', () => { viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1); render(); });
    els.nextBtn?.addEventListener('click', () => { viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1); render(); });
    els.todayBtn?.addEventListener('click', () => { viewDate = stripTime(new Date()); selectedDate = null; render(); });

    // Filters
    els.nwYearFilter?.addEventListener('change', (e) => { filterYear = e.target.value || 'all'; applyFilters(); });
    els.nwMonthFilter?.addEventListener('change', (e) => { filterMonth = e.target.value || 'all'; applyFilters(); });

    // First paint + preload
    render();
    fetchNotWorkingDates().catch(console.error);
  }
})();

/* =========================================================
 * RCPA LIST MODAL — open via "RCPA" button (in-modal Year filter)
 * =======================================================*/
(() => {
  'use strict';

  /* =======================
     DOM REFS (list modal)
  ======================= */
  const openBtn = document.getElementById('openRcpaListBtn');
  const modal = document.getElementById('rcpaListModal');
  const closeBtn = document.getElementById('closeRcpaListBtn');
  const tbody = document.getElementById('rcpaListTbody');
  const yearFilter = document.getElementById('rcpaListYearFilter');

  /* NEW: pagination DOM refs (optional but recommended in HTML) */
  const listPrevBtn = document.getElementById('rcpaListPrev');
  const listNextBtn = document.getElementById('rcpaListNext');
  const listPageInfo = document.getElementById('rcpaListPageInfo');
  const listTotal = document.getElementById('rcpaListTotal');

  /* =======================
     DOM REFS (view modal)
  ======================= */
  const viewModal = document.getElementById('rcpa-view-modal');
  const viewCloseBtn = document.getElementById('rcpa-view-close');

  /* =======================
     DOM REFS (reject viewer)
  ======================= */
  const dModal = document.getElementById('reject-remarks-modal');
  const dClose = document.getElementById('reject-remarks-close');
  const dText = document.getElementById('reject-remarks-text');
  const dList = document.getElementById('reject-remarks-attach-list');

  /* =======================
     DOM REFS (WHY-WHY modal)
  ======================= */
  const whyModal = document.getElementById('rcpa-why-view-modal');
  const whyClose = document.getElementById('rcpa-why-view-close');
  const whyOk = document.getElementById('rcpa-why-view-ok');
  const whyDesc = document.getElementById('rcpa-why-view-desc');
  const whyList = document.getElementById('rcpa-why-view-list');
  const whyOpenBtn = document.getElementById('rcpa-view-open-why');

  // track last trigger for focus return
  let lastViewTrigger = null;

  if (!openBtn || !modal || !tbody) return;

  const API_URL = '../php-backend/rcpa-dashboard-rcpa.php';
  const VIEW_URL = '../php-backend/rcpa-view-closed.php';
  const WHY_URL = '../php-backend/rcpa-why-analysis-list.php';
  const COLS = 17; // header count incl. Action column

  // state
  let allRows = [];
  let filteredRows = [];

  /* NEW: pagination state */
  let page = 1;
  const pageSize = 9;

  /* =======================
     UTILITIES
  ======================= */
  const esc = s =>
    ('' + (s ?? '')).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));

  function fmtYmd(ymd) {
    if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return ymd || '';
    const d = new Date(ymd + 'T00:00:00');
    const mnames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${mnames[d.getMonth()]} ${String(d.getDate()).padStart(2, '0')}, ${d.getFullYear()}`;
  }
  function fmtDateTime(s) {
    if (!s) return '';
    const d = new Date(String(s).replace(' ', 'T'));
    if (isNaN(d)) return s;
    const mnames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    let hh = d.getHours();
    const mm = String(d.getMinutes()).padStart(2, '0');
    const ampm = hh >= 12 ? 'PM' : 'AM';
    hh = hh % 12 || 12;
    return `${mnames[d.getMonth()]} ${String(d.getDate()).padStart(2, '0')}, ${d.getFullYear()} ${hh}:${mm} ${ampm}`;
  }
  const fmtDateOnly = (s) => {
    if (!s) return '';
    const d = new Date(String(s).replace(' ', 'T'));
    return isNaN(d) ? String(s) : d.toLocaleDateString();
  };
  const yearFrom = (s) => {
    if (!s) return '';
    const d = new Date(String(s).replace(' ', 'T'));
    if (!isNaN(d)) return String(d.getFullYear());
    const m = String(s).match(/\b(20\d{2}|\d{4})\b/);
    return m ? m[1] : '';
  };
  function deriveYear(isoDateTime) {
    if (!isoDateTime) return null;
    const y = String(isoDateTime).slice(0, 4);
    return /^\d{4}$/.test(y) ? y : null;
  }
  function shouldHideAssigneeValidationByStatus() {
    const status = (document.getElementById('rcpa-view-status')?.value || '')
      .trim()
      .toUpperCase();
    const blocked = new Set([
      'IN-VALID APPROVAL',
      'IN-VALIDATION REPLY',
      'IN-VALIDATION REPLY APPROVAL',
      'IN-VALID APPROVAL - ORIGINATOR',
      'CLOSED (IN-VALID)'
    ]);
    return blocked.has(status);
  }
  function shouldHideInvalidReplyByStatus() {
    const status = (document.getElementById('rcpa-view-status')?.value || '')
      .trim()
      .toUpperCase();
    const blocked = new Set([
      'VALID APPROVAL',
      'VALIDATION REPLY',
      'REPLY CHECKING - ORIGINATOR',
      'VALIDATION REPLY APPROVAL',
      'FOR CLOSING',
      'FOR CLOSING APPROVAL',
      'EVIDENCE CHECKING',
      'EVIDENCE CHECKING - ORIGINATOR',
      'EVIDENCE CHECKING APPROVAL',
      'EVIDENCE APPROVAL'
    ]);
    return blocked.has(status);
  }



  // BETTER: surface server error body in console to debug 4xx/5xx
  async function fetchJSON(url) {
    const res = await fetch(url, { credentials: 'same-origin' });
    const text = await res.text().catch(() => '');
    try {
      const json = text ? JSON.parse(text) : {};
      if (!res.ok) {
        console.error('Fetch failed:', res.status, json?.error || text || url);
        throw new Error(json?.error || `HTTP ${res.status}`);
      }
      return json;
    } catch (e) {
      if (!res.ok) throw e; // already handled
      // non-JSON but 200
      console.error('Non-JSON response for', url, text);
      throw new Error('Invalid JSON');
    }
  }

  function setVal(id, v) { const el = document.getElementById(id); if (el) el.value = v ?? ''; }
  function setChecked(id, on) { const el = document.getElementById(id); if (el) el.checked = !!on; }
  function setDateVal(id, v) { const el = document.getElementById(id); if (el) el.value = (v && String(v).slice(0, 10)) || ''; }
  function showCond(id, show) { const el = document.getElementById(id); if (el) el.hidden = !show; }
  function setSectionVisible(el, show) { if (!el) return; if (show) el.removeAttribute('hidden'); else el.setAttribute('hidden', ''); }
  function setHiddenSel(selector, hide) {
    viewModal?.querySelectorAll(selector).forEach(el => hide ? el.setAttribute('hidden', '') : el.removeAttribute('hidden'));
  }
  function setCheckedByAny(selectors, on) {
    const seen = new Set();
    selectors.forEach(sel => {
      viewModal?.querySelectorAll(sel).forEach(cb => {
        if (cb && !seen.has(cb)) { cb.checked = !!on; seen.add(cb); }
      });
    });
  }
  function renderAttachmentsTo(wrapId, s) {
    const wrap = document.getElementById(wrapId);
    if (!wrap) return;
    wrap.innerHTML = '';
    if (s == null || s === '') return;

    const escapeHtml = (t) => ('' + t).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
    const humanSize = (n) => {
      if (n == null || n === '' || isNaN(n)) return '';
      let bytes = Number(n);
      if (bytes < 1024) return bytes + ' B';
      const units = ['KB', 'MB', 'GB', 'TB', 'PB'];
      let i = -1;
      do { bytes /= 1024; i++; } while (bytes >= 1024 && i < units.length - 1);
      return bytes.toFixed(bytes >= 10 ? 0 : 1) + ' ' + units[i];
    };

    let items = [];
    try {
      const parsed = typeof s === 'string' ? JSON.parse(s) : s;
      if (Array.isArray(parsed)) items = parsed;
      else if (parsed && Array.isArray(parsed.files)) items = parsed.files;
    } catch {
      items = String(s).split(/[\n,]+/).map(t => t.trim()).filter(Boolean).map(t => {
        const parts = t.split('|').map(x => x.trim());
        if (parts.length >= 2) return { name: parts[0], url: parts[1], size: parts[2] };
        return { url: t };
      });
    }

    items.forEach(it => {
      const url = typeof it === 'string' ? it : (it && (it.url || it.path || it.href)) || '';
      let name = typeof it === 'string' ? '' : (it && (it.name || it.filename)) || '';
      let size = (it && (it.size ?? it.bytes)) ?? '';
      if (!name) {
        if (url) {
          try { name = decodeURIComponent(url.split('/').pop().split('?')[0]) || 'Attachment'; }
          catch { name = url.split('/').pop().split('?')[0] || 'Attachment'; }
        } else { name = 'Attachment'; }
      }
      const safeName = escapeHtml(name);
      const safeUrl = escapeHtml(url);
      const sizeText = size === '' ? '' : (isNaN(size) ? escapeHtml(String(size)) : escapeHtml(humanSize(size)));
      const linkStart = url ? `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer" title="${safeName}">` : `<span title="${safeName}">`;
      const linkEnd = url ? `</a>` : `</span>`;

      const row = document.createElement('div');
      row.className = 'file-chip';
      row.innerHTML = `
        <i class="fa-solid fa-paperclip" aria-hidden="true"></i>
        <div class="file-info">
          <div class="name">${linkStart}${safeName}${linkEnd}</div>
          <div class="sub">${sizeText}</div>
        </div>
      `;
      wrap.appendChild(row);
    });
  }

  /* =======================
     BADGES (list table)
  ======================= */
  function badgeForCategory(c) {
    const raw = c ?? '';
    thead: ;
    const t = String(raw).trim().toUpperCase();
    const map = { 'MAJOR': 'badge-cat-major', 'MINOR': 'badge-cat-minor', 'OBS': 'badge-cat-obs', 'OBSERVATION': 'badge-cat-obs' };
    const cls = map[t];
    return cls ? `<span class="rcpa-badge ${cls}">${esc(raw)}</span>` : esc(raw || '—');
  }
  function badgeForStatus(s) {
    const t = String(s || '').toUpperCase().trim();
    const map = {
      'QMS CHECKING': 'badge-qms-checking',
      'FOR APPROVAL OF SUPERVISOR': 'badge-approval-supervisor',
      'FOR APPROVAL OF MANAGER': 'badge-approval-manager',
      'REJECTED': 'badge-rejected',
      'ASSIGNEE PENDING': 'badge-assignee-pending',
      'VALID APPROVAL': 'badge-valid-approval',
      'IN-VALID APPROVAL': 'badge-invalid-approval',
      'REPLY CHECKING - ORIGINATOR': 'badge-validation-reply-approval',
      'IN-VALIDATION REPLY': 'badge-invalidation-reply',
      'VALIDATION REPLY': 'badge-validation-reply',
      'VALIDATION REPLY APPROVAL': 'badge-validation-reply-approval',
      'IN-VALIDATION REPLY APPROVAL': 'badge-invalidation-reply-approval',
      'FOR CLOSING': 'badge-assignee-corrective',
      'FOR CLOSING APPROVAL': 'badge-assignee-corrective-approval',
      'EVIDENCE CHECKING': 'badge-corrective-checking',
      'EVIDENCE CHECKING - ORIGINATOR': 'badge-validation-reply-approval',
      'IN-VALID APPROVAL - ORIGINATOR': 'badge-validation-reply-approval',
      'EVIDENCE CHECKING APPROVAL': 'badge-corrective-checking-approval',
      'EVIDENCE APPROVAL': 'badge-corrective-checking-approval',
      'CLOSED (VALID)': 'badge-closed',
      'CLOSED (IN-VALID)': 'badge-rejected'
    };
    const cls = map[t] || 'badge-unknown';
    return `<span class="rcpa-badge ${cls}">${s ? s : 'NO STATUS'}</span>`;
  }

  /* =======================
     LIST RENDER/FILTER
  ======================= */
  async function fetchRows() {
    const res = await fetch(API_URL, { credentials: 'same-origin' });
    const data = await res.json();
    if (!res.ok || data.success === false) throw new Error(data.error || `HTTP ${res.status}`);
    return data.rows || [];
  }

  function populateYearFilter(rows) {
    const years = Array.from(new Set(rows.map(r => deriveYear(r.date_request)).filter(Boolean))).sort().reverse();
    yearFilter.innerHTML = `<option value="all">All</option>` + years.map(y => `<option value="${y}">${y}</option>`).join('');
    const thisYear = String(new Date().getFullYear());
    yearFilter.value = years.includes(thisYear) ? thisYear : 'all';
  }

  /* NEW: update footer info/buttons */
  function updateFooter() {
    const total = filteredRows.length;
    const lastPage = Math.max(1, Math.ceil(total / pageSize));
    if (listTotal) listTotal.textContent = `${total} record${total === 1 ? '' : 's'}`;
    if (listPageInfo) listPageInfo.textContent = `Page ${Math.min(page, lastPage)} of ${lastPage}`;
    if (listPrevBtn) listPrevBtn.disabled = page <= 1 || total === 0;
    if (listNextBtn) listNextBtn.disabled = page >= lastPage || total === 0;
  }

  /* NEW: render current page slice */
  function renderPage() {
    const total = filteredRows.length;
    const lastPage = Math.max(1, Math.ceil(total / pageSize));
    page = Math.min(Math.max(1, page), lastPage); // clamp

    if (total === 0) {
      tbody.innerHTML = `<tr><td colspan="${COLS}" class="rcpa-empty">No records found.</td></tr>`;
      updateFooter();
      return;
    }

    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const slice = filteredRows.slice(start, end);
    render(slice);
    updateFooter();
  }

  function applyFilter() {
    const y = yearFilter.value;
    filteredRows = (y === 'all') ? allRows : allRows.filter(r => deriveYear(r.date_request) === y);
    page = 1;         // reset to first page on filter change
    renderPage();     // render page slice + update footer
  }

  function render(rows) {
    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="${COLS}" class="rcpa-empty">No records found.</td></tr>`;
      return;
    }
    tbody.innerHTML = rows.map(r => `
    <tr>
      <td>${esc(r.originator_department)}</td>
      <td>${esc(r.id)}</td>
      <td>${esc(r.rcpa_type_label || r.rcpa_type)}</td>
      <td>${badgeForCategory(r.category || r.category_label)}</td>
      <td>${esc(r.originator_name)}</td>
      <td>${esc(r.assignee)}</td>
      <td>${fmtDateTime(r.date_request)}</td>
      <td>${badgeForStatus(r.status)}</td>
      <td>${fmtYmd(r.reply_received)}</td>
      <td>${r.no_days_reply ?? ''}</td>
      <td>${fmtYmd(r.reply_date)}</td>
      <td>${fmtYmd(r.reply_due_date)}</td>
      <td>${r.no_days_close ?? ''}</td>
      <td>${fmtYmd(r.close_date)}</td>
      <td>${fmtYmd(r.close_due_date)}</td>

      <!-- Action -->
      <td>
        <button type="button" class="rcpa-btn rcpa-view-btn"
                data-view-id="${esc(r.id)}"
                aria-label="View RCPA ${esc(r.id)}" title="View">
          View
        </button>
      </td>

      <!-- History -->
      <td>
        <button type="button"
                class="rcpa-history-btn"
                data-history-id="${esc(r.id)}"
                aria-label="View history for RCPA ${esc(r.id)}"
                title="History"
                style="background:none;border:0;padding:0;margin:0;line-height:1;cursor:pointer;">
          <i class="fa-solid fa-clock-rotate-left" aria-hidden="true"></i>
          <span class="sr-only" style="position:absolute;left:-9999px;">History</span>
        </button>
      </td>
    </tr>
  `).join('');
  }

  async function openListModal() {
    tbody.innerHTML = `<tr><td colspan="${COLS}" class="rcpa-empty">Loading…</td></tr>`;
    modal.classList.add('show');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('no-scroll');

    try {
      allRows = await fetchRows();
      populateYearFilter(allRows);
      applyFilter(); // will render page 1 and update footer
    } catch (e) {
      console.error(e);
      tbody.innerHTML = `<tr><td colspan="${COLS}" class="rcpa-empty">Failed to load.</td></tr>`;
      // reset footer on error
      filteredRows = [];
      page = 1;
      updateFooter();
    }
  }

  function closeListModal() {
    modal.classList.remove('show');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('no-scroll');
    openBtn?.focus();
  }

  // open/close (list)
  openBtn.addEventListener('click', openListModal);
  closeBtn?.addEventListener('click', closeListModal);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeListModal(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      // close Why-Why first if open
      if (whyModal && !whyModal.hidden) { closeWhyModal(); return; }
      if (dModal && !dModal.hidden) { closeDisapproveModal(); return; }
      if (viewModal && !viewModal.hidden) { hideViewModal(); return; }
      if (modal.classList.contains('show')) { closeListModal(); }
    }
  });
  yearFilter?.addEventListener('change', applyFilter);

  /* NEW: pagination events */
  listPrevBtn?.addEventListener('click', () => { if (page > 1) { page--; renderPage(); } });
  listNextBtn?.addEventListener('click', () => { page++; renderPage(); });

  /* =======================
     VIEW MODAL: helpers
  ======================= */
  const validFs = viewModal?.querySelector('fieldset.validation:not(.validation-invalid)');
  const invalidFs = viewModal?.querySelector('fieldset.validation-invalid');
  const corrFs = viewModal?.querySelector('fieldset.corrective-evidence');
  const evidenceFs = viewModal?.querySelector('#rcpa-view-evidence');
  const followFs = viewModal?.querySelector('#rcpa-view-followup');

  function lockViewCheckboxes() {
    if (!viewModal) return;
    const boxes = viewModal.querySelectorAll('input[type="checkbox"]');
    boxes.forEach(cb => {
      cb.classList.add('readonly-check');
      cb.setAttribute('tabindex', '-1');
      cb.setAttribute('aria-readonly', 'true');
      cb.dataset.lockChecked = cb.checked ? '1' : '0';
    });
  }
  // prevent toggling readonly checkboxes
  viewModal?.addEventListener('click', (e) => {
    const lbl = e.target.closest?.('label');
    if (lbl) {
      const forId = lbl.getAttribute('for');
      const target = forId ? viewModal.querySelector(`#${CSS.escape(forId)}`) : lbl.querySelector('input[type="checkbox"]');
      if (target?.classList.contains('readonly-check')) { e.preventDefault(); }
    }
    if (e.target.matches?.('input[type="checkbox"].readonly-check')) { e.preventDefault(); }
  }, true);
  viewModal?.addEventListener('keydown', (e) => {
    if (e.target.matches?.('input[type="checkbox"].readonly-check') && (e.key === ' ' || e.key === 'Enter')) {
      e.preventDefault();
    }
  });
  viewModal?.addEventListener('change', (e) => {
    if (e.target.matches?.('input[type="checkbox"].readonly-check')) {
      e.preventDefault();
      e.target.checked = e.target.dataset.lockChecked === '1';
    }
  });

  function parseSemYear(s) {
    const out = { sem1: '', sem2: '', year: '', month: '' };
    if (!s) return out;
    const str = String(s).trim();
    const parts = str.split(/[;,|/]+/).map(t => t.trim()).filter(Boolean);
    if (parts.length >= 1) out.sem1 = parts[0];
    if (parts.length >= 2) out.sem2 = parts[1];
    let m = str.match(/^(\d{4})-(\d{1,2})$/);
    if (m) { out.year = m[1]; out.month = String(m[2]).padStart(2, '0'); return out; }
    m = str.match(/^([A-Za-z]+)\s+(\d{4})$/);
    if (m) { out.month = m[1]; out.year = m[2]; return out; }
    const y = str.match(/\b(20\d{2})\b/);
    if (y) out.year = y[1];
    return out;
  }

  function toggleValidPanels({ showNC, showPNC }) {
    viewModal?.querySelectorAll('.correction-grid:not(.preventive-grid)').forEach(g => {
      g.style.display = showNC ? 'grid' : 'none';
    });
    const pnc = viewModal?.querySelector('.preventive-grid');
    if (pnc) pnc.style.display = showPNC ? 'grid' : 'none';
    setCheckedByAny(['#rcpa-view-for-nc-valid', '#rcpa-view-for-nc', '.checkbox-for-non-conformance input[type="checkbox"]'], !!showNC);
    setCheckedByAny(['#rcpa-view-for-pnc', '.checkbox-for-potential-non-conformance input[type="checkbox"]'], !!showPNC);
  }

  // ✅ define to avoid runtime error
  function fillNotValidSection(data) {
    const hasData = !!(data && (
      (data.reason_non_valid && String(data.reason_non_valid).trim() !== '') ||
      (data.attachment && String(data.attachment).trim() !== '') ||
      (data.assignee_name && String(data.assignee_name).trim() !== '') ||
      (data.assignee_supervisor_name && String(data.assignee_supervisor_name).trim() !== '')
    ));

    if (!invalidFs) return false;

    if (!hasData) {
      setChecked('rcpa-view-findings-not-valid', false);
      setVal('rcpa-view-not-valid-reason', '');
      renderAttachmentsTo('rcpa-view-not-valid-attach-list', []);
      setSectionVisible(invalidFs, false);
      return false;
    }

    setChecked('rcpa-view-findings-not-valid', true);
    setVal('rcpa-view-not-valid-reason', data.reason_non_valid || '');
    renderAttachmentsTo('rcpa-view-not-valid-attach-list', data.attachment || '');
    setSectionVisible(invalidFs, true);
    return true;
  }

  // Renders the "Disapproval Remarks" table inside the view modal
  function renderRejectsTable(items) {
    const tb = document.querySelector('#rcpa-rejects-table tbody');
    if (!tb) return;

    const list = Array.isArray(items) ? items : [];

    if (!list.length) {
      tb.innerHTML = `<tr><td class="rcpa-empty" colspan="3">No records found</td></tr>`;
      // clear cache
      if (viewModal) viewModal.__rejects = [];
      return;
    }

    // Cache the list on the view modal so the row "View" buttons can read it
    if (viewModal) viewModal.__rejects = list;

    tb.innerHTML = list.map((row, i) => {
      const when = (() => {
        const d = new Date(String(row.created_at).replace(' ', 'T'));
        return isNaN(d) ? esc(row.created_at || '') : esc(d.toLocaleString());
      })();
      return `
      <tr>
        <td>${esc(row.disapprove_type || '-')}</td>
        <td>${when || '-'}</td>
        <td>
          <button type="button" class="rcpa-btn rcpa-reject-view" data-idx="${i}">
            View
          </button>
        </td>
      </tr>
    `;
    }).join('');
  }


  function fieldsetHasContent(root) {
    if (!root) return false;

    // any non-empty input/textarea/select?
    const hasFormValues = Array.from(root.querySelectorAll('input, textarea, select')).some(el => {
      if (el.disabled || el.readOnly) {
        // still count if it has a value/checked
      }
      const t = (el.type || '').toLowerCase();
      if (t === 'checkbox' || t === 'radio') return el.checked;
      const v = (el.value ?? '').toString().trim();
      return v.length > 0;
    });

    // any attachment chips rendered?
    const hasAttachments = Array.from(root.querySelectorAll('.attach-list')).some(list => list.children.length > 0);

    // special: Disapproval remarks table rows (not the "No records found" placeholder)
    let hasRejectRows = false;
    const rejTbody = root.querySelector('#rcpa-rejects-table tbody');
    if (rejTbody) {
      hasRejectRows = Array.from(rejTbody.querySelectorAll('tr')).some(tr => !tr.querySelector('.rcpa-empty'));
    }

    return hasFormValues || hasAttachments || hasRejectRows;
  }

  // Hide any fieldset that has no meaningful content
  function autoHideEmptyFieldsets() {
    if (!viewModal) return;

    const rejectFs = viewModal.querySelector('fieldset.reject-remarks');

    const sections = [
      viewModal.querySelector('.rcpa-type'),
      viewModal.querySelector('.category'),
      viewModal.querySelector('.originator'),
      viewModal.querySelector('.assignee'),
      viewModal.querySelector('fieldset.validation:not(.validation-invalid)'), // valid
      viewModal.querySelector('fieldset.validation-invalid'),                  // not-valid
      viewModal.querySelector('#rcpa-view-evidence'),
      viewModal.querySelector('#rcpa-view-followup'),
      viewModal.querySelector('fieldset.corrective-evidence'),
      rejectFs
    ].filter(Boolean);

    sections.forEach(fs => {
      // Force rule for the "VALIDATION OF RCPA BY ASSIGNEE" fieldset
      if (fs === validFs) {
        const blocked = shouldHideAssigneeValidationByStatus();
        setSectionVisible(validFs, blocked ? false : validationHasContent());
        return;
      }

      // NEW: Force rule for the "FINDINGS IN-VALIDATION REPLY" fieldset
      if (fs === invalidFs) {
        const blocked = shouldHideInvalidReplyByStatus();
        setSectionVisible(invalidFs, blocked ? false : fieldsetHasContent(invalidFs));
        return;
      }

      // special handling for Disapproval Remarks table
      if (fs === rejectFs) {
        const tb = fs.querySelector('#rcpa-rejects-table tbody');
        const hasRows = !!(tb && Array.from(tb.querySelectorAll('tr')).some(tr => !tr.querySelector('.rcpa-empty')));
        setSectionVisible(fs, hasRows);
        return;
      }

      const has = fieldsetHasContent(fs);
      setSectionVisible(fs, has);
    });

    // Bonus: keep TYPE only if it has a value or a visible conditional block
    const typeFs = viewModal.querySelector('.rcpa-type');
    if (typeFs) {
      const typeVal = (viewModal.querySelector('#rcpa-view-type')?.value || '').trim();
      const anyCondVisible = Array.from(typeFs.querySelectorAll('.type-conditional')).some(div => !div.hidden);
      setSectionVisible(typeFs, !!typeVal || anyCondVisible);
    }
  }

  function validationHasContent() {
    if (!validFs) return false;

    // any checkboxes ticked?
    const hasChecked = [
      '#rcpa-view-findings-valid',
      '#rcpa-view-for-nc-valid',
      '#rcpa-view-for-nc',
      '#rcpa-view-for-pnc'
    ].some(sel => !!viewModal.querySelector(sel)?.checked);

    // any text filled?
    const hasText = [
      'rcpa-view-root-cause',
      'rcpa-view-correction',
      'rcpa-view-corrective',
      'rcpa-view-preventive'
    ].some(id => (document.getElementById(id)?.value || '').trim() !== '');

    // any dates set?
    const hasDates = [
      'rcpa-view-correction-target', 'rcpa-view-correction-done',
      'rcpa-view-corrective-target', 'rcpa-view-corrective-done',
      'rcpa-view-preventive-target', 'rcpa-view-preventive-done'
    ].some(id => !!document.getElementById(id)?.value);

    // any attachments?
    const hasAttach = !!document.getElementById('rcpa-view-valid-attach-list')?.children.length;

    // any NC/PNC grids visible with content?
    const panelHasContent = Array.from(validFs.querySelectorAll('.correction-grid, .preventive-grid'))
      .filter(el => getComputedStyle(el).display !== 'none')
      .some(el =>
        (el.querySelector('textarea')?.value || '').trim() !== '' ||
        Array.from(el.querySelectorAll('input[type="date"]')).some(inp => !!inp.value)
      );

    return hasChecked || hasText || hasDates || hasAttach || panelHasContent;
  }

  function autoHideValidation() {
    if (!validFs) return;

    // NEW: force-hide when status is in blocked list
    if (shouldHideAssigneeValidationByStatus()) {
      setSectionVisible(validFs, false);
      return;
    }

    // existing behavior: only show if there’s meaningful content
    setSectionVisible(validFs, validationHasContent());
  }


  async function fillViewModal(row) {
    // WHY-WHY: remember which RCPA is being viewed
    if (viewModal) viewModal.dataset.rcpaId = row.id;

    // TYPE + conditional
    const typeKey = String(row.rcpa_type || '').toLowerCase().trim();
    const typeLabelMap = {
      external: 'External QMS Audit',
      internal: 'Internal Quality Audit',
      unattain: 'Un-attainment of delivery target of Project',
      online: 'On-Line',
      '5s': '5s Audit / Health & Safety Concerns',
      mgmt: 'Management Objective'
    };
    const typeLabel = typeLabelMap[typeKey] || (row.rcpa_type || '');
    setVal('rcpa-view-type', typeLabel);

    showCond('v-type-external', typeKey === 'external');
    showCond('v-type-internal', typeKey === 'internal');
    showCond('v-type-unattain', typeKey === 'unattain');
    showCond('v-type-online', typeKey === 'online');
    showCond('v-type-hs', typeKey === '5s');
    showCond('v-type-mgmt', typeKey === 'mgmt');

    const sy = parseSemYear(row.sem_year);
    const reqYear = yearFrom(row.date_request) || sy.year || '';

    if (typeKey === 'external') {
      setChecked('v-external-sem1-pick', !!reqYear);
      setVal('v-external-sem1-year', reqYear);
      setChecked('v-external-sem2-pick', false);
      setVal('v-external-sem2-year', '');
    } else if (typeKey === 'internal') {
      setChecked('v-internal-sem1-pick', !!reqYear);
      setVal('v-internal-sem1-year', reqYear);
      setChecked('v-internal-sem2-pick', false);
      setVal('v-internal-sem2-year', '');
    } else if (typeKey === 'unattain') {
      setVal('v-project-name', row.project_name);
      setVal('v-wbs-number', row.wbs_number);
    } else if (typeKey === 'online') {
      setVal('v-online-year', sy.year || row.sem_year || '');
    } else if (typeKey === '5s') {
      setVal('v-hs-year', sy.year || '');
      if (/^\d{2}$/.test(sy.month)) {
        const d = new Date(Number(sy.year || 2000), Number(sy.month) - 1, 1);
        setVal('v-hs-month', isNaN(d) ? (row.sem_year || '') : d.toLocaleString(undefined, { month: 'long' }));
      } else {
        setVal('v-hs-month', sy.month || '');
      }
    } else if (typeKey === 'mgmt') {
      setVal('v-mgmt-year', sy.year || row.sem_year || '');
      const q = String(row.quarter || '').toUpperCase();
      setChecked('rcpa-view-mgmt-q1', q.includes('Q1'));
      setChecked('rcpa-view-mgmt-q2', q.includes('Q2'));
      setChecked('rcpa-view-mgmt-q3', q.includes('Q3'));
      setChecked('rcpa-view-mgmt-ytd', q.includes('YTD'));
    }

    // Category + NC/PNC flags
    const cat = String(row.category || '').toLowerCase();
    setChecked('rcpa-view-cat-major', cat === 'major');
    setChecked('rcpa-view-cat-minor', cat === 'minor');
    setChecked('rcpa-view-cat-obs', cat === 'observation');

    const confNorm = String(row.conformance || '').toLowerCase().replace(/[\s_-]+/g, ' ').trim();
    let isPNC = (confNorm === 'pnc') || confNorm.includes('potential');
    let isNC = false;
    if (!isPNC) {
      isNC = confNorm === 'nc' || /\bnon[- ]?conformance\b/.test(confNorm) || confNorm === 'non conformance' || confNorm === 'nonconformance';
    }
    if (cat === 'observation') { isPNC = true; isNC = false; }
    else if (cat === 'major' || cat === 'minor') { isPNC = false; isNC = true; }

    setChecked('rcpa-view-flag-pnc', isPNC);
    setChecked('rcpa-view-flag-nc', isNC);

    if (isPNC) {
      setHiddenSel('.checkbox-for-non-conformance', true);
      setHiddenSel('.checkbox-for-potential-non-conformance', false);
    } else if (isNC) {
      setHiddenSel('.checkbox-for-non-conformance', false);
      setHiddenSel('.checkbox-for-potential-non-conformance', true);
    } else {
      setHiddenSel('.checkbox-for-non-conformance', false);
      setHiddenSel('.checkbox-for-potential-non-conformance', false);
    }

    // Originator / top fields
    setVal('rcpa-view-originator-name', row.originator_name);
    setVal('rcpa-view-originator-dept', row.originator_department);
    setVal('rcpa-view-date', fmtDateTime(row.date_request));
    setVal('rcpa-view-remarks', row.remarks);
    renderAttachmentsTo('rcpa-view-attach-list', row.remarks_attachment);
    setVal('rcpa-view-system', row.system_applicable_std_violated);
    setVal('rcpa-view-clauses', row.standard_clause_number);
    setVal('rcpa-view-supervisor', row.originator_supervisor_head);

    // Assignee/status
    setVal('rcpa-view-assignee', row.assignee);
    setVal('rcpa-view-status', row.status);
    setVal('rcpa-view-conformance', row.conformance);

    // ===== Validation (NC / PNC) =====
    ['rcpa-view-root-cause', 'rcpa-view-correction', 'rcpa-view-corrective', 'rcpa-view-preventive'].forEach(id => setVal(id, ''));
    ['rcpa-view-correction-target', 'rcpa-view-correction-done', 'rcpa-view-corrective-target', 'rcpa-view-corrective-done', 'rcpa-view-preventive-target', 'rcpa-view-preventive-done']
      .forEach(id => setDateVal(id, ''));
    const vAtt = document.getElementById('rcpa-view-valid-attach-list'); if (vAtt) vAtt.innerHTML = '';
    toggleValidPanels({ showNC: false, showPNC: false });
    setChecked('rcpa-view-findings-valid', false);
    setSectionVisible(validFs, false);

    let hasValid = false;

    try {
      if (isNC) {
        toggleValidPanels({ showNC: true, showPNC: false });
        const nc = await fetchJSON(`../php-backend/rcpa-view-valid-nc.php?rcpa_no=${encodeURIComponent(row.id)}`);
        if (nc) {
          setVal('rcpa-view-root-cause', nc.root_cause ?? '');
          setVal('rcpa-view-correction', nc.correction ?? '');
          setDateVal('rcpa-view-correction-target', nc.correction_target_date);
          setDateVal('rcpa-view-correction-done', nc.correction_date_completed);
          setVal('rcpa-view-corrective', nc.corrective ?? '');
          setDateVal('rcpa-view-corrective-target', nc.corrective_target_date);
          setDateVal('rcpa-view-corrective-done', nc.correction_date_completed);
          renderAttachmentsTo('rcpa-view-valid-attach-list', nc.attachment);

          hasValid = !!(
            (nc.root_cause && String(nc.root_cause).trim() !== '') ||
            (nc.correction && String(nc.correction).trim() !== '') ||
            (nc.corrective && String(nc.corrective).trim() !== '') ||
            (nc.correction_target_date || nc.correction_date_completed || nc.corrective_target_date) ||
            (nc.attachment && String(nc.attachment).trim() !== '')
          );
        }
      } else if (isPNC) {
        toggleValidPanels({ showNC: false, showPNC: true });
        const pnc = await fetchJSON(`../php-backend/rcpa-view-valid-pnc.php?rcpa_no=${encodeURIComponent(row.id)}`);
        if (pnc) {
          setVal('rcpa-view-root-cause', pnc.root_cause ?? '');
          setVal('rcpa-view-preventive', pnc.preventive_action ?? '');
          setDateVal('rcpa-view-preventive-target', pnc.preventive_target_date);
          setDateVal('rcpa-view-preventive-done', pnc.preventive_date_completed);
          renderAttachmentsTo('rcpa-view-valid-attach-list', pnc.attachment);

          hasValid = !!(
            (pnc.root_cause && String(pnc.root_cause).trim() !== '') ||
            (pnc.preventive_action && String(pnc.preventive_action).trim() !== '') ||
            (pnc.preventive_target_date || pnc.preventive_date_completed) ||
            (pnc.attachment && String(pnc.attachment).trim() !== '')
          );
        }
      }
    } catch (err) {
      console.warn('Validation fetch failed:', err);
    }

    setChecked('rcpa-view-findings-valid', hasValid);
    setSectionVisible(validFs, !!hasValid);

    autoHideValidation();

    // ===== Not-Valid (IN-VALIDATION REPLY) =====
    try {
      const inv = await fetchJSON(`../php-backend/rcpa-view-not-valid.php?rcpa_no=${encodeURIComponent(row.id)}`);
      const hasNV = !!inv;
      fillNotValidSection(inv || null);
      setSectionVisible(invalidFs, !!hasNV);
    } catch (err) {
      console.warn('not-valid fetch failed:', err);
      fillNotValidSection(null);
    }

    // ===== Evidence checking =====
    {
      const actionRaw = String(row.evidence_checking_action_done || '').trim().toLowerCase();
      const remarks = row.evidence_checking_remarks || '';
      const attach = row.evidence_checking_attachment || '';

      const isYes = ['yes', 'y', '1', 'true'].includes(actionRaw);
      const isNo = ['no', 'n', '0', 'false'].includes(actionRaw);
      setCheckedByAny(['#rcpa-view-ev-action-yes'], isYes);
      setCheckedByAny(['#rcpa-view-ev-action-no'], isNo);

      setVal('rcpa-view-ev-remarks', remarks);
      renderAttachmentsTo('rcpa-view-ev-attach-list', attach);

      const hasData = !!actionRaw || (remarks && String(remarks).trim() !== '') || (attach && String(attach).trim() !== '');
      setSectionVisible(evidenceFs, hasData);
    }

    // ===== Follow-up =====
    {
      const tgt = row.follow_up_target_date || '';
      const notes = row.follow_up_remarks || '';
      const files = row.follow_up_attachment || '';

      setDateVal('rcpa-view-followup-date', tgt);
      setVal('rcpa-view-followup-remarks', notes);
      renderAttachmentsTo('rcpa-view-followup-attach-list', files);

      const hasData = (tgt && String(tgt).trim() !== '') || (notes && String(notes).trim() !== '') || (files && String(files).trim() !== '');
      setSectionVisible(followFs, hasData);
    }

    // ===== Corrective Evidence (latest) =====
    {
      const hasCorrRemarks = !!(row.corrective_action_remarks && String(row.corrective_action_remarks).trim() !== '');
      const hasCorrAttach = !!(row.corrective_action_attachment && String(row.corrective_action_attachment).trim() !== '');
      setVal('rcpa-view-corrective-remarks', hasCorrRemarks ? row.corrective_action_remarks : '');
      if (hasCorrAttach) renderAttachmentsTo('rcpa-view-corrective-attach-list', row.corrective_action_attachment);
      else {
        const caAtt = document.getElementById('rcpa-view-corrective-attach-list');
        if (caAtt) caAtt.innerHTML = '';
      }
      setSectionVisible(corrFs, hasCorrRemarks || hasCorrAttach);
    }

    // ===== Disapproval remarks table =====
    renderRejectsTable(Array.isArray(row.rejects) ? row.rejects : []);

    // ===== Why-Why button visibility (show only if data exists) =====
    if (row.id) refreshWhyButton(row.id);

    // NEW: after all fields/attachments are set, auto-hide empties
    autoHideEmptyFieldsets();

  }

  function showViewModal(triggerEl) {
    lastViewTrigger = triggerEl || null;
    // NEW: mark list modal as background
    modal.classList.add('is-background');

    viewModal.removeAttribute('hidden');
    requestAnimationFrame(() => viewModal.classList.add('show'));
    viewModal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('no-scroll');
    viewCloseBtn?.focus();
  }

  function hideViewModal() {
    viewModal.classList.remove('show');
    viewModal.setAttribute('aria-hidden', 'true');
    viewModal.setAttribute('hidden', '');

    // NEW: restore list modal to foreground
    modal.classList.remove('is-background');

    lastViewTrigger?.focus();
    lastViewTrigger = null;
  }

  viewCloseBtn?.addEventListener('click', hideViewModal);
  viewModal?.addEventListener('click', (e) => { if (e.target === viewModal) hideViewModal(); });

  // open/close reject-viewer
  function openDisapproveModal(text, attachments) {
    if (dText) dText.value = text || '';
    if (dList) {
      dList.innerHTML = '';
      renderAttachmentsTo('reject-remarks-attach-list', attachments || '');
    }
    dModal?.removeAttribute('hidden');
    requestAnimationFrame(() => dModal?.classList.add('show'));
    document.body.classList.add('no-scroll');
  }
  function closeDisapproveModal() {
    if (!dModal) return;
    dModal.classList.remove('show');
    dModal.setAttribute('hidden', '');
    document.body.classList.remove('no-scroll');
    if (dText) dText.value = '';
    if (dList) dList.innerHTML = '';
  }
  dClose?.addEventListener('click', closeDisapproveModal);
  dModal?.addEventListener('click', (e) => { if (e.target === dModal) closeDisapproveModal(); });

  // Disapproval table click -> open viewer
  (function bindRejectViewClicks() {
    const table = document.getElementById('rcpa-rejects-table');
    if (!table) return;
    table.addEventListener('click', (e) => {
      const btn = e.target.closest('.rcpa-reject-view');
      if (!btn) return;
      const cache = (viewModal && viewModal.__rejects) || [];
      const idx = parseInt(btn.getAttribute('data-idx'), 10);
      const item = cache[idx];
      if (!item) return;
      openDisapproveModal(item.remarks || '', item.attachments || item.attachment || '');
    });
  })();

  // --- reset the view modal before loading a record ---
  function clearViewForm() {
    // Hide conditional type blocks
    ['v-type-external', 'v-type-internal', 'v-type-unattain', 'v-type-online', 'v-type-hs', 'v-type-mgmt']
      .forEach(id => showCond(id, false));

    // Clear text/textarea fields
    [
      'rcpa-view-type', 'v-external-sem1-year', 'v-external-sem2-year', 'v-internal-sem1-year', 'v-internal-sem2-year',
      'v-project-name', 'v-wbs-number', 'v-online-year', 'v-hs-month', 'v-hs-year', 'v-mgmt-year',
      'rcpa-view-originator-name', 'rcpa-view-originator-dept', 'rcpa-view-date', 'rcpa-view-remarks',
      'rcpa-view-system', 'rcpa-view-clauses', 'rcpa-view-supervisor', 'rcpa-view-assignee',
      'rcpa-view-status', 'rcpa-view-conformance',
      'rcpa-view-root-cause', 'rcpa-view-correction', 'rcpa-view-corrective', 'rcpa-view-preventive',
      'rcpa-view-corrective-remarks', 'rcpa-view-ev-remarks', 'rcpa-view-followup-remarks',
      'rcpa-view-not-valid-reason'
    ].forEach(id => setVal(id, ''));

    // Clear dates
    [
      'rcpa-view-correction-target', 'rcpa-view-correction-done',
      'rcpa-view-corrective-target', 'rcpa-view-corrective-done',
      'rcpa-view-preventive-target', 'rcpa-view-preventive-done',
      'rcpa-view-followup-date'
    ].forEach(id => setDateVal(id, ''));

    // Uncheck checkboxes
    [
      'rcpa-view-cat-major', 'rcpa-view-cat-minor', 'rcpa-view-cat-obs',
      'rcpa-view-flag-nc', 'rcpa-view-flag-pnc',
      'rcpa-view-findings-valid', 'rcpa-view-findings-not-valid',
      'rcpa-view-ev-action-yes', 'rcpa-view-ev-action-no',
      'rcpa-view-mgmt-q1', 'rcpa-view-mgmt-q2', 'rcpa-view-mgmt-q3', 'rcpa-view-mgmt-ytd'
    ].forEach(id => setChecked(id, false));

    // Show both NC/PNC toggles and uncheck their boxes
    setHiddenSel('.checkbox-for-non-conformance', false);
    setHiddenSel('.checkbox-for-potential-non-conformance', false);
    setCheckedByAny(['#rcpa-view-for-nc-valid', '#rcpa-view-for-nc', '.checkbox-for-non-conformance input[type="checkbox"]'], false);
    setCheckedByAny(['#rcpa-view-for-pnc', '.checkbox-for-potential-non-conformance input[type="checkbox"]'], false);

    // Hide NC/PNC panels
    toggleValidPanels({ showNC: false, showPNC: false });

    // Clear attachment lists
    [
      'rcpa-view-attach-list',
      'rcpa-view-valid-attach-list',
      'rcpa-view-not-valid-attach-list',
      'rcpa-view-corrective-attach-list',
      'rcpa-view-ev-attach-list',
      'rcpa-view-followup-attach-list'
    ].forEach(id => { const el = document.getElementById(id); if (el) el.innerHTML = ''; });

    // Hide main sections
    setSectionVisible(validFs, false);
    setSectionVisible(invalidFs, false);
    setSectionVisible(corrFs, false);
    setSectionVisible(evidenceFs, false);
    setSectionVisible(followFs, false);

    // Reset Disapproval table + cache
    const tb = document.querySelector('#rcpa-rejects-table tbody');
    if (tb) tb.innerHTML = `<tr><td class="rcpa-empty" colspan="3">No records found</td></tr>`;
    if (viewModal) viewModal.__rejects = [];

    // WHY-WHY: clear current rcpa id and hide button
    if (viewModal && viewModal.dataset) viewModal.dataset.rcpaId = '';
    setWhyButtonVisible(false);
  }

  // LIST: delegate click on "View" buttons (KEEP LIST OPEN)
  tbody.addEventListener('click', async (e) => {
    // History icon
    const hBtn = e.target.closest('.rcpa-history-btn');
    if (hBtn) {
      const rcpaId = hBtn.getAttribute('data-history-id');
      if (rcpaId) {
        document.dispatchEvent(new CustomEvent('rcpa:action', {
          detail: { action: 'history', id: rcpaId }
        }));
      }
      return;
    }

    // View button (existing)
    const btn = e.target.closest('.rcpa-view-btn');
    if (!btn) return;
    const rcpaId = btn.getAttribute('data-view-id');
    if (!rcpaId) return;

    try {
      clearViewForm();
      const row = await fetchJSON(`${VIEW_URL}?id=${encodeURIComponent(rcpaId)}`);
      if (!row || !row.id) { alert('Record not found.'); return; }
      await fillViewModal(row);
      lockViewCheckboxes();
      showViewModal(btn);
    } catch (err) {
      console.error(err);
      alert('Failed to load record. Please try again.');
    }
  });


  /* =======================
     WHY-WHY: button visibility, rendering & events
  ======================= */
  function setWhyButtonVisible(show) {
    if (!whyOpenBtn) return;
    // Using hidden keeps layout consistent with your markup
    if (show) whyOpenBtn.removeAttribute('hidden');
    else whyOpenBtn.setAttribute('hidden', '');
  }

  async function refreshWhyButton(rcpaId) {
    try {
      setWhyButtonVisible(false); // default off while loading
      const data = await fetchJSON(`${WHY_URL}?rcpa_no=${encodeURIComponent(rcpaId)}`);
      const hasRows = Array.isArray(data?.rows) && data.rows.length > 0;
      const hasDesc = !!(data?.description_of_findings && String(data.description_of_findings).trim() !== '');
      setWhyButtonVisible(hasRows || hasDesc);
    } catch (e) {
      console.warn('Why-Why availability check failed:', e);
      setWhyButtonVisible(false);
    }
  }

  function renderWhyList(items) {
    if (!whyList) return;

    const rows = Array.isArray(items) ? items : [];

    if (!rows.length) {
      whyList.classList.remove('two-col');
      whyList.style.display = 'flex';
      whyList.style.flexDirection = 'column';
      whyList.innerHTML = `<div class="rcpa-empty">No Why-Why analysis found for this record.</div>`;
      return;
    }

    // Group by analysis_type
    const groups = rows.reduce((m, r) => {
      const key = r.analysis_type || 'Analysis';
      (m[key] = m[key] || []).push(r);
      return m;
    }, {});
    const entries = Object.entries(groups);

    // Two columns only when exactly 2 groups
    if (entries.length === 2) {
      whyList.classList.add('two-col');
      whyList.style.display = '';          // let CSS grid handle it
      whyList.style.flexDirection = '';
    } else {
      whyList.classList.remove('two-col');
      whyList.style.display = 'flex';
      whyList.style.flexDirection = 'column';
    }

    const html = entries.map(([type, arr]) => {
      const itemsHtml = arr.map((r, i) => {
        const isRoot = String(r.answer).toLowerCase() === 'yes';
        const badge = isRoot
          ? `<span style="display:inline-block;padding:2px 6px;border-radius:999px;border:1px solid #16a34a;margin-left:6px;font-size:12px;">Root Cause</span>`
          : '';
        return `
        <div class="why-item${isRoot ? ' is-root' : ''}" style="padding:10px;border:1px solid #e5e7eb;border-radius:6px;background:#f9fafb;">
          <div style="font-weight:600;margin-bottom:6px;">Why ${i + 1}${badge}</div>
          <div>${esc(r.why_occur ?? '')}</div>
        </div>
      `;
      }).join('');

      return `
      <div class="why-group" style="border:1px solid #d1d5db;border-radius:8px;padding:12px; max-width: 45vw;">
        <div style="font-weight:700;margin-bottom:8px;">${esc(type)}</div>
        <div style="display:flex;flex-direction:column;gap:8px;">${itemsHtml}</div>
      </div>
    `;
    }).join('');

    whyList.innerHTML = html;
  }


  async function openWhyModal() {
    if (!viewModal) return;

    const id = viewModal.dataset.rcpaId;
    if (!id) { alert('Record not ready. Open an RCPA first.'); return; }

    // reset content
    if (whyDesc) whyDesc.value = '';
    if (whyList) whyList.innerHTML = '<div class="rcpa-empty">Loading…</div>';

    try {
      const data = await fetchJSON(`${WHY_URL}?rcpa_no=${encodeURIComponent(id)}`);
      if (whyDesc) whyDesc.value = data?.description_of_findings || '';
      renderWhyList(data?.rows || []);
    } catch (err) {
      console.error('Why-Why load failed:', err);
      if (whyList) whyList.innerHTML = '<div class="rcpa-empty">Failed to load.</div>';
    }

    whyModal?.removeAttribute('hidden');
    requestAnimationFrame(() => whyModal?.classList.add('show'));
    // body already has no-scroll from view modal; keep consistent
    document.body.classList.add('no-scroll');
    whyClose?.focus();
  }

  function closeWhyModal() {
    if (!whyModal) return;
    whyModal.classList.remove('show');
    whyModal.setAttribute('hidden', '');
    // keep body no-scroll because view modal remains open
    if (whyList) whyList.innerHTML = '';
    if (whyDesc) whyDesc.value = '';
    // return focus to trigger
    whyOpenBtn?.focus();
  }

  // Bind Why-Why events
  whyOpenBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation(); // avoid label toggling the checkbox
    openWhyModal();
  });
  whyClose?.addEventListener('click', closeWhyModal);
  whyOk?.addEventListener('click', closeWhyModal);
  whyModal?.addEventListener('click', (e) => { if (e.target === whyModal) closeWhyModal(); });

  // Tip: ensure view modal is visually above the list modal
  // #rcpaListModal { z-index: 1000; }
  // #rcpa-view-modal { z-index: 1100; }
  // #rcpa-why-view-modal { z-index: 1190; }  /* optional, between view & reject */
  // #reject-remarks-modal { z-index: 1200; }
})();

/* ===== GRADE modal IIFE (builds table + loads departments) ===== */
(() => {
  'use strict';

  if (document.readyState !== 'loading') init();
  else document.addEventListener('DOMContentLoaded', init);

  function init() {
    const openBtn = document.getElementById('openGradeBtn');
    const modal = document.getElementById('gradeModal');
    const closeBtn = document.getElementById('closeGradeBtn');

    if (!openBtn || !modal) return;

    const tableWrap = document.getElementById('gradeTableWrap');
    const tableEl = document.getElementById('gradeTable');
    const metaEl = document.getElementById('gradeMeta');

    const DEPT_API_URL = '../php-backend/rcpa-grade-departments.php';

    let gradeLoaded = false;
    let gradeDepartments = [];

    async function loadDepartments() {
      const res = await fetch(DEPT_API_URL, { credentials: 'same-origin' });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Failed to load departments');
      gradeDepartments = Array.isArray(data.departments) ? data.departments : [];
    }

    function buildGradeTable() {
      if (!tableEl) return;

      const th = (txt, cls = '') => `<th class="${cls}">${txt}</th>`;
      const td = (txt, cls = '') => `<td class="${cls}">${txt}</td>`;
      const tdAtt = (txt, cls = '', attrs = '') => `<td class="${cls}" ${attrs}>${txt}</td>`;

      const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

      const deptHeaders = gradeDepartments.map(d => th(d, 'hdr-dept sticky-top'));

      // ONE sticky header row only (no sticky TOTAL RCPA row)
      const theadHTML = `
        <thead>
          <tr>
            ${th('MONTH', 'left sticky-top')}
            ${th('&nbsp;', 'sticky-top band-head')}  <!-- REPLY/CLOSING band column -->
            ${th('DEPARTMENT', 'left sticky-top')}
            ${deptHeaders.join('')}
            ${th('Total', 'total sticky-top')}
          </tr>
        </thead>
      `;

      const replyRows = [
        ['HIT REPLY', '0'],
        ['MISSED', '0'],
        ['W/ REPLY', '0'],
        ['FILL RATE', '<span class="no-rcpa">NO RCPA</span>'],
        ['SERVICE LEVEL', '<span class="no-rcpa">NO RCPA</span>']
      ];
      const closingRows = [
        ['Hit Closing', '0'],
        ['Missed', '0'],
        ['Closed', '0'],
        ['Fill Rate', '<span class="no-rcpa">NO RCPA</span>'],
        ['Service Level', '<span class="no-rcpa">NO RCPA</span>']
      ];

      const ROWS_PER_GROUP = replyRows.length + closingRows.length;

      // Month block now includes a non-sticky "TOTAL RCPA" row at the top
      const makeMonthBlock = (monthLabel) => {
        let html = '';

        // ---- TOTAL RCPA row for this month
        html += '<tr>';
        // month cell spans TOTAL row + all REPLY + all CLOSING rows
        html += tdAtt(monthLabel, 'month-col', `rowspan="${ROWS_PER_GROUP + 1}"`);
        // band column spacer to align with REPLY/CLOSING column
        html += td('', 'band-title');
        // label + per-dept totals (yellow style via hdr-dept)
        html += td('TOTAL RCPA', 'hdr-dept left');
        html += gradeDepartments.map(() => td('0', 'hdr-dept')).join('');
        html += td('0', 'hdr-dept'); // group grand total (kept yellow, not sticky)
        html += '</tr>';

        // ---- REPLY
        replyRows.forEach(([label, defVal], i) => {
          html += '<tr>';

          if (i === 0) {
            html += tdAtt('REPLY', 'band-title left', `rowspan="${replyRows.length}"`);
          }

          html += td(label, 'left row-subhead');
          html += gradeDepartments.map(() => td(defVal)).join('');
          html += td(defVal);

          html += '</tr>';
        });

        // ---- CLOSING
        closingRows.forEach(([label, defVal], i) => {
          html += '<tr>';

          if (i === 0) {
            html += tdAtt('CLOSING', 'band-title left', `rowspan="${closingRows.length}"`);
          }

          html += td(label, 'left row-subhead');
          html += gradeDepartments.map(() => td(defVal)).join('');
          html += td(defVal);

          html += '</tr>';
        });

        return html;
      };

      // YTD block including its own non-sticky TOTAL RCPA row
      const makeYtdBlock = () => {
        let html = '';

        // YTD TOTAL row
        html += '<tr>';
        html += tdAtt('YTD', 'month-col ytd-col', `rowspan="${ROWS_PER_GROUP + 1}"`);
        html += td('', 'band-title');
        html += td('TOTAL RCPA', 'hdr-dept left');
        html += gradeDepartments.map(() => td('0', 'hdr-dept')).join('');
        html += td('0', 'hdr-dept');
        html += '</tr>';

        // REPLY
        replyRows.forEach(([label, defVal], i) => {
          html += '<tr>';
          if (i === 0) {
            html += tdAtt('REPLY', 'band-title left', `rowspan="${replyRows.length}"`);
          }
          html += td(label, 'left row-subhead');
          html += gradeDepartments.map(() => td(defVal)).join('');
          html += td(defVal);
          html += '</tr>';
        });

        // CLOSING
        closingRows.forEach(([label, defVal], i) => {
          html += '<tr>';
          if (i === 0) {
            html += tdAtt('CLOSING', 'band-title left', `rowspan="${closingRows.length}"`);
          }
          html += td(label, 'left row-subhead');
          html += gradeDepartments.map(() => td(defVal)).join('');
          html += td(defVal);
          html += '</tr>';
        });

        return html;
      };

      // Spacer row to separate December block from YTD block
      // Spacer row to separate December block from YTD block (bigger gap)
      const makeSpacerRow = () =>
        `<tr class="ytd-sep"><td colspan="${gradeDepartments.length + 4}" style="padding:0;border:0;height:32px;"></td></tr>`;

      const tbodyHTML = `
        <tbody>
          ${MONTHS.map(makeMonthBlock).join('')}
          ${makeSpacerRow()}
          ${makeYtdBlock()}
        </tbody>
      `;

      tableEl.innerHTML = theadHTML + tbodyHTML;

      // sticky top offset still computed for the single header row (harmless if unused)
      const hdr1 = tableEl.querySelector('thead tr:first-child');
      const h1 = hdr1 ? hdr1.getBoundingClientRect().height : 0;
      tableEl.style.setProperty('--hdr1-h', `${h1}px`);

      if (metaEl) {
        const n = gradeDepartments.length;
        metaEl.textContent = n ? `${n} department${n > 1 ? 's' : ''} loaded` : 'No departments found';
      }

      // ensure no artificial cap on tableWrap height
      if (tableWrap) tableWrap.style.maxHeight = '';
    }

    const open = async () => {
      modal.classList.add('show');
      modal.setAttribute('aria-hidden', 'false');
      document.body.classList.add('no-scroll');

      if (!gradeLoaded) {
        try {
          if (tableEl) {
            tableEl.innerHTML = `
              <tbody>
                <tr><td class="left" style="padding:12px;">Loading departments…</td></tr>
              </tbody>`;
          }
          await loadDepartments();
          buildGradeTable();
          gradeLoaded = true;
        } catch (err) {
          console.error(err);
          if (tableEl) {
            tableEl.innerHTML = `
              <tbody>
                <tr><td class="left" style="padding:12px;color:#b00020;">Failed to load departments.</td></tr>
              </tbody>`;
          }
          if (metaEl) metaEl.textContent = '';
        }
      }

      closeBtn?.focus();
    };

    const close = () => {
      modal.classList.remove('show');
      modal.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('no-scroll');
      openBtn?.focus();
    };

    openBtn.addEventListener('click', open);
    closeBtn.addEventListener('click', close);
    modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.classList.contains('show')) close();
    });
  }
})();

/* ====== HISTORY MODAL ====== */
(function () {
  const historyModal = document.getElementById('rcpa-history-modal');
  const historyTitle = document.getElementById('rcpa-history-title');
  const historyBody = document.getElementById('rcpa-history-body');
  const historyClose = document.getElementById('rcpa-history-close');

  const esc = (s) => ('' + (s ?? '')).replace(/[&<>"'`=\/]/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '`': '&#96;', '=': '&#61;', '/': '&#47;'
  }[m]));

  const fmtDate = (s) => {
    if (!s || /^0{4}-0{2}-0{2}/.test(String(s))) return '';
    const d = new Date(String(s).replace(' ', 'T'));
    if (isNaN(d)) return String(s);

    // Example: "Aug 19, 2025, 10:32 AM"
    const month = d.toLocaleString('en-US', { month: 'short' });
    const day = String(d.getDate()).padStart(2, '0');
    const year = d.getFullYear();
    let h = d.getHours();
    const m = String(d.getMinutes()).padStart(2, '0');
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;

    return `${month} ${day}, ${year}, ${h}:${m} ${ampm}`;
  };


  // Minutes / hours / days "ago" (or "in …")
  const timeAgo = (s) => {
    if (!s) return '';
    const d = new Date(String(s).replace(' ', 'T'));
    if (isNaN(d)) return '';
    const now = new Date();
    const diff = now - d; // past => positive
    const absMs = Math.abs(diff);

    const MIN = 60 * 1000, HOUR = 60 * MIN, DAY = 24 * HOUR;
    if (absMs < 30 * 1000) return 'just now';

    let v, unit;
    if (absMs < HOUR) {
      v = Math.max(1, Math.floor(absMs / MIN));
      unit = v === 1 ? 'minute' : 'minutes';
    } else if (absMs < DAY) {
      v = Math.floor(absMs / HOUR);
      unit = v === 1 ? 'hour' : 'hours';
    } else {
      v = Math.floor(absMs / DAY);
      unit = v === 1 ? 'day' : 'days';
    }

    return diff >= 0 ? `${v} ${unit} ago` : `in ${v} ${unit}`;
  };


  function openHistoryModal(rcpaId) {
    historyTitle.textContent = rcpaId;
    historyBody.innerHTML = `<div class="rcpa-muted">Loading history…</div>`;
    historyModal.classList.add('show');
    historyModal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    loadHistory(rcpaId);
    setTimeout(() => historyClose?.focus(), 0);
  }

  function closeHistoryModal() {
    historyModal.classList.remove('show');
    historyModal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
  }

  async function loadHistory(rcpaId) {
    try {
      const res = await fetch(`../php-backend/rcpa-history.php?id=${encodeURIComponent(rcpaId)}`, { credentials: 'same-origin' });
      const data = await res.json();
      if (!res.ok || !data?.ok) throw new Error(data?.error || `HTTP ${res.status}`);

      const rows = Array.isArray(data.rows) ? data.rows : [];
      if (!rows.length) {
        historyBody.innerHTML = `<div class="rcpa-empty">No history yet.</div>`;
        return;
      }

      historyBody.innerHTML = `
        <table class="rcpa-history-table">
          <thead><tr><th>Date & Time</th><th>Name</th><th>Activity</th></tr></thead>
          <tbody>
            ${rows.map(h => `
              <tr>
               <td>
                ${fmtDate(h.date_time)}
                ${(() => { const ago = timeAgo(h.date_time); return ago ? `<span class="rcpa-ago">(${ago})</span>` : ''; })()}
                </td>
                <td>${esc(h.name)}</td>
                <td>${esc(h.activity)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    } catch (e) {
      console.error(e);
      historyBody.innerHTML = `<div class="rcpa-empty">Failed to load history.</div>`;
    }
  }

  // Close handlers
  historyClose?.addEventListener('click', closeHistoryModal);
  historyModal?.addEventListener('click', (e) => { if (e.target === historyModal) closeHistoryModal(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && historyModal.classList.contains('show')) closeHistoryModal();
  });

  // Listen for the action dispatched from your table JS
  document.addEventListener('rcpa:action', (e) => {
    const { action, id } = e.detail || {};
    if (action === 'history' && id) openHistoryModal(id);
  });
})();