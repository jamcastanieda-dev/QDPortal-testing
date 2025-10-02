// LIST TABLE

(function () {
  // ------------ helpers for normalization -------------
  const norm = (s) => (s ?? '').toString().trim().toLowerCase();
  // be lenient for name equality: collapse multiples spaces and remove commas/periods
  const normName = (s) => norm(s).replace(/\s+/g, ' ').replace(/[.,]/g, '');

  // ------------ dynamic getters (always read latest globals) -------------
  const getCurrentUser = () =>
    normName(window.RCPA_EMPLOYEE_NAME || window.RCPA_USER_NAME || window.RCPA_NAME || window.USER_NAME || '');
  const getCurrentDept = () => norm(window.RCPA_DEPARTMENT || '');
  const getCurrentSect = () => norm(window.RCPA_SECTION || '');
  const getCurrentRole = () => norm(window.RCPA_ROLE || '');
  const isSupOrMgr = () => (getCurrentRole() === 'manager' || getCurrentRole() === 'supervisor');

  const tbody = document.querySelector('#rcpa-table tbody');
  const totalEl = document.getElementById('rcpa-total');
  const pageInfo = document.getElementById('rcpa-page-info');
  const prevBtn = document.getElementById('rcpa-prev');
  const nextBtn = document.getElementById('rcpa-next');
  const fType = document.getElementById('rcpa-filter-type');

  // Floating action container elements
  const actionContainer = document.getElementById('action-container');
  const viewBtn = document.getElementById('view-button');
  const validBtn = document.getElementById('valid-button');
  const notValidBtn = document.getElementById('not-valid-button');
  const assignBtn = document.getElementById('assign-button'); // may be hidden depending on role

  // ASSIGN button visibility: sup/mgr + dept/section match
  const canAssignOnRow = (rowAssignee, rowSection) => {
    if (!isSupOrMgr()) return false;
    if (norm(rowAssignee) !== getCurrentDept()) return false;
    const rs = norm(rowSection);
    if (!rs) return true;
    if (!getCurrentSect()) return false;
    return rs === getCurrentSect();
  };

  // Base department/section gate for any actions (used for sup/mgr path)
  const canActOnRowDeptSect = (rowAssignee, rowSection) => {
    if (norm(rowAssignee) !== getCurrentDept()) return false;
    if (getCurrentRole() === 'manager') return true; // managers ignore section
    const rs = norm(rowSection);
    if (!rs) return true;
    if (!getCurrentSect()) return false;
    return rs === getCurrentSect();
  };

  const isAssigneeUser = (rowAssigneeName) => normName(rowAssigneeName) === getCurrentUser();

  // FINAL decision for hamburger visibility
  // assignee_name match bypasses dept/section gate (shows View/Valid/Not Valid; Assign still role-gated)
  const shouldShowActions = (rowAssignee, rowSection, assigneeName) => {
    if (isAssigneeUser(assigneeName)) return true; // assignee gets actions regardless of dept/section
    if (!canActOnRowDeptSect(rowAssignee, rowSection)) return false;
    return isSupOrMgr(); // sup/mgr get actions when dept/section pass
  };

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

  function actionButtonHtml(id, assignee, section, assigneeName) {
    const safeId = escapeHtml(id ?? '');
    const safeAsg = escapeHtml(assignee || '');
    const safeSec = escapeHtml(section || '');

    if (shouldShowActions(assignee, section, assigneeName)) {
      return `
        <div class="rcpa-actions">
          <button class="rcpa-more"
                  data-id="${safeId}"
                  data-assignee="${safeAsg}"
                  data-section="${safeSec}"
                  title="Actions">
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
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const month = months[d.getMonth()];
    const day = String(d.getDate()).padStart(2, '0');
    const year = d.getFullYear();
    let h = d.getHours();
    const m = String(d.getMinutes()).padStart(2, '0');
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${month} ${day}, ${year}, ${h}:${m} ${ampm}`;
  }

  function formatYmdPretty(ymd) {
    const mnames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const m = parseInt(ymd.slice(5, 7), 10) - 1;
    const d = parseInt(ymd.slice(8, 10), 10);
    const y = parseInt(ymd.slice(0, 4), 10);
    if ([m, d, y].some(Number.isNaN)) return ymd;
    return `${mnames[m]} ${String(d).padStart(2, '0')}, ${y}`;
  }
  function daysDiffFromToday(ymd) {
    const y = parseInt(ymd.slice(0, 4), 10);
    const m = parseInt(ymd.slice(5, 7), 10) - 1;
    const d = parseInt(ymd.slice(8, 10), 10);
    if ([y, m, d].some(Number.isNaN)) return null;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const due = new Date(y, m, d);
    const msPerDay = 24 * 60 * 60 * 1000;
    return Math.round((due - today) / msPerDay);
  }
  function formatReplyDueCell(ymd) {
    if (!ymd) return '';
    const pretty = formatYmdPretty(ymd);
    const diff = daysDiffFromToday(ymd);
    if (diff === null) return pretty;
    const abs = Math.abs(diff);
    const plural = abs === 1 ? 'day' : 'days';
    const valueText = (diff < 0 ? `-${abs}` : `${abs}`) + ` ${plural}`;
    let className = '';
    if (abs > 5) className = 'badge-cat-obs';
    else if (abs > 2) className = 'badge-cat-minor';
    else className = 'badge-cat-major';
    return `<span class="rcpa-badge ${className}">${pretty} (${valueText})</span>`;
  }

  let page = 1;
  const pageSize = 10;
  let currentTarget = null;
  let lastSeenId = 0;
  let es = null;

  async function load() {
    const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
    if (fType?.value) params.set('type', fType.value);

    hideActions();
    tbody.innerHTML = `<tr><td colspan="10" class="rcpa-empty">Loading…</td></tr>`;

    let res;
    try {
      res = await fetch('../php-backend/rcpa-list-assignee-pending.php?' + params.toString(), { credentials: 'same-origin' });
    } catch {
      tbody.innerHTML = `<tr><td colspan="10" class="rcpa-empty">Network error.</td></tr>`;
      return;
    }
    if (!res.ok) {
      tbody.innerHTML = `<tr><td colspan="10" class="rcpa-empty">Failed to load (${res.status}).</td></tr>`;
      return;
    }

    const data = await res.json();

    // ✅ NEW: ensure globals are populated BEFORE rendering rows
    if (data && data.current) {
      if (!window.RCPA_EMPLOYEE_NAME && data.current.name)        window.RCPA_EMPLOYEE_NAME = data.current.name;
      if (!window.RCPA_ROLE && data.current.role)                 window.RCPA_ROLE = data.current.role;
      if (!window.RCPA_DEPARTMENT && data.current.department)     window.RCPA_DEPARTMENT = data.current.department;
      if (!window.RCPA_SECTION && data.current.section)           window.RCPA_SECTION = data.current.section;
    }

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
          <td>${formatReplyDueCell(r.reply_due_date)}</td>
          <td>${badgeForStatus(r.status)}</td>
          <td>${escapeHtml(r.originator_name)}</td>
          <td>${escapeHtml(r.section ? `${r.assignee} - ${r.section}` : (r.assignee || ''))}</td>
          <td>${actionButtonHtml(r.id ?? '', r.assignee, r.section, r.assignee_name)}</td>
          <td>
            <i class="fa-solid fa-clock-rotate-left icon-rcpa-history"
               data-id="${r.id ?? ''}" role="button" tabindex="0"
               title="View history"></i>
          </td>
        </tr>`).join('');
    }

    const total = Number(data.total || 0);
    const lastPage = Math.max(1, Math.ceil(total / pageSize));
    totalEl.textContent = `${total} record${total === 1 ? '' : 's'}`;
    pageInfo.textContent = `Page ${data.page} of ${lastPage}`;
    prevBtn.disabled = page <= 1;
    nextBtn.disabled = page >= lastPage;

    const maxId = rows.reduce((m, r) => Math.max(m, Number(r.id || 0)), lastSeenId);
    if (maxId > lastSeenId) lastSeenId = maxId;
  }

  document.addEventListener('rcpa:refresh', () => { load(); });

  // pagination + filter events
  prevBtn?.addEventListener('click', () => { if (page > 1) { page--; load(); } });
  nextBtn?.addEventListener('click', () => { page++; load(); });
  fType?.addEventListener('change', () => { page = 1; load(); startSse(true); });

  // icon morph helpers
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

    // toggle Assign visibility
    const rowAssignee = target.dataset.assignee || '';
    const rowSection = target.dataset.section || '';
    const showAssign = canAssignOnRow(rowAssignee, rowSection);
    if (assignBtn) assignBtn.hidden = !showAssign;

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

  // open/close hamburger
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
    if (currentTarget === moreBtn) hideActions(); else showActions(moreBtn, id);
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
  ['scroll','resize'].forEach(evt => window.addEventListener(evt, () => {
    if (currentTarget) positionActionContainer(currentTarget);
  }, { passive: true }));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') hideActions(); });

  function dispatchAction(action, id) {
    document.dispatchEvent(new CustomEvent('rcpa:action', { detail: { action, id } }));
  }
  viewBtn.addEventListener('click', () => { dispatchAction('view', actionContainer.dataset.id); hideActions(); });
  validBtn.addEventListener('click', () => { dispatchAction('valid', actionContainer.dataset.id); hideActions(); });
  notValidBtn.addEventListener('click', () => { dispatchAction('not-valid', actionContainer.dataset.id); hideActions(); });
  assignBtn?.addEventListener('click', () => { dispatchAction('assign', actionContainer.dataset.id); hideActions(); });

  // SSE
  function startSse(restart = false) {
    if (restart && es) { try { es.close(); } catch {} }
    const qs = new URLSearchParams();
    if (fType?.value) qs.set('type', fType.value);
    es = new EventSource(`../php-backend/rcpa-assignee-pending-sse.php?${qs.toString()}`);
    es.addEventListener('rcpa', () => { load(); });
    es.onerror = () => {};
  }

  load();
  startSse();
})();



// ASSIGN MODAL (stand-alone IIFE)
// ASSIGN MODAL (stand-alone IIFE with dropdown + SweetAlert confirm + save)
// ASSIGN MODAL (stand-alone IIFE with dropdown + SweetAlert confirm + save)
(function () {
  // Use existing modal; if missing, auto-create it (no RCPA No. line)
  let modal = document.getElementById('rcpa-assign-modal');
  if (!modal) {
    const tpl = document.createElement('div');
    tpl.innerHTML = `
      <div class="modal-overlay" id="rcpa-assign-modal" hidden aria-modal="true" role="dialog" aria-labelledby="rcpa-assign-title">
        <div class="modal-content">
          <h3 id="rcpa-assign-title" style="margin-top:0;">Assign a person to reply this RCPA</h3>
          <label for="rcpa-assign-select" style="display:block; font-weight:600; margin:10px 0 6px;">Employee</label>
          <select id="rcpa-assign-select" class="u-line" style="width:100%;">
            <option value="">— Select employee —</option>
          </select>
          <div id="rcpa-assign-help" class="rcpa-muted" style="margin-top:.5rem; font-size:.9em;"></div>
          <div style="display:flex; gap:8px; justify-content:flex-end; margin-top:14px;">
            <button type="button" class="rcpa-btn" id="rcpa-assign-submit" disabled>Assign</button>
          </div>
        </div>
      </div>
    `.trim();
    document.body.appendChild(tpl.firstElementChild);
    modal = document.getElementById('rcpa-assign-modal');
  }

  const selectEl = document.getElementById('rcpa-assign-select');
  const helpEl   = document.getElementById('rcpa-assign-help');
  const submitEl = document.getElementById('rcpa-assign-submit');

  let currentId = null;

  function openModal(id) {
    currentId = id;

    // reset UI
    if (helpEl) helpEl.textContent = '';
    if (selectEl) {
      selectEl.innerHTML = `<option value="">— Select employee —</option>`;
      selectEl.disabled = true;
    }
    submitEl.disabled = true;

    // Load options filtered by the RCPA row's department/section (server enforces perms)
    fetch(`../php-backend/rcpa-assign-options.php?id=${encodeURIComponent(id)}`, { credentials: 'same-origin' })
      .then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then(data => {
        const options = Array.isArray(data?.options) ? data.options : [];
        const current = (data?.current_assignee_name || '').trim();

        if (!options.length) {
          if (helpEl) helpEl.textContent = 'No employees found for this department/section.';
          selectEl.disabled = true;
          submitEl.disabled = true;
          return;
        }

        const frag = document.createDocumentFragment();
        options.forEach(name => {
          const opt = document.createElement('option');
          opt.value = name;
          opt.textContent = name;
          if (current && name.toLowerCase() === current.toLowerCase()) opt.selected = true;
          frag.appendChild(opt);
        });
        selectEl.appendChild(frag);
        selectEl.disabled = false;
        submitEl.disabled = !selectEl.value;

        if (current && helpEl) helpEl.textContent = `Current assignee: ${current}`;
      })
      .catch(err => {
        console.error(err);
        if (helpEl) helpEl.textContent = 'Failed to load employees.';
      });

    // open modal
    modal.removeAttribute('hidden');
    requestAnimationFrame(() => modal.classList.add('show'));
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    modal.classList.remove('show');
    const onEnd = (e) => {
      if (e.target !== modal || e.propertyName !== 'opacity') return;
      modal.removeEventListener('transitionend', onEnd);
      modal.setAttribute('hidden', '');
      document.body.style.overflow = '';
      currentId = null;
    };
    modal.addEventListener('transitionend', onEnd);
  }

  // Overlay click / ESC to close (no visible close buttons)
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && modal && !modal.hidden) closeModal(); });

  // Enable Assign only when a value is selected
  selectEl.addEventListener('change', () => { submitEl.disabled = !selectEl.value; });

  // Click Assign → confirm → POST → refresh
  submitEl.addEventListener('click', async () => {
    const chosen = (selectEl.value || '').trim();
    if (!currentId || !chosen) return;

    // SweetAlert2 confirm if available, else confirm()
    const confirmAssign = () => {
      if (window.Swal && typeof window.Swal.fire === 'function') {
        return window.Swal.fire({
          title: 'Confirm assignment',
          text: `Assign "${chosen}" to reply to this RCPA?`,
          icon: 'question',
          showCancelButton: true,
          confirmButtonText: 'Assign'
        }).then(r => r.isConfirmed);
      }
      return Promise.resolve(confirm(`Assign "${chosen}" to reply to this RCPA?`));
    };

    if (!(await confirmAssign())) return;

    // lock UI during save
    submitEl.disabled = true;
    selectEl.disabled = true;

    try {
      const res = await fetch('../php-backend/rcpa-assign-set.php', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: Number(currentId), assignee_name: chosen })
      });
      const json = await res.json().catch(() => ({}));

      if (!res.ok || json?.ok !== true) {
        const msg = json?.error || `Failed to assign (HTTP ${res.status}).`;
        if (window.Swal?.fire) window.Swal.fire('Error', msg, 'error'); else alert(msg);
        selectEl.disabled = false;
        submitEl.disabled = !selectEl.value;
        return;
      }

      if (window.Swal?.fire) window.Swal.fire('Assigned', 'Assignee updated successfully.', 'success');
      closeModal();
      document.dispatchEvent(new CustomEvent('rcpa:refresh'));
    } catch (err) {
      console.error(err);
      if (window.Swal?.fire) window.Swal.fire('Error', 'Network or server error.', 'error'); else alert('Network or server error.');
      selectEl.disabled = false;
      submitEl.disabled = !selectEl.value;
    }
  });

  // Listen for 'assign' action from the list IIFE
  document.addEventListener('rcpa:action', (e) => {
    const { action, id } = e.detail || {};
    if (action === 'assign' && id) openModal(id);
  });
})();



// view modal
(function () {
  // --- Main view modal elems ---
  const modal = document.getElementById('rcpa-view-modal');
  const closeX = document.getElementById('rcpa-view-close');

  // --- Disapproval viewer modal (textarea + attachment list) ---
  const rjModal = document.getElementById('reject-remarks-modal');
  const rjText = document.getElementById('reject-remarks-text');
  const rjList = document.getElementById('reject-remarks-attach-list');
  const rjClose = document.getElementById('reject-remarks-close');

  // --- Why-Why VIEW modal (create if missing) ---
  let whyViewModal = document.getElementById('rcpa-why-view-modal');
  if (!whyViewModal) {
    const tpl = document.createElement('div');
    tpl.innerHTML = `
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
    `.trim();
    document.body.appendChild(tpl.firstElementChild);
    whyViewModal = document.getElementById('rcpa-why-view-modal');
  }
  const whyViewClose = document.getElementById('rcpa-why-view-close');
  const whyViewOk = document.getElementById('rcpa-why-view-ok');
  const whyViewDesc = document.getElementById('rcpa-why-view-desc');
  const whyViewList = document.getElementById('rcpa-why-view-list');

  // ---------- Small helpers ----------
  function escapeHTML(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
  function humanSize(n) {
    if (n == null || n === '' || isNaN(n)) return '';
    let b = Number(n); if (b < 1024) return b + ' B';
    const u = ['KB', 'MB', 'GB', 'TB', 'PB']; let i = -1;
    do { b /= 1024; i++; } while (b >= 1024 && i < u.length - 1);
    return b.toFixed(b >= 10 ? 0 : 1) + ' ' + u[i];
  }
  function normalizeAttachments(payload) {
    if (!payload) return [];
    try {
      const parsed = typeof payload === 'string' ? JSON.parse(payload) : payload;
      if (Array.isArray(parsed)) return parsed;
      if (parsed && Array.isArray(parsed.files)) return parsed.files;
      return [];
    } catch {
      return String(payload).split(/[\n,]+/)
        .map(s => s.trim()).filter(Boolean)
        .map(s => {
          const p = s.split('|').map(x => x.trim());
          return p.length >= 2 ? { name: p[0], url: p[1], size: p[2] } : { url: s };
        });
    }
  }
  function setDateInput(id, v) {
    const el = document.getElementById(id);
    if (!el) return;
    const s = (v && /^\d{4}-\d{2}-\d{2}$/.test(String(v))) ? v : '';
    el.value = s;
  }
  const showEl = (el, show) => { if (el) el.hidden = !show; };

  // ---------- Disapproval viewer logic ----------
  function renderRejectAttachments(target, payload) {
    if (!target) return;
    target.innerHTML = '';
    const items = normalizeAttachments(payload);
    if (!items.length) {
      target.innerHTML = '<div class="rcpa-empty">No attachments</div>';
      return;
    }
    items.forEach(it => {
      const url = it?.url || it?.href || it?.path || '';
      let name = it?.name || it?.filename || '';
      const size = it?.size ?? it?.bytes;

      if (!name) {
        if (url) {
          try { name = decodeURIComponent(url.split('/').pop().split('?')[0]) || 'Attachment'; }
          catch { name = url.split('/').pop().split('?')[0] || 'Attachment'; }
        } else name = 'Attachment';
      }

      const safeName = escapeHTML(name);
      const safeUrl = escapeHTML(url);
      const sizeTxt = (size === '' || size == null) ? '' :
        (isNaN(size) ? escapeHTML(String(size)) : escapeHTML(humanSize(size)));

      const row = document.createElement('div');
      row.className = 'file-chip';
      row.innerHTML = `
        <i class="fa-solid fa-paperclip" aria-hidden="true"></i>
        <div class="file-info">
          <div class="name">${url ? `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer" title="${safeName}">${safeName}</a>`
          : `<span title="${safeName}">${safeName}</span>`}</div>
          <div class="sub">${sizeTxt}</div>
        </div>
      `;
      target.appendChild(row);
    });
  }
  function openRejectRemarks(text, attachmentsPayload) {
    if (!rjModal) return;
    if (rjText) rjText.value = text || '';
    renderRejectAttachments(rjList, attachmentsPayload);
    rjModal.removeAttribute('hidden');
    requestAnimationFrame(() => rjModal.classList.add('show'));
  }
  function closeRejectRemarks() {
    if (!rjModal) return;
    rjModal.classList.remove('show');
    const onEnd = (e) => {
      if (e.target !== rjModal || e.propertyName !== 'opacity') return;
      rjModal.removeEventListener('transitionend', onEnd);
      rjModal.setAttribute('hidden', '');
      if (rjText) rjText.value = '';
      if (rjList) rjList.innerHTML = '';
    };
    rjModal.addEventListener('transitionend', onEnd);
  }
  rjClose && rjClose.addEventListener('click', closeRejectRemarks);
  rjModal && rjModal.addEventListener('click', (e) => { if (e.target === rjModal) closeRejectRemarks(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && rjModal && !rjModal.hidden) closeRejectRemarks(); });

  // ---------- Rejects table (mini-list inside the main view modal) ----------
  function renderRejectsTable(items) {
    const tb = document.querySelector('#rcpa-rejects-table tbody');
    const fs = document.querySelector('fieldset.reject-remarks'); // fieldset to toggle
    const vm = document.getElementById('rcpa-view-modal');
    if (!tb) return;

    const list = Array.isArray(items) ? items : [];

    if (!list.length) {
      tb.innerHTML = `<tr><td class="rcpa-empty" colspan="3">No records found</td></tr>`;
      if (vm) vm.__rejects = [];
      if (fs) { fs.hidden = true; fs.setAttribute('aria-hidden', 'true'); } // hide when empty
      return;
    }

    // Show when there is data
    if (fs) { fs.hidden = false; fs.removeAttribute('aria-hidden'); }

    if (vm) vm.__rejects = list;

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
      </tr>
    `;
    }).join('');
  }

  // Hook the “View” buttons via delegation
  (function hookRejectsActions() {
    const table = document.getElementById('rcpa-rejects-table');
    if (!table) return;
    table.addEventListener('click', (e) => {
      const btn = e.target.closest('.rcpa-reject-view');
      if (!btn) return;
      const vm = document.getElementById('rcpa-view-modal');
      const cache = (vm && vm.__rejects) || [];
      const idx = parseInt(btn.getAttribute('data-idx'), 10);
      const item = cache[idx];
      if (!item) return;
      openRejectRemarks(item.remarks || '', item.attachments);
    });
  })();

  // ---------- View modal helpers ----------
  let currentViewId = null;
  let editing = false;

  const EDITABLE_IDS = ['rcpa-view-remarks', 'rcpa-view-system', 'rcpa-view-clauses'];

  const setVal = (id, v) => { const el = document.getElementById(id); if (el) el.value = v ?? ''; };
  const setChecked = (id, on) => { const el = document.getElementById(id); if (el) el.checked = !!on; };
  const showCond = (id, show) => { const el = document.getElementById(id); if (el) el.hidden = !show; };

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
      if (e.target.matches?.('input[type="checkbox"].readonly-check') &&
        (e.key === ' ' || e.key === 'Spacebar' || e.key === 'Enter')) {
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

  function setEditMode(on) {
    editing = on;
    EDITABLE_IDS.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      if (on) el.removeAttribute('readonly');
      else el.setAttribute('readonly', '');
      el.classList.toggle('is-editing', on);
    });
  }

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

    // Reset Disapprove Remarks table + hide fieldset by default
    const tb = document.querySelector('#rcpa-rejects-table tbody');
    if (tb) tb.innerHTML = `<tr><td class="rcpa-empty" colspan="3">No records found</td></tr>`;
    const rejectsFs = document.querySelector('fieldset.reject-remarks');
    if (rejectsFs) { rejectsFs.hidden = true; rejectsFs.setAttribute('aria-hidden', 'true'); }

    const vm = document.getElementById('rcpa-view-modal');
    if (vm) vm.__rejects = [];

    // Reset reject viewer modal bits
    if (rjText) rjText.value = '';
    if (rjList) rjList.innerHTML = '';

    // Hide Assignee Validation fieldset
    const valFS = document.getElementById('rcpa-view-valid-fieldset');
    if (valFS) valFS.hidden = true;

    // Uncheck validation toggles
    ['rcpa-view-findings-valid', 'rcpa-view-for-nc-valid', 'rcpa-view-for-pnc']
      .forEach(id => setChecked(id, false));

    // Clear validation values
    [
      'rcpa-view-root-cause', 'rcpa-view-correction', 'rcpa-view-corrective', 'rcpa-view-preventive',
      'rcpa-view-correction-target', 'rcpa-view-correction-done',
      'rcpa-view-corrective-target', 'rcpa-view-corrective-done',
      'rcpa-view-preventive-target', 'rcpa-view-preventive-done',
      'rcpa-view-assignee-sign', 'rcpa-view-assignee-sup-sign'
    ].forEach(id => setVal(id, ''));

    const vlist = document.getElementById('rcpa-view-valid-attach-list');
    if (vlist) vlist.innerHTML = '';

    // Hide NC/PNC grids
    showCond('rcpa-valid-nc-grid', false);
    showCond('rcpa-valid-corrective-grid', false);
    showCond('rcpa-valid-pnc-grid', false);

    // Show both labels by default
    const lblNC = document.querySelector('.checkbox-for-non-conformance');
    const lblPNC = document.querySelector('.checkbox-for-potential-non-conformance');
    if (lblNC) lblNC.hidden = false;
    if (lblPNC) lblPNC.hidden = false;

    currentViewId = null;
    setEditMode(false);
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

  // Remarks attachments (originator)
  function renderAttachments(s, target) {
    if (!target) return;
    target.innerHTML = '';
    if (s == null || s === '') return;

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
      const url = it?.url || it?.href || it?.path || '';
      let name = it?.name || it?.filename || '';
      let size = (it?.size ?? it?.bytes) ?? '';

      if (!name) {
        if (url) {
          try { name = decodeURIComponent(url.split('/').pop().split('?')[0]) || 'Attachment'; }
          catch { name = url.split('/').pop().split('?')[0] || 'Attachment'; }
        } else { name = 'Attachment'; }
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
        </div>
      `;
      target.appendChild(row);
    });
  }

  function fillFindingsInValidation(data) {
    const fieldset = document.querySelector('.validation-invalid');
    const notValidCheckbox = document.getElementById('rcpa-view-findings-not-valid');
    const reasonTextarea = document.getElementById('rcpa-view-not-valid-reason');
    const attachList = document.getElementById('rcpa-view-not-valid-attach-list');

    if (!data || Object.keys(data).length === 0) {
      fieldset.hidden = true;
      return;
    }

    fieldset.hidden = false;
    notValidCheckbox.checked = true;

    if (data.reason_non_valid) setVal('rcpa-view-not-valid-reason', data.reason_non_valid);
    if (data.attachment) renderAttachments(data.attachment, attachList);

    if (data.assignee_name) setVal('rcpa-view-invalid-assignee-sign', `${data.assignee_name} / ${data.assignee_date}`);
    if (data.assignee_supervisor_name) setVal('rcpa-view-invalid-assignee-sup-sign', `${data.assignee_supervisor_name} / ${data.assignee_supervisor_date}`);
    if (data.qms_name) setVal('rcpa-view-invalid-qms-sign', `${data.qms_name} / ${data.qms_date}`);
    if (data.originator_name) setVal('rcpa-view-invalid-originator-sign', `${data.originator_name} / ${data.originator_date}`);
  }

  // --- bind the Why-Why button if present in DOM ---
  function bindWhyWhyButton() {
    const btn = document.getElementById('rcpa-view-open-why');
    if (btn && !btn.dataset.boundWhy) {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        openWhyViewModal();
      });
      btn.dataset.boundWhy = '1';
    }
  }
  // Bind immediately (button exists in your HTML)
  bindWhyWhyButton();

  // NEW: show Assignee Validation fieldset only when there’s data
  function fillAssigneeValidation(payload, conformanceStr) {
    const fs = document.getElementById('rcpa-view-valid-fieldset');
    if (!fs) return;

    // (Re)bind in case this code runs before DOM was ready
    bindWhyWhyButton();

    const hasNC = payload?.nc && Object.keys(payload.nc).length > 0;
    const hasPNC = payload?.pnc && Object.keys(payload.pnc).length > 0;

    if (!hasNC && !hasPNC) { fs.hidden = true; return; }
    fs.hidden = false;

    setChecked('rcpa-view-findings-valid', true);

    const norm = String(conformanceStr || '').toLowerCase();
    const preferNC = norm.includes('non-conformance') && !norm.includes('potential');
    const selected =
      (preferNC && hasNC) ? { type: 'nc', ...payload.nc } :
        (hasPNC ? { type: 'pnc', ...payload.pnc } :
          (hasNC ? { type: 'nc', ...payload.nc } : null));

    if (!selected) { fs.hidden = true; return; }

    setVal('rcpa-view-root-cause', selected.root_cause || '');
    renderAttachments(selected.attachment, document.getElementById('rcpa-view-valid-attach-list'));

    const assigneeLine = [selected.assignee_name, selected.assignee_date].filter(Boolean).join(' / ');
    const supLine = [selected.assignee_supervisor_name, selected.assignee_supervisor_date].filter(Boolean).join(' / ');
    setVal('rcpa-view-assignee-sign', assigneeLine);
    setVal('rcpa-view-assignee-sup-sign', supLine);

    const lblNC = document.querySelector('.checkbox-for-non-conformance');
    const lblPNC = document.querySelector('.checkbox-for-potential-non-conformance');

    if (selected.type === 'nc') {
      setChecked('rcpa-view-for-nc-valid', true);
      setChecked('rcpa-view-for-pnc', false);

      showEl(lblNC, true);
      showEl(lblPNC, false);

      showCond('rcpa-valid-nc-grid', true);
      showCond('rcpa-valid-corrective-grid', true);
      showCond('rcpa-valid-pnc-grid', false);

      setVal('rcpa-view-correction', selected.correction || '');
      setDateInput('rcpa-view-correction-target', selected.correction_target_date);
      setDateInput('rcpa-view-correction-done', selected.correction_date_completed);

      setVal('rcpa-view-corrective', selected.corrective || '');
      setDateInput('rcpa-view-corrective-target', selected.corrective_target_date);
      setDateInput('rcpa-view-corrective-done', selected.correction_date_completed);
    } else {
      setChecked('rcpa-view-for-nc-valid', false);
      setChecked('rcpa-view-for-pnc', true);

      showEl(lblNC, false);
      showEl(lblPNC, true);

      showCond('rcpa-valid-nc-grid', false);
      showCond('rcpa-valid-corrective-grid', false);
      showCond('rcpa-valid-pnc-grid', true);

      setVal('rcpa-view-preventive', selected.preventive_action || '');
      setDateInput('rcpa-view-preventive-target', selected.preventive_target_date);
      setDateInput('rcpa-view-preventive-done', selected.preventive_date_completed);
    }
  }

  // ---- Why-Why Analysis: rendering + open/close ----
  // ---- Why-Why Analysis: rendering + open/close ----
  function renderWhyViewList(rows) {
    if (!whyViewList) return;

    // Inject the responsive 2-col style once
    if (!document.getElementById('rcpa-why-two-col-style')) {
      const style = document.createElement('style');
      style.id = 'rcpa-why-two-col-style';
      style.textContent = `
      #rcpa-why-view-modal #rcpa-why-view-list.two-col {
        display: grid !important;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
      }
      @media (max-width: 720px) {
        #rcpa-why-view-modal #rcpa-why-view-list.two-col {
          grid-template-columns: 1fr;
        }
      }
    `;
      document.head.appendChild(style);
    }

    if (!rows || rows.length === 0) {
      whyViewList.classList.remove('two-col');
      whyViewList.style.display = 'flex';
      whyViewList.style.flexDirection = 'column';
      whyViewList.innerHTML = `<div class="rcpa-empty">No Why-Why analysis found for this record.</div>`;
      return;
    }

    // Group by category (analysis_type)
    const groups = rows.reduce((m, r) => {
      (m[r.analysis_type] = m[r.analysis_type] || []).push(r);
      return m;
    }, {});
    const entries = Object.entries(groups);

    // 2-column layout ONLY when exactly 2 categories exist
    if (entries.length === 2) {
      whyViewList.classList.add('two-col');
    } else {
      whyViewList.classList.remove('two-col');
      whyViewList.style.display = 'flex';
      whyViewList.style.flexDirection = 'column';
    }

    const html = entries.map(([type, arr]) => {
      const items = arr.map((r, idx) => {
        const isRoot = String(r.answer).toLowerCase() === 'yes';

        // Base card styling + conditional red border for root cause
        const base = 'padding:10px;border-radius:6px;background:#f9fafb;';
        const border = isRoot
          ? 'border:2px solid #ef4444; box-shadow: inset 0 0 0 2px rgba(239,68,68,.05);'
          : 'border:1px solid #e5e7eb;';

        const badge = isRoot
          ? `<span class="badge" style="display:inline-block;padding:2px 6px;border-radius:999px;border:1px solid #16a34a;margin-left:6px;font-size:12px;">Root Cause</span>`
          : '';

        return `
        <div class="why-item${isRoot ? ' is-root' : ''}" style="${base}${border}">
          <div style="font-weight:600;margin-bottom:6px;">Why ${idx + 1}${badge}</div>
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
    if (!currentViewId) return;

    if (whyViewDesc) whyViewDesc.value = '';
    if (whyViewList) whyViewList.innerHTML = '<div class="rcpa-empty">Loading…</div>';

    fetch(`../php-backend/rcpa-why-analysis-list.php?rcpa_no=${encodeURIComponent(currentViewId)}`, { credentials: 'same-origin' })
      .then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then(data => {
        const desc = data?.description_of_findings || '';
        if (whyViewDesc) whyViewDesc.value = desc;

        const items = Array.isArray(data?.rows) ? data.rows : [];
        renderWhyViewList(items);
      })
      .catch(err => {
        if (whyViewList) whyViewList.innerHTML = `<div class="rcpa-empty">Failed to load analysis.</div>`;
        console.error(err);
      });

    if (whyViewModal) {
      whyViewModal.removeAttribute('hidden');
      requestAnimationFrame(() => whyViewModal.classList.add('show'));
      document.body.style.overflow = 'hidden';
    }
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

  // Close handlers for Why-Why view modal
  whyViewClose?.addEventListener('click', closeWhyViewModal);
  whyViewOk?.addEventListener('click', closeWhyViewModal);
  whyViewModal?.addEventListener('click', (e) => { if (e.target === whyViewModal) closeWhyViewModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && whyViewModal && !whyViewModal.hidden) closeWhyViewModal(); });

  // Fill all modal fields from the row AND render disapprovals
  function fillViewModal(row) {
    currentViewId = row.id || null;

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

    const confNorm = String(row.conformance || '').toLowerCase().replace(/[\s_-]+/g, ' ').trim();
    let isPNC = (confNorm === 'pnc') || confNorm.includes('potential');
    let isNC = false;
    if (!isPNC) {
      isNC = (confNorm === 'nc') ||
        /\bnon[- ]?conformance\b/.test(confNorm) ||
        confNorm === 'non conformance' ||
        confNorm === 'nonconformance';
    }
    if (cat === 'observation') { isPNC = true; isNC = false; }
    else if (cat === 'major' || cat === 'minor') { isPNC = false; isNC = true; }

    setChecked('rcpa-view-flag-pnc', isPNC);
    setChecked('rcpa-view-flag-nc', isNC);

    setVal('rcpa-view-remarks', row.remarks);
    renderAttachments(row.remarks_attachment, document.getElementById('rcpa-view-attach-list'));

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

    renderRejectsTable(row.rejects || []);
    fillFindingsInValidation(row.findings_invalidation);

    fillAssigneeValidation(row.validation_assignee, row.conformance);

    setEditMode(false);
  }

  // ---------- Modal show/hide ----------
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

  [closeX].forEach?.(el => el && el.addEventListener('click', hideModal));
  if (closeX && !Array.isArray(closeX)) closeX.addEventListener('click', hideModal);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !modal.hidden) hideModal(); });

  // ---------- VIEW action ----------
  document.addEventListener('rcpa:action', async (e) => {
    const { action, id } = e.detail || {};
    if (action !== 'view' || !id) return;

    clearViewForm();
    try {
      const res = await fetch(`../php-backend/rcpa-view-assignee-pending.php?id=${encodeURIComponent(id)}`, { credentials: 'same-origin' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const row = await res.json();
      if (!row || !row.id) { alert('Record not found.'); return; }
      fillViewModal(row);
      lockViewCheckboxes();
      showModal();
      requestAnimationFrame(() => document.getElementById('rcpa-view-modal')?.__renderStatusFlow?.(row.id || id));
    } catch (err) {
      console.error(err);
      alert('Failed to load record. Please try again.');
    }
  });
})();

