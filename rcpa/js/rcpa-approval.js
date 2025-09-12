(function () {
  const tbody = document.querySelector('#rcpa-table tbody');
  const totalEl = document.getElementById('rcpa-total');
  const pageInfo = document.getElementById('rcpa-page-info');
  const prevBtn = document.getElementById('rcpa-prev');
  const nextBtn = document.getElementById('rcpa-next');
  const fStatus = document.getElementById('rcpa-filter-status');
  const fType = document.getElementById('rcpa-filter-type');

  const actionContainer = document.getElementById('action-container');
  const viewBtn = document.getElementById('view-button');
  const acceptBtn = document.getElementById('accept-button');
  const rejectBtn = document.getElementById('reject-button');

  let page = 1;
  const pageSize = 10;
  let currentTarget = null;

  // ⚡ track latest seen id for SSE resume
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

  function actionButtonHtml(id) {
    const safeId = escapeHtml(id ?? '');
    return `
      <div class="rcpa-actions">
        <button class="rcpa-more" data-id="${safeId}" title="Actions">
          <i class="fa-solid fa-bars" aria-hidden="true"></i>
          <span class="sr-only">Actions</span>
        </button>
      </div>
    `;
  }

  function fmtDate(s) {
    if (!s) return '';
    const str = String(s);
    if (/^0{4}-0{2}-0{2}/.test(str)) return ''; // "0000-00-00 ..."
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

  // ⚡ highlight a row
  // remove blinking highlight – just scroll the new row into view
  function highlightRowById(id) {
    const rows = tbody.querySelectorAll('tr');
    for (const tr of rows) {
      const firstCell = tr.querySelector('td');
      if (firstCell && firstCell.textContent.trim() === String(id)) {
        tr.scrollIntoView({ block: 'center', behavior: 'smooth' });
        break;
      }
    }
  }


  async function load(highlightId) {
    const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
    if (fType.value) params.set('type', fType.value);
    if (fStatus.value) params.set('status', fStatus.value);

    hideActions();

    tbody.innerHTML = `<tr><td colspan="9" class="rcpa-empty">Loading…</td></tr>`;

    let res;
    try {
      res = await fetch('../php-backend/rcpa-list-approval.php?' + params.toString(), { credentials: 'same-origin' });
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
          <td>${escapeHtml(r.originator_name || '')}</td>
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

    // ⚡ update lastSeenId to the max id we just rendered
    const maxId = rows.reduce((m, r) => Math.max(m, Number(r.id || 0)), lastSeenId);
    if (maxId > lastSeenId) lastSeenId = maxId;

    // ⚡ highlight when requested (after SSE)
    if (highlightId) highlightRowById(highlightId);
  }

  document.addEventListener('rcpa:refresh', () => { load(); });

  function debounce(fn, ms) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
  }

  prevBtn.addEventListener('click', () => { if (page > 1) { page--; load(); } });
  nextBtn.addEventListener('click', () => { page++; load(); });
  [fType, fStatus].forEach(el => el.addEventListener('change', () => { page = 1; load(); }));

  // --- positioning helpers for the floating action container ---
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

  tbody.addEventListener('click', (e) => {
    const moreBtn = e.target.closest('.rcpa-more');
    if (!moreBtn) return;
    const id = moreBtn.dataset.id;
    if (currentTarget === moreBtn) hideActions(); else showActions(moreBtn, id);
  });

  document.addEventListener('click', (e) => {
    if (currentTarget && !e.target.closest('.rcpa-actions') && !actionContainer.contains(e.target)) {
      hideActions();
    }
  });

  ['scroll', 'resize'].forEach(evt => window.addEventListener(evt, () => {
    if (currentTarget) positionActionContainer(currentTarget);
  }, { passive: true }));

  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') hideActions(); });

  function dispatchAction(action, id) {
    document.dispatchEvent(new CustomEvent('rcpa:action', { detail: { action, id } }));
  }
  viewBtn.addEventListener('click', () => { dispatchAction('view', actionContainer.dataset.id); hideActions(); });
  acceptBtn.addEventListener('click', () => { dispatchAction('accept', actionContainer.dataset.id); hideActions(); });
  rejectBtn.addEventListener('click', () => { dispatchAction('reject', actionContainer.dataset.id); hideActions(); });

  // ⚡ SSE: listen for new requests; reload immediately
  function startSse() {
    if (es) { try { es.close(); } catch { } }
    es = new EventSource(`../php-backend/rcpa-approval-sse.php?since=${lastSeenId}`);
    es.addEventListener('rcpa', (e) => {
      try {
        const data = JSON.parse(e.data || '{}');
        if (data && data.max_id) {
          lastSeenId = Math.max(lastSeenId, Number(data.max_id));
          load(data.max_id); // highlight the fresh row
        } else {
          load();
        }
      } catch {
        load();
      }
    });
    es.onerror = () => {
      // EventSource will auto-reconnect by itself (honors server "retry")
    };
  }

  // Initial load, then begin SSE stream
  load();
  startSse();
})();


/* ====== VIEW MODAL + ACCEPT / REJECT FLOWS ====== */
(function () {
  // View Modal elems
  const modal = document.getElementById('rcpa-view-modal');
  const closeX = document.getElementById('rcpa-view-close');
  const closeBtn = document.getElementById('rcpa-view-close-btn');

  // Helper: set input/textarea value
  const setVal = (id, v) => { const el = document.getElementById(id); if (el) el.value = v ?? ''; };
  // Helper: set checkbox state
  const setChecked = (id, on) => { const el = document.getElementById(id); if (el) el.checked = !!on; };
  // Helper: show/hide a type-specific block
  const showCond = (id, show) => { const el = document.getElementById(id); if (el) el.hidden = !show; };
  // Helper: simple date fmt  
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

  // Mark all checkboxes in the view modal as read-only (no visual gray-out)
  function lockViewCheckboxes() {
    const boxes = modal.querySelectorAll('input[type="checkbox"]');
    boxes.forEach(cb => {
      cb.classList.add('readonly-check');
      cb.setAttribute('tabindex', '-1');       // remove from tab order
      cb.setAttribute('aria-readonly', 'true'); // a11y hint
      cb.dataset.lockChecked = cb.checked ? '1' : '0'; // snapshot (just in case)
    });
  }

  // Prevent mouse + label clicks + keyboard toggles
  function installReadonlyGuards() {
    // Capture phase so we beat the label default toggle
    modal.addEventListener('click', (e) => {
      // If clicking the checkbox itself
      if (e.target.matches?.('input[type="checkbox"].readonly-check')) {
        e.preventDefault(); return;
      }
      // If clicking a <label> that targets or contains a readonly checkbox
      const lbl = e.target.closest('label');
      if (lbl) {
        const forId = lbl.getAttribute('for');
        let cb = null;
        if (forId) cb = modal.querySelector(`#${CSS.escape(forId)}`);
        else cb = lbl.querySelector('input[type="checkbox"]');
        if (cb && cb.classList.contains('readonly-check')) {
          e.preventDefault(); return;
        }
      }
    }, true);

    // Block keyboard toggles (Space/Enter)
    modal.addEventListener('keydown', (e) => {
      if (
        e.target.matches?.('input[type="checkbox"].readonly-check') &&
        (e.key === ' ' || e.key === 'Spacebar' || e.key === 'Enter')
      ) {
        e.preventDefault();
      }
    });

    // Paranoia: if something slips through, revert to the snapshot
    modal.addEventListener('change', (e) => {
      if (e.target.matches?.('input[type="checkbox"].readonly-check')) {
        e.preventDefault();
        e.target.checked = e.target.dataset.lockChecked === '1';
      }
    });
  }
  installReadonlyGuards();

  // Reset modal to a clean state
  function clearViewForm() {
    ['v-type-external', 'v-type-internal', 'v-type-unattain', 'v-type-online', 'v-type-hs', 'v-type-mgmt']
      .forEach(id => showCond(id, false));

    [
      'rcpa-view-type', 'v-external-sem1-year', 'v-external-sem2-year', 'v-internal-sem1-year', 'v-internal-sem2-year',
      'v-project-name', 'v-wbs-number', 'v-online-year', 'v-hs-month', 'v-hs-year', 'v-mgmt-year',
      'rcpa-view-originator-name', 'rcpa-view-originator-dept', 'rcpa-view-date', 'rcpa-view-remarks',
      'rcpa-view-system', 'rcpa-view-clauses', 'rcpa-view-supervisor', 'rcpa-view-assignee',
      'rcpa-view-status', 'rcpa-view-conformance'
    ].forEach(id => setVal(id, ''));

    ['rcpa-view-cat-major', 'rcpa-view-cat-minor', 'rcpa-view-cat-obs', 'rcpa-view-flag-nc', 'rcpa-view-flag-pnc',
      'rcpa-view-mgmt-q1', 'rcpa-view-mgmt-q2', 'rcpa-view-mgmt-q3', 'rcpa-view-mgmt-ytd'
    ].forEach(id => setChecked(id, false));

    const att = document.getElementById('rcpa-view-attach-list');
    if (att) att.innerHTML = '';
  }

  // Parse "sem_year"
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

  // Attachments renderer
  function renderAttachments(s) {
    const wrap = document.getElementById('rcpa-view-attach-list');
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
          try {
            name = decodeURIComponent(url.split('/').pop().split('?')[0]) || 'Attachment';
          } catch {
            name = url.split('/').pop().split('?')[0] || 'Attachment';
          }
        } else {
          name = 'Attachment';
        }
      }

      const safeName = escapeHtml(name);
      const safeUrl = escapeHtml(url);
      const sizeText = size === '' ? '' : (isNaN(size) ? escapeHtml(String(size)) : escapeHtml(humanSize(size)));

      const linkStart = url
        ? `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer" title="${safeName}">`
        : `<span title="${safeName}">`;
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

  // Fill modal
  function fillViewModal(row) {
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

    // Show only the relevant type block
    showCond('v-type-external', typeKey === 'external');
    showCond('v-type-internal', typeKey === 'internal');
    showCond('v-type-unattain', typeKey === 'unattain');
    showCond('v-type-online', typeKey === 'online');
    showCond('v-type-hs', typeKey === '5s');
    showCond('v-type-mgmt', typeKey === 'mgmt');

    // Parse sem_year and populate type-specific fields
    const sy = parseSemYear(row.sem_year);

    const reqYear = yearFrom(row.date_request) || sy.year || '';

    if (typeKey === 'external') {
      // Only 1st Sem is checked, year from date_request
      setChecked('v-external-sem1-pick', !!reqYear);
      setVal('v-external-sem1-year', reqYear);
      setChecked('v-external-sem2-pick', false);
      setVal('v-external-sem2-year', '');
    } else if (typeKey === 'internal') {
      // Only 1st Sem is checked, year from date_request
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

    // Category checkboxes
    const cat = String(row.category || '').toLowerCase();
    setChecked('rcpa-view-cat-major', cat === 'major');
    setChecked('rcpa-view-cat-minor', cat === 'minor');
    setChecked('rcpa-view-cat-obs', cat === 'observation');

    // Common fields
    setVal('rcpa-view-originator-name', row.originator_name);
    setVal('rcpa-view-originator-dept', row.originator_department);
    setVal('rcpa-view-date', fmt(row.date_request));

    // Conformance flags (NC / PNC) — ensure only one is checked
    const confNorm = String(row.conformance || '')
      .toLowerCase()
      .replace(/[\s_-]+/g, ' ')
      .trim();

    // Prefer Potential Non-conformance over Non-conformance when both keywords appear
    let isPNC = (confNorm === 'pnc') || confNorm.includes('potential');
    let isNC = false;

    if (!isPNC) {
      // Match "non-conformance", "non conformance", or "nc"
      isNC = confNorm === 'nc' ||
        /\bnon[- ]?conformance\b/.test(confNorm) ||
        confNorm === 'non conformance' ||
        confNorm === 'nonconformance';
    }

    // Category override to mirror business rules:
    // Observation -> PNC only; Major/Minor -> NC only
    if (cat === 'observation') { isPNC = true; isNC = false; }
    else if (cat === 'major' || cat === 'minor') { isPNC = false; isNC = true; }

    setChecked('rcpa-view-flag-pnc', isPNC);
    setChecked('rcpa-view-flag-nc', isNC);

    // Remarks & attachments
    setVal('rcpa-view-remarks', row.remarks);
    renderAttachments(row.remarks_attachment);

    // Standards & supervision
    setVal('rcpa-view-system', row.system_applicable_std_violated);
    setVal('rcpa-view-clauses', row.standard_clause_number);
    setVal('rcpa-view-supervisor', row.originator_supervisor_head);

    // Assignment & status
    const assigneeRaw = (row.assignee ?? '').trim();
    const sectionRaw = (row.section ?? '').trim();
    const assigneeDisplay = sectionRaw
      ? (assigneeRaw ? `${assigneeRaw} - ${sectionRaw}` : sectionRaw)
      : assigneeRaw;

    setVal('rcpa-view-assignee', assigneeDisplay);

    setVal('rcpa-view-status', row.status);
    setVal('rcpa-view-conformance', row.conformance);
  }


  function showModal() {
    modal.removeAttribute('hidden');
    requestAnimationFrame(() => {
      modal.classList.add('show');
    });
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

  [closeX, closeBtn].forEach(el => el && el.addEventListener('click', hideModal));
  modal.addEventListener('click', (e) => { if (e.target === modal) hideModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !modal.hidden) hideModal(); });

  // ===== View action =====
  document.addEventListener('rcpa:action', async (e) => {
    const { action, id } = e.detail || {};
    if (action !== 'view' || !id) return;

    clearViewForm();
    try {
      const res = await fetch(`../php-backend/rcpa-view-approval.php?id=${encodeURIComponent(id)}`, { credentials: 'same-origin' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const row = await res.json();
      if (!row || !row.id) {
        alert('Record not found.');
        return;
      }
      fillViewModal(row);
      lockViewCheckboxes();
      showModal();
    } catch (err) {
      console.error(err);
      alert('Failed to load record. Please try again.');
    }
  });

  // ===== Accept action (unchanged) =====
  document.addEventListener('rcpa:action', async (e) => {
    const { action, id } = e.detail || {};
    if (action !== 'accept' || !id) return;

    Swal.fire({
      title: 'Approve this RCPA?',
      text: 'This will set the status to "QMS CHECKING".',
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
          const res = await fetch('../php-backend/rcpa-accept-approval.php', {
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


      Swal.fire({
        icon: 'success',
        title: 'RCPA approved',
        text: 'Status has been set to "QMS CHECKING".',
        timer: 1600,
        showConfirmButton: false
      });
      document.dispatchEvent(new CustomEvent('rcpa:refresh'));
    });
  });

  // ===== Reject action: open modal -> submit reason -> POST -> success toast =====

  let rejectCurrentId = null;
  let rejectElsBound = false;

  function bindRejectModalEvents() {
    if (rejectElsBound) return;
    rejectElsBound = true;

    const m = document.getElementById('rcpa-reject-modal');
    const btnClose = document.getElementById('rcpa-reject-close');
    const btnCancel = document.getElementById('rcpa-reject-cancel');
    const form = document.getElementById('rcpa-reject-form');
    const textarea = document.getElementById('rcpa-reject-remarks');
    const submitBtn = document.getElementById('rcpa-reject-submit');

    // NEW: attachment elements
    const fileInput = document.getElementById('rcpa-reject-files');
    const clipBtn = document.getElementById('rcpa-reject-clip');
    const badge = document.getElementById('rcpa-reject-attach-count');
    const list = document.getElementById('rcpa-reject-files-list');
    const dt = new DataTransfer(); // holds selected files

    function renderFiles() {
      list.innerHTML = '';
      Array.from(dt.files).forEach((f, i) => {
        const row = document.createElement('div');
        row.className = 'file-chip reject-file-chip';
        const size = (() => {
          let v = f.size, u = ['B', 'KB', 'MB', 'GB']; let k = 0;
          while (v >= 1024 && k < u.length - 1) { v /= 1024; k++; }
          return (v >= 10 || k === 0) ? Math.round(v) + ' ' + u[k] : v.toFixed(1) + ' ' + u[k];
        })();
        row.innerHTML = `
        <i class="fa-solid fa-paperclip" aria-hidden="true"></i>
        <div class="file-info">
          <div class="name" title="${f.name}">${f.name}</div>
          <div class="sub">${size}</div>
        </div>
        <button type="button" class="file-remove" data-idx="${i}"
          aria-label="Remove ${f.name}">
          <i class="fa-solid fa-xmark" aria-hidden="true"></i>
        </button>`;
        list.appendChild(row);
      });
      const n = dt.files.length;
      badge.hidden = n === 0;
      badge.textContent = n;
    }

    // NEW: click paperclip to open chooser
    clipBtn?.addEventListener('click', () => fileInput?.click());

    // NEW: when native input gets files, push into DataTransfer and re-render
    fileInput?.addEventListener('change', () => {
      Array.from(fileInput.files).forEach(f => dt.items.add(f));
      renderFiles();
      fileInput.value = ''; // allow selecting the same file again later
    });

    // NEW: handle remove (X)
    list.addEventListener('click', (e) => {
      const btn = e.target.closest('.file-remove');
      if (!btn) return;
      const idx = +btn.dataset.idx;
      if (!Number.isInteger(idx)) return;
      dt.items.remove(idx);
      renderFiles();
    });

    // show/hide modal (unchanged)
    function showRejectModal(forId) {
      rejectCurrentId = forId;
      if (textarea) textarea.value = '';
      // NEW: reset attachments each time the modal opens
      while (dt.items.length) dt.items.remove(0);
      renderFiles();

      m.removeAttribute('hidden');
      requestAnimationFrame(() => m.classList.add('show'));
      document.body.style.overflow = 'hidden';
      setTimeout(() => textarea && textarea.focus(), 40);
    }
    function hideRejectModal() {
      m.classList.remove('show');
      const onEnd = (e) => {
        if (e.target !== m || e.propertyName !== 'opacity') return;
        m.removeEventListener('transitionend', onEnd);
        m.setAttribute('hidden', '');
        document.body.style.overflow = '';
        rejectCurrentId = null;
      };
      m.addEventListener('transitionend', onEnd);
    }

    btnClose && btnClose.addEventListener('click', hideRejectModal);
    btnCancel && btnCancel.addEventListener('click', hideRejectModal);
    m.addEventListener('click', (e) => { if (e.target === m) hideRejectModal(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !m.hidden) hideRejectModal(); });

    // REPLACE your current submit handler with this one
    form && form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const remarks = (textarea?.value || '').trim();

      if (!remarks) {
        if (window.Swal) {
          await Swal.fire({ icon: 'info', title: 'Reason required', text: 'Please enter a reason before submitting.' });
        } else {
          alert('Please enter a reason before submitting.');
        }
        return;
      }

      // Confirm
      if (window.Swal) {
        const result = await Swal.fire({
          title: 'Confirm rejection?',
          text: 'Status will be set to "REJECTED". Proceed?',
          icon: 'warning',
          showCancelButton: true,
          confirmButtonText: 'Reject',
          cancelButtonText: 'Cancel',
          focusCancel: true
        });
        if (!result.isConfirmed) return;
      } else if (!confirm('Confirm rejection? Status will be set to "REJECTED".')) {
        return;
      }

      submitBtn && (submitBtn.disabled = true);

      try {
        const fd = new FormData();
        fd.append('id', rejectCurrentId);
        fd.append('remarks', remarks);
        // NEW: append all selected files
        Array.from(dt.files).forEach(f => fd.append('attachments[]', f));

        const res = await fetch('../php-backend/rcpa-reject-approval.php', {
          method: 'POST',
          body: fd,                  // multipart
          credentials: 'same-origin'
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!data || !data.success) throw new Error(data?.error || 'Failed to update');

        hideRejectModal();

        if (window.Swal) {
          Swal.fire({
            icon: 'success',
            title: 'RCPA rejected',
            text: 'Status has been set to "REJECTED".',
            timer: 1600,
            showConfirmButton: false
          });
        } else {
          alert('RCPA rejected. Status set to "REJECTED".');
        }

        // Optional: refresh list
        // document.dispatchEvent(new CustomEvent('rcpa:refresh'));
      } catch (err) {
        console.error(err);
        if (window.Swal) {
          Swal.fire({ icon: 'error', title: 'Failed to reject', text: err.message || 'Please try again.' });
        } else {
          alert('Failed to reject this RCPA. Please try again.');
        }
      } finally {
        submitBtn && (submitBtn.disabled = false);
      }
    });

    // expose
    bindRejectModalEvents.show = showRejectModal;
  }


  // Intercept reject action -> CONFIRM -> open rejection modal
  // Intercept reject action -> open rejection modal (no pre-confirm)
  document.addEventListener('rcpa:action', (e) => {
    const { action, id } = (e.detail || {});
    if (action !== 'reject' || !id) return;

    bindRejectModalEvents(); // idempotent
    bindRejectModalEvents.show(id);
  });

})();

/* ====== HISTORY MODAL ====== */
(function () {
  const historyModal = document.getElementById('rcpa-history-modal');
  const historyTitle = document.getElementById('rcpa-history-title');
  const historyBody = document.getElementById('rcpa-history-body');
  const historyClose = document.getElementById('rcpa-history-close');

  let agoTimer = null;

  const esc = (s) => ('' + (s ?? '')).replace(/[&<>"'`=\/]/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '`': '&#96;', '=': '&#61;', '/': '&#47;'
  }[m]));

  // Parse "YYYY-MM-DD HH:MM:SS" -> local Date
  const parseDT = (s) => {
    if (!s) return null;
    const d = new Date(String(s).replace(' ', 'T'));
    return isNaN(d) ? null : d;
  };

  // Absolute, compact, consistent — no timezone text
  const fmtAbs = (s) => {
    if (!s || /^0{4}-0{2}-0{2}/.test(String(s))) return '';
    const d = s instanceof Date ? s : parseDT(s);
    if (!d) return String(s);

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[d.getMonth()];
    const day = String(d.getDate()).padStart(2, '0');
    const year = d.getFullYear();
    let h = d.getHours();
    const m = String(d.getMinutes()).padStart(2, '0');
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;

    // Example: "Aug 19, 2025, 10:32 AM"
    return `${month} ${day}, ${year}, ${h}:${m} ${ampm}`;
  };


  // Minutes / hours / days "ago" (or "in …")
  const timeAgo = (s) => {
    const d = s instanceof Date ? s : parseDT(s);
    if (!d) return '';
    const now = new Date();
    const diff = now - d; // past => positive
    const abs = Math.abs(diff);
    const MIN = 60 * 1000, HOUR = 60 * MIN, DAY = 24 * HOUR;

    if (abs < 30 * 1000) return 'just now';

    let v, unit;
    if (abs >= DAY) { v = Math.floor(abs / DAY); unit = v === 1 ? 'day' : 'days'; }
    else if (abs >= HOUR) { v = Math.floor(abs / HOUR); unit = v === 1 ? 'hour' : 'hours'; }
    else { v = Math.max(1, Math.floor(abs / MIN)); unit = v === 1 ? 'minute' : 'minutes'; }

    return diff >= 0 ? `${v} ${unit} ago` : `in ${v} ${unit}`;
  };

  // Renders the 2-line date cell with a <time> that auto-updates
  // Inline: "date time (ago)"
  const renderDateCell = (s) => {
    const d = parseDT(s);
    if (!d) return '';
    const abs = fmtAbs(d);           // no timezone text
    const rel = timeAgo(d);          // minutes/hours/days
    return `${esc(abs)}${rel ? ` <span class="rcpa-ago js-ago" data-ts="${d.getTime()}">(${esc(rel)})</span>` : ''}`;
  };


  function startAgoTicker(rootEl) {
    stopAgoTicker();
    const update = () => {
      rootEl.querySelectorAll('.js-ago').forEach(el => {
        const ts = Number(el.getAttribute('data-ts'));
        if (!ts) return;
        const rel = timeAgo(new Date(ts));
        el.textContent = rel ? `(${rel})` : '';
      });
    };
    update();
    agoTimer = setInterval(update, 60 * 1000); // refresh every minute
  }
  function stopAgoTicker() {
    if (agoTimer) { clearInterval(agoTimer); agoTimer = null; }
  }

  function openHistoryModal(id) {
    historyTitle.textContent = id;
    historyBody.innerHTML = `<div class="rcpa-muted">Loading history…</div>`;
    historyModal.classList.add('show');
    historyModal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    loadHistory(id);
    setTimeout(() => historyClose?.focus(), 0);
  }

  function closeHistoryModal() {
    stopAgoTicker();
    historyModal.classList.remove('show');
    historyModal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
  }

  async function loadHistory(id) {
    try {
      const res = await fetch(`../php-backend/rcpa-history.php?id=${encodeURIComponent(id)}`, { credentials: 'same-origin' });
      const data = await res.json();
      if (!res.ok || !data?.ok) throw new Error(data?.error || `HTTP ${res.status}`);

      const rows = Array.isArray(data.rows) ? data.rows : [];
      if (!rows.length) {
        historyBody.innerHTML = `<div class="rcpa-empty">No history yet.</div>`;
        return;
      }

      historyBody.innerHTML = `
        <table class="rcpa-history-table">
          <thead>
            <tr><th>Date & Time</th><th>Name</th><th>Activity</th></tr>
          </thead>
          <tbody>
            ${rows.map(h => `
              <tr>
                <td>${renderDateCell(h.date_time)}</td>
                <td>${esc(h.name)}</td>
                <td>${esc(h.activity).replace(/\n/g, '<br>')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;

      startAgoTicker(historyBody);
    } catch (e) {
      console.error(e);
      historyBody.innerHTML = `<div class="rcpa-empty">Failed to load history.</div>`;
    }
  }

  // Close handlers
  historyClose?.addEventListener('click', closeHistoryModal);
  historyModal?.addEventListener('click', (e) => { if (e.target === historyModal) closeHistoryModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && historyModal.classList.contains('show')) closeHistoryModal(); });

  // Delegate from your table (guard if tbody not found)
  const rcpaTbody = document.querySelector('#rcpa-table tbody');
  rcpaTbody?.addEventListener('click', (e) => {
    const icon = e.target.closest('.icon-rcpa-history');
    if (icon) {
      const id = icon.getAttribute('data-id');
      if (id) openHistoryModal(id);
    }
  });
  rcpaTbody?.addEventListener('keydown', (e) => {
    const icon = e.target.closest('.icon-rcpa-history');
    if (icon && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      const id = icon.getAttribute('data-id');
      if (id) openHistoryModal(id);
    }
  });
})();