(function () {
  const CAN_ACTIONS = !!window.RCPA_CAN_ACTIONS;
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

  let page = 1;
  const pageSize = 10;
  let currentTarget = null; // the currently-open hamburger button

  // ⚡ SSE tracking
  let lastSeenId = 0;
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
    if (t === 'CLOSED (VALID)') return `<span class="rcpa-badge badge-closed">CLOSED (VALID)</span>`;
    if (t === 'CLOSED (INVALID)') return `<span class="rcpa-badge badge-rejected">CLOSED (INVALID)</span>`;
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
    if (CAN_ACTIONS) {
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

  async function load() {
    const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
    if (fType.value) params.set('type', fType.value);

    hideActions();
    tbody.innerHTML = `<tr><td colspan="9" class="rcpa-empty">Loading…</td></tr>`;

    let res;
    try {
      res = await fetch('../php-backend/rcpa-list-qms-checking.php?' + params.toString(), { credentials: 'same-origin' });
    } catch {
      tbody.innerHTML = `<tr><td colspan="9" class="rcpa-empty">Network error.</td></tr>`;
      return;
    }
    if (!res.ok) {
      tbody.innerHTML = `<tr><td colspan="9" class="rcpa-empty">Failed to load (${res.status}).</td></tr>`;
      return;
    }

    const data = await res.json();
    const rows = Array.isArray(data.rows) ? data.rows : [];

    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="9" class="rcpa-empty">No records.</td></tr>`;
    } else {
      tbody.innerHTML = rows.map(r => `
        <tr>
          <td>${r.id ?? ''}</td>
          <td>${labelForType(r.rcpa_type)}</td>
          <td>${badgeForCategory(r.category || r.cetegory)}</td>
          <td>${fmtDate(r.date_request)}</td>
          <td>${badgeForStatus(r.status)}</td>
          <td>${escapeHtml(r.originator_name)}</td>
           <td>${escapeHtml(
        (() => {
          const assignee = r?.section ? `${r.assignee} - ${r.section}` : r?.assignee;
          const assigneeName = r?.assignee_name ? ` (${r.assignee_name})` : ''; // Add assignee_name in parentheses
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

    // ⚡ update lastSeenId to the max id we just rendered
    const maxId = rows.reduce((m, r) => Math.max(m, Number(r.id || 0)), lastSeenId);
    if (maxId > lastSeenId) lastSeenId = maxId;
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
    if (currentTarget === moreBtn) {
      hideActions();
    } else {
      showActions(moreBtn, id);
    }
  });

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

  // Pagination + single remaining filter
  prevBtn.addEventListener('click', () => { if (page > 1) { page--; load(); } });
  nextBtn.addEventListener('click', () => { page++; load(); });

  // ⚡ Rebuild SSE when the Type filter changes
  fType.addEventListener('change', () => {
    page = 1;
    load();
    startSse(true); // restart stream with new filter
  });

  // ⚡ SSE: auto-reload when new QMS Checking items appear for this viewer
  function startSse(restart = false) {
    if (restart && es) { try { es.close(); } catch { } }
    const qs = new URLSearchParams({ since: String(lastSeenId) });
    if (fType.value) qs.set('type', fType.value);
    es = new EventSource(`../php-backend/rcpa-qms-checking-sse.php?${qs.toString()}`);
    es.addEventListener('rcpa', (e) => {
      try {
        const data = JSON.parse(e.data || '{}');
        if (data && data.max_id) {
          lastSeenId = Math.max(lastSeenId, Number(data.max_id));
          load(); // quiet refresh; no blinking/animation
        } else {
          load();
        }
      } catch {
        load();
      }
    });
    es.onerror = () => { /* EventSource auto-reconnects */ };
  }

  load();
  startSse();
})();

// view modal
(function () {
  // View modal
  const modal = document.getElementById('rcpa-view-modal');
  const closeX = document.getElementById('rcpa-view-close');
  const editBtn = document.getElementById('rcpa-view-edit-btn');

  // Reject-remarks viewer modal
  const rjModal = document.getElementById('reject-remarks-modal');
  const rjText = document.getElementById('reject-remarks-text');
  const rjImg = document.getElementById('reject-remarks-image');
  const rjClose = document.getElementById('reject-remarks-close');

  // QMS Reject modal (input + files)
  const qmsRejModal = document.getElementById('rcpa-reject-modal');
  const qmsRejClose = document.getElementById('rcpa-reject-close');
  const qmsRejCancel = document.getElementById('rcpa-reject-cancel');
  const qmsRejForm = document.getElementById('rcpa-reject-form');
  const qmsRejTA = document.getElementById('rcpa-reject-remarks');
  const qmsRejSubmit = document.getElementById('rcpa-reject-submit');
  const qmsRejClipBtn = document.getElementById('rcpa-reject-clip');
  const qmsRejFileInp = document.getElementById('rcpa-reject-files');
  const qmsRejList = document.getElementById('rcpa-reject-files-list');
  const qmsRejBadge = document.getElementById('rcpa-reject-attach-count');

  // State
  let currentViewId = null;
  let editing = false;
  const EDITABLE_IDS = ['rcpa-view-remarks', 'rcpa-view-system', 'rcpa-view-clauses'];

  // Helpers
  const setVal = (id, v) => { const el = document.getElementById(id); if (el) el.value = v ?? ''; };
  const setChecked = (id, on) => { const el = document.getElementById(id); if (el) el.checked = !!on; };
  const showCond = (id, show) => { const el = document.getElementById(id); if (el) el.hidden = !show; };
  const fmt = (s) => { if (!s) return ''; const d = new Date(String(s).replace(' ', 'T')); return isNaN(d) ? s : d.toLocaleString(); };
  const yearFrom = (s) => { if (!s) return ''; const d = new Date(String(s).replace(' ', 'T')); if (!isNaN(d)) return String(d.getFullYear()); const m = String(s).match(/\b(20\d{2}|\d{4})\b/); return m ? m[1] : ''; };

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
      if (e.target.matches?.('input[type="checkbox"].readonly-check') && (e.key === ' ' || e.key === 'Spacebar' || e.key === 'Enter')) e.preventDefault();
    });
    modal.addEventListener('change', (e) => {
      if (e.target.matches?.('input[type="checkbox"].readonly-check')) {
        e.preventDefault();
        e.target.checked = e.target.dataset.lockChecked === '1';
      }
    });
  }
  installReadonlyGuards();

  function setEditMode(on) {
    editing = on;
    EDITABLE_IDS.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      if (on) el.removeAttribute('readonly'); else el.setAttribute('readonly', '');
      el.classList.toggle('is-editing', on);
    });
    if (editBtn) editBtn.textContent = on ? 'Save' : 'Edit';
  }

  function clearViewForm() {
    ['v-type-external', 'v-type-internal', 'v-type-unattain', 'v-type-online', 'v-type-hs', 'v-type-mgmt'].forEach(id => showCond(id, false));
    ['rcpa-view-type', 'v-external-sem1-year', 'v-external-sem2-year', 'v-internal-sem1-year', 'v-internal-sem2-year', 'v-project-name', 'v-wbs-number', 'v-online-year', 'v-hs-month', 'v-hs-year', 'v-mgmt-year', 'rcpa-view-originator-name', 'rcpa-view-originator-dept', 'rcpa-view-date', 'rcpa-view-remarks', 'rcpa-view-system', 'rcpa-view-clauses', 'rcpa-view-supervisor', 'rcpa-view-assignee', 'rcpa-view-status', 'rcpa-view-conformance'].forEach(id => setVal(id, ''));
    ['rcpa-view-cat-major', 'rcpa-view-cat-minor', 'rcpa-view-cat-obs', 'rcpa-view-flag-nc', 'rcpa-view-flag-pnc', 'rcpa-view-mgmt-q1', 'rcpa-view-mgmt-q2', 'rcpa-view-mgmt-q3', 'rcpa-view-mgmt-ytd'].forEach(id => setChecked(id, false));
    const att = document.getElementById('rcpa-view-attach-list'); if (att) att.innerHTML = '';
    // clear disapprovals table
    const tb = document.querySelector('#rcpa-rejects-table tbody');
    if (tb) tb.innerHTML = `<tr><td class="rcpa-empty" colspan="3">No records found</td></tr>`;
    const rejectsFs = document.querySelector('fieldset.rejects');
    if (rejectsFs) rejectsFs.hidden = true;   // ← hide by default
    currentViewId = null;
    setEditMode(false);
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
    const y = str.match(/\b(20\d{2})\b/); if (y) out.year = y[1];
    return out;
  }

  function renderAttachments(s, target) {
    if (!target) return;  // Check if target exists
    target.innerHTML = '';  // Clear previous content
    if (s == null || s === '') {
      target.innerHTML = '<div class="no-attachments">No attachments</div>'; // Show message for no attachments
      return;
    }

    // Helper functions for escaping HTML and formatting file sizes
    const escapeHtml = (t) => ('' + t).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[c]);

    const humanSize = (n) => {
      if (n == null || n === '' || isNaN(n)) return '';
      let b = Number(n);
      if (b < 1024) return b + ' B';
      const u = ['KB', 'MB', 'GB', 'TB', 'PB'];
      let i = -1;
      do { b /= 1024; i++; } while (b >= 1024 && i < u.length - 1);
      return b.toFixed(b >= 10 ? 0 : 1) + ' ' + u[i];
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

    // Loop through the items and render each attachment
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
      target.appendChild(row);
    });
  }

  // ===== Disapproval remarks table + viewer =====
  function renderRejectsTable(items) {
    const tb = document.querySelector('#rcpa-rejects-table tbody');
    const fs = document.querySelector('fieldset.rejects');
    if (!tb) return;
    const list = Array.isArray(items) ? items : [];

    if (!list.length) {
      tb.innerHTML = `<tr><td class="rcpa-empty" colspan="3">No records found</td></tr>`;
      if (fs) { fs.hidden = true; fs.setAttribute('aria-hidden', 'true'); }  // ← hide when empty
      return;
    }

    // show when there is data
    if (fs) { fs.hidden = false; fs.removeAttribute('aria-hidden'); }

    // cache on modal for "View" buttons
    modal.__rejects = list;

    tb.innerHTML = list.map((row, i) => {
      const typ = (row.disapprove_type || '') + '';
      const when = (() => {
        const d = new Date(String(row.created_at).replace(' ', 'T'));
        return isNaN(d) ? (row.created_at || '') : d.toLocaleString();
      })();
      return `
      <tr>
        <td>${escapeHTML(typ)}</td>
        <td>${escapeHTML(when)}</td>
        <td><button type="button" class="rcpa-btn rcpa-reject-view" data-idx="${i}">View</button></td>
      </tr>`;
    }).join('');
  }

  function escapeHTML(s) { return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
  function firstImageUrlFrom(attachments) {
    try {
      const arr = typeof attachments === 'string' ? JSON.parse(attachments || '[]')
        : Array.isArray(attachments) ? attachments
          : (attachments && Array.isArray(attachments.files) ? attachments.files : []);
      const img = arr.find(a => {
        const mime = String(a?.mime || '').toLowerCase();
        const url = String(a?.url || '');
        return mime.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(url);
      });
      return img ? img.url : null;
    } catch { return null; }
  }
  // Replace the firstImageUrlFrom function and modify openRejectRemarks
  function openRejectRemarks(text, attachments) {
    if (rjText) { rjText.value = text || ''; }
    const attachList = document.getElementById('reject-remarks-attach-list');
    if (attachList) {
      renderAttachments(attachments, attachList); // Reuse existing renderAttachments function
    }
    rjModal.classList.add('show');
    rjModal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    setTimeout(() => rjClose?.focus(), 0);
  }
  function closeRejectRemarks() {
    rjModal.classList.remove('show');
    rjModal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
    if (rjText) rjText.value = '';
    if (rjImg) { rjImg.removeAttribute('src'); rjImg.style.display = 'none'; }
  }
  rjClose?.addEventListener('click', closeRejectRemarks);
  rjModal?.addEventListener('click', e => { if (e.target === rjModal) closeRejectRemarks(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeRejectRemarks(); });

  // click "View" in disapprovals table
  (function hookRejectsActions() {
    const table = document.getElementById('rcpa-rejects-table');
    if (!table) return;
    table.addEventListener('click', (e) => {
      const btn = e.target.closest('.rcpa-reject-view'); if (!btn) return;
      const idx = parseInt(btn.getAttribute('data-idx'), 10);
      const cache = modal.__rejects || [];
      const item = cache[idx]; if (!item) return;
      const text = item.remarks || '';
      const attachments = item.attachments || [];
      openRejectRemarks(text, attachments); // Pass attachments directly
    });
  })();

  // ===== Fill modal from row =====
  function fillViewModal(row) {
    currentViewId = row.id || null;

    // Set RCPA Type
    const typeKey = String(row.rcpa_type || '').toLowerCase().trim();
    const typeLabelMap = {
      external: 'External QMS Audit',
      internal: 'Internal Quality Audit',
      unattain: 'Un-attainment of delivery target of Project',
      online: 'On-Line',
      '5s': '5s Audit / Health & Safety Concerns',
      mgmt: 'Management Objective'
    };
    setVal('rcpa-view-type', typeLabelMap[typeKey] || (row.rcpa_type || ''));

    // Show/hide based on RCPA type
    showCond('v-type-external', typeKey === 'external');
    showCond('v-type-internal', typeKey === 'internal');
    showCond('v-type-unattain', typeKey === 'unattain');
    showCond('v-type-online', typeKey === 'online');
    showCond('v-type-hs', typeKey === '5s');
    showCond('v-type-mgmt', typeKey === 'mgmt');

    // Handle Semester/Year values
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
      } else setVal('v-hs-month', sy.month || '');
    } else if (typeKey === 'mgmt') {
      setVal('v-mgmt-year', sy.year || row.sem_year || '');
      const q = String(row.quarter || '').toUpperCase();
      setChecked('rcpa-view-mgmt-q1', q.includes('Q1'));
      setChecked('rcpa-view-mgmt-q2', q.includes('Q2'));
      setChecked('rcpa-view-mgmt-q3', q.includes('Q3'));
      setChecked('rcpa-view-mgmt-ytd', q.includes('YTD'));
    }

    // CATEGORY
    const cat = String(row.category || '').toLowerCase();
    setChecked('rcpa-view-cat-major', cat === 'major');
    setChecked('rcpa-view-cat-minor', cat === 'minor');
    setChecked('rcpa-view-cat-obs', cat === 'observation');

    // ORIGINATOR
    setVal('rcpa-view-originator-name', row.originator_name);
    setVal('rcpa-view-originator-dept', row.originator_department);
    setVal('rcpa-view-date', fmt(row.date_request));

    // Conformance flags (Non-Conformance and Potential Non-Conformance)
    const confNorm = String(row.conformance || '').toLowerCase().replace(/[\s_-]+/g, ' ').trim();
    let isPNC = (confNorm === 'pnc') || confNorm.includes('potential');
    let isNC = false;
    if (!isPNC) isNC = confNorm === 'nc' || /\bnon[- ]?conformance\b/.test(confNorm) || confNorm === 'non conformance' || confNorm === 'nonconformance';
    if (cat === 'observation') { isPNC = true; isNC = false; } else if (cat === 'major' || cat === 'minor') { isPNC = false; isNC = true; }
    setChecked('rcpa-view-flag-pnc', isPNC);
    setChecked('rcpa-view-flag-nc', isNC);

    // Remarks & Attachments
    setVal('rcpa-view-remarks', row.remarks);
    renderAttachments(row.remarks_attachment);

    // Standards & Supervision
    setVal('rcpa-view-system', row.system_applicable_std_violated);
    setVal('rcpa-view-clauses', row.standard_clause_number);
    setVal('rcpa-view-supervisor', row.originator_supervisor_head);

    // ASSIGNEE / STATUS
    const assigneeRaw = (row.assignee ?? '').trim();
    const sectionRaw = (row.section ?? '').trim();
    const assigneeDisplay = sectionRaw
      ? (assigneeRaw ? `${assigneeRaw} - ${sectionRaw}` : sectionRaw)
      : assigneeRaw;

    setVal('rcpa-view-assignee', assigneeDisplay);
    setVal('rcpa-view-status', row.status);
    setVal('rcpa-view-conformance', row.conformance);

    // Handle Findings INVALIDation Reply section
    const invalidData = row.findings_invalidation || {};
    const fieldset = document.querySelector('.validation-invalid');
    const notValidCheckbox = document.getElementById('rcpa-view-findings-not-valid');
    const reasonTextarea = document.getElementById('rcpa-view-not-valid-reason');
    const attachList = document.getElementById('rcpa-view-not-valid-attach-list');

    if (invalidData && Object.keys(invalidData).length > 0) {
      // Show the Findings INVALIDation Reply section
      fieldset.hidden = false;

      // Set the checkbox to checked if findings are not valid
      notValidCheckbox.checked = true;

      // Set the reason if available
      if (invalidData.reason_non_valid) {
        setVal('rcpa-view-not-valid-reason', invalidData.reason_non_valid);
      }

      // Render attachments if available
      if (invalidData.attachment) {
        renderAttachments(invalidData.attachment, attachList);
      }

      // Populate signature fields
      if (invalidData.assignee_name) {
        setVal('rcpa-view-invalid-assignee-sign', `${invalidData.assignee_name} / ${invalidData.assignee_date}`);
      }

      if (invalidData.assignee_supervisor_name) {
        setVal('rcpa-view-invalid-assignee-sup-sign', `${invalidData.assignee_supervisor_name} / ${invalidData.assignee_supervisor_date}`);
      }
    } else {
      // Hide the Findings INVALIDation Reply section if no data is present
      fieldset.hidden = true;
    }

    // Exit edit mode
    setEditMode(false);
  }


  function showModal() { modal.removeAttribute('hidden'); requestAnimationFrame(() => modal.classList.add('show')); document.body.style.overflow = 'hidden'; }
  function hideModal() {
    modal.classList.remove('show');
    const onEnd = (e) => { if (e.target !== modal || e.propertyName !== 'opacity') return; modal.removeEventListener('transitionend', onEnd); modal.setAttribute('hidden', ''); document.body.style.overflow = ''; };
    modal.addEventListener('transitionend', onEnd);
  }
  [closeX].forEach(el => el && el.addEventListener('click', hideModal));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !modal.hidden) hideModal(); });

  // === Load + open View
  document.addEventListener('rcpa:action', async (e) => {
    const { action, id } = e.detail || {};
    if (action !== 'view' || !id) return;
    clearViewForm();
    try {
      const res = await fetch(`../php-backend/rcpa-view-qms-checking.php?id=${encodeURIComponent(id)}`, { credentials: 'same-origin' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!data || !data.ok || !data.row) { alert('Record not found.'); return; }
      fillViewModal(data.row);
      renderRejectsTable(data.rejects || []);
      lockViewCheckboxes();
      showModal();
      requestAnimationFrame(() => document.getElementById('rcpa-view-modal')?.__renderStatusFlow?.(data.row.id || id));

    } catch (err) {
      console.error(err);
      alert('Failed to load record. Please try again.');
    }
  });

  // === Edit/Save (unchanged)
  if (editBtn) {
    editBtn.addEventListener('click', async () => {
      if (!editing) { setEditMode(true); document.getElementById(EDITABLE_IDS[0])?.focus(); return; }
      if (!currentViewId) { window.Swal ? Swal.fire({ icon: 'error', title: 'Missing record ID.' }) : alert('Missing record ID.'); return; }

      const remarks = (document.getElementById('rcpa-view-remarks')?.value ?? '').trim();
      const system = (document.getElementById('rcpa-view-system')?.value ?? '').trim();
      const clauses = (document.getElementById('rcpa-view-clauses')?.value ?? '').trim();
      const safeRemarks = remarks.length > 255 ? remarks.slice(0, 255) : remarks;

      const fd = new FormData();
      fd.append('id', String(currentViewId));
      fd.append('remarks', safeRemarks);
      fd.append('system_applicable_std_violated', system);
      fd.append('standard_clause_number', clauses);

      editBtn.disabled = true; editBtn.textContent = 'Saving…';
      try {
        const res = await fetch('../php-backend/rcpa-update-qms-checking.php', { method: 'POST', body: fd, credentials: 'same-origin' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!data || !data.success) throw new Error(data?.error || 'Save failed');
        window.Swal ? Swal.fire({ icon: 'success', title: 'Saved', timer: 1200, showConfirmButton: false }) : alert('Saved!');
        setEditMode(false);
      } catch (err) {
        console.error(err);
        window.Swal ? Swal.fire({ icon: 'error', title: 'Save failed', text: String(err.message || err) }) : alert('Save failed: ' + (err.message || err));
        editBtn.textContent = 'Save';
      } finally { editBtn.disabled = false; }
    });
  }

  // ===== QMS Reject modal: picker UI =====
  let selectedFiles = []; // array of File

  function refreshRejectFilesUI() {
    qmsRejList.innerHTML = '';
    selectedFiles.forEach((f, idx) => {
      const row = document.createElement('div');
      row.className = 'reject-file-chip file-chip';
      row.innerHTML = `
        <i class="fa-solid fa-paperclip" aria-hidden="true"></i>
        <div class="file-info">
          <div class="name" title="${escapeHTML(f.name)}">${escapeHTML(f.name)}</div>
          <div class="sub">${f.type || ''} ${f.size ? `• ${f.size} bytes` : ''}</div>
        </div>
        <button type="button" class="file-remove" aria-label="Remove">&times;</button>
      `;
      row.querySelector('.file-remove').addEventListener('click', () => {
        selectedFiles.splice(idx, 1);
        refreshRejectFilesUI();
      });
      qmsRejList.appendChild(row);
    });
    if (qmsRejBadge) {
      if (selectedFiles.length) { qmsRejBadge.textContent = String(selectedFiles.length); qmsRejBadge.hidden = false; }
      else qmsRejBadge.hidden = true;
    }
  }

  qmsRejClipBtn?.addEventListener('click', () => qmsRejFileInp?.click());
  qmsRejFileInp?.addEventListener('change', () => {
    const files = Array.from(qmsRejFileInp.files || []);
    // Allow all kinds of files (per your note), just append:
    selectedFiles = selectedFiles.concat(files);
    // Reset input so same files can be re-picked later
    qmsRejFileInp.value = '';
    refreshRejectFilesUI();
  });

  function showRejectModal(forId) {
    qmsRejForm?.reset();
    selectedFiles = [];
    refreshRejectFilesUI();
    qmsRejModal.removeAttribute('hidden');
    requestAnimationFrame(() => qmsRejModal.classList.add('show'));
    document.body.style.overflow = 'hidden';
    setTimeout(() => qmsRejTA?.focus(), 40);
  }
  function hideRejectModal() {
    qmsRejModal.classList.remove('show');
    const onEnd = (e) => {
      if (e.target !== qmsRejModal || e.propertyName !== 'opacity') return;
      qmsRejModal.removeEventListener('transitionend', onEnd);
      qmsRejModal.setAttribute('hidden', ''); document.body.style.overflow = '';
    };
    qmsRejModal.addEventListener('transitionend', onEnd);
  }
  qmsRejClose?.addEventListener('click', hideRejectModal);
  qmsRejCancel?.addEventListener('click', hideRejectModal);
  qmsRejModal?.addEventListener('click', (e) => { if (e.target === qmsRejModal) hideRejectModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !qmsRejModal.hidden) hideRejectModal(); });

  // ===== Intercept "reject" action → open modal → confirm → POST
  let rejectCurrentId = null;

  document.addEventListener('rcpa:action', (e) => {
    const { action, id } = (e.detail || {});
    if (action !== 'reject' || !id) return;
    rejectCurrentId = id;
    showRejectModal(id);
  });

  // Submit reject modal
  qmsRejForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const remarks = (qmsRejTA?.value || '').trim();
    if (!remarks) {
      if (window.Swal) await Swal.fire({ icon: 'info', title: 'Reason required', text: 'Please enter a reason before submitting.' });
      else alert('Please enter a reason before submitting.');
      return;
    }

    // Confirm
    if (window.Swal) {
      const res = await Swal.fire({
        title: 'Reject this RCPA?', text: 'Status will be set to "REJECTED".', icon: 'warning',
        showCancelButton: true, confirmButtonText: 'Reject', cancelButtonText: 'Cancel', focusCancel: true
      });
      if (!res.isConfirmed) return;
    } else {
      const ok = confirm('Reject this RCPA? Status will be set to "REJECTED".'); if (!ok) return;
    }

    qmsRejSubmit.disabled = true;

    try {
      const fd = new FormData();
      fd.append('id', String(rejectCurrentId));
      fd.append('remarks', remarks);
      // attach files
      selectedFiles.forEach(f => fd.append('attachments[]', f, f.name));

      const res = await fetch('../php-backend/rcpa-reject-qms-checking.php', {
        method: 'POST', body: fd, credentials: 'same-origin'
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!data || !data.success) throw new Error(data?.error || 'Failed to update');

      hideRejectModal();
      if (window.Swal) Swal.fire({ icon: 'success', title: 'RCPA rejected', text: 'Status has been set to "REJECTED".', timer: 1600, showConfirmButton: false });
      else alert('RCPA rejected. Status set to "REJECTED".');

      document.dispatchEvent(new CustomEvent('rcpa:refresh'));

    } catch (err) {
      console.error(err);
      if (window.Swal) Swal.fire({ icon: 'error', title: 'Failed to reject', text: String(err.message || err) });
      else alert('Failed to reject this RCPA. Please try again.');
    } finally {
      qmsRejSubmit.disabled = false;
    }
  });

  // === View action fetch (expects { ok:true, row:{...}, rejects:[...] })
  document.addEventListener('rcpa:action', async (e) => {
    const { action, id } = e.detail || {};
    if (action !== 'accept' || !id) return;

    Swal.fire({
      title: 'Approve this RCPA?',
      text: 'This will set the status to "ASSIGNEE PENDING".',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Approve',
      cancelButtonText: 'Cancel',
      focusCancel: true,
      showLoaderOnConfirm: true,
      preConfirm: async () => {
        try {
          const fd = new FormData();
          fd.append('id', id);
          const res = await fetch('../php-backend/rcpa-accept-qms-checking.php', {
            method: 'POST',
            body: fd,
            credentials: 'same-origin'
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data = await res.json();
          if (!data || !data.success) throw new Error(data?.error || 'Failed to update');
          return data;
        } catch (err) {
          Swal.showValidationMessage(err.message || 'Request failed');
          throw err;
        }
      },
      allowOutsideClick: () => !Swal.isLoading()
    }).then((result) => {
      if (!result.isConfirmed) return;
      Swal.fire({ icon: 'success', title: 'RCPA approved', text: 'Status has been set to "ASSIGNEE PENDING".', timer: 1600, showConfirmButton: false });
      document.dispatchEvent(new CustomEvent('rcpa:refresh'));


    });
  });

})();