(function initStatusFlowView() {
  const viewModal = document.getElementById('rcpa-view-modal');

  // One-time CSS (only .done is green)
  if (!document.getElementById('rcpa-status-flow-css')) {
    const st = document.createElement('style');
    st.id = 'rcpa-status-flow-css';
    st.textContent = `
      #rcpa-status-flow .flow-label{color:#9ca3af; font-size:.78rem;}
      #rcpa-status-flow .flow-step.next .flow-label{color:#6b7280;}
      #rcpa-status-flow .flow-step.done .flow-label{color:#22c55e;}
      #rcpa-status-flow .flow-top{font-size:.8rem; color:#6b7280;}
      #rcpa-status-flow .flow-top .flow-date{font-size:.75rem; color:#9ca3af;}
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
    // VALID path
    VALID_APPROVAL: /the\s+assignee\s+supervisor\/manager\s+approved\s+the\s+assignee\s+reply\s+as\s+valid\.?/i,
    VALIDATION_REPLY: /the\s+valid\s+reply\s+by\s+assignee\s+was\s+approved\s+by\s+qms\.?/i,
    REPLY_CHECKING_ORIG: /the\s+originator\s+approved\s+the\s+valid\s+reply\.?/i,
    FOR_CLOSING: /the\s+assignee\s+request(?:ed)?\s+approval\s+for\s+corrective\s+action\s+evidence\.?/i,
    FOR_CLOSING_APPROVAL: /the\s+assignee\s+supervisor\/manager\s+approved\s+the\s+assignee\s+corrective\s+action\s+evidence\s+approval\.?/i,
    EVIDENCE_CHECKING: /the\s+qms\s+accepted\s+the\s+corrective\s+reply\s+for\s+evidence\s+checking\s*\(originator\)\.?/i,
    EVIDENCE_CHECKING_ORIG: /originator\s+approved\s+the\s+corrective\s+evidence\.?/i,
    FINAL_APPROVAL_VALID: /final\s+approval\s+given\.\s*request\s+closed\s*\(valid\)\.?/i,
    // INVALID path
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

    // Load history
    let rows = [];
    try {
      const res = await fetch(`../php-backend/rcpa-history.php?id=${encodeURIComponent(rcpaNo)}`, {
        credentials: 'same-origin', headers: { 'Accept': 'application/json' }
      });
      const data = await res.json().catch(() => ({}));
      rows = Array.isArray(data?.rows) ? data.rows : [];
    } catch { rows = []; }

    // Build steps (freeze branch when status is ASSIGNEE PENDING)
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

    // Clamp future (and current) to defaults
    const cutoffIdx = STEPS.indexOf(statusNow);
    if (cutoffIdx >= 0) STEPS.forEach((k, i) => { if (i > cutoffIdx) stepData[k] = { name: '—', date: '', ts: 0 }; });

    // Fill DOM
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

    // done/next flags — current is NOT done
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

    // progress
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

  let agoTimer = null;

  const esc = (s) => ('' + (s ?? '')).replace(/[&<>"'`=\/]/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '`': '&#96;', '=': '&#61;', '/': '&#47;'
  }[m]));

  const fmtDate = (s) => {
    if (!s || /^0{4}-0{2}-0{2}/.test(String(s))) return '';
    const d = new Date(String(s).replace(' ', 'T'));
    if (isNaN(d)) return String(s);

    const month = d.toLocaleString('en-US', { month: 'short' });
    const day = String(d.getDate()).padStart(2, '0');
    const year = d.getFullYear();
    let h = d.getHours();
    const m = String(d.getMinutes()).padStart(2, '0');
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12; if (h === 0) h = 12;

    // Example: "Aug 19, 2025, 10:32 AM"
    return `${month} ${day}, ${year}, ${h}:${m} ${ampm}`;
  };

  // --- helpers for relative time ---
  const parseDT = (s) => {
    if (!s) return null;
    const d = new Date(String(s).replace(' ', 'T'));
    return isNaN(d) ? null : d;
  };

  const timeAgo = (s) => {
    if (!s) return '';
    const d = new Date(String(s).replace(' ', 'T'));
    if (isNaN(d)) return '';
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


  const renderDateCell = (s) => {
    const d = parseDT(s);
    if (!d) return esc(String(s || ''));
    const iso = d.toISOString();
    const abs = esc(fmtDate(d));
    const rel = timeAgo(d);
    return `
      <div class="dt">
        <div class="dt-line1">${abs}</div>
        <div class="dt-line2">
          <time class="rcpa-ago js-ago" datetime="${iso}" data-ts="${d.getTime()}">
            ${rel ? `(${rel})` : ''}
          </time>
        </div>
      </div>
    `;
  };

  function startAgoTicker(rootEl) {
    stopAgoTicker();
    const update = () => {
      rootEl.querySelectorAll('.js-ago').forEach(el => {
        const ts = Number(el.getAttribute('data-ts'));
        if (!ts) return;
        const rel = timeAgo(new Date(ts));
        el.textContent = rel ? `(${rel})` : '';
        el.title = new Date(ts).toLocaleString();
      });
    };
    update();
    agoTimer = setInterval(update, 60 * 1000);
  }
  function stopAgoTicker() {
    if (agoTimer) { clearInterval(agoTimer); agoTimer = null; }
  }

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
    stopAgoTicker();
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
                  ${timeAgo(h.date_time) ? `<span class="rcpa-ago">(${timeAgo(h.date_time)})</span>` : ''}
                </td>
                <td>${esc(h.name)}</td>
                <td>${esc(h.activity)}</td>
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
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && historyModal.classList.contains('show')) closeHistoryModal();
  });

  // Listen for the action dispatched from your table JS
  document.addEventListener('rcpa:action', (e) => {
    const { action, id } = e.detail || {};
    if (action === 'history' && id) openHistoryModal(id);
  });
})();

