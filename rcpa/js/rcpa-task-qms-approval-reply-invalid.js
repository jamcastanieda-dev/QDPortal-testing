// js/rcpa-task-qms-approval-reply-invalid.js
(function () {
    const IS_APPROVER = !!window.RCPA_IS_APPROVER;
    const tbody = document.querySelector('#rcpa-table tbody');
    const totalEl = document.getElementById('rcpa-total');
    const pageInfo = document.getElementById('rcpa-page-info');
    const prevBtn = document.getElementById('rcpa-prev');
    const nextBtn = document.getElementById('rcpa-next');
    const fType = document.getElementById('rcpa-filter-type');

    // Floating action container elements
    const actionContainer = document.getElementById('action-container');
    const viewBtn = document.getElementById('view-button');
    const acceptBtn = document.getElementById('accept-button');
    const rejectBtn = document.getElementById('reject-button');

    if (!IS_APPROVER) actionContainer.classList.add('hidden');

    let page = 1;
    const pageSize = 10;
    let currentTarget = null;

    // ⚡ SSE handle
    let es = null;

    function labelForType(t) {
        const key = (t || '').toLowerCase().trim();
        const map = {
            external: 'External QMS Audit',
            internal: 'Internal Quality Audit',
            unattain: 'Un-attainment of delivery target of Project',
            online: 'On-Line',
            '5s': '5S Audit / Health & Safety Concerns',
            mgmt: 'Management Objective'
        };
        return map[key] ?? (t || '');
    }

    function escapeHtml(s) {
        return ('' + (s ?? '')).replace(/[&<>"']/g, c => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[c]));
    }

    function badgeForStatus(s) {
        const t = (s || '').toUpperCase();
        if (t === 'QMS CHECKING') return `<span class="rcpa-badge badge-qms-checking">QMS CHECKING</span>`;
        if (t === 'FOR APPROVAL OF SUPERVISOR') return `<span class="rcpa-badge badge-approval-supervisor">FOR APPROVAL OF SUPERVISOR</span>`;
        if (t === 'FOR APPROVAL OF MANAGER') return `<span class="rcpa-badge badge-approval-manager">FOR APPROVAL OF MANAGER</span>`;
        if (t === 'REJECTED') return `<span class="rcpa-badge badge-rejected">REJECTED</span>`;
        if (t === 'ASSIGNEE PENDING') return `<span class="rcpa-badge badge-assignee-pending">ASSIGNEE PENDING</span>`;
        if (t === 'VALID APPROVAL') return `<span class="rcpa-badge badge-valid-approval">VALID APPROVAL</span>`;
        if (t === 'INVALID APPROVAL') return `<span class="rcpa-badge badge-invalid-approval">INVALID APPROVAL</span>`;
        if (t === 'INVALIDATION REPLY') return `<span class="rcpa-badge badge-invalidation-reply">INVALIDATION REPLY</span>`;
        if (t === 'VALIDATION REPLY') return `<span class="rcpa-badge badge-validation-reply">VALIDATION REPLY</span>`;
        if (t === 'VALIDATION REPLY APPROVAL') return `<span class="rcpa-badge badge-validation-reply-approval">VALIDATION REPLY APPROVAL</span>`;
        if (t === 'INVALIDATION REPLY APPROVAL') return `<span class="rcpa-badge badge-invalidation-reply-approval">INVALIDATION REPLY APPROVAL</span>`;
        if (t === 'FOR CLOSING') return `<span class="rcpa-badge badge-assignee-corrective">FOR CLOSING</span>`;
        if (t === 'FOR CLOSING APPROVAL') return `<span class="rcpa-badge badge-assignee-corrective-approval">FOR CLOSING APPROVAL</span>`;
        if (t === 'EVIDENCE CHECKING') return `<span class="rcpa-badge badge-corrective-checking">EVIDENCE CHECKING</span>`;
        // if (t === 'EVIDENCE CHECKING APPROVAL') return `<span class="rcpa-badge badge-corrective-checking-approval">EVIDENCE CHECKING APPROVAL</span>`;
        if (t === 'EVIDENCE APPROVAL') return `<span class="rcpa-badge badge-corrective-checking-approval">EVIDENCE APPROVAL</span>`;
        if (t === 'CLOSED') return `<span class="rcpa-badge badge-closed">CLOSED</span>`;
        if (t === 'REPLY CHECKING - ORIGINATOR') return `<span class="rcpa-badge badge-validation-reply-approval">REPLY CHECKING - ORIGINATOR</span>`;
        if (t === 'EVIDENCE CHECKING - ORIGINATOR') return `<span class="rcpa-badge badge-validation-reply-approval">EVIDENCE CHECKING - ORIGINATOR</span>`;
        if (t === 'INVALID APPROVAL - ORIGINATOR') return `<span class="rcpa-badge badge-validation-reply-approval">INVALID APPROVAL - ORIGINATOR</span>`;
        return `<span class="rcpa-badge badge-unknown">NO STATUS</span>`;
    }

    function badgeForCategory(c) {
        const v = (c || '').toLowerCase();
        if (v === 'major') return `<span class="rcpa-badge badge-cat-major">Major</span>`;
        if (v === 'minor') return `<span class="rcpa-badge badge-cat-minor">Minor</span>`;
        if (v === 'observation') return `<span class="rcpa-badge badge-cat-obs">Observation</span>`;
        return '';
    }

    function actionButtonHtml(id) {
        const safeId = escapeHtml(id ?? '');
        if (IS_APPROVER) {
            return `
        <div class="rcpa-actions">
          <button class="rcpa-more" data-id="${safeId}" title="Actions">
            <i class="fa-solid fa-bars" aria-hidden="true"></i>
            <span class="sr-only">Actions</span>
          </button>
        </div>`;
        }
        return `
      <div class="rcpa-actions">
        <button class="rcpa-view-only action-btn" data-id="${safeId}" title="View">View</button>
      </div>`;
    }

    function fmtDate(s) {
        if (!s) return '';
        const str = String(s);
        if (/^0{4}-0{2}-0{2}/.test(str)) return '';
        const d = new Date(str.replace(' ', 'T'));
        if (isNaN(d)) return str;
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const month = months[d.getMonth()];
        const day = String(d.getDate()).padStart(2, '0');
        const year = d.getFullYear();
        let h = d.getHours();
        const m = String(d.getMinutes()).padStart(2, '0');
        const ampm = h >= 12 ? 'PM' : 'AM';
        h = h % 12 || 12;
        return `${month} ${day}, ${year}, ${h}:${m} ${ampm}`;
    }

    // Format a YYYY-MM-DD as "Mon DD, YYYY"
    function fmtYmd(s) {
        if (!s) return '';
        const m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (!m) return s;
        const [, Y, M, D] = m;
        const d = new Date(`${Y}-${M}-${D}T00:00:00`);
        if (isNaN(d)) return s;
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${months[d.getMonth()]} ${String(d.getDate()).padStart(2, '0')}, ${d.getFullYear()}`;
    }

    /* ---------- Closing due date helpers (Manila) ---------- */
    const MANILA_TZ = 'Asia/Manila';
    const MANILA_OFFSET = '+08:00'; // no DST
    function todayYmdManila() {
        const parts = new Intl.DateTimeFormat('en-CA', { timeZone: MANILA_TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
        const get = t => parts.find(p => p.type === t).value;
        return `${get('year')}-${get('month')}-${get('day')}`;
    }
    function dateAtMidnightManila(ymd) {
        if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(String(ymd))) return null;
        return new Date(`${ymd}T00:00:00${MANILA_OFFSET}`);
    }
    function diffDaysFromTodayManila(ymd) {
        const today = dateAtMidnightManila(todayYmdManila());
        const target = dateAtMidnightManila(ymd);
        if (!today || !target) return null;
        const msPerDay = 24 * 60 * 60 * 1000;
        return Math.trunc((target - today) / msPerDay);
    }

    function renderCloseDue(ymd) {
        if (!ymd) return '';
        const base = fmtYmd(ymd);
        const d = diffDaysFromTodayManila(ymd);
        if (d === null) return base;
        const plural = Math.abs(d) === 1 ? 'day' : 'days';
        return `${base} (${d} ${plural})`;
    }

    // Styled close-due cell with thresholds:
    // >25 days = badge-cat-obs, >7 days = badge-cat-minor, <=7 days = badge-cat-major
    function formatCloseDueCell(ymd) {
        if (!ymd) return '';
        const pretty = fmtYmd(ymd);
        const diff = diffDaysFromTodayManila(ymd);
        if (diff === null) return pretty;

        const abs = Math.abs(diff);
        const plural = abs === 1 ? 'day' : 'days';
        const valueText = (diff < 0 ? `-${abs}` : `${abs}`) + ` ${plural}`;

        let className = '';
        if (abs > 25) className = 'badge-cat-obs';
        else if (abs > 7) className = 'badge-cat-minor';
        else className = 'badge-cat-major';

        return `<span class="rcpa-badge ${className}">${pretty} (${valueText})</span>`;
    }
    /* ------------------------------------------------------- */

    async function load() {
        const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
        if (fType.value) params.set('type', fType.value);

        hideActions();
        tbody.innerHTML = `<tr><td colspan="10" class="rcpa-empty">Loading…</td></tr>`;

        let res;
        try {
            res = await fetch('../php-backend/rcpa-list-approval-invalidation-reply.php?' + params.toString(), { credentials: 'same-origin' });
        } catch {
            tbody.innerHTML = `<tr><td colspan="10" class="rcpa-empty">Network error.</td></tr>`;
            return;
        }
        if (!res.ok) {
            tbody.innerHTML = `<tr><td colspan="10" class="rcpa-empty">Failed to load (${res.status}).</td></tr>`;
            return;
        }

        const data = await res.json();
        const rows = Array.isArray(data.rows) ? data.rows : [];

        if (!rows.length) {
            tbody.innerHTML = `<tr><td colspan="10" class="rcpa-empty">No records.</td></tr>`;
        } else {
            tbody.innerHTML = rows.map(r => `
        <tr>
          <td>${r.id ?? ''}</td>
          <td>${labelForType(r.rcpa_type)}</td>
          <td>${badgeForCategory(r.category || r.cetegory)}</td>
          <td>${fmtDate(r.date_request)}</td>
          <td>${formatCloseDueCell(r.close_due_date)}</td>
          <td>${badgeForStatus(r.status)}</td>
          <td>${escapeHtml(r.originator_name)}</td>
           <td>${escapeHtml(
                (() => {
                    const assignee = r?.section ? `${r.assignee} - ${r.section}` : r?.assignee;
                    const assigneeName = r?.assignee_name ? ` (${r.assignee_name})` : '';  // Display assignee_name in parentheses
                    return assignee + assigneeName;
                })()
            )}</td>
          <td>${actionButtonHtml(r.id ?? '')}</td>
          <td>
            <i class="fa-solid fa-clock-rotate-left icon-rcpa-history"
               data-id="${r.id ?? ''}" role="button" tabindex="0"
               title="View history"></i>
          </td>
        </tr>
      `).join('');
        }

        const total = Number(data.total || 0);
        const lastPage = Math.max(1, Math.ceil(total / pageSize));
        totalEl.textContent = `${total} record${total === 1 ? '' : 's'}`;
        pageInfo.textContent = `Page ${data.page} of ${lastPage}`;
        prevBtn.disabled = page <= 1;
        nextBtn.disabled = page >= lastPage;
    }

    // 🔔 realtime via SSE (same filters/visibility as PHP list)
    function startSse(restart = false) {
        try { if (restart && es) es.close(); } catch { }
        const qs = new URLSearchParams();
        if (fType.value) qs.set('type', fType.value);
        es = new EventSource(`../php-backend/rcpa-approval-invalidation-reply-sse.php?${qs.toString()}`);
        es.addEventListener('rcpa', () => { load(); });
        es.onerror = () => { /* EventSource will auto-reconnect */ };
    }

    document.addEventListener('rcpa:refresh', () => { load(); });

    const switchIcon = (iconElement, newIcon) => {
        if (!iconElement) return;
        iconElement.classList.add('icon-fade-out');
        iconElement.addEventListener('transitionend', function onFadeOut() {
            iconElement.removeEventListener('transitionend', onFadeOut);
            iconElement.classList.remove('fa-bars', 'fa-xmark');
            iconElement.classList.add(newIcon);
            iconElement.classList.remove('icon-fade-out');
            iconElement.classList.add('icon-fade-in');
            setTimeout(() => iconElement.classList.remove('icon-fade-in'), 300);
        });
    };

    function positionActionContainer(target) {
        const wasHidden = actionContainer.classList.contains('hidden');
        if (wasHidden) { actionContainer.style.visibility = 'hidden'; actionContainer.classList.remove('hidden'); }
        const rect = target.getBoundingClientRect();
        const gap = 8;
        const popW = actionContainer.offsetWidth;
        const popH = actionContainer.offsetHeight;
        const vw = document.documentElement.clientWidth;
        const vh = document.documentElement.clientHeight;
        let top = rect.top + (rect.height - popH) / 2;
        let left = rect.left - popW - gap;
        if (left < 8) left = rect.right + gap;
        top = Math.max(8, Math.min(top, vh - popH - 8));
        left = Math.max(8, Math.min(left, vw - popW - 8));
        actionContainer.style.top = `${top}px`;
        actionContainer.style.left = `${left}px`;
        if (wasHidden) { actionContainer.classList.add('hidden'); actionContainer.style.visibility = ''; }
    }

    function showActions(target, id) {
        currentTarget = target;
        actionContainer.dataset.id = id;
        positionActionContainer(target);
        actionContainer.classList.remove('hidden');
        const icon = target.querySelector('i.fa-solid');
        switchIcon(icon, 'fa-xmark');
    }

    function hideActions() {
        if (!currentTarget) return;
        const icon = currentTarget.querySelector('i.fa-solid');
        switchIcon(icon, 'fa-bars');
        actionContainer.classList.add('hidden');
        currentTarget = null;
    }

    // Open/close hamburger actions + history
    tbody.addEventListener('click', (e) => {
        const viewOnly = e.target.closest('.rcpa-view-only');
        if (viewOnly) {
            const id = viewOnly.getAttribute('data-id');
            if (id) document.dispatchEvent(new CustomEvent('rcpa:action', { detail: { action: 'view', id } }));
            return;
        }
        const hist = e.target.closest('.icon-rcpa-history');
        if (hist) {
            const id = hist.getAttribute('data-id');
            if (id) document.dispatchEvent(new CustomEvent('rcpa:action', { detail: { action: 'history', id } }));
            return;
        }
        const moreBtn = e.target.closest('.rcpa-more');
        if (!moreBtn) return;

        const id = moreBtn.dataset.id;
        if (currentTarget === moreBtn) hideActions();
        else showActions(moreBtn, id);
    });

    // Keyboard support for history icon
    tbody.addEventListener('keydown', (e) => {
        const hist = e.target.closest('.icon-rcpa-history');
        if (hist && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            const id = hist.getAttribute('data-id');
            if (id) document.dispatchEvent(new CustomEvent('rcpa:action', { detail: { action: 'history', id } }));
        }
    });

    document.addEventListener('click', (e) => {
        if (currentTarget && !e.target.closest('.rcpa-actions') && !actionContainer.contains(e.target)) {
            hideActions();
        }
    });

    // Top tabs navigation
    document.querySelector('.rcpa-table-toolbar').addEventListener('click', (e) => {
        const tab = e.target.closest('.rcpa-tab[data-href]');
        if (!tab) return;
        window.location.href = tab.dataset.href;
    });

    ['scroll', 'resize'].forEach(evt => window.addEventListener(evt, () => {
        if (currentTarget) positionActionContainer(currentTarget);
    }, { passive: true }));

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') hideActions();
    });

    function dispatchAction(action, id) {
        document.dispatchEvent(new CustomEvent('rcpa:action', { detail: { action, id } }));
    }
    viewBtn.addEventListener('click', () => { dispatchAction('view', actionContainer.dataset.id); hideActions(); });
    acceptBtn.addEventListener('click', () => { dispatchAction('accept', actionContainer.dataset.id); hideActions(); });
    rejectBtn.addEventListener('click', () => { dispatchAction('reject', actionContainer.dataset.id); hideActions(); });

    // Pagination + filter
    prevBtn.addEventListener('click', () => { if (page > 1) { page--; load(); } });
    nextBtn.addEventListener('click', () => { page++; load(); });
    fType.addEventListener('change', () => { page = 1; load(); startSse(true); });

    window.addEventListener('beforeunload', () => { try { es && es.close(); } catch { } });

    load();
    startSse(); // ⚡ realtime
})();

// view
(function () {
    // Main view modal
    const modal = document.getElementById('rcpa-view-modal');
    const closeX = document.getElementById('rcpa-view-close');

    // -------- Disapproval quick-view modal (already supported) --------
    const rjQuick = document.getElementById('reject-remarks-modal');
    const rjQuickText = document.getElementById('reject-remarks-text');
    const rjQuickList = document.getElementById('reject-remarks-attach-list');
    const rjQuickClose = document.getElementById('reject-remarks-close');

    function openRejectRemarks(item) {
        if (!rjQuick) return;
        if (rjQuickText) rjQuickText.value = item?.remarks || '';
        if (rjQuickList) {
            rjQuickList.innerHTML = '';
            renderAttachmentsInto('reject-remarks-attach-list', item?.attachments || '');
        }
        rjQuick.removeAttribute('hidden');
        requestAnimationFrame(() => rjQuick.classList.add('show'));
    }
    function closeRejectRemarks() {
        if (!rjQuick) return;
        rjQuick.classList.remove('show');
        const onEnd = (e) => {
            if (e.target !== rjQuick || e.propertyName !== 'opacity') return;
            rjQuick.removeEventListener('transitionend', onEnd);
            rjQuick.setAttribute('hidden', '');
            if (rjQuickText) rjQuickText.value = '';
            if (rjQuickList) rjQuickList.innerHTML = '';
        };
        rjQuick.addEventListener('transitionend', onEnd);
    }
    rjQuickClose && rjQuickClose.addEventListener('click', closeRejectRemarks);
    rjQuick && rjQuick.addEventListener('click', (e) => { if (e.target === rjQuick) closeRejectRemarks(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && rjQuick && !rjQuick.hidden) closeRejectRemarks(); });

    // -------- Reject modal (ASSIGNEE PENDING) --------
    const rejModal = document.getElementById('rcpa-reject-modal');
    const rejClose = document.getElementById('rcpa-reject-close');
    const rejForm = document.getElementById('rcpa-reject-form');
    const rejText = document.getElementById('rcpa-reject-remarks');
    const rejClip = document.getElementById('rcpa-reject-clip');
    const rejInput = document.getElementById('rcpa-reject-files');
    const rejBadge = document.getElementById('rcpa-reject-attach-count');
    const rejList = document.getElementById('rcpa-reject-files-list');
    const rejCancel = document.getElementById('rcpa-reject-cancel');
    const rejSubmit = document.getElementById('rcpa-reject-submit');

    // -------- Approve modal (SUP/MGR APPROVAL) --------
    const appModal = document.getElementById('rcpa-approve-modal');
    const appClose = document.getElementById('rcpa-approve-close');
    const appForm = document.getElementById('rcpa-approve-form');
    const appText = document.getElementById('rcpa-approve-remarks');
    const appClip = document.getElementById('rcpa-approve-clip');
    const appInput = document.getElementById('rcpa-approve-files');
    const appBadge = document.getElementById('rcpa-approve-attach-count');
    const appList = document.getElementById('rcpa-approve-files-list');
    const appCancel = document.getElementById('rcpa-approve-cancel');
    const appSubmit = document.getElementById('rcpa-approve-submit');

    // -------- Approval quick-view modal (NEW) --------
    const apQuick = document.getElementById('approve-remarks-modal');
    const apQuickText = document.getElementById('approve-remarks-text');
    const apQuickList = document.getElementById('approve-remarks-attach-list');
    const apQuickClose = document.getElementById('approve-remarks-close');

    function openApproveRemarks(item) {
        if (!apQuick) return;
        if (apQuickText) apQuickText.value = item?.remarks || '';
        if (apQuickList) {
            apQuickList.innerHTML = '';
            // backend may send "attachments" (normalized) or original "attachment"
            const attach = item?.attachments ?? item?.attachment ?? '';
            renderAttachmentsInto('approve-remarks-attach-list', attach);
        }
        apQuick.removeAttribute('hidden');
        requestAnimationFrame(() => apQuick.classList.add('show'));
    }

    function closeApproveRemarks() {
        if (!apQuick) return;
        apQuick.classList.remove('show');
        const onEnd = (e) => {
            if (e.target !== apQuick || e.propertyName !== 'opacity') return;
            apQuick.removeEventListener('transitionend', onEnd);
            apQuick.setAttribute('hidden', '');
            if (apQuickText) apQuickText.value = '';
            if (apQuickList) apQuickList.innerHTML = '';
        };
        apQuick.addEventListener('transitionend', onEnd);
    }

    apQuickClose && apQuickClose.addEventListener('click', closeApproveRemarks);
    apQuick && apQuick.addEventListener('click', (e) => { if (e.target === apQuick) closeApproveRemarks(); });
    // close on ESC too
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && apQuick && !apQuick.hidden) closeApproveRemarks();
    });


    let currentViewId = null;

    function openRejectModal() {
        if (!rejModal) return;
        if (rejText) rejText.value = '';
        if (rejInput) rejInput.value = '';
        if (rejList) rejList.innerHTML = '';
        if (rejBadge) { rejBadge.textContent = '0'; rejBadge.hidden = true; }

        rejModal.removeAttribute('hidden');
        requestAnimationFrame(() => rejModal.classList.add('show'));
        setTimeout(() => rejText?.focus(), 80);
        document.body.style.overflow = 'hidden';
    }
    function closeRejectModal() {
        if (!rejModal) return;
        rejModal.classList.remove('show');
        const onEnd = (e) => {
            if (e.target !== rejModal || e.propertyName !== 'opacity') return;
            rejModal.removeEventListener('transitionend', onEnd);
            rejModal.setAttribute('hidden', '');
            document.body.style.overflow = '';
        };
        rejModal.addEventListener('transitionend', onEnd);
    }
    rejClose?.addEventListener('click', closeRejectModal);
    rejCancel?.addEventListener('click', closeRejectModal);
    rejModal?.addEventListener('click', (e) => { if (e.target === rejModal) closeRejectModal(); });
    rejClip?.addEventListener('click', () => rejInput?.click());

    // Selected files UI (shared helper)
    function humanSize(n) {
        if (!n && n !== 0) return '';
        let b = Number(n);
        if (b < 1024) return b + ' B';
        const u = ['KB', 'MB', 'GB', 'TB']; let i = -1;
        do { b /= 1024; i++; } while (b >= 1024 && i < u.length - 1);
        return (b >= 10 ? b.toFixed(0) : b.toFixed(1)) + ' ' + u[i];
    }
    function renderRejectList(files) {
        if (!rejList) return;
        rejList.innerHTML = '';
        [...files].forEach((f, idx) => {
            const row = document.createElement('div');
            row.className = 'reject-file-chip file-chip';
            row.innerHTML = `
        <i class="fa-solid fa-paperclip" aria-hidden="true"></i>
        <div class="file-info">
          <div class="name" title="${f.name}">${f.name}</div>
          <div class="sub">${humanSize(f.size)}</div>
        </div>
        <button type="button" class="file-remove" data-i="${idx}" title="Remove">✕</button>`;
            rejList.appendChild(row);
        });
        if (rejBadge) {
            rejBadge.textContent = String(files.length);
            rejBadge.hidden = files.length === 0;
        }
    }
    rejInput?.addEventListener('change', () => renderRejectList(rejInput.files || []));
    rejList?.addEventListener('click', (e) => {
        const btn = e.target.closest('.file-remove');
        if (!btn || !rejInput) return;
        const i = Number(btn.getAttribute('data-i'));
        const dt = new DataTransfer();
        [...rejInput.files].forEach((f, idx) => { if (idx !== i) dt.items.add(f); });
        rejInput.files = dt.files;
        renderRejectList(rejInput.files || []);
    });

    // ---------- Small helpers ----------
    const setVal = (id, v) => { const el = document.getElementById(id); if (el) el.value = v ?? ''; };
    const setChecked = (id, on) => { const el = document.getElementById(id); if (el) el.checked = !!on; };
    const showCond = (id, show) => { const el = document.getElementById(id); if (el) el.hidden = !show; };
    const escapeHTML = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

    const fmt = (s) => { if (!s) return ''; const d = new Date(String(s).replace(' ', 'T')); return isNaN(d) ? s : d.toLocaleString(); };
    const fmtDateOnly = (s) => { if (!s) return ''; const d = new Date(String(s).replace(' ', 'T')); return isNaN(d) ? String(s) : d.toLocaleDateString(); };
    const yearFrom = (s) => { if (!s) return ''; const d = new Date(String(s).replace(' ', 'T')); if (!isNaN(d)) return String(d.getFullYear()); const m = String(s).match(/\b(20\d{2}|\d{4})\b/); return m ? m[1] : ''; };

    function setHiddenSel(selector, hide) {
        modal.querySelectorAll(selector).forEach(el => { if (hide) el.setAttribute('hidden', ''); else el.removeAttribute('hidden'); });
    }
    function setCheckedByAny(selectors, on) {
        const seen = new Set();
        selectors.forEach(sel => {
            modal.querySelectorAll(sel).forEach(cb => {
                if (cb && !seen.has(cb)) { cb.checked = !!on; seen.add(cb); }
            });
        });
    }
    function setDateVal(id, v) {
        const el = document.getElementById(id);
        if (el) el.value = (v && String(v).slice(0, 10)) || '';
    }

    function lockViewCheckboxes() {
        const boxes = modal.querySelectorAll('input[type="checkbox"]');
        boxes.forEach(cb => {
            cb.classList.add('readonly-check');
            cb.setAttribute('tabindex', '-1');
            cb.setAttribute('aria-readonly', 'true');
            cb.dataset.lockChecked = cb.checked ? '1' : '0';
        });
    }
    modal.addEventListener('click', (e) => {
        if (e.target.matches?.('input[type="checkbox"].readonly-check')) { e.preventDefault(); return; }
        const lbl = e.target.closest('label');
        if (!lbl) return;
        const forId = lbl.getAttribute('for');
        const cb = forId ? modal.querySelector(`#${CSS.escape(forId)}`) : lbl.querySelector('input[type="checkbox"]');
        if (cb && cb.classList.contains('readonly-check')) e.preventDefault();
    }, true);
    modal.addEventListener('keydown', (e) => {
        if (e.target.matches?.('input[type="checkbox"].readonly-check') && (e.key === ' ' || e.key === 'Enter')) e.preventDefault();
    });
    modal.addEventListener('change', (e) => {
        if (e.target.matches?.('input[type="checkbox"].readonly-check')) {
            e.preventDefault(); e.target.checked = e.target.dataset.lockChecked === '1';
        }
    });

    // -------- Attachments rendering (shared) --------
    function ensureNVAttachList() {
        let el = document.getElementById('rcpa-view-not-valid-attach-list');
        if (!el) {
            el = document.createElement('div');
            el.id = 'rcpa-view-not-valid-attach-list';
            el.className = 'attach-list';
            el.setAttribute('aria-live', 'polite');
            const reason = document.getElementById('rcpa-view-not-valid-reason');
            const parent = reason?.closest('.field') || reason?.parentElement;
            (parent || modal).insertAdjacentElement('afterend', el);
        }
        return el;
    }
    function renderAttachmentsInto(targetId, s) {
        ensureNVAttachList();
        const wrap = document.getElementById(targetId);
        if (!wrap) return;
        wrap.innerHTML = '';
        if (s == null || s === '') return;

        const humanSize = (n) => {
            if (n == null || n === '' || isNaN(n)) return '';
            let bytes = Number(n);
            if (bytes < 1024) return bytes + ' B';
            const units = ['KB', 'MB', 'GB', 'TB', 'PB'];
            let i = -1;
            do { bytes /= 1024; i++; } while (bytes >= 1024 && i < units.length - 1);
            return bytes.toFixed(bytes >= 10 ? 0 : 1) + ' ' + units[i];
        };

        // Normalize to array
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
            const url = typeof it === 'string' ? it : (it?.url || it?.path || it?.href) || '';
            let name = typeof it === 'string' ? '' : (it?.name || it?.filename) || '';
            let size = (it?.size ?? it?.bytes) ?? '';

            if (!name) {
                if (url) {
                    try { name = decodeURIComponent(url.split('/').pop().split('?')[0]) || 'Attachment'; }
                    catch { name = url.split('/').pop().split('?')[0] || 'Attachment'; }
                } else name = 'Attachment';
            }

            const safeName = escapeHTML(name);
            const safeUrl = escapeHTML(url);
            const sizeText = size === '' ? '' : (isNaN(size) ? escapeHTML(String(size)) : escapeHTML(humanSize(size)));
            const linkStart = url ? `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer" title="${safeName}">` : `<span title="${safeName}">`;
            const linkEnd = url ? `</a>` : `</span>`;

            const row = document.createElement('div');
            row.className = 'file-chip';
            row.innerHTML = `
        <i class="fa-solid fa-paperclip" aria-hidden="true"></i>
        <div class="file-info">
          <div class="name">${linkStart}${safeName}${linkEnd}</div>
          <div class="sub">${sizeText}</div>
        </div>`;
            wrap.appendChild(row);
        });
    }
    function renderAttachments(s) {
        renderAttachmentsInto('rcpa-view-attach-list', s);
    }

    // -------- Disapproval Remarks table (list) --------
    function renderRejectsTable(items) {
        const tb = document.querySelector('#rcpa-rejects-table tbody');
        const rjFs = document.querySelector('fieldset.reject-remarks, #rcpa-rejects-fieldset');
        if (!tb) return;

        const list = Array.isArray(items) ? items : [];
        if (!list.length) {
            tb.innerHTML = `<tr><td class="rcpa-empty" colspan="3">No records found</td></tr>`;
            if (modal) modal.__rejects = [];
            if (rjFs) { rjFs.hidden = true; rjFs.setAttribute('aria-hidden', 'true'); }
            return;
        }

        if (modal) modal.__rejects = list;
        tb.innerHTML = list.map((row, i) => {
            const disType = String(row.disapprove_type || '');
            const when = (() => {
                const d = new Date(String(row.created_at || '').replace(' ', 'T'));
                return isNaN(d) ? (row.created_at || '') : d.toLocaleString();
            })();
            return `
      <tr>
        <td>${escapeHTML(disType) || '-'}</td>
        <td>${escapeHTML(when) || '-'}</td>
        <td><button type="button" class="rcpa-btn rcpa-reject-view" data-idx="${i}">View</button></td>
      </tr>`;
        }).join('');

        if (rjFs) { rjFs.hidden = false; rjFs.removeAttribute('aria-hidden'); }
    }

    function renderApprovalsTable(items) {
        const tb = document.querySelector('#rcpa-approvals-table tbody');
        const apFs = document.querySelector('fieldset.approve-remarks, #rcpa-approvals-fieldset');
        if (!tb) return;

        const list = Array.isArray(items) ? items : [];
        if (!list.length) {
            tb.innerHTML = `<tr><td class="rcpa-empty" colspan="3">No records found</td></tr>`;
            if (modal) modal.__approvals = [];
            if (apFs) { apFs.hidden = true; apFs.setAttribute('aria-hidden', 'true'); }
            return;
        }

        if (modal) modal.__approvals = list;
        tb.innerHTML = list.map((row, i) => {
            const apType = String(row.type || '');
            const when = (() => {
                const d = new Date(String(row.created_at || '').replace(' ', 'T'));
                return isNaN(d) ? (row.created_at || '') : d.toLocaleString();
            })();
            return `
      <tr>
        <td>${escapeHTML(apType) || '-'}</td>
        <td>${escapeHTML(when) || '-'}</td>
        <td><button type="button" class="rcpa-btn rcpa-approval-view" data-idx="${i}">View</button></td>
      </tr>`;
        }).join('');

        if (apFs) { apFs.hidden = false; apFs.removeAttribute('aria-hidden'); }
    }


    (function hookRejectsActions() {
        const table = document.getElementById('rcpa-rejects-table');
        if (!table) return;
        table.addEventListener('click', (e) => {
            const btn = e.target.closest('.rcpa-reject-view');
            if (!btn) return;
            const idx = parseInt(btn.getAttribute('data-idx'), 10);
            const cache = (modal && modal.__rejects) || [];
            const item = cache[idx];
            if (!item) return;
            openRejectRemarks(item);
        });
    })();

    (function hookApprovalsActions() {
        const table = document.getElementById('rcpa-approvals-table');
        if (!table) return;
        table.addEventListener('click', (e) => {
            const btn = e.target.closest('.rcpa-approval-view');
            if (!btn) return;
            const idx = parseInt(btn.getAttribute('data-idx'), 10);
            const cache = (modal && modal.__approvals) || [];
            const item = cache[idx];
            if (!item) return;
            openApproveRemarks(item); // <-- use dedicated modal
        });
    })();



    // -------- Reset & parsing --------
    function clearViewForm() {
        ['v-type-external', 'v-type-internal', 'v-type-unattain', 'v-type-online', 'v-type-hs', 'v-type-mgmt'].forEach(id => showCond(id, false));

        [
            'rcpa-view-type', 'v-external-sem1-year', 'v-external-sem2-year', 'v-internal-sem1-year', 'v-internal-sem2-year',
            'v-project-name', 'v-wbs-number', 'v-online-year', 'v-hs-month', 'v-hs-year', 'v-mgmt-year',
            'rcpa-view-originator-name', 'rcpa-view-originator-dept', 'rcpa-view-date', 'rcpa-view-remarks',
            'rcpa-view-system', 'rcpa-view-clauses', 'rcpa-view-supervisor', 'rcpa-view-assignee',
            'rcpa-view-status', 'rcpa-view-conformance',
            'rcpa-view-not-valid-reason', 'rcpa-view-invalid-assignee-sign', 'rcpa-view-invalid-assignee-sup-sign',
            'rcpa-view-invalid-qms-sign'
        ].forEach(id => setVal(id, ''));

        [
            'rcpa-view-cat-major', 'rcpa-view-cat-minor', 'rcpa-view-cat-obs', 'rcpa-view-flag-nc', 'rcpa-view-flag-pnc',
            'rcpa-view-mgmt-q1', 'rcpa-view-mgmt-q2', 'rcpa-view-mgmt-q3', 'rcpa-view-mgmt-ytd',
            'rcpa-view-findings-not-valid'
        ].forEach(id => setChecked(id, false));

        const att = document.getElementById('rcpa-view-attach-list'); if (att) att.innerHTML = '';
        ensureNVAttachList();
        const nvAtt = document.getElementById('rcpa-view-not-valid-attach-list'); if (nvAtt) nvAtt.innerHTML = '';

        const rjFs = document.querySelector('fieldset.reject-remarks, #rcpa-rejects-fieldset');
        if (rjFs) { rjFs.hidden = true; rjFs.setAttribute('aria-hidden', 'true'); }

        // NEW: approvals reset
        const apFs = document.querySelector('fieldset.approve-remarks, #rcpa-approvals-fieldset');
        if (apFs) { apFs.hidden = true; apFs.setAttribute('aria-hidden', 'true'); }
        const apTbody = document.querySelector('#rcpa-approvals-table tbody');
        if (apTbody) apTbody.innerHTML = `<tr><td class="rcpa-empty" colspan="3">No records found</td></tr>`;

        document.getElementById('rcpa-view-modal')?.__clearStatusFlow?.();
    }

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

    // -------- Fill view --------
    function fillViewModal(row) {
        const typeKey = String(row.rcpa_type || '').toLowerCase().trim();
        const typeLabelMap = {
            external: 'External QMS Audit', internal: 'Internal Quality Audit', unattain: 'Un-attainment of delivery target of Project',
            online: 'On-Line', '5s': '5s Audit / Health & Safety Concerns', mgmt: 'Management Objective'
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
            setChecked('v-external-sem1-pick', !!reqYear); setVal('v-external-sem1-year', reqYear);
            setChecked('v-external-sem2-pick', false); setVal('v-external-sem2-year', '');
        } else if (typeKey === 'internal') {
            setChecked('v-internal-sem1-pick', !!reqYear); setVal('v-internal-sem1-year', reqYear);
            setChecked('v-internal-sem2-pick', false); setVal('v-internal-sem2-year', '');
        } else if (typeKey === 'unattain') {
            setVal('v-project-name', row.project_name); setVal('v-wbs-number', row.wbs_number);
        } else if (typeKey === 'online') {
            setVal('v-online-year', sy.year || row.sem_year || '');
        } else if (typeKey === '5s') {
            setVal('v-hs-year', sy.year || '');
            if (/^\d{2}$/.test(sy.month)) {
                const d = new Date(Number(sy.year || 2000), Number(sy.month) - 1, 1);
                setVal('v-hs-month', isNaN(d) ? (row.sem_year || '') : d.toLocaleString(undefined, { month: 'long' }));
            } else setVal('v-hs-month', sy.month || '');
        } else if (typeKey === 'mgmt') {
            setVal('v-mgmt-year', sy.year || row.sem_year || '');
            const q = String(row.quarter || '').toUpperCase();
            setChecked('rcpa-view-mgmt-q1', q.includes('Q1'));
            setChecked('rcpa-view-mgmt-q2', q.includes('Q2'));
            setChecked('rcpa-view-mgmt-q3', q.includes('Q3'));
            setChecked('rcpa-view-mgmt-ytd', q.includes('YTD'));
        }

        const cat = String(row.category || '').toLowerCase();
        setChecked('rcpa-view-cat-major', cat === 'major');
        setChecked('rcpa-view-cat-minor', cat === 'minor');
        setChecked('rcpa-view-cat-obs', cat === 'observation');

        setVal('rcpa-view-originator-name', row.originator_name);
        setVal('rcpa-view-originator-dept', row.originator_department);
        setVal('rcpa-view-date', fmt(row.date_request));

        const confNorm = String(row.conformance || '').toLowerCase().replace(/[\s_-]+/g, ' ').trim();
        let isPNC = (confNorm === 'pnc') || confNorm.includes('potential');
        let isNC = false;
        if (!isPNC) isNC = confNorm === 'nc' || /\bnon[- ]?conformance\b/.test(confNorm) || confNorm === 'non conformance' || confNorm === 'nonconformance';
        if (cat === 'observation') { isPNC = true; isNC = false; }
        else if (cat === 'major' || cat === 'minor') { isPNC = false; isNC = true; }

        setChecked('rcpa-view-flag-pnc', isPNC);
        setChecked('rcpa-view-flag-nc', isNC);

        setVal('rcpa-view-remarks', row.remarks);
        renderAttachments(row.remarks_attachment);

        setVal('rcpa-view-system', row.system_applicable_std_violated);
        setVal('rcpa-view-clauses', row.standard_clause_number);
        setVal('rcpa-view-supervisor', row.originator_supervisor_head);

        const assigneeRaw = (row.assignee ?? '').trim();
        const sectionRaw = (row.section ?? '').trim();
        const assigneeDisplay = sectionRaw
            ? (assigneeRaw ? `${assigneeRaw} - ${sectionRaw}` : sectionRaw)
            : assigneeRaw;

        setVal('rcpa-view-assignee', assigneeDisplay);

        setVal('rcpa-view-status', row.status);
        setVal('rcpa-view-conformance', row.conformance);

        // Disapproval remarks list (backend must return row.rejects)
        renderRejectsTable(row.rejects || []);
    }

    // Not-valid section
    function fillNotValid(nv) {
        ensureNVAttachList();
        const hasNV = !!(nv && (nv.reason_non_valid || nv.assignee_name || nv.assignee_supervisor_name || nv.attachment));
        setChecked('rcpa-view-findings-not-valid', hasNV);
        setVal('rcpa-view-not-valid-reason', nv?.reason_non_valid || '');
        const assigneeSig = [nv?.assignee_name, fmtDateOnly(nv?.assignee_date)].filter(Boolean).join(' ');
        const supSig = [nv?.assignee_supervisor_name, fmtDateOnly(nv?.assignee_supervisor_date)].filter(Boolean).join(' ');
        setVal('rcpa-view-invalid-assignee-sign', assigneeSig);
        setVal('rcpa-view-invalid-assignee-sup-sign', supSig);
        renderAttachmentsInto('rcpa-view-not-valid-attach-list', nv?.attachment || '');
    }

    // Show/hide main modal
    function showModal() {
        modal.removeAttribute('hidden');
        requestAnimationFrame(() => { modal.classList.add('show'); });
        document.body.style.overflow = 'hidden';
    }
    function hideModal() {
        modal.classList.remove('show');
        const onEnd = (e) => {
            if (e.target !== modal || e.propertyName !== 'opacity') return;
            modal.removeEventListener('transitionend', onEnd);
            modal.setAttribute('hidden', '');
            document.body.style.overflow = '';
        };
        modal.addEventListener('transitionend', onEnd);
    }
    [closeX].forEach(el => el && el.addEventListener('click', hideModal));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !modal.hidden) hideModal(); });

    // VIEW action (loads record + not-valid + rejects)
    document.addEventListener('rcpa:action', async (e) => {
        const { action, id } = e.detail || {};
        if (action !== 'view' || !id) return;

        clearViewForm();

        try {
            const res = await fetch(`../php-backend/rcpa-view-approval-invalid.php?id=${encodeURIComponent(id)}`, { credentials: 'same-origin' });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const row = await res.json();
            if (!row || !row.id) { alert('Record not found.'); return; }
            currentViewId = row.id;
            fillViewModal(row);

            // INVALID info
            // INVALID info
            try {
                const nvRes = await fetch(`../php-backend/rcpa-view-invalidation-reply.php?rcpa_no=${encodeURIComponent(id)}`, { credentials: 'same-origin' });
                if (nvRes.ok) {
                    const nv = await nvRes.json();
                    if (nv && (nv.rcpa_no || nv.reason_non_valid || nv.assignee_name || nv.attachment)) {
                        fillNotValid(nv);
                    } else {
                        fillNotValid(null);
                    }
                    // NEW: render lists from this endpoint
                    renderApprovalsTable(nv.approvals || []);
                    renderRejectsTable(nv.rejects || []);
                } else {
                    fillNotValid(null);
                    renderApprovalsTable([]);
                    renderRejectsTable([]);
                }
            } catch {
                fillNotValid(null);
                renderApprovalsTable([]);
                renderRejectsTable([]);
            }


            lockViewCheckboxes();
            showModal();
            requestAnimationFrame(() => document.getElementById('rcpa-view-modal')?.__renderStatusFlow?.(row.id || id));
        } catch (err) {
            console.error(err);
            alert('Failed to load record. Please try again.');
        }
    });

    // ==================== APPROVE (with remarks + attachments) ====================
    function openApproveModal() {
        if (!appModal) return;
        appText && (appText.value = '');
        appInput && (appInput.value = '');
        appList && (appList.innerHTML = '');
        if (appBadge) { appBadge.textContent = '0'; appBadge.hidden = true; }

        appModal.removeAttribute('hidden');
        requestAnimationFrame(() => appModal.classList.add('show'));
        setTimeout(() => appText?.focus(), 80);
        document.body.style.overflow = 'hidden';
    }
    function closeApproveModal() {
        if (!appModal) return;
        appModal.classList.remove('show');
        const onEnd = (e) => {
            if (e.target !== appModal || e.propertyName !== 'opacity') return;
            appModal.removeEventListener('transitionend', onEnd);
            appModal.setAttribute('hidden', '');
            document.body.style.overflow = '';
        };
        appModal.addEventListener('transitionend', onEnd);
    }
    appClose?.addEventListener('click', closeApproveModal);
    appCancel?.addEventListener('click', closeApproveModal);
    appModal?.addEventListener('click', (e) => { if (e.target === appModal) closeApproveModal(); });
    appClip?.addEventListener('click', () => appInput?.click());
    function renderApproveList(files) {
        if (!appList) return;
        appList.innerHTML = '';
        [...files].forEach((f, idx) => {
            const row = document.createElement('div');
            row.className = 'reject-file-chip file-chip';
            row.innerHTML = `
      <i class="fa-solid fa-paperclip" aria-hidden="true"></i>
      <div class="file-info">
        <div class="name" title="${f.name}">${f.name}</div>
        <div class="sub">${humanSize(f.size)}</div>
      </div>
      <button type="button" class="file-remove" data-i="${idx}" title="Remove">✕</button>`;
            appList.appendChild(row);
        });
        if (appBadge) {
            appBadge.textContent = String(files.length);
            appBadge.hidden = files.length === 0;
        }
    }
    appInput?.addEventListener('change', () => renderApproveList(appInput.files || []));
    appList?.addEventListener('click', (e) => {
        const btn = e.target.closest('.file-remove');
        if (!btn || !appInput) return;
        const i = Number(btn.getAttribute('data-i'));
        const dt = new DataTransfer();
        [...appInput.files].forEach((f, idx) => { if (idx !== i) dt.items.add(f); });
        appInput.files = dt.files;
        renderApproveList(appInput.files || []);
    });

    // OPEN Approve modal on accept action
    document.addEventListener('rcpa:action', (e) => {
        const { action, id } = e.detail || {};
        if (action !== 'accept' || !id) return;
        currentViewId = id;
        openApproveModal();
    });

    // Submit approve (POST remarks + attachments)
    appForm?.addEventListener('submit', async (ev) => {
        ev.preventDefault();
        if (!currentViewId) { alert('Missing record id.'); return; }

        try {
            appSubmit.disabled = true;
            appSubmit.textContent = 'Approving…';

            const fd = new FormData();
            fd.append('id', String(currentViewId));                 // rcpa_no / id
            fd.append('remarks', (appText?.value || '').trim());
            if (appInput && appInput.files) {
                [...appInput.files].forEach(f => fd.append('attachments[]', f, f.name));
            }

            const res = await fetch('../php-backend/rcpa-accept-approval-invalidation-reply.php', {
                method: 'POST', body: fd, credentials: 'same-origin'
            });
            const data = await res.json();
            if (!res.ok || !data?.success) throw new Error(data?.error || `HTTP ${res.status}`);

            const st = document.getElementById('rcpa-view-status');
            if (st) st.value = 'INVALID APPROVAL - ORIGINATOR';

            if (window.Swal) {
                await Swal.fire({
                    icon: 'success',
                    title: 'INVALIDation Reply approved',
                    text: 'Status set to "INVALID APPROVAL - ORIGINATOR".',
                    timer: 1600,
                    showConfirmButton: false
                });
            } else {
                alert('INVALIDation Reply approved. Status set to "INVALID APPROVAL - ORIGINATOR".');
            }

            closeApproveModal();
            document.dispatchEvent(new CustomEvent('rcpa:refresh'));
        } catch (err) {
            console.error(err);
            if (window.Swal) {
                Swal.fire({ icon: 'error', title: 'Approval failed', text: String(err.message || err) });
            } else {
                alert('Approval failed: ' + (err.message || err));
            }
        } finally {
            appSubmit.disabled = false;
            appSubmit.textContent = 'Approve';
        }
    });

    // ==================== REJECT (unchanged) ====================
    document.addEventListener('rcpa:action', (e) => {
        const { action, id } = e.detail || {};
        if (action !== 'reject' || !id) return;
        currentViewId = id;
        openRejectModal();
    });

    // Submit reject (POST to invalid endpoint)
    rejForm?.addEventListener('submit', async (ev) => {
        ev.preventDefault();
        if (!currentViewId) { alert('Missing record id.'); return; }
        const text = (rejText?.value || '').trim();
        if (!text) {
            if (window.Swal) Swal.fire({ icon: 'warning', title: 'Remarks required' });
            else alert('Please enter the reason.');
            return;
        }

        try {
            rejSubmit.disabled = true;
            rejSubmit.textContent = 'Submitting…';

            const fd = new FormData();
            fd.append('id', String(currentViewId));
            fd.append('remarks', text);
            if (rejInput && rejInput.files) {
                [...rejInput.files].forEach(f => fd.append('attachments[]', f, f.name));
            }

            const res = await fetch('../php-backend/rcpa-reject-approval-invalidation-reply.php', {
                method: 'POST', body: fd, credentials: 'same-origin'
            });
            const data = await res.json();
            if (!res.ok || !data?.success) throw new Error(data?.error || `HTTP ${res.status}`);

            setVal('rcpa-view-status', 'INVALIDATION REPLY');
            if (window.Swal) {
                Swal.fire({ icon: 'success', title: 'Returned to QMS/QA Team', text: 'Status set to "INVALIDATION REPLY".', timer: 1600, showConfirmButton: false });
            } else {
                alert('Returned to QMS/QA Team. Status set to "INVALIDATION REPLY".');
            }
            closeRejectModal();
            document.dispatchEvent(new CustomEvent('rcpa:refresh'));
        } catch (err) {
            console.error(err);
            if (window.Swal) Swal.fire({ icon: 'error', title: 'Submit failed', text: String(err.message || err) });
            else alert('Submit failed: ' + (err.message || err));
        } finally {
            rejSubmit.disabled = false;
            rejSubmit.textContent = 'Submit';
        }
    });
})();

