(function () {
    const tbody = document.querySelector('#rcpa-table tbody');
    const totalEl = document.getElementById('rcpa-total');
    const pageInfo = document.getElementById('rcpa-page-info');
    const prevBtn = document.getElementById('rcpa-prev');
    const nextBtn = document.getElementById('rcpa-next');
    const fType = document.getElementById('rcpa-filter-type');
    const fStatus = document.getElementById('rcpa-filter-status'); // NEW

    let page = 1;
    const pageSize = 10;

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
        if (t === 'IN-VALID APPROVAL') return `<span class="rcpa-badge badge-invalid-approval">IN-VALID APPROVAL</span>`;
        if (t === 'IN-VALIDATION REPLY') return `<span class="rcpa-badge badge-invalidation-reply">IN-VALIDATION REPLY</span>`;
        if (t === 'VALIDATION REPLY') return `<span class="rcpa-badge badge-validation-reply">VALIDATION REPLY</span>`;
        if (t === 'VALIDATION REPLY APPROVAL') return `<span class="rcpa-badge badge-validation-reply-approval">VALIDATION REPLY APPROVAL</span>`;
        if (t === 'IN-VALIDATION REPLY APPROVAL') return `<span class="rcpa-badge badge-invalidation-reply-approval">IN-VALIDATION REPLY APPROVAL</span>`;
        if (t === 'FOR CLOSING') return `<span class="rcpa-badge badge-assignee-corrective">FOR CLOSING</span>`;
        if (t === 'FOR CLOSING APPROVAL') return `<span class="rcpa-badge badge-assignee-corrective-approval">FOR CLOSING APPROVAL</span>`;
        if (t === 'EVIDENCE CHECKING') return `<span class="rcpa-badge badge-corrective-checking">EVIDENCE CHECKING</span>`;
        if (t === 'EVIDENCE CHECKING APPROVAL') return `<span class="rcpa-badge badge-corrective-checking-approval">EVIDENCE CHECKING APPROVAL</span>`;
        if (t === 'EVIDENCE APPROVAL') return `<span class="rcpa-badge badge-corrective-checking-approval">EVIDENCE APPROVAL</span>`;
        if (t === 'CLOSED (VALID)') return `<span class="rcpa-badge badge-closed">CLOSED (VALID)</span>`;
        if (t === 'CLOSED (IN-VALID)') return `<span class="rcpa-badge badge-rejected">CLOSED (IN-VALID)</span>`;
        if (t === 'REPLY CHECKING - ORIGINATOR') return `<span class="rcpa-badge badge-validation-reply-approval">REPLY CHECKING - ORIGINATOR</span>`;
        if (t === 'EVIDENCE CHECKING - ORIGINATOR') return `<span class="rcpa-badge badge-validation-reply-approval">EVIDENCE CHECKING - ORIGINATOR</span>`;
        if (t === 'IN-VALID APPROVAL - ORIGINATOR') return `<span class="rcpa-badge badge-validation-reply-approval">IN-VALID APPROVAL - ORIGINATOR</span>`;
        return `<span class="rcpa-badge badge-unknown">NO STATUS</span>`;
    }

    function badgeForCategory(c) {
        const v = (c || '').toLowerCase();
        if (v === 'major') return `<span class="rcpa-badge badge-cat-major">Major</span>`;
        if (v === 'minor') return `<span class="rcpa-badge badge-cat-minor">Minor</span>`;
        if (v === 'observation') return `<span class="rcpa-badge badge-cat-obs">Observation</span>`;
        return '';
    }

    // Actions column: only a View button
    function actionButtonHtml(id) {
        const safeId = escapeHtml(id ?? '');
        return `
          <div class="rcpa-actions">
            <button class="action-btn rcpa-view" data-id="${safeId}" title="View">View</button>
          </div>
        `;
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

    // Format YYYY-MM-DD as "Mon DD, YYYY"
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
        const parts = new Intl.DateTimeFormat('en-CA', {
            timeZone: MANILA_TZ, year: 'numeric', month: '2-digit', day: '2-digit'
        }).formatToParts(new Date());
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

    // "Mon DD, YYYY (N days)"
    function renderCloseDue(ymd) {
        if (!ymd) return '';
        const base = fmtYmd(ymd);
        const d = diffDaysFromTodayManila(ymd);
        if (d === null) return base;
        const plural = Math.abs(d) === 1 ? 'day' : 'days';
        return `${base} (${d} ${plural})`;
    }
    /* ------------------------------------------------------- */

    async function load() {
        const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
        if (fType.value) params.set('type', fType.value);
        if (fStatus.value) params.set('status', fStatus.value); // NEW ('' -> both statuses)

        tbody.innerHTML = `<tr><td colspan="10" class="rcpa-empty">Loading…</td></tr>`;

        let res;
        try {
            res = await fetch('../php-backend/rcpa-list-closed.php?' + params.toString(), { credentials: 'same-origin' });
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
                    <td>${renderCloseDue(r.close_due_date)}</td> <!-- NEW -->
                    <td>${badgeForStatus(r.status)}</td>
                    <td>${escapeHtml(r.originator_name)}</td>
                    <td>${escapeHtml(r.section ? `${r.assignee} - ${r.section}` : (r.assignee || ''))}</td>
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

    document.addEventListener('rcpa:refresh', () => { load(); });

    // Row actions: only View + History
    tbody.addEventListener('click', (e) => {
        const btnView = e.target.closest('.rcpa-view');
        if (btnView) {
            const id = btnView.getAttribute('data-id');
            if (id) document.dispatchEvent(new CustomEvent('rcpa:action', { detail: { action: 'view', id } }));
            return;
        }

        const hist = e.target.closest('.icon-rcpa-history');
        if (hist) {
            const id = hist.getAttribute('data-id');
            if (id) document.dispatchEvent(new CustomEvent('rcpa:action', { detail: { action: 'history', id } }));
        }
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

    // Top tabs navigation (optional)
    document.querySelector('.rcpa-table-toolbar').addEventListener('click', (e) => {
        const tab = e.target.closest('.rcpa-tab[data-href]');
        if (!tab) return;
        window.location.href = tab.dataset.href;
    });

    // Pagination + filters
    prevBtn.addEventListener('click', () => { if (page > 1) { page--; load(); } });
    nextBtn.addEventListener('click', () => { page++; load(); });
    fType.addEventListener('change', () => { page = 1; load(); });
    fStatus.addEventListener('change', () => { page = 1; load(); }); // NEW

    load();
})();

/* ====== VIEW MODAL: fetch, fill, show ====== */
(function () {
    // Modal elems
    const modal = document.getElementById('rcpa-view-modal');
    const closeX = document.getElementById('rcpa-view-close');

    // Track current record id for sub-views (Why-Why)
    let currentViewId = null;

    let currentFollowUpRec = null; // {id, target_date, remarks, attachment} or null

    // Disapproval remarks viewer
    const dModal = document.getElementById('reject-remarks-modal');
    const dClose = document.getElementById('reject-remarks-close');
    const dText = document.getElementById('reject-remarks-text');
    const dList = document.getElementById('reject-remarks-attach-list');

    // Why-Why modal
    const whyViewModal = document.getElementById('rcpa-why-view-modal');
    const whyViewClose = document.getElementById('rcpa-why-view-close');
    const whyViewOk = document.getElementById('rcpa-why-view-ok');
    const whyViewDesc = document.getElementById('rcpa-why-view-desc');
    const whyViewList = document.getElementById('rcpa-why-view-list');

    // Sections we may hide/show
    const validFs = modal.querySelector('fieldset.validation:not(.validation-invalid)');
    const invalidFs = modal.querySelector('fieldset.validation-invalid');
    const corrFs = modal.querySelector('fieldset.corrective-evidence');

    const evidenceFs = modal.querySelector('#rcpa-view-evidence');

    const followFs = modal.querySelector('#rcpa-view-followup');

    const actionsWrap = modal.querySelector('.actions');


    const setSectionVisible = (el, show) => {
        if (!el) return;
        if (show) el.removeAttribute('hidden');
        else el.setAttribute('hidden', '');
    };

    // Light styling for 2-column layout + root cause highlight
    if (!document.getElementById('rcpa-why-style')) {
        const style = document.createElement('style');
        style.id = 'rcpa-why-style';
        style.textContent = `
        #rcpa-why-view-list.two-col { display:grid !important; grid-template-columns:1fr 1fr; gap:12px; }
        @media (max-width: 760px) { #rcpa-why-view-list.two-col { grid-template-columns:1fr; } }
        #rcpa-why-view-modal .why-item.is-root { border:2px solid #ef4444; background:#fff7f7; }
      `;
        document.head.appendChild(style);
    }

    function openDisapproveModal(text, attachments) {
        if (dText) dText.value = text || '';
        if (dList) renderAttachmentsTo('reject-remarks-attach-list', attachments);
        dModal.removeAttribute('hidden');
        requestAnimationFrame(() => dModal.classList.add('show'));
        document.body.style.overflow = 'hidden';
    }
    function closeDisapproveModal() {
        dModal.classList.remove('show');
        const onEnd = (e) => {
            if (e.target !== dModal || e.propertyName !== 'opacity') return;
            dModal.removeEventListener('transitionend', onEnd);
            dModal.setAttribute('hidden', '');
            document.body.style.overflow = '';
            if (dText) dText.value = '';
            if (dList) dList.innerHTML = '';
        };
        dModal.addEventListener('transitionend', onEnd);
    }
    dClose?.addEventListener('click', closeDisapproveModal);
    dModal?.addEventListener('click', (e) => { if (e.target === dModal) closeDisapproveModal(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && dModal && !dModal.hidden) closeDisapproveModal(); });

    function escapeHTML(s) {
        return String(s ?? '')
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function renderRejectsTable(items) {
        const tb = document.querySelector('#rcpa-rejects-table tbody');
        if (!tb) return;

        const list = Array.isArray(items) ? items : [];
        if (!list.length) {
            tb.innerHTML = `<tr><td class="rcpa-empty" colspan="3">No records found</td></tr>`;
            return;
        }

        const cacheHost = document.getElementById('rcpa-view-modal');
        if (cacheHost) cacheHost.__rejects = list;

        tb.innerHTML = list.map((row, i) => {
            const disType = escapeHTML(row.disapprove_type || '');
            const when = (() => {
                const d = new Date(String(row.created_at).replace(' ', 'T'));
                return isNaN(d) ? escapeHTML(row.created_at || '') : escapeHTML(d.toLocaleString());
            })();
            return `
        <tr>
          <td>${disType || '-'}</td>
          <td>${when || '-'}</td>
          <td><button type="button" class="rcpa-btn rcpa-reject-view" data-idx="${i}">View</button></td>
        </tr>
      `;
        }).join('');
    }

    // Clicking "View" beside a disapproval row opens the read-only viewer
    (function hookDisapproveActions() {
        const table = document.getElementById('rcpa-rejects-table');
        if (!table) return;
        table.addEventListener('click', (e) => {
            const btn = e.target.closest('.rcpa-reject-view');
            if (!btn) return;
            const host = document.getElementById('rcpa-view-modal');
            const cache = (host && host.__rejects) || [];
            const idx = parseInt(btn.getAttribute('data-idx'), 10);
            const item = cache[idx];
            if (!item) return;
            openDisapproveModal(item.remarks || '', item.attachments);
        });
    })();

    // Helpers
    const setVal = (id, v) => { const el = document.getElementById(id); if (el) el.value = v ?? ''; };
    const setChecked = (id, on) => { const el = document.getElementById(id); if (el) el.checked = !!on; };
    const showCond = (id, show) => { const el = document.getElementById(id); if (el) el.hidden = !show; };
    function setHiddenSel(selector, hide) {
        modal.querySelectorAll(selector).forEach(el => {
            if (hide) el.setAttribute('hidden', '');
            else el.removeAttribute('hidden');
        });
    }
    function setCheckedByAny(selectors, on) {
        const seen = new Set();
        selectors.forEach(sel => {
            modal.querySelectorAll(sel).forEach(cb => {
                if (cb && !seen.has(cb)) {
                    cb.checked = !!on;
                    seen.add(cb);
                }
            });
        });
    }
    function setDateVal(id, v) {
        const el = document.getElementById(id);
        if (!el) return;
        el.value = (v && String(v).slice(0, 10)) || '';
    }
    function fmtDateOnly(s) {
        if (!s) return '';
        const d = new Date(String(s).replace(' ', 'T'));
        return isNaN(d) ? String(s) : d.toLocaleDateString();
    }
    function toggleValidPanels({ showNC, showPNC }) {
        modal.querySelectorAll('.correction-grid:not(.preventive-grid)').forEach(g => {
            g.style.display = showNC ? 'grid' : 'none';
        });
        const pnc = modal.querySelector('.preventive-grid');
        if (pnc) pnc.style.display = showPNC ? 'grid' : 'none';
        setCheckedByAny(['#rcpa-view-for-nc-valid', '#rcpa-view-for-nc', '.checkbox-for-non-conformance input[type="checkbox"]'], !!showNC);
        setCheckedByAny(['#rcpa-view-for-pnc', '.checkbox-for-potential-non-conformance input[type="checkbox"]'], !!showPNC);
    }
    const fmt = (s) => {
        if (!s) return '';
        const d = new Date(String(s).replace(' ', 'T'));
        return isNaN(d) ? s : d.toLocaleString();
    };
    const yearFrom = (s) => {
        if (!s) return '';
        const d = new Date(String(s).replace(' ', 'T'));
        if (!isNaN(d)) return String(d.getFullYear());
        const m = String(s).match(/\b(20\d{2}|\d{4})\b/);
        return m ? m[1] : '';
    };
    async function fetchJSON(url) {
        const res = await fetch(url, { credentials: 'same-origin' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
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
    function installReadonlyGuards() {
        modal.addEventListener('click', (e) => {
            if (e.target.matches?.('input[type="checkbox"].readonly-check')) { e.preventDefault(); return; }
            const lbl = e.target.closest('label');
            if (lbl) {
                const forId = lbl.getAttribute('for');
                let cb = null;
                if (forId) cb = modal.querySelector(`#${CSS.escape(forId)}`);
                else cb = lbl.querySelector('input[type="checkbox"]');
                if (cb && cb.classList.contains('readonly-check')) { e.preventDefault(); return; }
            }
        }, true);
        modal.addEventListener('keydown', (e) => {
            if (e.target.matches?.('input[type="checkbox"].readonly-check') && (e.key === ' ' || e.key === 'Spacebar' || e.key === 'Enter')) {
                e.preventDefault();
            }
        });
        modal.addEventListener('change', (e) => {
            if (e.target.matches?.('input[type="checkbox"].readonly-check')) {
                e.preventDefault();
                e.target.checked = e.target.dataset.lockChecked === '1';
            }
        });
    }
    installReadonlyGuards();

    // Attachments renderer
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
    function renderRemarksAttachments(s) { renderAttachmentsTo('rcpa-view-attach-list', s); }

    /* ================= Not-Valid (IN-VALIDATION REPLY) integration ================= */

    function fillNotValidSection(data) {
        const hasData = !!(data && (
            (data.reason_non_valid && String(data.reason_non_valid).trim() !== '') ||
            (data.attachment && String(data.attachment).trim() !== '') ||
            (data.assignee_name && String(data.assignee_name).trim() !== '') ||
            (data.assignee_supervisor_name && String(data.assignee_supervisor_name).trim() !== '')
        ));

        if (!hasData) {
            setChecked('rcpa-view-findings-not-valid', false);
            setVal('rcpa-view-not-valid-reason', '');
            renderAttachmentsTo('rcpa-view-not-valid-attach-list', []);
            ['rcpa-view-invalid-assignee-sign',
                'rcpa-view-invalid-assignee-sup-sign',
                'rcpa-view-invalid-qms-sign',
                'rcpa-view-invalid-originator-sign'
            ].forEach(id => setVal(id, ''));
            setSectionVisible(invalidFs, false);
            return false;
        }

        setChecked('rcpa-view-findings-not-valid', true);
        setVal('rcpa-view-not-valid-reason', data.reason_non_valid || '');
        renderAttachmentsTo('rcpa-view-not-valid-attach-list', data.attachment || '');

        setVal(
            'rcpa-view-invalid-assignee-sign',
            [data.assignee_name, fmtDateOnly(data.assignee_date)].filter(Boolean).join(' ')
        );
        setVal(
            'rcpa-view-invalid-assignee-sup-sign',
            [data.assignee_supervisor_name, fmtDateOnly(data.assignee_supervisor_date)].filter(Boolean).join(' ')
        );

        // Not in provided table — intentionally left blank:
        setVal('rcpa-view-invalid-qms-sign', '');
        setVal('rcpa-view-invalid-originator-sign', '');

        setSectionVisible(invalidFs, true);
        return true;
    }

    // Why-Why utilities
    function ensureWhyWhyButton() {
        if (document.getElementById('rcpa-view-open-why')) return;
        const label = modal?.querySelector('label.inline-check input#rcpa-view-findings-valid')?.closest('label.inline-check');
        if (!label) return;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.id = 'rcpa-view-open-why';
        btn.className = 'rcpa-btn rcpa-btn-secondary';
        btn.style.marginLeft = '8px';
        btn.textContent = 'Why-Why Analysis';
        label.appendChild(btn);
    }
    function renderWhyViewList(rows) {
        if (!whyViewList) return;

        if (!rows || rows.length === 0) {
            whyViewList.classList.remove('two-col');
            whyViewList.style.display = 'flex';
            whyViewList.style.flexDirection = 'column';
            whyViewList.innerHTML = `<div class="rcpa-empty">No Why-Why analysis found for this record.</div>`;
            return;
        }

        const groups = rows.reduce((m, r) => {
            const key = r.analysis_type || 'Analysis';
            (m[key] = m[key] || []).push(r);
            return m;
        }, {});
        const entries = Object.entries(groups);

        if (entries.length === 2) {
            whyViewList.classList.add('two-col');
        } else {
            whyViewList.classList.remove('two-col');
            whyViewList.style.display = 'flex';
            whyViewList.style.flexDirection = 'column';
        }

        const html = entries.map(([type, arr]) => {
            const items = arr.map((r, i) => {
                const isRoot = String(r.answer).toLowerCase() === 'yes';
                const badge = isRoot ? `<span style="display:inline-block;padding:2px 6px;border-radius:999px;border:1px solid #16a34a;margin-left:6px;font-size:12px;">Root Cause</span>` : '';
                return `
            <div class="why-item${isRoot ? ' is-root' : ''}" style="padding:10px;border:1px solid #e5e7eb;border-radius:6px;background:#f9fafb;">
              <div style="font-weight:600;margin-bottom:6px;">Why ${i + 1}${badge}</div>
              <div>${escapeHTML(r.why_occur)}</div>
            </div>
          `;
            }).join('');

            return `
          <div class="why-group" style="border:1px solid #d1d5db;border-radius:8px;padding:12px; max-width: 45vw;">
            <div style="font-weight:700;margin-bottom:8px;">${escapeHTML(type)}</div>
            <div style="display:flex;flex-direction:column;gap:8px;">${items}</div>
          </div>
        `;
        }).join('');

        whyViewList.innerHTML = html;
    }
    function openWhyViewModal() {
        if (!whyViewModal || !currentViewId) return;

        if (whyViewDesc) whyViewDesc.value = '';
        if (whyViewList) whyViewList.innerHTML = '<div class="rcpa-empty">Loading…</div>';

        fetch(`../php-backend/rcpa-why-analysis-list.php?rcpa_no=${encodeURIComponent(currentViewId)}`, { credentials: 'same-origin' })
            .then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
            .then(data => {
                if (whyViewDesc) whyViewDesc.value = data?.description_of_findings || '';
                renderWhyViewList(Array.isArray(data?.rows) ? data.rows : []);
            })
            .catch(() => {
                if (whyViewList) whyViewList.innerHTML = `<div class="rcpa-empty">Failed to load analysis.</div>`;
            });

        whyViewModal.removeAttribute('hidden');
        requestAnimationFrame(() => whyViewModal.classList.add('show'));
        document.body.style.overflow = 'hidden';
    }
    function closeWhyViewModal() {
        if (!whyViewModal) return;
        whyViewModal.classList.remove('show');
        const onEnd = (e) => {
            if (e.target !== whyViewModal || e.propertyName !== 'opacity') return;
            whyViewModal.removeEventListener('transitionend', onEnd);
            whyViewModal.setAttribute('hidden', '');
            document.body.style.overflow = '';
        };
        whyViewModal.addEventListener('transitionend', onEnd);
    }
    function bindWhyWhyButton() {
        ensureWhyWhyButton();
        const btn = document.getElementById('rcpa-view-open-why');
        if (btn && !btn.dataset.boundWhy) {
            btn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); openWhyViewModal(); });
            btn.dataset.boundWhy = '1';
        }
    }
    // Why-Why close handlers
    whyViewClose?.addEventListener('click', closeWhyViewModal);
    whyViewOk?.addEventListener('click', closeWhyViewModal);
    whyViewModal?.addEventListener('click', (e) => { if (e.target === whyViewModal) closeWhyViewModal(); });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && whyViewModal && !whyViewModal.hidden) closeWhyViewModal();
    });

    function clearViewForm() {
        // Hide all conditional type blocks
        ['v-type-external', 'v-type-internal', 'v-type-unattain', 'v-type-online', 'v-type-hs', 'v-type-mgmt']
            .forEach(id => showCond(id, false));

        // Reset text/textarea inputs
        [
            'rcpa-view-type', 'v-external-sem1-year', 'v-external-sem2-year', 'v-internal-sem1-year', 'v-internal-sem2-year',
            'v-project-name', 'v-wbs-number', 'v-online-year', 'v-hs-month', 'v-hs-year', 'v-mgmt-year',
            'rcpa-view-originator-name', 'rcpa-view-originator-dept', 'rcpa-view-date', 'rcpa-view-remarks',
            'rcpa-view-system', 'rcpa-view-clauses', 'rcpa-view-supervisor', 'rcpa-view-assignee',
            'rcpa-view-status', 'rcpa-view-conformance',
            'rcpa-view-root-cause', 'rcpa-view-correction', 'rcpa-view-corrective', 'rcpa-view-preventive',
            'rcpa-view-assignee-sign', 'rcpa-view-assignee-sup-sign',
            // invalid block signatures/fields
            'rcpa-view-not-valid-reason', 'rcpa-view-invalid-assignee-sign', 'rcpa-view-invalid-assignee-sup-sign',
            'rcpa-view-invalid-qms-sign', 'rcpa-view-invalid-originator-sign',
            // corrective-evidence text
            'rcpa-view-corrective-remarks',
            // evidence checking text
            'rcpa-view-ev-remarks',
            // follow-up text (view)
            'rcpa-view-followup-remarks'
        ].forEach(id => setVal(id, ''));

        // Reset date inputs
        [
            'rcpa-view-correction-target', 'rcpa-view-correction-done',
            'rcpa-view-corrective-target', 'rcpa-view-corrective-done',
            'rcpa-view-preventive-target', 'rcpa-view-preventive-done',
            // follow-up date (view)
            'rcpa-view-followup-date'
        ].forEach(id => setDateVal(id, ''));

        // Reset checkboxes
        [
            'rcpa-view-cat-major', 'rcpa-view-cat-minor', 'rcpa-view-cat-obs',
            'rcpa-view-flag-nc', 'rcpa-view-flag-pnc',
            'rcpa-view-findings-valid', 'rcpa-view-findings-not-valid',
            // evidence yes/no (view)
            'rcpa-view-ev-action-yes', 'rcpa-view-ev-action-no',
            // mgmt quarter flags
            'rcpa-view-mgmt-q1', 'rcpa-view-mgmt-q2', 'rcpa-view-mgmt-q3', 'rcpa-view-mgmt-ytd'
        ].forEach(id => setChecked(id, false));

        // Show both “For …” toggles and uncheck their boxes
        setHiddenSel('.checkbox-for-non-conformance', false);
        setHiddenSel('.checkbox-for-potential-non-conformance', false);
        setCheckedByAny(['#rcpa-view-for-nc-valid', '#rcpa-view-for-nc', '.checkbox-for-non-conformance input[type="checkbox"]'], false);
        setCheckedByAny(['#rcpa-view-for-pnc', '.checkbox-for-potential-non-conformance input[type="checkbox"]'], false);

        // Hide both NC/PNC panels
        toggleValidPanels({ showNC: false, showPNC: false });

        // Clear attachment lists in the main view
        [
            'rcpa-view-attach-list',
            'rcpa-view-valid-attach-list',
            'rcpa-view-not-valid-attach-list',
            'rcpa-view-corrective-attach-list',
            'rcpa-view-ev-attach-list',
            'rcpa-view-followup-attach-list'
        ].forEach(id => { const el = document.getElementById(id); if (el) el.innerHTML = ''; });

        // Hide major sections by default
        setSectionVisible(validFs, false);
        setSectionVisible(invalidFs, false);
        setSectionVisible(corrFs, false);
        setSectionVisible(evidenceFs, false);
        setSectionVisible(followFs, false);

        // Follow-up state + button label + existing list
        currentFollowUpRec = null;
        const followBtn = document.getElementById('rcpa-followup-open');
        if (followBtn) followBtn.textContent = 'Add follow up for effectiveness';
        const fuExistingWrap = document.getElementById('rcpa-followup-existing');
        const fuExistingList = document.getElementById('rcpa-followup-existing-list');
        if (fuExistingWrap) fuExistingWrap.hidden = true;
        if (fuExistingList) fuExistingList.innerHTML = '';

        // Disapproval remarks table: reset + hide its fieldset if present; clear cache
        const tb = document.querySelector('#rcpa-rejects-table tbody');
        if (tb) tb.innerHTML = `<tr><td class="rcpa-empty" colspan="3">No records found</td></tr>`;
        const rjFs = document.querySelector('#rcpa-rejects-fieldset, fieldset.reject-remarks');
        if (rjFs) { rjFs.hidden = true; rjFs.setAttribute('aria-hidden', 'true'); }
        if (modal) modal.__rejects = [];

        // Why-Why UI: clear description/list and forget id
        if (whyViewDesc) whyViewDesc.value = '';
        if (whyViewList) whyViewList.innerHTML = '';

        if (actionsWrap) actionsWrap.hidden = true; // hide by default each time

        currentViewId = null;
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

    async function fillViewModal(row) {
        // keep current id for sub-views
        currentViewId = row.id || null;

        // TYPE + conditional blocks
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

        const cat = String(row.category || '').toLowerCase();
        setChecked('rcpa-view-cat-major', cat === 'major');
        setChecked('rcpa-view-cat-minor', cat === 'minor');
        setChecked('rcpa-view-cat-obs', cat === 'observation');

        setVal('rcpa-view-originator-name', row.originator_name);
        setVal('rcpa-view-originator-dept', row.originator_department);
        setVal('rcpa-view-date', fmt(row.date_request));

        const confNorm = String(row.conformance || '')
            .toLowerCase().replace(/[\s_-]+/g, ' ').trim();

        let isPNC = (confNorm === 'pnc') || confNorm.includes('potential');
        let isNC = false;
        if (!isPNC) {
            isNC = confNorm === 'nc' ||
                /\bnon[- ]?conformance\b/.test(confNorm) ||
                confNorm === 'non conformance' ||
                confNorm === 'nonconformance';
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

        setVal('rcpa-view-remarks', row.remarks);
        renderRemarksAttachments(row.remarks_attachment);

        setVal('rcpa-view-system', row.system_applicable_std_violated);
        setVal('rcpa-view-clauses', row.standard_clause_number);
        setVal('rcpa-view-supervisor', row.originator_supervisor_head);

        setVal('rcpa-view-assignee', row.assignee);
        setVal('rcpa-view-status', row.status);
        setVal('rcpa-view-conformance', row.conformance);

        const rcpaNo = row.id;

        // Reset validation block UI & attachments
        ['rcpa-view-root-cause', 'rcpa-view-correction', 'rcpa-view-corrective', 'rcpa-view-preventive']
            .forEach(id => setVal(id, ''));
        ['rcpa-view-correction-target', 'rcpa-view-correction-done',
            'rcpa-view-corrective-target', 'rcpa-view-corrective-done',
            'rcpa-view-preventive-target', 'rcpa-view-preventive-done'].forEach(id => setDateVal(id, ''));
        const vAtt = document.getElementById('rcpa-view-valid-attach-list');
        if (vAtt) vAtt.innerHTML = '';

        toggleValidPanels({ showNC: false, showPNC: false });
        setChecked('rcpa-view-findings-valid', false);
        setVal('rcpa-view-assignee-sign', '');
        setVal('rcpa-view-assignee-sup-sign', '');
        setSectionVisible(validFs, false); // hide unless we actually find data

        let hasValid = false;
        let validAttachmentSrc = '';

        if (isNC) {
            toggleValidPanels({ showNC: true, showPNC: false });
            try {
                const nc = await fetchJSON(`../php-backend/rcpa-view-valid-nc.php?rcpa_no=${encodeURIComponent(rcpaNo)}`);
                if (nc) {
                    setVal('rcpa-view-root-cause', nc.root_cause ?? '');
                    setVal('rcpa-view-correction', nc.correction ?? '');
                    setDateVal('rcpa-view-correction-target', nc.correction_target_date);
                    setDateVal('rcpa-view-correction-done', nc.correction_date_completed);
                    setVal('rcpa-view-corrective', nc.corrective ?? '');
                    setDateVal('rcpa-view-corrective-target', nc.corrective_target_date);
                    setDateVal('rcpa-view-corrective-done', nc.correction_date_completed);

                    const assigneeLine = [nc.assignee_name, fmtDateOnly(nc.assignee_date)].filter(Boolean).join(' ');
                    const supLine = [nc.assignee_supervisor_name, fmtDateOnly(nc.assignee_supervisor_date)].filter(Boolean).join(' ');
                    setVal('rcpa-view-assignee-sign', assigneeLine);
                    setVal('rcpa-view-assignee-sup-sign', supLine);

                    renderAttachmentsTo('rcpa-view-valid-attach-list', nc.attachment);
                    validAttachmentSrc = nc.attachment || '';
                    hasValid = !!(
                        (nc.root_cause && String(nc.root_cause).trim() !== '') ||
                        (nc.correction && String(nc.correction).trim() !== '') ||
                        (nc.corrective && String(nc.corrective).trim() !== '') ||
                        (nc.preventive_action && String(nc.preventive_action).trim() !== '') ||
                        (nc.correction_target_date || nc.correction_date_completed || nc.corrective_target_date) ||
                        (assigneeLine || supLine) ||
                        (validAttachmentSrc && String(validAttachmentSrc).trim() !== '')
                    );
                }
            } catch (err) {
                console.warn('valid-nc fetch failed:', err);
            }
        } else if (isPNC) {
            toggleValidPanels({ showNC: false, showPNC: true });
            try {
                const pnc = await fetchJSON(`../php-backend/rcpa-view-valid-pnc.php?rcpa_no=${encodeURIComponent(rcpaNo)}`);
                if (pnc) {
                    setVal('rcpa-view-root-cause', pnc.root_cause ?? '');
                    setVal('rcpa-view-preventive', pnc.preventive_action ?? '');
                    setDateVal('rcpa-view-preventive-target', pnc.preventive_target_date);
                    setDateVal('rcpa-view-preventive-done', pnc.preventive_date_completed);

                    const assigneeLine = [pnc.assignee_name, fmtDateOnly(pnc.assignee_date)].filter(Boolean).join(' ');
                    const supLine = [pnc.assignee_supervisor_name, fmtDateOnly(pnc.assignee_supervisor_date)].filter(Boolean).join(' ');
                    setVal('rcpa-view-assignee-sign', assigneeLine);
                    setVal('rcpa-view-assignee-sup-sign', supLine);

                    renderAttachmentsTo('rcpa-view-valid-attach-list', pnc.attachment);
                    validAttachmentSrc = pnc.attachment || '';
                    hasValid = !!(
                        (pnc.root_cause && String(pnc.root_cause).trim() !== '') ||
                        (pnc.preventive_action && String(pnc.preventive_action).trim() !== '') ||
                        (pnc.preventive_target_date || pnc.preventive_date_completed) ||
                        (assigneeLine || supLine) ||
                        (validAttachmentSrc && String(validAttachmentSrc).trim() !== '')
                    );
                }
            } catch (err) {
                console.warn('valid-pnc fetch failed:', err);
            }
        }

        setChecked('rcpa-view-findings-valid', hasValid);
        setSectionVisible(validFs, !!hasValid);

        // Load "Findings not valid" info (rcpa_not_valid). Shows section only when data exists.
        try {
            const inv = await fetchJSON(`../php-backend/rcpa-view-not-valid.php?rcpa_no=${encodeURIComponent(rcpaNo)}`);
            fillNotValidSection(inv || null);
        } catch (err) {
            console.warn('not-valid fetch failed:', err);
            fillNotValidSection(null);
        }

        // ===== EVIDENCE CHECKING (rcpa_evidence_checking_remarks) =====
        (() => {
            const fs = evidenceFs;
            if (!fs) return;

            const actionRaw = String(row.evidence_checking_action_done || '').trim().toLowerCase();
            const remarks = row.evidence_checking_remarks || '';
            const attach = row.evidence_checking_attachment || '';

            // Set Yes/No exclusively in view mode
            const isYes = ['yes', 'y', '1', 'true'].includes(actionRaw);
            const isNo = ['no', 'n', '0', 'false'].includes(actionRaw);
            setCheckedByAny(['#rcpa-view-ev-action-yes'], isYes);
            setCheckedByAny(['#rcpa-view-ev-action-no'], isNo);

            // Remarks & attachments
            setVal('rcpa-view-ev-remarks', remarks);
            renderAttachmentsTo('rcpa-view-ev-attach-list', attach);

            // Show only if any data exists
            const hasData =
                !!actionRaw ||
                (remarks && String(remarks).trim() !== '') ||
                (attach && String(attach).trim() !== '');
            setSectionVisible(fs, hasData);
        })();

        // ===== FOLLOW-UP FOR EFFECTIVENESS (rcpa_follow_up_remarks) =====
        (() => {
            const fs = followFs;
            if (!fs) return;

            const tgt = row.follow_up_target_date || '';
            const notes = row.follow_up_remarks || '';
            const files = row.follow_up_attachment || '';
            const rec = row.follow_up || null; // {id, rcpa_no, target_date, remarks, attachment}

            currentFollowUpRec = rec;

            // values
            setDateVal('rcpa-view-followup-date', tgt);
            setVal('rcpa-view-followup-remarks', notes);
            renderAttachmentsTo('rcpa-view-followup-attach-list', files);

            // show only if any content exists
            const hasData = (tgt && String(tgt).trim() !== '') ||
                (notes && String(notes).trim() !== '') ||
                (files && String(files).trim() !== '');
            setSectionVisible(fs, hasData);

            // Button label: Add vs Update
            const followBtn = document.getElementById('rcpa-followup-open');
            if (followBtn) {
                followBtn.textContent = rec ? 'Update follow up for effectiveness'
                    : 'Add follow up for effectiveness';
            }
        })();


        // Corrective Evidence — only show if there’s content
        const hasCorrRemarks = !!(row.corrective_action_remarks && String(row.corrective_action_remarks).trim() !== '');
        const hasCorrAttach = !!(row.corrective_action_attachment && String(row.corrective_action_attachment).trim() !== '');
        setVal('rcpa-view-corrective-remarks', hasCorrRemarks ? row.corrective_action_remarks : '');
        if (hasCorrAttach) {
            renderAttachmentsTo('rcpa-view-corrective-attach-list', row.corrective_action_attachment);
        } else {
            const caAtt = document.getElementById('rcpa-view-corrective-attach-list');
            if (caAtt) caAtt.innerHTML = '';
        }
        setSectionVisible(corrFs, hasCorrRemarks || hasCorrAttach);
        
        if (actionsWrap) actionsWrap.hidden = !row.can_followup;


        // Ensure Why-Why button exists & is bound
        bindWhyWhyButton();
    }

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

    // VIEW action only
    document.addEventListener('rcpa:action', async (e) => {
        const { action, id } = e.detail || {};
        if (action !== 'view' || !id) return;

        clearViewForm();
        try {
            const res = await fetch(`../php-backend/rcpa-view-closed.php?id=${encodeURIComponent(id)}`, { credentials: 'same-origin' });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const row = await res.json();
            if (!row || !row.id) { alert('Record not found.'); return; }
            await fillViewModal(row);
            lockViewCheckboxes();

            const rejects = Array.isArray(row.rejects) ? row.rejects : [];
            renderRejectsTable(rejects);

            showModal();
        } catch (err) {
            console.error(err);
            alert('Failed to load record. Please try again.');
        }
    });

    // Make sure Why-Why button is present even if the view is already rendered
    bindWhyWhyButton();


    /* ===== FOLLOW-UP FOR EFFECTIVENESS: modal + submit ===== */
    (function () {
        const openBtn = document.getElementById('rcpa-followup-open');
        const fuModal = document.getElementById('rcpa-followup-modal');
        const fuClose = document.getElementById('rcpa-followup-close');
        const fuCancel = document.getElementById('rcpa-followup-cancel');
        const fuForm = document.getElementById('rcpa-followup-form');
        const fuText = document.getElementById('rcpa-followup-remarks');
        const fuDate = document.getElementById('rcpa-followup-date');
        const fuClip = document.getElementById('rcpa-followup-clip');
        const fuInput = document.getElementById('rcpa-followup-files');
        const fuBadge = document.getElementById('rcpa-followup-attach-count');
        const fuList = document.getElementById('rcpa-followup-files-list');
        const fuSubmit = document.getElementById('rcpa-followup-submit');

        if (!openBtn || !fuModal) return;

        function humanSize(n) {
            if (!n && n !== 0) return '';
            let b = Number(n);
            if (b < 1024) return b + ' B';
            const u = ['KB', 'MB', 'GB', 'TB']; let i = -1;
            do { b /= 1024; i++; } while (b >= 1024 && i < u.length - 1);
            return (b >= 10 ? b.toFixed(0) : b.toFixed(1)) + ' ' + u[i];
        }

        function renderFuList(files) {
            if (!fuList) return;
            fuList.innerHTML = '';
            [...files].forEach((f, idx) => {
                const row = document.createElement('div');
                row.className = 'reject-file-chip file-chip';
                row.innerHTML = `
        <i class="fa-solid fa-paperclip" aria-hidden="true"></i>
        <div class="file-info">
          <div class="name" title="${f.name}">${f.name}</div>
          <div class="sub">${humanSize(f.size)}</div>
        </div>
        <button type="button" class="file-remove" data-i="${idx}" title="Remove">✕</button>
      `;
                fuList.appendChild(row);
            });
            if (fuBadge) {
                fuBadge.textContent = String(files.length);
                fuBadge.hidden = files.length === 0;
            }
        }

        function clearFuForm() {
            if (fuText) fuText.value = '';
            if (fuDate) fuDate.value = '';
            if (fuInput) fuInput.value = '';
            if (fuList) fuList.innerHTML = '';
            if (fuBadge) { fuBadge.textContent = '0'; fuBadge.hidden = true; }
        }

        function openFu() {
            if (!currentViewId) { alert('Open a record first.'); return; }

            // Prefill or clear
            if (currentFollowUpRec) {
                if (fuText) fuText.value = currentFollowUpRec.remarks || '';
                if (fuDate) fuDate.value = (currentFollowUpRec.target_date || '').slice(0, 10);
                // existing attachments (read-only list)
                renderAttachmentsTo('rcpa-followup-existing-list', currentFollowUpRec.attachment || '');
                const exWrap = document.getElementById('rcpa-followup-existing');
                if (exWrap) exWrap.hidden = !(currentFollowUpRec.attachment && String(currentFollowUpRec.attachment).trim() !== '');
            } else {
                clearFuForm();
                const exWrap = document.getElementById('rcpa-followup-existing');
                if (exWrap) exWrap.hidden = true;
            }

            fuModal.removeAttribute('hidden');
            requestAnimationFrame(() => fuModal.classList.add('show'));
            setTimeout(() => fuText?.focus(), 80);
            document.body.style.overflow = 'hidden';
        }

        function closeFu() {
            fuModal.classList.remove('show');
            const onEnd = (e) => {
                if (e.target !== fuModal || e.propertyName !== 'opacity') return;
                fuModal.removeEventListener('transitionend', onEnd);
                fuModal.setAttribute('hidden', '');
                document.body.style.overflow = '';
                clearFuForm();
            };
            fuModal.addEventListener('transitionend', onEnd);
        }

        openBtn.addEventListener('click', openFu);
        fuClose?.addEventListener('click', closeFu);
        fuCancel?.addEventListener('click', closeFu);
        fuModal?.addEventListener('click', (e) => { if (e.target === fuModal) closeFu(); });
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && fuModal && !fuModal.hidden) closeFu(); });

        fuClip?.addEventListener('click', () => fuInput?.click());
        fuInput?.addEventListener('change', () => renderFuList(fuInput.files || []));

        fuList?.addEventListener('click', (e) => {
            const btn = e.target.closest('.file-remove');
            if (!btn || !fuInput) return;
            const i = Number(btn.getAttribute('data-i'));
            const dt = new DataTransfer();
            [...fuInput.files].forEach((f, idx) => { if (idx !== i) dt.items.add(f); });
            fuInput.files = dt.files;
            renderFuList(fuInput.files || []);
        });

        fuForm?.addEventListener('submit', async (ev) => {
            ev.preventDefault();
            const remarks = (fuText?.value || '').trim();
            const date = (fuDate?.value || '').trim();

            if (!currentViewId) { alert('Missing record id.'); return; }
            if (!remarks) { alert('Remarks required.'); return; }
            if (!date) { alert('Target Date required.'); return; }

            try {
                fuSubmit.disabled = true;
                fuSubmit.textContent = 'Submitting…';

                const fd = new FormData();
                fd.append('rcpa_no', String(currentViewId));
                fd.append('remarks', remarks);
                fd.append('target_date', date);

                // If updating, include the existing row id
                if (currentFollowUpRec?.id) {
                    fd.append('id', String(currentFollowUpRec.id));
                }

                if (fuInput && fuInput.files) {
                    [...fuInput.files].forEach(f => fd.append('attachments[]', f, f.name));
                }

                // single endpoint handles both create & update
                const res = await fetch('../php-backend/rcpa-follow-up-create.php', {
                    method: 'POST',
                    credentials: 'same-origin',
                    body: fd
                });
                const data = await res.json().catch(() => ({}));
                if (!res.ok || !data.ok) throw new Error(data?.error || `HTTP ${res.status}`);

                if (window.Swal) Swal.fire({ icon: 'success', title: 'Saved', text: 'Follow-up saved.' });
                else alert('Follow-up saved.');

                // Refresh the view panel to reflect changes (including button label)
                try {
                    const r = await fetch(`../php-backend/rcpa-view-closed.php?id=${encodeURIComponent(currentViewId)}`, { credentials: 'same-origin' });
                    const refreshed = await r.json();
                    await fillViewModal(refreshed);
                    lockViewCheckboxes();
                } catch { }

                closeFu();
            } catch (err) {
                if (window.Swal) Swal.fire({ icon: 'error', title: 'Save failed', text: err?.message || 'Unexpected error.' });
                else alert(err?.message || 'Save failed.');
            } finally {
                fuSubmit.disabled = false;
                fuSubmit.textContent = 'Submit';
            }
        });

    })();

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