/* ====== VALIDATION REPLY MODAL: open, validate, submit ====== */
(function () {
  // --- VALID MODAL refs ---
  const overlay = document.getElementById('rcpa-valid-modal');
  const closeX = document.getElementById('rcpa-valid-close');
  const form = document.getElementById('rcpa-valid-form');
  const submitBtn = document.getElementById('rcpa-valid-submit');
  const backBtn = document.getElementById('rcpa-valid-back');
  const errEl = document.getElementById('rcpa-valid-error');
  const attachTrigger = document.getElementById('valid-attach-trigger');
  const attachInput = document.getElementById('valid-attachments');
  const attachList = document.getElementById('valid-attach-list');
  const rootCause = document.getElementById('valid-root-cause');

  // --- WHY-WHY MODAL refs ---
  const whyOverlay = document.getElementById('rcpa-why-modal');
  const whyClose = document.getElementById('rcpa-why-close');
  const whyText = document.getElementById('rcpa-why-text');
  const whyNext = document.getElementById('rcpa-why-next');
  const whyChainsContainer = document.getElementById('rcpa-why-chains-container');
  const whyAddBtn = document.getElementById('rcpa-why-add-chain');
  const whyErr = document.getElementById('rcpa-why-error');

  let fileMap = new Map();
  let mode = 'OTHER';
  let saving = false;

  // --- helpers to guarantee editability (legacy safe no-op for removed RO box) ---
  function ensureEditable(el) {
    if (!el) return;
    el.removeAttribute('readonly');
    el.removeAttribute('disabled');
    el.readOnly = false;
    el.disabled = false;
    el.style.pointerEvents = 'auto';
  }
  function unfreezeChain(chain) {
    if (!chain) return;
    chain.querySelectorAll('input, select, textarea').forEach(ensureEditable);
  }

  // Keep “Add New Analysis” right below the description textarea
  (function placeWhyAddBtnBelowTextarea() {
    if (!whyAddBtn || !whyText) return;
    const wrap = whyText.closest('.textarea-wrap') || whyText.parentElement || whyText;
    wrap.insertAdjacentElement('afterend', whyAddBtn);
    whyAddBtn.hidden = false;
    if (!whyAddBtn.style.marginTop) whyAddBtn.style.marginTop = '12px';
  })();

  // ------------ Why-Why Modal Logic (UPDATED) ------------
  function levelHTML(chainId, levelIndex) {
    const radioName = `root-cause-${chainId}-${levelIndex}`;
    const prompt = (levelIndex === 0) ? ' Why did this occur?' : '';
    const categoryHTML = levelIndex === 0 ? `
    <label for="rcpa-why-category-${chainId}-${levelIndex}" class="field-title">Category</label>
    <select id="rcpa-why-category-${chainId}-${levelIndex}" class="rcpa-why-category"
            style="width:100%;padding:10px;font-size:14px;border:1px solid #d1d5db;border-radius:6px;margin-top:4px; margin-bottom: 16px;">
      <option value="Man">Man</option>
      <option value="Method">Method</option>
      <option value="Environment">Environment</option>
      <option value="Machine">Machine</option>
      <option value="Material">Material</option>
    </select>
  ` : '';

    return `
    <div class="why-level" data-level="${levelIndex}" style="
          padding:16px;background-color:#f9fafb;border-radius:8px;border:1px solid #e5e7eb;
          margin-top:${levelIndex > 0 ? '16px' : '0'};">
      ${categoryHTML}
      <div style="display:flex;align-items:flex-start;gap:16px;flex-wrap:wrap;">
        <div style="flex:3;display:flex;flex-direction:column;gap:8px;min-width:150px;">
          <label for="rcpa-why-reason-${chainId}-${levelIndex}" class="field-title why-label">
            Why #${levelIndex + 1}:${prompt}
          </label>
          <input type="text" id="rcpa-why-reason-${chainId}-${levelIndex}" class="rcpa-why-reason"
                 style="width:100%;padding:10px;font-size:14px;border:1px solid #d1d5db;border-radius:6px;min-width:150px;">
        </div>
        <div style="flex:1;display:flex;flex-direction:column;gap:8px;min-width:120px;">
          <label class="field-title">Is this the root cause?</label>
          <div style="display:flex;flex-direction:row;align-items:center;gap:12px;padding-top:8px;">
            <label style="display:flex;align-items:center;gap:6px;font-size:14px;cursor:pointer;">
              <input type="radio" name="${radioName}" value="yes" style="width:16px;height:16px;accent-color:#3b82f6;cursor:pointer;"> Yes
            </label>
            <label style="display:flex;align-items:center;gap:6px;font-size:14px;cursor:pointer;">
              <input type="radio" name="${radioName}" value="no" style="width:16px;height:16px;accent-color:#3b82f6;cursor:pointer;"> No
            </label>
          </div>
        </div>
      </div>
    </div>
  `;
  }

  function addNewAnalysisChain() {
    const chainId = `chain-${Date.now()}`;
    const chain = document.createElement('div');
    chain.className = 'why-chain';
    chain.dataset.chainId = chainId;
    chain.style.cssText = `
      position:relative;border:1px solid #d1d5db;border-radius:8px;padding:16px;background:#fff;
      flex:1;min-width:600px;max-width:700px;`;

    chain.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <h3 style="margin:0;font-size:16px;font-weight:600;">Analysis Chain</h3>
        <button type="button" class="why-chain-delete" aria-label="Delete this analysis chain"
                style="border:none;background:transparent;font-size:24px;cursor:pointer;color:#9ca3af;line-height:1;">&times;</button>
      </div>
      <div class="why-levels-container"></div>
      <div class="why-controls" style="display:flex;gap:8px;justify-content:flex-start;margin-top:12px;">
        <button type="button" class="rcpa-btn rcpa-btn-secondary why-add-level" style="padding:6px 10px;">
          <i class="fa-solid fa-plus" style="margin-right:6px;"></i> Add Why
        </button>
        <button type="button" class="rcpa-btn rcpa-btn-secondary why-remove-level" style="padding:6px 10px;">
          <i class="fa-solid fa-minus" style="margin-right:6px;"></i> Remove Why
        </button>
      </div>
    `;

    const levelsContainer = chain.querySelector('.why-levels-container');
    levelsContainer.innerHTML = levelHTML(chainId, 0); // start with one row

    whyChainsContainer.appendChild(chain);
    if (whyErr) whyErr.textContent = '';
  }

  function reindexLevels(chain) {
    const chainId = chain.dataset.chainId;
    const levels = chain.querySelectorAll('.why-level');
    levels.forEach((el, i) => {
      el.dataset.level = String(i);

      const inp = el.querySelector('.rcpa-why-reason');
      if (inp) inp.id = `rcpa-why-reason-${chainId}-${i}`;

      const whyLabel = el.querySelector('label.why-label');
      if (whyLabel) {
        whyLabel.setAttribute('for', `rcpa-why-reason-${chainId}-${i}`);
        whyLabel.textContent = `Why #${i + 1}:${i === 0 ? ' Why did this occur?' : ''}`;
      }

      const yes = el.querySelector('input[type="radio"][value="yes"]');
      const no = el.querySelector('input[type="radio"][value="no"]');
      if (yes) yes.name = `root-cause-${chainId}-${i}`;
      if (no) no.name = `root-cause-${chainId}-${i}`;

      // show Category only on first level
      const catWrap = el.querySelector('.rcpa-why-category')?.closest('label')?.parentElement
        || el.querySelector('.rcpa-why-category')?.parentElement;
      if (catWrap) catWrap.style.display = (i === 0) ? '' : 'none';
    });
  }

  function clearRootHighlights(chain) {
    chain.querySelectorAll('.rcpa-why-reason').forEach(inp => {
      inp.style.border = '';
      inp.style.boxShadow = '';
    });
    chain.classList.remove('is-complete');
  }

  function highlightRoot(chain, levelEl) {
    clearRootHighlights(chain);
    const inp = levelEl.querySelector('.rcpa-why-reason');
    if (inp) {
      inp.style.border = '2px solid #ef4444';
      inp.style.boxShadow = '0 0 0 2px rgba(239,68,68,.08) inset';
    }
    chain.classList.add('is-complete');
  }

  // Event delegation inside Why-Why modal
  whyChainsContainer?.addEventListener('click', (e) => {
    const target = e.target;

    // Delete whole chain
    if (target.classList.contains('why-chain-delete')) {
      const chain = target.closest('.why-chain');
      chain?.remove();
      if (whyChainsContainer.childElementCount === 0) addNewAnalysisChain();
      return;
    }

    // + Add Why
    if (target.classList.contains('why-add-level')) {
      const chain = target.closest('.why-chain');
      if (!chain) return;
      const chainId = chain.dataset.chainId;
      const levelsContainer = chain.querySelector('.why-levels-container');
      const newIndex = levelsContainer.querySelectorAll('.why-level').length;
      levelsContainer.insertAdjacentHTML('beforeend', levelHTML(chainId, newIndex));
      reindexLevels(chain);
      unfreezeChain(chain);
      return;
    }

    // − Remove Why (keep at least one level)
    if (target.classList.contains('why-remove-level')) {
      const chain = target.closest('.why-chain');
      if (!chain) return;
      const levels = chain.querySelectorAll('.why-level');
      if (levels.length <= 1) return;
      const last = levels[levels.length - 1];

      const yes = last.querySelector('input[type="radio"][value="yes"]');
      if (yes?.checked) clearRootHighlights(chain);

      last.remove();
      reindexLevels(chain);

      // if another level is still YES, keep highlight on it
      const yesEl = chain.querySelector('input[type="radio"][value="yes"]:checked')?.closest('.why-level');
      if (yesEl) highlightRoot(chain, yesEl);
      return;
    }

    // Yes/No selection (enforce single root per chain + highlight)
    if (target.matches('input[type="radio"]')) {
      const level = target.closest('.why-level');
      const chain = target.closest('.why-chain');
      if (!level || !chain) return;

      if (target.value === 'yes') {
        // uncheck other YES radios across this chain
        chain.querySelectorAll('.why-level').forEach(lv => {
          if (lv === level) return;
          const yes = lv.querySelector('input[type="radio"][value="yes"]');
          const no = lv.querySelector('input[type="radio"][value="no"]');
          if (yes) yes.checked = false;
          if (no) no.checked = true;
        });
        highlightRoot(chain, level);
      } else {
        // if switching to NO and no other YES exists, clear highlights
        const anyYes = [...chain.querySelectorAll('input[type="radio"][value="yes"]')].some(r => r.checked);
        if (!anyYes) clearRootHighlights(chain);
        else {
          const yesEl = chain.querySelector('input[type="radio"][value="yes"]:checked')?.closest('.why-level');
          if (yesEl) highlightRoot(chain, yesEl);
        }
      }
    }
  });

  // Add new analysis chain button
  whyAddBtn?.addEventListener('click', addNewAnalysisChain);
  // ------------ END Why-Why (UPDATED) ------------

  // --- VALID MODAL Sections & fields ---
  const secNC = document.getElementById('valid-nc-section');
  const corrText = document.getElementById('valid-correction');
  const corrTarget = document.getElementById('valid-correction-target');
  const corrDone = document.getElementById('valid-correction-completed');
  const correcText = document.getElementById('valid-corrective');
  const correcTarget = document.getElementById('valid-corrective-target');
  const correcDone = document.getElementById('valid-corrective-completed');
  const secPNC = document.getElementById('valid-pnc-section');
  const pncText = document.getElementById('valid-pnc-text');
  const pncTarget = document.getElementById('valid-pnc-target');
  const pncDone = document.getElementById('valid-pnc-completed');

  // Disallow past dates for Target Date (Corrective)
  (() => {
    const pad = n => String(n).padStart(2, '0');
    const now = new Date();
    const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

    if (correcTarget) correcTarget.setAttribute('min', today); // #valid-corrective-target

    // OPTIONAL: also enforce for other target fields (uncomment if needed)
    // if (corrTarget) corrTarget.setAttribute('min', today);   // #valid-correction-target
    // if (pncTarget) pncTarget.setAttribute('min', today);     // #valid-pnc-target
  })();


  // --- Inline "Closing Due date: MMM DD, YYYY" on the Corrective Action label ---
  const correcLabel = document.querySelector('label[for="valid-corrective"]');
  if (correcLabel && !correcLabel.dataset.baseLabel) {
    correcLabel.dataset.baseLabel =
      correcLabel.textContent.trim() || 'Corrective Action (prevent recurrence)';
  }
  function formatYmdPretty(ymd) {
    if (!ymd) return '';
    // expect YYYY-MM-DD
    const y = parseInt(ymd.slice(0, 4), 10);
    const m = parseInt(ymd.slice(5, 7), 10) - 1;
    const d = parseInt(ymd.slice(8, 10), 10);
    if ([y, m, d].some(n => Number.isNaN(n))) return '';
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[m]} ${d}, ${y}`;
  }
  function updateCorrectiveLabel(closeDue) {
    if (!correcLabel) return;
    const base = correcLabel.dataset.baseLabel || 'Corrective Action (prevent recurrence)';
    const v = String(closeDue || '').trim();
    if (!v || v === '0000-00-00') {
      correcLabel.textContent = base;
      return;
    }
    const pretty = formatYmdPretty(v);
    correcLabel.textContent = pretty
      ? `${base} Closing Due date: ${pretty}`
      : base;
  }

  function normalizeConformance(s) {
    const v = String(s || '').toLowerCase();
    if (v.includes('potential')) return 'PNC';
    if (v.includes('non')) return 'NC';
    return 'OTHER';
  }

  function setMode(m) {
    mode = m;
    secNC.hidden = m !== 'NC';
    secPNC.hidden = m !== 'PNC';
  }

  function humanSize(bytes) {
    const u = ['B', 'KB', 'MB', 'GB', 'TB']; let i = 0, n = Number(bytes) || 0;
    while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
    return (n >= 10 ? n.toFixed(0) : n.toFixed(1)) + ' ' + u[i];
  }
  function sigOf(file) { return [file.name, file.size, file.lastModified || 0].join('::'); }

  function renderSelectedFiles() {
    if (!attachList) return;
    attachList.innerHTML = '';
    if (fileMap.size === 0) return;
    for (const [sig, f] of fileMap.entries()) {
      const chip = document.createElement('div');
      chip.className = 'file-chip';
      chip.style.cssText = 'display:flex;align-items:center;gap:8px;padding:6px 10px;border:1px solid var(--rcpa-border,#e5e7eb);border-radius:9999px;';
      chip.innerHTML = `
  <i class="fa-solid fa-paperclip" aria-hidden="true"></i>
  <span style="max-width:320px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${f.name}</span>
  <small style="color:#6b7280;">${humanSize(f.size)}</small>
  <button type="button" class="chip-remove" data-sig="${sig}" aria-label="Remove file" style="border:none;background:transparent;cursor:pointer;font-size:16px;line-height:1;">&times;</button>
  `;
      attachList.appendChild(chip);
    }
  }

  const openPicker = () => attachInput?.click();
  attachTrigger?.addEventListener('click', openPicker);
  attachTrigger?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPicker(); }
  });
  attachInput?.addEventListener('change', () => {
    if (!attachInput.files) return;
    Array.from(attachInput.files).forEach(f => {
      const sig = sigOf(f);
      if (!fileMap.has(sig)) fileMap.set(sig, f);
    });
    attachInput.value = '';
    renderSelectedFiles();
  });
  attachList?.addEventListener('click', (e) => {
    const btn = e.target.closest('.chip-remove');
    if (!btn) return;
    const sig = btn.getAttribute('data-sig');
    if (sig && fileMap.has(sig)) { fileMap.delete(sig); renderSelectedFiles(); }
  });

  function resetValidForm() {
    // Do NOT auto-fill from Why-Why
    if (rootCause) rootCause.value = '';
    [corrText, correcText, pncText].forEach(el => el && (el.value = ''));
    [corrTarget, corrDone, correcTarget, correcDone, pncTarget, pncDone].forEach(el => el && (el.value = ''));
    errEl.textContent = '';
    setMode('OTHER');
    updateCorrectiveLabel(null); // reset label to base on form reset
    // preserve attachments across back/next by default
  }

  // Preserve values when returning for the same record
  async function openValidModal(id, preserve = false, rootCauseText = '') {
    const sameRecord = overlay.dataset.id === String(id);
    overlay.dataset.id = id;
    if (!preserve || !sameRecord) resetValidForm();

    overlay.removeAttribute('hidden');
    requestAnimationFrame(() => overlay.classList.add('show'));
    document.body.style.overflow = 'hidden';
    // Avoid focusing a field that will be locked by Why-Why injection
    if (!preserve && !rootCauseText) setTimeout(() => rootCause?.focus(), 0);

    // helper to lock/unlock the Root Cause textarea
    const lockRootCauseField = (on) => {
      if (!rootCause) return;
      rootCause.readOnly = on;
      rootCause.disabled = on;
      rootCause.style.pointerEvents = on ? 'none' : 'auto';
      if (on) rootCause.setAttribute('title', 'Locked from Why-Why analysis');
      else rootCause.removeAttribute('title');
    };

    // ensure label starts clean before fetching
    updateCorrectiveLabel(null);

    try {
      const res = await fetch(`../php-backend/rcpa-view-assignee-pending.php?id=${encodeURIComponent(id)}`, { credentials: 'same-origin' });
      if (res.ok) {
        const row = await res.json();
        const m = normalizeConformance(row?.conformance);
        setMode(m);
        overlay.dataset.conformance = row?.conformance || '';

        // show formatted close_due_date inline on the Corrective Action label
        updateCorrectiveLabel(row?.close_due_date);
      }
    } catch { /* non-blocking */ }

    // === FIX: Always refresh and lock Root Cause when coming from Why-Why ===
    if (rootCause) {
      if (rootCauseText) {
        // Always overwrite with the latest selection and lock it
        rootCause.value = rootCauseText;
        lockRootCauseField(true);
      } else {
        // No incoming Why-Why text: lock based on mode (optional hardening)
        const mustLock = (mode === 'NC' || mode === 'PNC');
        lockRootCauseField(mustLock);
      }
    }
  }

  function closeValidModal() {
    overlay.classList.remove('show');
    const onEnd = (e) => {
      if (e.target !== overlay || e.propertyName !== 'opacity') return;
      overlay.removeEventListener('transitionend', onEnd);
      overlay.setAttribute('hidden', '');
      document.body.style.overflow = '';
    };
    overlay.addEventListener('transitionend', onEnd);
  }

  function openWhyModal(id) {
    if (!whyOverlay) { openValidModal(id, false); return; }
    whyOverlay.dataset.id = id;
    if (whyChainsContainer) {
      // reset content
      whyChainsContainer.innerHTML = '';
    }
    addNewAnalysisChain();
    if (whyErr) whyErr.textContent = '';
    const remarksEl = document.getElementById('rcpa-view-remarks');
    const remarksVal = remarksEl?.value ?? '';
    if (whyText) whyText.value = remarksVal;

    if (!remarksVal) {
      fetch(`../php-backend/rcpa-view-assignee-pending.php?id=${encodeURIComponent(id)}`, { credentials: 'same-origin' })
        .then(r => r.ok ? r.json() : null)
        .then(row => {
          if (row && whyText && !whyText.value) {
            whyText.value = row.remarks || '';
          }
        })
        .catch(() => { /* non-blocking */ });
    }
    whyOverlay.removeAttribute('hidden');
    requestAnimationFrame(() => whyOverlay.classList.add('show'));
    document.body.style.overflow = 'hidden';
  }

  function closeWhyModal() {
    if (!whyOverlay) return;
    whyOverlay.classList.remove('show');
    const onEnd = (e) => {
      if (e.target !== whyOverlay || e.propertyName !== 'opacity') return;
      whyOverlay.removeEventListener('transitionend', onEnd);
      whyOverlay.setAttribute('hidden', '');
      document.body.style.overflow = '';
    };
    whyOverlay.addEventListener('transitionend', onEnd);
  }

  whyClose?.addEventListener('click', closeWhyModal);
  whyOverlay?.addEventListener('click', (e) => { if (e.target === whyOverlay) closeWhyModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !whyOverlay?.hidden) closeWhyModal(); });

  // On Next: require at least one "Yes", save Why-Why analysis to DB, then (re)open Valid modal.
  // IMPORTANT: We pass preserve=true when returning to the same record, so user entries stay.
  whyNext?.addEventListener('click', async () => {
    const id = whyOverlay?.dataset.id;
    if (!id) return;

    const completedChains = whyChainsContainer.querySelectorAll('.why-chain.is-complete');
    if (completedChains.length === 0) {
      whyErr.textContent = 'Please complete at least one analysis chain by selecting "Yes" for a root cause.';
      return;
    }
    whyErr.textContent = '';

    // Build payload rows for DB
    const descFindings = (whyText?.value || '').trim();
    const rows = [];
    const chains = whyChainsContainer.querySelectorAll('.why-chain');
    chains.forEach(chain => {
      const chainId = chain.dataset.chainId;
      const firstLevel = chain.querySelector('.why-level[data-level="0"]');
      const catSel = firstLevel?.querySelector('.rcpa-why-category');
      const analysisType = catSel?.value || 'Man';

      const levels = chain.querySelectorAll('.why-level');
      levels.forEach(level => {
        const reasonInput = level.querySelector('.rcpa-why-reason');
        const whyOccur = (reasonInput?.value || '').trim();
        if (!whyOccur) return;
        const checked = level.querySelector('input[type="radio"]:checked');
        const ans = (checked?.value === 'yes') ? 'Yes' : 'No';
        rows.push({ chain_id: chainId, analysis_type: analysisType, why_occur: whyOccur, answer: ans });
      });
    });

    // Save to DB
    try {
      const res = await fetch('../php-backend/rcpa-why-analysis-save.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          rcpa_no: Number(id),
          description_of_findings: descFindings,
          rows
        })
      });
      if (!res.ok) {
        const t = await res.text().catch(() => '');
        throw new Error(`Save failed (${res.status}): ${t || 'Unknown error'}`);
      }
      const data = await res.json();
      if (!data?.success) throw new Error(data?.error || 'Save failed');
    } catch (err) {
      whyErr.textContent = err.message || 'Request failed while saving Why-Why analysis.';
      return;
    }

    // Collect identified root cause(s) from chains (YES rows) to pass to Valid modal
    const selectedRoots = [];
    chains.forEach(chain => {
      const yesLevel = chain.querySelector('input[type="radio"][value="yes"]:checked')?.closest('.why-level');
      if (!yesLevel) return;
      const reason = (yesLevel.querySelector('.rcpa-why-reason')?.value || '').trim();
      if (!reason) return;
      const cat = chain.querySelector('.why-level[data-level="0"] .rcpa-why-category')?.value || '';
      selectedRoots.push(cat ? `[${cat}] ${reason}` : reason);
    });
    const rootCauseText = selectedRoots.join('\n');

    // Transition to Valid modal, PRESERVING any typed values for the same record
    const sameRecord = overlay.dataset.id === String(id);
    whyOverlay.classList.remove('show');
    const onEnd = (e) => {
      if (e.target !== whyOverlay || e.propertyName !== 'opacity') return;
      whyOverlay.removeEventListener('transitionend', onEnd);
      whyOverlay.setAttribute('hidden', '');
      openValidModal(id, /*preserve*/ sameRecord, rootCauseText);
    };
    whyOverlay.addEventListener('transitionend', onEnd);
  });

  document.addEventListener('rcpa:action', (e) => {
    const { action, id } = e.detail || {};
    if (action === 'valid' && id) openWhyModal(id);
  });

  closeX?.addEventListener('click', () => { if (!saving) closeValidModal(); });
  overlay.addEventListener('click', (e) => { if (e.target === overlay && !saving) closeValidModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !saving) closeValidModal(); });

  backBtn?.addEventListener('click', () => {
    if (saving) return;
    const id = overlay.dataset.id;
    if (!id) return;
    overlay.classList.remove('show');
    const onEnd = (e) => {
      if (e.target !== overlay || e.propertyName !== 'opacity') return;
      overlay.removeEventListener('transitionend', onEnd);
      overlay.setAttribute('hidden', '');
      if (whyOverlay) {
        whyOverlay.dataset.id = id;
        whyOverlay.removeAttribute('hidden');
        requestAnimationFrame(() => whyOverlay.classList.add('show'));
      }
    };
    overlay.addEventListener('transitionend', onEnd);
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (saving) return;
    const id = overlay.dataset.id;
    const root = (rootCause?.value || '').trim();

    if ((mode === 'NC' || mode === 'PNC') && !root) {
      errEl.textContent = 'Please provide the root cause.'; rootCause.focus(); return;
    }
    if (mode === 'NC') {
      if (!corrText.value.trim()) { errEl.textContent = 'Please fill the Correction (immediate action).'; corrText.focus(); return; }
      if (!correcText.value.trim()) { errEl.textContent = 'Please fill the Corrective Action (prevent recurrence).'; correcText.focus(); return; }
    }
    if (mode === 'PNC' && !pncText.value.trim()) {
      errEl.textContent = 'Please fill the details for Potential Non-conformance.'; pncText.focus(); return;
    }

    // --- Require at least one attachment for NC/PNC submissions ---
    if ((mode === 'NC' || mode === 'PNC') && fileMap.size === 0) {
      if (window.Swal) {
        Swal.fire({
          icon: 'warning',
          title: 'Attachments required',
          text: 'Please attach at least one file before submitting.',
          confirmButtonText: 'OK'
        });
      } else {
        alert('Please attach at least one file before submitting.');
      }
      return;
    }

    // --- NEW: Require target dates ---
    if (mode === 'NC') {
      if (!corrTarget.value) {
        if (window.Swal) {
          await Swal.fire({
            icon: 'warning',
            title: 'Target date required',
            text: 'Please set a Target Date for Correction (immediate action).',
            confirmButtonText: 'OK'
          });
        } else {
          alert('Please set a Target Date for Correction (immediate action).');
        }
        corrTarget.focus();
        return;
      }
      if (!correcTarget.value) {
        if (window.Swal) {
          await Swal.fire({
            icon: 'warning',
            title: 'Target date required',
            text: 'Please set a Target Date for Corrective Action (prevent recurrence).',
            confirmButtonText: 'OK'
          });
        } else {
          alert('Please set a Target Date for Corrective Action (prevent recurrence).');
        }
        correcTarget.focus();
        return;
      }
    }
    if (mode === 'PNC') {
      if (!pncTarget.value) {
        if (window.Swal) {
          await Swal.fire({
            icon: 'warning',
            title: 'Target date required',
            text: 'Please set a Target Date for the Preventive Action.',
            confirmButtonText: 'OK'
          });
        } else {
          alert('Please set a Target Date for the Preventive Action.');
        }
        pncTarget.focus();
        return;
      }
    }
    // --- END NEW ---

    let endpoint = '';
    const fd = new FormData();
    if (mode === 'NC') {
      endpoint = '../php-backend/rcpa-valid-non-conformance-create.php';
      fd.append('rcpa_no', id);
      fd.append('root_cause', root);
      fd.append('correction', (corrText.value || '').trim());
      fd.append('correction_target_date', corrTarget.value || '');
      fd.append('correction_date_completed', corrDone.value || '');
      fd.append('corrective', (correcText.value || '').trim());
      fd.append('corrective_target_date', correcTarget.value || '');
      fd.append('corrective_date_completed', correcDone.value || '');
    } else if (mode === 'PNC') {
      endpoint = '../php-backend/rcpa-valid-potential-conformance-create.php';
      fd.append('rcpa_no', id);
      fd.append('root_cause', root);
      fd.append('preventive_action', (pncText.value || '').trim());
      fd.append('preventive_target_date', pncTarget.value || '');
      fd.append('preventive_date_completed', pncDone.value || '');
    } else {
      alert('No NC/PNC details required for this conformance.');
      closeValidModal();
      return;
    }

    for (const f of fileMap.values()) fd.append('attachments[]', f);

    const doInsert = async () => {
      const res = await fetch(endpoint, { method: 'POST', body: fd, credentials: 'same-origin' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!data || !data.success) throw new Error(data?.error || 'Insert failed');
      return data;
    };

    const confirmText = mode === 'NC' ? 'This will save Non-conformance actions.' : 'This will save Potential Non-conformance actions.';
    const lock = (on) => {
      saving = on;
      submitBtn.disabled = on;
      submitBtn.textContent = on ? 'Saving…' : 'Submit';
    };

    if (window.Swal) {
      Swal.fire({
        title: 'Submit this record?',
        text: confirmText,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Yes, save',
        cancelButtonText: 'Cancel',
        focusCancel: true,
        showLoaderOnConfirm: true,
        preConfirm: async () => {
          try {
            lock(true);
            return await doInsert();
          } catch (err) {
            Swal.showValidationMessage(err.message || 'Request failed');
            throw err;
          } finally {
            lock(false);
          }
        },
        allowOutsideClick: () => !Swal.isLoading()
      }).then((result) => {
        if (!result.isConfirmed) return;
        closeValidModal();
        Swal.fire({ icon: 'success', title: 'Saved successfully.', timer: 1600, showConfirmButton: false });
        document.dispatchEvent(new CustomEvent('rcpa:refresh'));
      });
      return;
    }

    if (!confirm('Submit this record?')) return;
    try {
      lock(true);
      await doInsert();
      closeValidModal();
      alert('Saved successfully.');
      document.dispatchEvent(new CustomEvent('rcpa:refresh'));
    } catch (err) {
      errEl.textContent = err.message || 'Request failed';
    } finally {
      lock(false);
    }
  });
})();


/* ====== INVALIDATION REPLY MODAL: open, validate, submit ====== */
(function () {
  const overlay = document.getElementById('rcpa-not-valid-modal');
  const closeX = document.getElementById('rcpa-not-valid-close');
  const form = document.getElementById('rcpa-not-valid-form');
  const submitBtn = document.getElementById('rcpa-not-valid-submit');
  const textarea = document.getElementById('not-valid-reason');
  const filesInp = document.getElementById('not-valid-files');
  const errEl = document.getElementById('rcpa-not-valid-error');

  const attachTrigger = document.getElementById('not-valid-attach-trigger');
  const attachList = document.getElementById('not-valid-attach-list');

  // keep a persistent list of selected files (append across picks)
  let fileMap = new Map(); // key = name::size::lastModified -> File
  let saving = false;

  function humanSize(bytes) {
    const u = ['B', 'KB', 'MB', 'GB', 'TB']; let i = 0, n = Number(bytes) || 0;
    while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
    return (n >= 10 ? n.toFixed(0) : n.toFixed(1)) + ' ' + u[i];
  }
  function sigOf(f) { return [f.name, f.size, f.lastModified || 0].join('::'); }

  function renderSelectedFiles() {
    attachList.innerHTML = '';
    if (fileMap.size === 0) return;
    for (const [sig, f] of fileMap.entries()) {
      const chip = document.createElement('div');
      chip.className = 'file-chip';
      chip.style.cssText = 'display:flex;align-items:center;gap:8px;padding:6px 10px;border:1px solid var(--rcpa-border,#e5e7eb);border-radius:9999px;';
      chip.innerHTML = `
        <i class="fa-solid fa-paperclip" aria-hidden="true"></i>
        <span style="max-width:320px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${f.name}</span>
        <small style="color:#6b7280;">${humanSize(f.size)}</small>
        <button type="button" class="chip-remove" data-sig="${sig}"
          aria-label="Remove file"
          style="border:none;background:transparent;cursor:pointer;font-size:16px;line-height:1;">&times;</button>`;
      attachList.appendChild(chip);
    }
  }

  // Open picker via icon (click + keyboard)
  const openPicker = () => filesInp?.click();
  attachTrigger?.addEventListener('click', openPicker);
  attachTrigger?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPicker(); }
  });

  // Append new selections (de-dupe), allow re-selecting same files later
  filesInp?.addEventListener('change', () => {
    if (!filesInp.files) return;
    Array.from(filesInp.files).forEach(f => {
      const sig = sigOf(f);
      if (!fileMap.has(sig)) fileMap.set(sig, f);
    });
    filesInp.value = ''; // reset to allow picking same files again
    renderSelectedFiles();
  });

  // Remove a selected file chip
  attachList?.addEventListener('click', (e) => {
    const btn = e.target.closest('.chip-remove');
    if (!btn) return;
    const sig = btn.getAttribute('data-sig');
    if (sig && fileMap.has(sig)) {
      fileMap.delete(sig);
      renderSelectedFiles();
    }
  });

  function openNotValidModal(id) {
    overlay.dataset.id = id;
    textarea.value = '';
    fileMap = new Map();
    attachList.innerHTML = '';
    if (filesInp) filesInp.value = '';
    errEl.textContent = '';
    overlay.removeAttribute('hidden');
    requestAnimationFrame(() => overlay.classList.add('show'));
    document.body.style.overflow = 'hidden';
    setTimeout(() => textarea.focus(), 0);
  }

  function closeNotValidModal() {
    overlay.classList.remove('show');
    const onEnd = (e) => {
      if (e.target !== overlay || e.propertyName !== 'opacity') return;
      overlay.removeEventListener('transitionend', onEnd);
      overlay.setAttribute('hidden', '');
      document.body.style.overflow = '';
    };
    overlay.addEventListener('transitionend', onEnd);
  }

  // Open when "Not Valid" action is invoked
  document.addEventListener('rcpa:action', (e) => {
    const { action, id } = e.detail || {};
    if (action === 'not-valid' && id) openNotValidModal(id);
  });

  // Close handlers
  closeX?.addEventListener('click', () => { if (!saving) closeNotValidModal(); });
  overlay.addEventListener('click', (e) => { if (e.target === overlay && !saving) closeNotValidModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !overlay.hidden && !saving) closeNotValidModal(); });

  // Submit -> POST to rcpa-not-valid-create.php
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (saving) return;

    const id = overlay.dataset.id;
    const reason = (textarea.value || '').trim();
    if (!reason) {
      errEl.textContent = 'Please provide the reason for non-validity.';
      textarea.focus();
      return;
    }

    const fd = new FormData();
    fd.append('rcpa_no', id);
    fd.append('reason_non_valid', reason);

    for (const f of fileMap.values()) {
      fd.append('attachments[]', f);
    }

    const doInsert = async () => {
      const res = await fetch('../php-backend/rcpa-invalid-create.php', {
        method: 'POST',
        body: fd,
        credentials: 'same-origin'
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!data || !data.success) throw new Error(data?.error || 'Insert failed');
      return data;
    };

    const lock = (on) => {
      saving = on;
      submitBtn.disabled = on;
      submitBtn.textContent = on ? 'Saving…' : 'Submit';
    };

    if (window.Swal) {
      Swal.fire({
        title: 'Mark as INVALIDATION REPLY?',
        text: 'This will save the non-validity reason and evidence.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, save',
        cancelButtonText: 'Cancel',
        focusCancel: true,
        showLoaderOnConfirm: true,
        preConfirm: async () => {
          try {
            lock(true);
            return await doInsert();
          } catch (err) {
            Swal.showValidationMessage(err.message || 'Request failed');
            throw err;
          } finally {
            lock(false);
          }
        },
        allowOutsideClick: () => !Swal.isLoading()
      }).then((result) => {
        if (!result.isConfirmed) return;
        closeNotValidModal();
        Swal.fire({ icon: 'success', title: 'Saved.', timer: 1400, showConfirmButton: false });
        document.dispatchEvent(new CustomEvent('rcpa:refresh'));
      });
      return;
    }

    // Fallback confirm
    if (!confirm('Mark as INVALIDATION REPLY?')) return;
    try {
      lock(true);
      await doInsert();
      closeNotValidModal();
      alert('Saved.');
      document.dispatchEvent(new CustomEvent('rcpa:refresh'));
    } catch (err) {
      errEl.textContent = err.message || 'Request failed';
    } finally {
      lock(false);
    }
  });
})();

// rcpa-task-assignee-pending.js
(function () {
  const ENDPOINT = '../php-backend/rcpa-assignee-tab-counters.php';
  const SSE_URL = '../php-backend/rcpa-assignee-tab-counters-sse.php';

  // Pick a tab by href with safe nth-child fallback
  function pickTab(tabsWrap, href, nth) {
    return tabsWrap.querySelector(`.rcpa-tab[href$="${href}"]`)
      || tabsWrap.querySelector(`.rcpa-tab:nth-child(${nth})`);
  }

  // Ensure a badge <span> exists inside a tab link; returns the element
  function ensureBadge(el, id) {
    if (!el) return null;
    let b = el.querySelector('.tab-badge');
    if (!b) {
      b = document.createElement('span');
      b.className = 'tab-badge';
      if (id) b.id = id;
      b.hidden = true;
      if (!el.style.position) el.style.position = 'relative';
      el.appendChild(b);
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

  function resolveBadgeNodes() {
    const wrap = document.querySelector('.rcpa-tabs');
    if (!wrap) return null;

    // Tabs: 1) ASSIGNEE PENDING (this page active)  2) FOR CLOSING
    const tabPending = pickTab(wrap, 'rcpa-task-assignee-pending.php', 1);
    const tabClosing = pickTab(wrap, 'rcpa-task-assignee-corrective.php', 2);

    return {
      bPending: ensureBadge(tabPending, 'tabBadgeAssigneePending'),
      bClosing: ensureBadge(tabClosing, 'tabBadgeAssigneeClosing'),
    };
  }

  function applyCounts(counts) {
    const nodes = resolveBadgeNodes();
    if (!nodes) return;

    const pending = counts?.assignee_pending ?? 0;
    const closing = counts?.for_closing ?? 0;

    setBadge(nodes.bPending, pending);
    setBadge(nodes.bClosing, closing);
  }

  async function refreshAssigneeTabBadges() {
    // make sure badges exist even if fetch fails
    resolveBadgeNodes();

    try {
      const res = await fetch(ENDPOINT, { credentials: 'same-origin', headers: { 'Accept': 'application/json' } });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data || !data.ok) {
        const n = resolveBadgeNodes();
        if (n) [n.bPending, n.bClosing].forEach(b => { if (b) b.hidden = true; });
        return;
      }
      applyCounts(data.counts || {});
    } catch {
      const n = resolveBadgeNodes();
      if (n) [n.bPending, n.bClosing].forEach(b => { if (b) b.hidden = true; });
    }
  }

  // Expose for websocket/manual refresh
  window.refreshAssigneeTabBadges = refreshAssigneeTabBadges;

  // Initial load + generic refresh hook
  document.addEventListener('DOMContentLoaded', refreshAssigneeTabBadges);
  document.addEventListener('rcpa:refresh', refreshAssigneeTabBadges);

  // Optional: refresh via WebSocket broadcast
  if (window.socket) {
    const prev = window.socket.onmessage;
    window.socket.onmessage = function (event) {
      try {
        const msg = JSON.parse(event.data);
        if (msg && msg.action === 'rcpa-request') refreshAssigneeTabBadges();
      } catch {
        if (event.data === 'rcpa-request') refreshAssigneeTabBadges();
      }
      if (typeof prev === 'function') prev.call(this, event);
    };
  }

  /* ---------- SSE live updates (non-blocking) ---------- */
  let es;
  function startSse(restart = false) {
    try { if (restart && es) es.close(); } catch { }

    try {
      es = new EventSource(SSE_URL);

      // Preferred named event
      es.addEventListener('rcpa-assignee-tabs', (ev) => {
        try {
          const payload = JSON.parse(ev.data || '{}');
          if (payload && payload.counts) applyCounts(payload.counts);
        } catch { }
      });

      // Fallback default message
      es.onmessage = (ev) => {
        try {
          const payload = JSON.parse(ev.data || '{}');
          if (payload && payload.counts) applyCounts(payload.counts);
        } catch { }
      };

      es.onerror = () => {
        // EventSource auto-reconnects; nothing to do.
      };
    } catch {
      // Ignore if EventSource unsupported
    }
  }

  document.addEventListener('DOMContentLoaded', () => startSse());
  window.addEventListener('beforeunload', () => { try { es && es.close(); } catch { } });
})();
