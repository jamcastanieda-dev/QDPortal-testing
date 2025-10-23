(function () {
  // Robust parse for approver flag
  const toBoolFlag = (v) => {
    if (v === true || v === 1) return true;
    if (v === false || v === 0 || v == null) return false;
    const s = String(v).trim().toLowerCase();
    return s === '1' || s === 'true' || s === 'yes' || s === 'on';
  };

  const IS_APPROVER = toBoolFlag(window.RCPA_IS_APPROVER);
  const CURRENT_DEPT = (window.RCPA_DEPARTMENT || '').toString().trim().toLowerCase();
  const CURRENT_SECT = (window.RCPA_SECTION || '').toString().trim().toLowerCase();
  const CURRENT_ROLE = (window.RCPA_ROLE || '').toString().trim().toLowerCase(); // 👈 added

  const tbody = document.querySelector('#rcpa-table tbody');
  const totalEl = document.getElementById('rcpa-total');
  const pageInfo = document.getElementById('rcpa-page-info');
  const prevBtn = document.getElementById('rcpa-prev');
  const nextBtn = document.getElementById('rcpa-next');
  const fType = document.getElementById('rcpa-filter-type');

  const actionContainer = document.getElementById('action-container');
  const viewBtn = document.getElementById('view-button');
  const acceptBtn = document.getElementById('accept-button');
  const rejectBtn = document.getElementById('reject-button');

  // Non-approvers never need the action container
  if (!IS_APPROVER) actionContainer.classList.add('hidden');

  let page = 1;
  const pageSize = 10;
  let currentTarget = null;
  let es = null; // ⚡ SSE handle

  const norm = s => (s ?? '').toString().trim().toLowerCase();

  // Dept must match AND (no row.section) OR (row.section matches user's section)
  // ➕ Managers can act for their department regardless of section
  const canActOnRow = (rowAssignee, rowSection) => {
    if (norm(rowAssignee) !== CURRENT_DEPT) return false;
    if (CURRENT_ROLE === 'manager') return true; // 👈 manager override on section
    const rs = norm(rowSection);
    if (!rs) return true;
    return rs === CURRENT_SECT;
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

  // Show hamburger ONLY if user is approver AND this row is assigned to their department/section (manager ignores section)
  function actionButtonHtml(id, assignee, section) {
    const safeId = escapeHtml(id ?? '');
    if (IS_APPROVER && canActOnRow(assignee, section)) {
      return `
        <div class="rcpa-actions">
          <button class="rcpa-more" data-id="${safeId}" title="Actions">
            <i class="fa-solid fa-bars" aria-hidden="true"></i>
            <span class="sr-only">Actions</span>
          </button>
        </div>
      `;
    }
    return `
      <div class="rcpa-actions">
        <button class="rcpa-view-only action-btn" data-id="${safeId}" title="View">View</button>
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
    h = (h % 12) || 12;
    return `${month} ${day}, ${year}, ${h}:${m} ${ampm}`;
  }

  function formatYmdPretty(ymd) {
    const mnames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return ymd || '';
    const y = +ymd.slice(0, 4), m = +ymd.slice(5, 7) - 1, d = +ymd.slice(8, 10);
    if ([y, m, d].some(Number.isNaN)) return ymd;
    return `${mnames[m]} ${String(d).padStart(2, '0')}, ${y}`;
  }
  function daysDiffFromToday(ymd) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null;
    const y = +ymd.slice(0, 4), m = +ymd.slice(5, 7) - 1, d = +ymd.slice(8, 10);
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

  async function load() {
    const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
    if (fType.value) params.set('type', fType.value);

    hideActions();
    tbody.innerHTML = `<tr><td colspan="10" class="rcpa-empty">Loading…</td></tr>`;

    let res;
    try {
      res = await fetch('../php-backend/rcpa-list-approval-valid.php?' + params.toString(), { credentials: 'same-origin' });
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
          <td>${formatReplyDueCell(r.reply_due_date)}</td>
          <td>${badgeForStatus(r.status)}</td>
          <td>${escapeHtml(r.originator_name)}</td>
          <td>${(() => {
          const left = r.section ? `${r.assignee} - ${r.section}` : (r.assignee || '');
          const right = r.assignee_name ? ` (${r.assignee_name})` : '';
          return escapeHtml(left + right);
        })()
        }</td>

          <td>${actionButtonHtml(r.id ?? '', r.assignee, r.section)}</td>
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

  // 🔔 realtime via SSE (mirrors same filter/visibility as the PHP list)
  function startSse(restart = false) {
    try { if (restart && es) es.close(); } catch { }
    const qs = new URLSearchParams();
    if (fType.value) qs.set('type', fType.value);
    es = new EventSource(`../php-backend/rcpa-approval-valid-sse.php?${qs.toString()}`);
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

  // click handlers
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

  document.querySelector('.rcpa-table-toolbar')?.addEventListener('click', (e) => {
    const tab = e.target.closest('.rcpa-tab[data-href]');
    if (!tab) return;
    window.location.href = tab.dataset.href;
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

  prevBtn.addEventListener('click', () => { if (page > 1) { page--; load(); } });
  nextBtn.addEventListener('click', () => { page++; load(); });

  // When the Type filter changes, reload and restart SSE to mirror the same subset
  fType.addEventListener('change', () => { page = 1; load(); startSse(true); });

  window.addEventListener('beforeunload', () => { try { es && es.close(); } catch { } });

  load();
  startSse(); // ⚡ go realtime
})();

/* ====== VIEW MODAL: fetch, fill, show ====== */
(function () {
  // Modal elems
  const modal = document.getElementById('rcpa-view-modal');
  const closeX = document.getElementById('rcpa-view-close');
  // ===== Reject modal (ASSIGNEE PENDING) =====
  const rjModal = document.getElementById('rcpa-reject-modal');
  const rjClose = document.getElementById('rcpa-reject-close');
  const rjForm = document.getElementById('rcpa-reject-form');
  const rjRemarks = document.getElementById('rcpa-reject-remarks');
  const rjClip = document.getElementById('rcpa-reject-clip');
  const rjInput = document.getElementById('rcpa-reject-files');
  const rjBadge = document.getElementById('rcpa-reject-attach-count');
  const rjList = document.getElementById('rcpa-reject-files-list');
  const rjCancel = document.getElementById('rcpa-reject-cancel');
  const rjSubmit = document.getElementById('rcpa-reject-submit');

  // ---------- Disapproval remarks: modal + helpers ----------
  const dModal = document.getElementById('reject-remarks-modal');
  const dClose = document.getElementById('reject-remarks-close');
  const dText = document.getElementById('reject-remarks-text');
  const dList = document.getElementById('reject-remarks-attach-list');

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
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && dModal && !dModal.hidden) closeDisapproveModal();
  });

  function escapeHTML(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function renderRejectsTable(items) {
    const tb = document.querySelector('#rcpa-rejects-table tbody');
    const fs = document.querySelector('fieldset.reject-remarks'); // fieldset to toggle
    const cacheHost = document.getElementById('rcpa-view-modal');
    if (!tb) return;

    const list = Array.isArray(items) ? items : [];

    if (!list.length) {
      tb.innerHTML = `<tr><td class="rcpa-empty" colspan="3">No records found</td></tr>`;
      if (cacheHost) cacheHost.__rejects = [];
      if (fs) { fs.hidden = true; fs.setAttribute('aria-hidden', 'true'); } // hide when empty
      return;
    }

    // Show when there is data
    if (fs) { fs.hidden = false; fs.removeAttribute('aria-hidden'); }

    // cache so click handler can find records
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


  // Click "View" in the disapproval table → open modal
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

  function openRejectModal() {
    if (!rjModal) return;
    rjRemarks.value = '';
    if (rjInput) rjInput.value = '';
    if (rjList) rjList.innerHTML = '';
    if (rjBadge) { rjBadge.textContent = '0'; rjBadge.hidden = true; }

    rjModal.removeAttribute('hidden');
    requestAnimationFrame(() => rjModal.classList.add('show'));
    setTimeout(() => rjRemarks?.focus(), 80);
    document.body.style.overflow = 'hidden';
  }
  function closeRejectModal() {
    if (!rjModal) return;
    rjModal.classList.remove('show');
    const onEnd = (e) => {
      if (e.target !== rjModal || e.propertyName !== 'opacity') return;
      rjModal.removeEventListener('transitionend', onEnd);
      rjModal.setAttribute('hidden', '');
      document.body.style.overflow = '';
    };
    rjModal.addEventListener('transitionend', onEnd);
  }
  rjClose?.addEventListener('click', closeRejectModal);
  rjCancel?.addEventListener('click', closeRejectModal);
  rjModal?.addEventListener('click', (e) => { if (e.target === rjModal) closeRejectModal(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && rjModal && !rjModal.hidden) closeRejectModal();
  });
  rjClip?.addEventListener('click', () => rjInput?.click());

  function humanSize(n) {
    if (!n && n !== 0) return '';
    let b = Number(n);
    if (b < 1024) return b + ' B';
    const u = ['KB', 'MB', 'GB', 'TB']; let i = -1;
    do { b /= 1024; i++; } while (b >= 1024 && i < u.length - 1);
    return (b >= 10 ? b.toFixed(0) : b.toFixed(1)) + ' ' + u[i];
  }
  function renderRejectList(files) {
    if (!rjList) return;
    rjList.innerHTML = '';
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
      rjList.appendChild(row);
    });
    if (rjBadge) {
      rjBadge.textContent = String(files.length);
      rjBadge.hidden = files.length === 0;
    }
  }
  rjInput?.addEventListener('change', () => renderRejectList(rjInput.files || []));

  // Allow removing selected file(s)
  rjList?.addEventListener('click', (e) => {
    const btn = e.target.closest('.file-remove');
    if (!btn || !rjInput) return;
    const i = Number(btn.getAttribute('data-i'));
    const dt = new DataTransfer();
    [...rjInput.files].forEach((f, idx) => { if (idx !== i) dt.items.add(f); });
    rjInput.files = dt.files;
    renderRejectList(rjInput.files || []);
  });


  // Track current record
  let currentViewId = null;

  // ---------- Helpers ----------
  const setVal = (id, v) => { const el = document.getElementById(id); if (el) el.value = v ?? ''; };
  const setChecked = (id, on) => { const el = document.getElementById(id); if (el) el.checked = !!on; };
  const showCond = (id, show) => { const el = document.getElementById(id); if (el) el.hidden = !show; };

  // NEW: show/hide by selector using the [hidden] attribute
  function setHiddenSel(selector, hide) {
    modal.querySelectorAll(selector).forEach(el => {
      if (hide) el.setAttribute('hidden', '');
      else el.removeAttribute('hidden');
    });
  }

  // Set multiple by CSS selectors (for robustness with duplicate IDs)
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

  // Trim to YYYY-MM-DD for <input type="date">
  function setDateVal(id, v) {
    const el = document.getElementById(id);
    if (!el) return;
    el.value = (v && String(v).slice(0, 10)) || '';
  }

  // date-only for signature captions (e.g., "8/20/2025")
  function fmtDateOnly(s) {
    if (!s) return '';
    const d = new Date(String(s).replace(' ', 'T'));
    return isNaN(d) ? String(s) : d.toLocaleDateString();
  }

  // Toggle the NC vs PNC panels
  function toggleValidPanels({ showNC, showPNC }) {
    modal.querySelectorAll('.correction-grid:not(.preventive-grid)').forEach(g => {
      g.style.display = showNC ? 'grid' : 'none';
    });
    const pnc = modal.querySelector('.preventive-grid');
    if (pnc) pnc.style.display = showPNC ? 'grid' : 'none';

    setCheckedByAny(
      ['#rcpa-view-for-nc-valid', '#rcpa-view-for-nc', '.checkbox-for-non-conformance input[type="checkbox"]'],
      !!showNC
    );
    setCheckedByAny(
      ['#rcpa-view-for-pnc', '.checkbox-for-potential-non-conformance input[type="checkbox"]'],
      !!showPNC
    );
  }

  // Simple date fmt (UI text fields)
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

  // --------- Attachments rendering ---------
  // Generic: render to a specific wrapId
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

    // Normalize input → array of items
    let items = [];
    try {
      const parsed = typeof s === 'string' ? JSON.parse(s) : s;
      if (Array.isArray(parsed)) items = parsed;
      else if (parsed && Array.isArray(parsed.files)) items = parsed.files;
    } catch {
      // fallback: comma/newline separated, optionally "name|url|size"
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

  // Backward-compat wrapper for existing remarks attachments
  function renderRemarksAttachments(s) {
    renderAttachmentsTo('rcpa-view-attach-list', s);
  }

  // ---------- Why-Why VIEW (auto-injected button + modal) ----------
  // Auto-inject the "Why-Why Analysis" button beside the Findings Valid checkbox if missing
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

  // Create the Why-Why view modal if missing
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

  // Inject responsive 2-col style once
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

  function renderWhyViewList(rows) {
    if (!whyViewList) return;

    if (!rows || rows.length === 0) {
      whyViewList.classList.remove('two-col');
      whyViewList.style.display = 'flex';
      whyViewList.style.flexDirection = 'column';
      whyViewList.innerHTML = `<div class="rcpa-empty">No Why-Why analysis found for this record.</div>`;
      return;
    }

    // Group by analysis_type (e.g., "Man", "Man #2", "Method")
    const groups = rows.reduce((m, r) => {
      (m[r.analysis_type] = m[r.analysis_type] || []).push(r);
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

        // base card + conditional red border for root cause
        const base = 'padding:10px;border-radius:6px;background:#f9fafb;';
        const border = isRoot
          ? 'border:2px solid #ef4444; box-shadow: inset 0 0 0 2px rgba(239,68,68,.05);'
          : 'border:1px solid #e5e7eb;';

        const badge = isRoot
          ? `<span class="badge" style="display:inline-block;padding:2px 6px;border-radius:999px;border:1px solid #16a34a;margin-left:6px;font-size:12px;">Root Cause</span>`
          : '';

        return `
        <div class="why-item${isRoot ? ' is-root' : ''}" style="${base}${border}">
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
      .catch(() => {
        if (whyViewList) whyViewList.innerHTML = `<div class="rcpa-empty">Failed to load analysis.</div>`;
      });

    const m = document.getElementById('rcpa-why-view-modal');
    if (m) {
      m.removeAttribute('hidden');
      requestAnimationFrame(() => m.classList.add('show'));
      document.body.style.overflow = 'hidden';
    }
  }
  function closeWhyViewModal() {
    const m = document.getElementById('rcpa-why-view-modal');
    if (!m) return;
    m.classList.remove('show');
    const onEnd = (e) => {
      if (e.target !== m || e.propertyName !== 'opacity') return;
      m.removeEventListener('transitionend', onEnd);
      m.setAttribute('hidden', '');
      document.body.style.overflow = '';
    };
    m.addEventListener('transitionend', onEnd);
  }
  whyViewClose?.addEventListener('click', closeWhyViewModal);
  whyViewOk?.addEventListener('click', closeWhyViewModal);
  whyViewModal?.addEventListener('click', (e) => { if (e.target === whyViewModal) closeWhyViewModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && whyViewModal && !whyViewModal.hidden) closeWhyViewModal(); });

  function bindWhyWhyButton() {
    ensureWhyWhyButton();
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
  // Bind immediately in case the button already exists in DOM
  bindWhyWhyButton();

  // ---------- Reset modal ----------
  // ---------- Reset modal ----------
  function clearViewForm() {
    ['v-type-external', 'v-type-internal', 'v-type-unattain', 'v-type-online', 'v-type-hs', 'v-type-mgmt']
      .forEach(id => showCond(id, false));

    [
      'rcpa-view-type', 'v-external-sem1-year', 'v-external-sem2-year', 'v-internal-sem1-year', 'v-internal-sem2-year',
      'v-project-name', 'v-wbs-number', 'v-online-year', 'v-hs-month', 'v-hs-year', 'v-mgmt-year',
      'rcpa-view-originator-name', 'rcpa-view-originator-dept', 'rcpa-view-date', 'rcpa-view-remarks',
      'rcpa-view-system', 'rcpa-view-clauses', 'rcpa-view-supervisor', 'rcpa-view-assignee',
      'rcpa-view-status', 'rcpa-view-conformance',
      'rcpa-view-root-cause', 'rcpa-view-correction', 'rcpa-view-corrective', 'rcpa-view-preventive',
      // signatures
      'rcpa-view-assignee-sign', 'rcpa-view-assignee-sup-sign'
    ].forEach(id => setVal(id, ''));

    ['rcpa-view-correction-target', 'rcpa-view-correction-done',
      'rcpa-view-corrective-target', 'rcpa-view-corrective-done',
      'rcpa-view-preventive-target', 'rcpa-view-preventive-done'
    ].forEach(id => setDateVal(id, ''));

    ['rcpa-view-cat-major', 'rcpa-view-cat-minor', 'rcpa-view-cat-obs',
      'rcpa-view-flag-nc', 'rcpa-view-flag-pnc', 'rcpa-view-findings-valid'
    ].forEach(id => setChecked(id, false));

    setCheckedByAny(['#rcpa-view-for-nc-valid', '#rcpa-view-for-nc', '.checkbox-for-non-conformance input[type="checkbox"]'], false);
    setCheckedByAny(['#rcpa-view-for-pnc', '.checkbox-for-potential-non-conformance input[type="checkbox"]'], false);

    // Show both “For …” toggles by default on reset
    setHiddenSel('.checkbox-for-non-conformance', false);
    setHiddenSel('.checkbox-for-potential-non-conformance', false);

    toggleValidPanels({ showNC: false, showPNC: false });

    // clear attachments (remarks + validation)
    const att1 = document.getElementById('rcpa-view-attach-list');
    if (att1) att1.innerHTML = '';
    const att2 = document.getElementById('rcpa-view-valid-attach-list');
    if (att2) att2.innerHTML = '';

    // Reset Disapproval Remarks table + hide fieldset by default
    const tb = document.querySelector('#rcpa-rejects-table tbody');
    if (tb) tb.innerHTML = `<tr><td class="rcpa-empty" colspan="3">No records found</td></tr>`;
    const rejectsFs = document.querySelector('fieldset.reject-remarks');
    if (rejectsFs) { rejectsFs.hidden = true; rejectsFs.setAttribute('aria-hidden', 'true'); }

    // clear cached rejects
    const cacheHost = document.getElementById('rcpa-view-modal');
    if (cacheHost) cacheHost.__rejects = [];

    currentViewId = null;
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

  // ---------- Main filler ----------
  async function fillViewModal(row) {
    currentViewId = row.id || null;

    // Ensure Why-Why button exists/bound for this modal
    bindWhyWhyButton();

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

    // CATEGORY
    const cat = String(row.category || '').toLowerCase();
    setChecked('rcpa-view-cat-major', cat === 'major');
    setChecked('rcpa-view-cat-minor', cat === 'minor');
    setChecked('rcpa-view-cat-obs', cat === 'observation');

    // ORIGINATOR
    setVal('rcpa-view-originator-name', row.originator_name);
    setVal('rcpa-view-originator-dept', row.originator_department);
    setVal('rcpa-view-date', fmt(row.date_request));

    // Conformance normalization
    const confNorm = String(row.conformance || '')
      .toLowerCase()
      .replace(/[\s_-]+/g, ' ')
      .trim();

    let isPNC = (confNorm === 'pnc') || confNorm.includes('potential');
    let isNC = false;

    if (!isPNC) {
      isNC =
        confNorm === 'nc' ||
        /\bnon[- ]?conformance\b/.test(confNorm) ||
        confNorm === 'non conformance' ||
        confNorm === 'nonconformance';
    }

    // Category override (business rule)
    if (cat === 'observation') { isPNC = true; isNC = false; }
    else if (cat === 'major' || cat === 'minor') { isPNC = false; isNC = true; }

    setChecked('rcpa-view-flag-pnc', isPNC);
    setChecked('rcpa-view-flag-nc', isNC);

    // HIDE the irrelevant "For ..." toggle based on conformance
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

    // Remarks & attachments
    setVal('rcpa-view-remarks', row.remarks);
    renderRemarksAttachments(row.remarks_attachment);

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

    // ===== Validity details (and signatures) =====
    const rcpaNo = row.id;

    // clear validity fields and validation attachments
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

    let hasValid = false;

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

          // Signatures
          const assigneeLine = [nc.assignee_name, fmtDateOnly(nc.assignee_date)].filter(Boolean).join(' ');
          const supLine = [nc.assignee_supervisor_name, fmtDateOnly(nc.assignee_supervisor_date)].filter(Boolean).join(' ');
          setVal('rcpa-view-assignee-sign', assigneeLine);
          setVal('rcpa-view-assignee-sup-sign', supLine);

          // Validation attachments
          renderAttachmentsTo('rcpa-view-valid-attach-list', nc.attachment);

          hasValid = !!(nc.root_cause || nc.correction || nc.corrective);
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

          // Signatures
          const assigneeLine = [pnc.assignee_name, fmtDateOnly(pnc.assignee_date)].filter(Boolean).join(' ');
          const supLine = [pnc.assignee_supervisor_name, fmtDateOnly(pnc.assignee_supervisor_date)].filter(Boolean).join(' ');
          setVal('rcpa-view-assignee-sign', assigneeLine);
          setVal('rcpa-view-assignee-sup-sign', supLine);

          // Validation attachments
          renderAttachmentsTo('rcpa-view-valid-attach-list', pnc.attachment);

          hasValid = !!(pnc.root_cause || pnc.preventive_action);
        }
      } catch (err) {
        console.warn('valid-pnc fetch failed:', err);
      }
    }

    setChecked('rcpa-view-findings-valid', hasValid);
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

  [closeX].forEach?.(el => el && el.addEventListener('click', hideModal));
  if (closeX && !Array.isArray(closeX)) closeX.addEventListener('click', hideModal);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !modal.hidden) hideModal(); });

  // VIEW action
  document.addEventListener('rcpa:action', async (e) => {
    const { action, id } = e.detail || {};
    if (action !== 'view' || !id) return;

    clearViewForm();
    try {
      const res = await fetch(`../php-backend/rcpa-view-approval-valid.php?id=${encodeURIComponent(id)}`, { credentials: 'same-origin' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const row = await res.json();
      if (!row || !row.id) { alert('Record not found.'); return; }
      await fillViewModal(row);
      lockViewCheckboxes();

      // show disapproval remarks table
      const rejects = Array.isArray(row.rejects) ? row.rejects : [];
      renderRejectsTable(rejects);

      // make sure Why-Why button works (in case DOM was rebuilt)
      bindWhyWhyButton();

      showModal();
      requestAnimationFrame(() => document.getElementById('rcpa-view-modal')?.__renderStatusFlow?.(row.id || id));

    } catch (err) {
      console.error(err);
      alert('Failed to load record. Please try again.');
    }
  });

  // Accept 
  // Accept action: set status to "VALIDATION REPLY"
  document.addEventListener('rcpa:action', async (e) => {
    const { action, id } = e.detail || {};
    if (action !== 'accept' || !id) return;

    // Use SweetAlert if available; otherwise simple confirm()
    if (!window.Swal) {
      const ok = confirm('Approve this RCPA as VALIDATION REPLY? This will set the status to "VALIDATION REPLY".');
      if (!ok) return;
      try {
        const fd = new FormData();
        fd.append('id', id);
        const res = await fetch('../php-backend/rcpa-accept-approval-valid.php', {
          method: 'POST',
          body: fd,
          credentials: 'same-origin'
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!data || !data.success) throw new Error(data?.error || 'Failed to update');
        // reflect in UI
        const statusEl = document.getElementById('rcpa-view-status');
        if (statusEl) statusEl.value = 'VALIDATION REPLY';
        alert('RCPA approved. Status set to "VALIDATION REPLY".');
        document.dispatchEvent(new CustomEvent('rcpa:refresh'));
        if (typeof window.refreshAssigneeApprovalBadges === 'function') {
          window.refreshAssigneeApprovalBadges();
        }

      } catch (err) {
        console.error(err);
        alert('Failed to approve this RCPA. Please try again.');
      }
      return;
    }

    // SweetAlert flow
    Swal.fire({
      title: 'Approve this RCPA as VALIDATION REPLY?',
      text: 'This will set the status to "VALIDATION REPLY".',
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
          const res = await fetch('../php-backend/rcpa-accept-approval-valid.php', {
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
      // reflect in UI
      const statusEl = document.getElementById('rcpa-view-status');
      if (statusEl) statusEl.value = 'VALIDATION REPLY';
      // refresh the table
      Swal.fire({ icon: 'success', title: 'RCPA approved', text: 'Status set to "VALIDATION REPLY".', timer: 1600, showConfirmButton: false });
      document.dispatchEvent(new CustomEvent('rcpa:refresh'));
      if (typeof window.refreshAssigneeApprovalBadges === 'function') {
        window.refreshAssigneeApprovalBadges();
      }

    });
  });


  // /Reject 
  // Reject → return to Assignee (status: ASSIGNEE PENDING)
  document.addEventListener('rcpa:action', async (e) => {
    const { action, id } = e.detail || {};
    if (action !== 'reject' || !id) return;

    // remember which record we're returning
    currentViewId = id;
    openRejectModal();
  });

  // Submit reject → POST remarks + files
  rjForm?.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    if (!currentViewId) { alert('Missing record id.'); return; }

    const text = (rjRemarks?.value || '').trim();
    if (!text) {
      if (window.Swal) Swal.fire({ icon: 'warning', title: 'Remarks required' });
      else alert('Please enter the reason.');
      return;
    }

    try {
      rjSubmit.disabled = true;
      rjSubmit.textContent = 'Submitting…';

      const fd = new FormData();
      fd.append('id', String(currentViewId));
      fd.append('remarks', text);
      // include files (already named attachments[])
      if (rjInput && rjInput.files) {
        [...rjInput.files].forEach(f => fd.append('attachments[]', f, f.name));
      }

      const res = await fetch('../php-backend/rcpa-reject-approval-valid.php', {
        method: 'POST',
        body: fd,
        credentials: 'same-origin'
      });
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.error || `HTTP ${res.status}`);

      // Reflect new status in the view modal
      const st = document.getElementById('rcpa-view-status');
      if (st) st.value = 'ASSIGNEE PENDING';

      if (window.Swal) {
        Swal.fire({ icon: 'success', title: 'Returned to Assignee', text: 'Status set to "ASSIGNEE PENDING".', timer: 1600, showConfirmButton: false });
      } else {
        alert('Returned to Assignee. Status set to "ASSIGNEE PENDING".');
      }

      closeRejectModal();
      // Optionally refresh the table/list
      document.dispatchEvent(new CustomEvent('rcpa:refresh'));
      if (typeof window.refreshAssigneeApprovalBadges === 'function') {
        window.refreshAssigneeApprovalBadges();
      }

    } catch (err) {
      console.error(err);
      if (window.Swal) Swal.fire({ icon: 'error', title: 'Submit failed', text: String(err.message || err) });
      else alert('Submit failed: ' + (err.message || err));
    } finally {
      rjSubmit.disabled = false;
      rjSubmit.textContent = 'Submit';
    }
  });

  // Keep tab counters in sync with any in-page refresh
  document.addEventListener('rcpa:refresh', () => {
    if (typeof window.refreshAssigneeApprovalBadges === 'function') {
      window.refreshAssigneeApprovalBadges();
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
    'VALID APPROVAL', 'VALIDATION REPLY',
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
      // removed: 'REPLY CHECKING - ORIGINATOR'
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
    // removed: REPLY_CHECKING_ORIG
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
      // removed: 'REPLY CHECKING - ORIGINATOR'
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

    // Back-compat for removed step
    const statusRaw = String(document.getElementById('rcpa-view-status')?.value || '').trim().toUpperCase();
    const statusNow = (statusRaw === 'REPLY CHECKING - ORIGINATOR') ? 'VALIDATION REPLY' : statusRaw;

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

// rcpa-task-assignee-approval-valid.js
// js/rcpa-assignee-approval-tab-counters.js
(function () {
  const ENDPOINT = '../php-backend/rcpa-assignee-approval-tab-counters.php';
  const SSE_URL = '../php-backend/rcpa-assignee-approval-tab-counters-sse.php';

  // Find a tab by href/data-href with nth-child fallback
  function pickTab(wrap, href, nth) {
    return wrap.querySelector(`.rcpa-tab[href$="${href}"]`)
      || wrap.querySelector(`.rcpa-tab[data-href="${href}"]`)
      || wrap.querySelector(`.rcpa-tab:nth-child(${nth})`);
  }

  // Make badges
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

  // Set badge text/visibility
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

  // Enable navigation for <button data-href=...>
  function wireNav(wrap) {
    wrap.querySelectorAll('.rcpa-tab[data-href]').forEach(btn => {
      btn.addEventListener('click', () => {
        const to = btn.getAttribute('data-href');
        if (to) window.location.href = to;
      });
    });
  }

  function resolveBadgeNodes() {
    const wrap = document.querySelector('.rcpa-tabs');
    if (!wrap) return null;
    wireNav(wrap);

    // Tabs: 1) VALID APPROVAL (active here)  2) INVALID APPROVAL
    const tabValid = pickTab(wrap, 'rcpa-task-assignee-approval-valid.php', 1);
    const tabInvalid = pickTab(wrap, 'rcpa-task-assignee-approval-invalid.php', 2);

    return {
      bValid: ensureBadge(tabValid, 'tabBadgeValidApproval'),
      bInvalid: ensureBadge(tabInvalid, 'tabBadgeInvalidApproval'),
    };
  }

  function applyCounts(counts) {
    const nodes = resolveBadgeNodes();
    if (!nodes) return;
    setBadge(nodes.bValid, counts?.valid_approval ?? 0);
    setBadge(nodes.bInvalid, counts?.invalid_approval ?? 0);
  }

  async function refreshAssigneeApprovalBadges() {
    resolveBadgeNodes(); // ensure badges exist even if fetch fails

    try {
      const res = await fetch(ENDPOINT, { credentials: 'same-origin', headers: { 'Accept': 'application/json' } });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data || !data.ok) {
        const n = resolveBadgeNodes();
        if (n) [n.bValid, n.bInvalid].forEach(b => { if (b) b.hidden = true; });
        return;
      }
      applyCounts(data.counts || {});
    } catch {
      const n = resolveBadgeNodes();
      if (n) [n.bValid, n.bInvalid].forEach(b => { if (b) b.hidden = true; });
    }
  }

  window.refreshAssigneeApprovalBadges = refreshAssigneeApprovalBadges;
  document.addEventListener('DOMContentLoaded', refreshAssigneeApprovalBadges);
  document.addEventListener('rcpa:refresh', refreshAssigneeApprovalBadges);

  // Optional: refresh via WebSocket broadcast
  if (window.socket) {
    const prev = window.socket.onmessage;
    window.socket.onmessage = function (event) {
      try {
        const msg = JSON.parse(event.data);
        if (msg && msg.action === 'rcpa-request') refreshAssigneeApprovalBadges();
      } catch {
        if (event.data === 'rcpa-request') refreshAssigneeApprovalBadges();
      }
      if (typeof prev === 'function') prev.call(this, event);
    };
  }

  /* ---------- SSE live updates ---------- */
  let es;
  function startSse(restart = false) {
    try { if (restart && es) es.close(); } catch { }
    try {
      es = new EventSource(SSE_URL);

      // Named event preferred
      es.addEventListener('rcpa-assignee-approval-tabs', (ev) => {
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
        // EventSource auto-reconnects; no manual retry here.
      };
    } catch {
      // Ignore if EventSource isn't supported.
    }
  }

  document.addEventListener('DOMContentLoaded', () => startSse());
  window.addEventListener('beforeunload', () => { try { es && es.close(); } catch { } });
})();