(function initStatusFlowView() {
  const viewModal = document.getElementById('rcpa-view-modal');

  // One-time CSS
  if (!document.getElementById('rcpa-status-flow-css')) {
    const st = document.createElement('style');
    st.id = 'rcpa-status-flow-css';
    st.textContent = `
      /* labels: gray by default, green only when .done */
      #rcpa-status-flow .flow-label{color:#9ca3af; font-size:.78rem;}
      #rcpa-status-flow .flow-step.next .flow-label{color:#6b7280;}
      #rcpa-status-flow .flow-step.done .flow-label{color:#22c55e;}

      /* top text shades */
      #rcpa-status-flow .flow-top{font-size:.8rem; color:#6b7280;}
      #rcpa-status-flow .flow-top .flow-date{font-size:.75rem; color:#9ca3af;}

      /* progress layering */
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
    const s = String(name || '').trim();
    if (!s || s === '—') return s;
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
      li.className = 'flow-step';
      li.setAttribute('data-key', key);
      li.innerHTML = `
        <div class="flow-top">
          <span class="flow-name">—</span>
          <span class="flow-date">—</span>
        </div>
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
    VALID_APPROVAL: /the\s+assignee\s+supervisor\/manager\s+approved\s+the\s+assignee\s+reply\s+as\s+valid\.?/i,
    VALIDATION_REPLY: /the\s+valid\s+reply\s+by\s+assignee\s+was\s+approved\s+by\s+qms\.?/i,
    REPLY_CHECKING_ORIG: /the\s+originator\s+approved\s+the\s+valid\s+reply\.?/i,
    FOR_CLOSING: /the\s+assignee\s+request(?:ed)?\s+approval\s+for\s+corrective\s+action\s+evidence\.?/i,
    FOR_CLOSING_APPROVAL: /the\s+assignee\s+supervisor\/manager\s+approved\s+the\s+assignee\s+corrective\s+action\s+evidence\s+approval\.?/i,
    EVIDENCE_CHECKING: /the\s+qms\s+accepted\s+the\s+corrective\s+reply\s+for\s+evidence\s+checking\s*\(originator\)\.?/i,
    EVIDENCE_CHECKING_ORIG: /originator\s+approved\s+the\s+corrective\s+evidence\.?/i,
    FINAL_APPROVAL_VALID: /final\s+approval\s+given\.\s*request\s+closed\s*\(valid\)\.?/i,
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
      case 'APPROVAL': return [/approved/i, (s) => !/disapproved/i.test(s)];
      case 'QMS CHECKING': return [/(?:\bchecked\b|\bchecking\b)/i, /\bqms\b/i];
      case 'ASSIGNEE PENDING': return [validOrNot];
      case 'VALID APPROVAL': return [PH.VALID_APPROVAL];
      case 'VALIDATION REPLY': return [PH.VALIDATION_REPLY];
      case 'REPLY CHECKING - ORIGINATOR': return [PH.REPLY_CHECKING_ORIG];
      case 'FOR CLOSING': return [PH.FOR_CLOSING];
      case 'FOR CLOSING APPROVAL': return [PH.FOR_CLOSING_APPROVAL];
      case 'EVIDENCE CHECKING': return [PH.EVIDENCE_CHECKING];
      case 'EVIDENCE CHECKING - ORIGINATOR': return [PH.EVIDENCE_CHECKING_ORIG];
      case 'EVIDENCE APPROVAL': return [PH.FINAL_APPROVAL_VALID];
      case 'CLOSED (VALID)': return [PH.FINAL_APPROVAL_VALID];
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

    // fetch history
    let rows = [];
    try {
      const res = await fetch(`../php-backend/rcpa-history.php?id=${encodeURIComponent(rcpaNo)}`, {
        credentials: 'same-origin', headers: { 'Accept': 'application/json' }
      });
      const data = await res.json().catch(() => ({}));
      rows = Array.isArray(data?.rows) ? data.rows : [];
    } catch { rows = []; }

    // decide chain (freeze when ASSIGNEE PENDING)
    let STEPS = PRE_STEPS.slice();
    if (statusNow !== 'ASSIGNEE PENDING') {
      const inValid = VALID_CHAIN.includes(statusNow);
      const inInvalid = INVALID_CHAIN.includes(statusNow);
      const branch = inValid ? 'valid' : (inInvalid ? 'invalid' : pickBranch(rows));
      STEPS = PRE_STEPS.concat(branch === 'valid' ? VALID_CHAIN : branch === 'invalid' ? INVALID_CHAIN : []);
    }
    ensureSteps(fs, STEPS);

    // map step -> latest row
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

    // clamp future (and current) to defaults
    const cutoffIdx = STEPS.indexOf(statusNow);
    if (cutoffIdx >= 0) {
      STEPS.forEach((k, i) => { if (i > cutoffIdx) stepData[k] = { name: '—', date: '', ts: 0 }; });
    }

    // fill DOM
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
        nameEl.removeAttribute('title');
        nameEl.removeAttribute('aria-label');
      } else if (hasActualName) {
        const initials = nameToInitials(info.name);
        nameEl.textContent = initials;
        nameEl.setAttribute('title', info.name);
        nameEl.setAttribute('aria-label', info.name);
      } else {
        nameEl.textContent = defaultName;
        nameEl.removeAttribute('title');
        nameEl.removeAttribute('aria-label');
      }

      li.querySelector('.flow-date').textContent =
        (isFuture || isCurrent)
          ? (key === 'ASSIGNEE PENDING' ? 'TBD' : '—')
          : (info.date ? fmtDateOnly(info.date) : (key === 'ASSIGNEE PENDING' ? 'TBD' : '—'));
    });

    // done/next flags — current is NOT done (keeps it gray)
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

    // progress bar: stop before next node
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