(function initStatusFlowView() {
    const viewModal = document.getElementById('rcpa-view-modal');

    // One-time CSS for the flow (keeps your visuals minimal/consistent)
    if (!document.getElementById('rcpa-status-flow-css')) {
        const st = document.createElement('style');
        st.id = 'rcpa-status-flow-css';
        st.textContent = `
      #rcpa-status-flow .flow-label{color:#9ca3af;font-size:.78rem;}
      #rcpa-status-flow .flow-step.next .flow-label{color:#6b7280;}
      #rcpa-status-flow .flow-step.done .flow-label{color:#22c55e;}
      #rcpa-status-flow .flow-top{font-size:.8rem;color:#6b7280;}
      #rcpa-status-flow .flow-top .flow-date{font-size:.75rem;color:#9ca3af;}
      #rcpa-status-flow .rcpa-flow::before{z-index:0;}
      #rcpa-status-flow .rcpa-flow::after{z-index:2;}
      #rcpa-status-flow .flow-node{z-index:1;}
    `;
        document.head.appendChild(st);
    }

    const PRE_STEPS = ['REQUESTED', 'APPROVAL', 'QMS CHECKING', 'ASSIGNEE PENDING'];
    const VALID_CHAIN = [
        'VALID APPROVAL', 'VALIDATION REPLY', 'REPLY CHECKING - ORIGINATOR',
        'FOR CLOSING', 'FOR CLOSING APPROVAL',
        'EVIDENCE CHECKING', 'EVIDENCE CHECKING - ORIGINATOR',
        'EVIDENCE APPROVAL', 'CLOSED (VALID)'
    ];
    const INVALID_CHAIN = [
        'INVALID APPROVAL', 'INVALIDATION REPLY', 'INVALIDATION REPLY APPROVAL',
        'INVALID APPROVAL - ORIGINATOR', 'CLOSED (INVALID)'
    ];

    function defaultActorFor(stepKey) {
        switch ((stepKey || '').toUpperCase()) {
            case 'FOR CLOSING':
            case 'ASSIGNEE PENDING': return 'Assignee';
            case 'VALID APPROVAL':
            case 'INVALID APPROVAL':
            case 'FOR CLOSING APPROVAL': return 'Assignee Supervisor/Manager';
            case 'QMS CHECKING':
            case 'VALIDATION REPLY':
            case 'INVALIDATION REPLY':
            case 'EVIDENCE CHECKING': return 'QMS';
            case 'REPLY CHECKING - ORIGINATOR':
            case 'EVIDENCE CHECKING - ORIGINATOR':
            case 'INVALID APPROVAL - ORIGINATOR': return 'Originator';
            case 'INVALIDATION REPLY APPROVAL':
            case 'EVIDENCE APPROVAL': return 'QA Head';
            default: return '';
        }
    }
    function nameToInitials(name) {
        const s = String(name || '').trim(); if (!s || s === '—') return s;
        const parts = s.split(/[\s\-\/]+/).filter(Boolean);
        const letters = parts.map(p => (p.match(/\p{L}/u) || [''])[0].toUpperCase()).filter(Boolean);
        return letters.join('') || s.charAt(0).toUpperCase();
    }
    function fmtDateOnly(s) {
        const m = String(s || '').match(/\d{4}-\d{2}-\d{2}/);
        if (m) return m[0];
        const d = new Date(String(s || '').replace(' ', 'T'));
        return isNaN(d) ? '' : d.toISOString().slice(0, 10);
    }
    function ensureFieldset() { return document.getElementById('rcpa-status-flow') || null; }
    function ensureSteps(fs, steps) {
        const ol = fs.querySelector('#rcpa-flow'); if (!ol) return;
        const have = new Set(Array.from(ol.querySelectorAll('.flow-step')).map(li => li.getAttribute('data-key') || ''));
        steps.forEach(key => {
            if (have.has(key)) return;
            const li = document.createElement('li');
            li.className = 'flow-step'; li.setAttribute('data-key', key);
            li.innerHTML = `
        <div class="flow-top"><span class="flow-name">—</span><span class="flow-date">—</span></div>
        <div class="flow-node" aria-hidden="true"></div>
        <div class="flow-label">${key}</div>`;
            ol.appendChild(li);
        });
        Array.from(ol.querySelectorAll('.flow-step')).forEach(li => {
            const k = li.getAttribute('data-key') || li.querySelector('.flow-label')?.textContent?.trim().toUpperCase();
            if (!steps.includes(k)) li.remove();
        });
    }
    function matches(text, tests) {
        const s = String(text || '');
        return tests.every(t => t instanceof RegExp ? t.test(s) : (typeof t === 'function' ? t(s) : false));
    }

    const PH = {
        // VALID
        VALID_APPROVAL: /the\s+assignee\s+supervisor\/manager\s+approved\s+the\s+assignee\s+reply\s+as\s+valid\.?/i,
        VALIDATION_REPLY: /the\s+valid\s+reply\s+by\s+assignee\s+was\s+approved\s+by\s+qms\.?/i,
        REPLY_CHECKING_ORIG: /the\s+originator\s+approved\s+the\s+valid\s+reply\.?/i,
        FOR_CLOSING: /the\s+assignee\s+request(?:ed)?\s+approval\s+for\s+corrective\s+action\s+evidence\.?/i,
        FOR_CLOSING_APPROVAL: /the\s+assignee\s+supervisor\/manager\s+approved\s+the\s+assignee\s+corrective\s+action\s+evidence\s+approval\.?/i,
        EVIDENCE_CHECKING: /the\s+qms\s+accepted\s+the\s+corrective\s+reply\s+for\s+evidence\s+checking\s*\(originator\)\.?/i,
        EVIDENCE_CHECKING_ORIG: /originator\s+approved\s+the\s+corrective\s+evidence\.?/i,
        FINAL_APPROVAL_VALID: /final\s+approval\s+given\.\s*request\s+closed\s*\(valid\)\.?/i,
        // INVALID
        INVALID_APPROVAL: /the\s+assignee\s+supervisor\/manager\s+approved\s+the\s+assignee\s+reply\s+as\s+invalid\.?/i,
        INVALIDATION_REPLY: /the\s+invalidation\s+reply\s+by\s+assignee\s+was\s+approved\s+by\s+qms\s+team\.?/i,
        INVALIDATION_REPLY_APPROVAL: /the\s+invalidation\s+reply\s+approval\s+by\s+qms\s+team\s+was\s+approved\s+by\s+qa\s+supervisor\/manager\.?/i,
        CLOSED_INVALID_BY_ORIG: /originator\s+approved\s+that\s+the\s+rcpa\s+is\s+closed\s*\(invalid\)\.?/i
    };
    function stepTests(key) {
        const validOrNot = (s) =>
            /the\s+assignee\s+confirmed\s+that\s+the\s+rcpa\s+is\s+valid\.?/i.test(s) ||
            /the\s+assignee\s+confirmed\s+that\s+the\s+rcpa\s+is\s+not\s+valid\.?/i.test(s);
        switch (key) {
            case 'REQUESTED': return [/requested/i];
            case 'APPROVAL': return [/approved/i, s => !(/disapproved/i.test(s))];
            case 'QMS CHECKING': return [/(?:\bchecked\b|\bchecking\b)/i, /\bqms\b/i];
            case 'ASSIGNEE PENDING': return [validOrNot];
            // VALID
            case 'VALID APPROVAL': return [PH.VALID_APPROVAL];
            case 'VALIDATION REPLY': return [PH.VALIDATION_REPLY];
            case 'REPLY CHECKING - ORIGINATOR': return [PH.REPLY_CHECKING_ORIG];
            case 'FOR CLOSING': return [PH.FOR_CLOSING];
            case 'FOR CLOSING APPROVAL': return [PH.FOR_CLOSING_APPROVAL];
            case 'EVIDENCE CHECKING': return [PH.EVIDENCE_CHECKING];
            case 'EVIDENCE CHECKING - ORIGINATOR': return [PH.EVIDENCE_CHECKING_ORIG];
            case 'EVIDENCE APPROVAL': return [PH.FINAL_APPROVAL_VALID];
            case 'CLOSED (VALID)': return [PH.FINAL_APPROVAL_VALID];
            // INVALID
            case 'INVALID APPROVAL': return [PH.INVALID_APPROVAL];
            case 'INVALIDATION REPLY': return [PH.INVALIDATION_REPLY];
            case 'INVALIDATION REPLY APPROVAL': return [PH.INVALIDATION_REPLY_APPROVAL];
            case 'INVALID APPROVAL - ORIGINATOR': return [PH.CLOSED_INVALID_BY_ORIG];
            case 'CLOSED (INVALID)': return [PH.CLOSED_INVALID_BY_ORIG];
        }
        return [];
    }

    function pickBranch(rows) {
        const toTs = (s) => { const d = new Date(String(s || '').replace(' ', 'T')); return isNaN(d) ? 0 : d.getTime(); };
        let latestValid = null, latestInvalid = null;
        rows.forEach(r => {
            const a = String(r?.activity || '');
            if (/the\s+assignee\s+confirmed\s+that\s+the\s+rcpa\s+is\s+valid\.?/i.test(a)) {
                if (!latestValid || toTs(r.date_time) > toTs(latestValid.date_time)) latestValid = r;
            }
            if (/the\s+assignee\s+confirmed\s+that\s+the\s+rcpa\s+is\s+not\s+valid\.?/i.test(a)) {
                if (!latestInvalid || toTs(r.date_time) > toTs(latestInvalid.date_time)) latestInvalid = r;
            }
        });
        if (latestValid && latestInvalid) return (toTs(latestValid.date_time) >= toTs(latestInvalid.date_time)) ? 'valid' : 'invalid';
        if (latestValid) return 'valid';
        if (latestInvalid) return 'invalid';
        return null;
    }

    function resetStatusFlow() {
        const fs = ensureFieldset(); if (!fs) return;
        fs.querySelectorAll('.flow-step').forEach(li => {
            li.classList.remove('done', 'next');
            li.querySelector('.flow-name').textContent = '—';
            li.querySelector('.flow-date').textContent = '—';
            li.querySelector('.flow-name').removeAttribute('title');
            li.querySelector('.flow-name').removeAttribute('aria-label');
        });
        fs.querySelector('.rcpa-flow')?.style.setProperty('--progress', '0%');
    }

    async function renderStatusFlow(rcpaNo) {
        const fs = ensureFieldset(); if (!fs) return;
        resetStatusFlow(); if (!rcpaNo) return;

        const statusNow = String(document.getElementById('rcpa-view-status')?.value || '').trim().toUpperCase();

        // Load history rows
        let rows = [];
        try {
            const res = await fetch(`../php-backend/rcpa-history.php?id=${encodeURIComponent(rcpaNo)}`, {
                credentials: 'same-origin', headers: { 'Accept': 'application/json' }
            });
            const data = await res.json().catch(() => ({}));
            rows = Array.isArray(data?.rows) ? data.rows : [];
        } catch { rows = []; }

        // Build step list (freeze branch at ASSIGNEE PENDING)
        let STEPS = PRE_STEPS.slice();
        if (statusNow !== 'ASSIGNEE PENDING') {
            const inValid = VALID_CHAIN.includes(statusNow);
            const inInvalid = INVALID_CHAIN.includes(statusNow);
            const branch = inValid ? 'valid' : (inInvalid ? 'invalid' : pickBranch(rows));
            STEPS = PRE_STEPS.concat(branch === 'valid' ? VALID_CHAIN : branch === 'invalid' ? INVALID_CHAIN : []);
        }
        ensureSteps(fs, STEPS);

        // Latest row per step
        const toTs = (s) => { const d = new Date(String(s || '').replace(' ', 'T')); return isNaN(d) ? 0 : d.getTime(); };
        const stepData = Object.fromEntries(STEPS.map(k => [k, { name: '—', date: '', ts: 0 }]));
        rows.forEach(r => {
            const act = r?.activity || '';
            STEPS.forEach(step => {
                const tests = stepTests(step); if (!tests.length) return;
                if (matches(act, tests)) {
                    const ts = toTs(r.date_time);
                    if (ts >= (stepData[step].ts || 0)) stepData[step] = { name: r?.name || '—', date: r?.date_time || '', ts };
                }
            });
        });

        // Clamp future to defaults
        const cutoffIdx = STEPS.indexOf(statusNow);
        if (cutoffIdx >= 0) STEPS.forEach((k, i) => { if (i > cutoffIdx) stepData[k] = { name: '—', date: '', ts: 0 }; });

        // Paint DOM
        const items = fs.querySelectorAll('.flow-step');
        items.forEach(li => {
            const key = li.getAttribute('data-key') || li.querySelector('.flow-label')?.textContent?.trim().toUpperCase();
            const info = stepData[key] || { name: '—', date: '' };
            const idx = STEPS.indexOf(key);
            const isFuture = (cutoffIdx >= 0 && idx > cutoffIdx);
            const isCurrent = (cutoffIdx >= 0 && idx === cutoffIdx);

            const nameEl = li.querySelector('.flow-name');
            const defaultName = defaultActorFor(key) || '—';
            const hasActualName = !!(info.name && info.name !== '—');

            if (isFuture || isCurrent) {
                nameEl.textContent = defaultName;
                nameEl.removeAttribute('title'); nameEl.removeAttribute('aria-label');
            } else if (hasActualName) {
                const initials = nameToInitials(info.name);
                nameEl.textContent = initials;
                nameEl.setAttribute('title', info.name);
                nameEl.setAttribute('aria-label', info.name);
            } else {
                nameEl.textContent = defaultName;
                nameEl.removeAttribute('title'); nameEl.removeAttribute('aria-label');
            }

            li.querySelector('.flow-date').textContent =
                (isFuture || isCurrent)
                    ? (key === 'ASSIGNEE PENDING' ? 'TBD' : '—')
                    : (info.date ? fmtDateOnly(info.date) : (key === 'ASSIGNEE PENDING' ? 'TBD' : '—'));
        });

        // done/next
        let doneCount = 0;
        for (let i = 0; i < STEPS.length; i++) {
            if (stepData[STEPS[i]]?.date) doneCount = i + 1; else break;
        }
        if (cutoffIdx >= 0) doneCount = Math.min(doneCount, cutoffIdx);

        items.forEach((li, idx) => {
            li.classList.remove('done', 'next');
            if (idx < doneCount) li.classList.add('done');
            else if (idx === doneCount) li.classList.add('next');
        });

        // progress rail
        const GAP_TARGET = 0.25, STOP_BEFORE_NEXT_PX = 8;
        const flowEl = fs.querySelector('.rcpa-flow');
        if (flowEl) {
            requestAnimationFrame(() => {
                let pct = 0;
                const nodes = Array.from(flowEl.querySelectorAll('.flow-node'));
                if (nodes.length >= 1 && doneCount > 0) {
                    const centers = nodes.map(n => { const r = n.getBoundingClientRect(); return r.left + r.width / 2; });
                    const rail = flowEl.getBoundingClientRect();
                    const left0 = rail.left;
                    const endCenter = centers[centers.length - 1];
                    const lastIdx = Math.min(doneCount - 1, centers.length - 1);
                    const lastCenter = centers[lastIdx];
                    let targetX = lastCenter;
                    if (lastIdx < centers.length - 1) {
                        const nextCenter = centers[lastIdx + 1];
                        targetX = lastCenter + (nextCenter - lastCenter) * GAP_TARGET;
                        targetX = Math.min(targetX, nextCenter - STOP_BEFORE_NEXT_PX);
                    }
                    pct = ((targetX - left0) / (endCenter - left0)) * 100;
                }
                flowEl.style.setProperty('--progress', `${Math.max(0, Math.min(100, pct)).toFixed(3)}%`);
            });
        }
    }

    if (viewModal) {
        viewModal.__renderStatusFlow = renderStatusFlow;
        viewModal.__clearStatusFlow = resetStatusFlow;
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