// --- QMS tabs notification badges ---
// --- QMS tabs notification badges ---
(function () {
  const ENDPOINT = '../php-backend/rcpa-qms-tab-counters.php';

  // QA and QMS should be treated the same
  function isQmsOrQaFromWindow() {
    try {
      const d = String(window.RCPA_DEPARTMENT || '').trim().toUpperCase();
      return d === 'QMS' || d === 'QA';
    } catch { return false; }
  }

  // Ensure a badge <span> exists inside a tab button; returns the element
  function ensureBadge(btn, id) {
    if (!btn) return null;
    let b = btn.querySelector('.tab-badge');
    if (!b) {
      b = document.createElement('span');
      b.className = 'tab-badge';
      if (id) b.id = id;
      b.hidden = true;
      if (!btn.style.position) btn.style.position = 'relative';
      btn.appendChild(b);
    }
    return b;
  }

  function setBadge(el, count) {
    if (!el) return;
    const n = Number(count) || 0;
    if (n > 0) {
      el.textContent = n > 99 ? '99+' : String(n);
      el.hidden = false;
      el.title = `${n} item${n > 1 ? 's' : ''}`;
      el.setAttribute('aria-label', el.title);
    } else {
      el.hidden = true;
      el.removeAttribute('title');
      el.removeAttribute('aria-label');
      el.textContent = '0';
    }
  }

  // Cache tab DOM once
  let btnQmsChecking, btnValid, btnInvalid, btnEvidence;
  let bQmsChecking, bValid, bInvalid, bEvidence;

  function ensureAllBadges() {
    const tabsWrap = document.querySelector('.rcpa-tabs');
    if (!tabsWrap) return false;

    btnQmsChecking = tabsWrap.querySelector('.rcpa-tab:nth-child(1)');
    btnValid = tabsWrap.querySelector('.rcpa-tab[data-href="rcpa-task-validation-reply.php"]');
    btnInvalid = tabsWrap.querySelector('.rcpa-tab[data-href="rcpa-task-invalidation-reply.php"]');
    btnEvidence = tabsWrap.querySelector('.rcpa-tab[data-href="rcpa-task-qms-corrective.php"]');

    bQmsChecking = ensureBadge(btnQmsChecking, 'tabBadgeQmsChecking');
    bValid = ensureBadge(btnValid, 'tabBadgeValid');
    bInvalid = ensureBadge(btnInvalid, 'tabBadgeNotValid');
    bEvidence = ensureBadge(btnEvidence, 'tabBadgeEvidence');

    return true;
  }

  // Apply counts directly (for SSE path)
  function applyCounts(counts) {
    if (!counts) return;
    ensureAllBadges();
    setBadge(bQmsChecking, counts.qms_checking);
    setBadge(bValid, counts.valid);
    setBadge(bInvalid, counts.not_valid);
    setBadge(bEvidence, counts.evidence_checking);
  }

  async function refreshQmsTabBadges() {
    if (!ensureAllBadges()) return;

    try {
      const res = await fetch(ENDPOINT, {
        credentials: 'same-origin',
        headers: { 'Accept': 'application/json' }
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data || !data.ok) {
        [bQmsChecking, bValid, bInvalid, bEvidence].forEach(b => { if (b) b.hidden = true; });
        return;
      }

      // Server already enforces visibility rules (QA/QMS = global, others = assignee-only)
      applyCounts(data.counts || {});
    } catch {
      [bQmsChecking, bValid, bInvalid, bEvidence].forEach(b => { if (b) b.hidden = true; });
    }
  }

  // Expose for websocket/manual refresh
  window.refreshQmsTabBadges = refreshQmsTabBadges;

  // Initial load
  document.addEventListener('DOMContentLoaded', refreshQmsTabBadges);

  // If you have a global WebSocket, refresh on RCPA events
  if (window.socket) {
    const prev = window.socket.onmessage;
    window.socket.onmessage = function (event) {
      try {
        const msg = JSON.parse(event.data);
        if (msg && msg.action === 'rcpa-request') refreshQmsTabBadges();
      } catch {
        if (event.data === 'rcpa-request') refreshQmsTabBadges();
      }
      if (typeof prev === 'function') prev.call(this, event);
    };
  }

  // Auto-refresh badges whenever pages fire a generic refresh event
  document.addEventListener('rcpa:refresh', () => {
    if (typeof window.refreshQmsTabBadges === 'function') {
      window.refreshQmsTabBadges();
    }
  });

  /* ---------------- SSE live updates ---------------- */
  let es;
  function startSse(restart = false) {
    try { if (restart && es) es.close(); } catch { }
    // For badge counters we don't need query params; visibility is handled server-side
    es = new EventSource('../php-backend/rcpa-qms-tab-counters-sse.php');

    // Receive counts directly and apply without an extra fetch
    es.addEventListener('rcpa-tabs', (ev) => {
      try {
        const payload = JSON.parse(ev.data || '{}');
        if (payload && payload.counts) applyCounts(payload.counts);
      } catch { /* ignore */ }
    });

    es.onerror = () => { /* EventSource will auto-reconnect */ };
  }

  window.addEventListener('beforeunload', () => { try { es && es.close(); } catch { } });

  // Kick off SSE after DOMContentLoaded (so badges exist)
  document.addEventListener('DOMContentLoaded', () => startSse());
})();

