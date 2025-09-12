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

  // Manila helpers for close_due_date
  const MANILA_TZ = 'Asia/Manila';
  const MANILA_OFFSET = '+08:00';
  function fmtYmd(s) {
    if (!s) return '';
    const m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return s;
    const d = new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00`);
    if (isNaN(d)) return s;
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${months[d.getMonth()]} ${String(d.getDate()).padStart(2,'0')}, ${d.getFullYear()}`;
  }
  function dateAtMidnightManila(ymd){ if(!/^\d{4}-\d{2}-\d{2}$/.test(String(ymd)))return null; return new Date(`${ymd}T00:00:00${MANILA_OFFSET}`); }
  function diffDaysFromTodayManila(ymd){
    const parts = new Intl.DateTimeFormat('en-CA',{timeZone:MANILA_TZ,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
    const get=t=>parts.find(p=>p.type===t).value;
    const today=`${get('year')}-${get('month')}-${get('day')}`;
    const a=dateAtMidnightManila(today), b=dateAtMidnightManila(ymd);
    if(!a||!b) return null;
    return Math.trunc((b-a)/(24*60*60*1000));
  }
  function renderCloseDue(ymd){
    if(!ymd) return '';
    const base=fmtYmd(ymd);
    const d=diffDaysFromTodayManila(ymd);
    if(d===null) return base;
    const plural=Math.abs(d)===1?'day':'days';
    return `${base} (${d} ${plural})`;
  }

  async function load() {
    const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
    if (fType.value) params.set('type', fType.value);

    hideActions();
    tbody.innerHTML = `<tr><td colspan="10" class="rcpa-empty">Loading…</td></tr>`;

    let res;
    try {
      res = await fetch('../php-backend/rcpa-list-validation-reply.php?' + params.toString(), { credentials: 'same-origin' });
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
          <td>${renderCloseDue(r.close_due_date)}</td>
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

  // Restart SSE when filter changes (so server watches the same subset)
  fType.addEventListener('change', () => { page = 1; load(); startSse(true); });

  // ⚡ SSE: refresh table whenever count/max changes (covers backfilled lower IDs too)
  function startSse(restart = false) {
    if (restart && es) { try { es.close(); } catch {} }
    const qs = new URLSearchParams();
    if (fType.value) qs.set('type', fType.value);
    es = new EventSource(`../php-backend/rcpa-validation-reply-sse.php?${qs.toString()}`);
    es.addEventListener('rcpa', () => { load(); });
    es.onerror = () => { /* EventSource auto-reconnects */ };
  }

  load();
  startSse();
})();


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
    const fs = document.querySelector('fieldset.reject-remarks');
    if (!tb) return;

    const list = Array.isArray(items) ? items : [];

    if (!list.length) {
      tb.innerHTML = `<tr><td class="rcpa-empty" colspan="3">No records found</td></tr>`;
      if (modal) modal.__rejects = [];
      if (fs) { fs.hidden = true; fs.setAttribute('aria-hidden', 'true'); }
      return;
    }

    if (modal) modal.__rejects = list;
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

    // Show fieldset when there is data
    if (fs) { fs.hidden = false; fs.removeAttribute('aria-hidden'); }
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

  // Responsive 2-col style
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

    // Group by analysis_type (e.g., "Man", "Method")
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
  document.getElementById('rcpa-why-view-close')?.addEventListener('click', closeWhyViewModal);
  document.getElementById('rcpa-why-view-ok')?.addEventListener('click', closeWhyViewModal);
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

    setHiddenSel('.checkbox-for-non-conformance', false);
    setHiddenSel('.checkbox-for-potential-non-conformance', false);

    toggleValidPanels({ showNC: false, showPNC: false });

    const att1 = document.getElementById('rcpa-view-attach-list');
    if (att1) att1.innerHTML = '';
    const att2 = document.getElementById('rcpa-view-valid-attach-list');
    if (att2) att2.innerHTML = '';

    // Reset rejects table and HIDE the fieldset
    const tb = document.querySelector('#rcpa-rejects-table tbody');
    if (tb) tb.innerHTML = `<tr><td class="rcpa-empty" colspan="3">No records found</td></tr>`;
    const fs = document.querySelector('fieldset.reject-remarks');
    if (fs) { fs.hidden = true; fs.setAttribute('aria-hidden', 'true'); }

    currentViewId = null;
    if (modal) modal.__rejects = [];
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

    // Disapproval remarks table
    renderRejectsTable(row.rejects || []);

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

  [closeX].forEach(el => el && el.addEventListener('click', hideModal));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !modal.hidden) hideModal(); });

  // VIEW action
  document.addEventListener('rcpa:action', async (e) => {
    const { action, id } = e.detail || {};
    if (action !== 'view' || !id) return;

    clearViewForm();
    try {
      const res = await fetch(`../php-backend/rcpa-view-validation-reply.php?id=${encodeURIComponent(id)}`, { credentials: 'same-origin' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const row = await res.json();
      if (!row || !row.id) { alert('Record not found.'); return; }
      await fillViewModal(row);
      lockViewCheckboxes();

      // make sure Why-Why button is ready
      bindWhyWhyButton();

      showModal();
    } catch (err) {
      console.error(err);
      alert('Failed to load record. Please try again.');
    }
  });

  // Accept → approve validation reply and update status
  document.addEventListener('rcpa:action', async (e) => {
    const { action, id } = e.detail || {};
    if (action !== 'accept' || !id) return;

    try {
      if (window.Swal) {
        const { isConfirmed } = await Swal.fire({
          icon: 'question',
          title: 'Approve this valid reply?',
          text: 'This will set the status to "REPLY CHECKING - ORIGINATOR".',
          showCancelButton: true,
          confirmButtonText: 'Yes, approve',
          cancelButtonText: 'Cancel',
          reverseButtons: true,
          focusCancel: true
        });
        if (!isConfirmed) return;
      } else {
        const ok = confirm('Approve this validation reply?\n\nThis will set the status to "REPLY CHECKING - ORIGINATOR".');
        if (!ok) return;
      }

      const fd = new FormData();
      fd.append('id', String(id));

      const res = await fetch('../php-backend/rcpa-accept-validation-reply.php', {
        method: 'POST',
        body: fd,
        credentials: 'same-origin'
      });
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.error || `HTTP ${res.status}`);

      const st = document.getElementById('rcpa-view-status');
      if (st) st.value = 'REPLY CHECKING - ORIGINATOR';

      if (window.Swal) {
        await Swal.fire({
          icon: 'success',
          title: 'Validation Reply approved',
          text: 'Status set to "REPLY CHECKING - ORIGINATOR".',
          timer: 1600,
          showConfirmButton: false
        });
      } else {
        alert('Validation Reply approved. Status set to "REPLY CHECKING - ORIGINATOR".');
      }

      document.dispatchEvent(new CustomEvent('rcpa:refresh'));


    } catch (err) {
      console.error(err);
      if (window.Swal) {
        Swal.fire({ icon: 'error', title: 'Approval failed', text: String(err.message || err) });
      } else {
        alert('Approval failed: ' + (err.message || err));
      }
    }
  });

  // Reject → open Return to Assignee modal
  document.addEventListener('rcpa:action', (e) => {
    const { action, id } = e.detail || {};
    if (action !== 'reject' || !id) return;
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
      if (rjInput && rjInput.files) {
        [...rjInput.files].forEach(f => fd.append('attachments[]', f, f.name));
      }

      const res = await fetch('../php-backend/rcpa-reject-validation-reply.php', {
        method: 'POST',
        body: fd,
        credentials: 'same-origin'
      });
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.error || `HTTP ${res.status}`);

      const st = document.getElementById('rcpa-view-status');
      if (st) st.value = 'VALID APPROVAL';

      if (window.Swal) {
        Swal.fire({
          icon: 'success',
          title: 'Validation Reply rejected',
          text: 'Status set to "VALID APPROVAL".',
          timer: 1600,
          showConfirmButton: false
        });
      } else {
        alert('Validation Reply rejected. Status set to "VALID APPROVAL".');
      }

      closeRejectModal();
      document.dispatchEvent(new CustomEvent('rcpa:refresh'));


    } catch (err) {
      console.error(err);
      if (window.Swal) Swal.fire({ icon: 'error', title: 'Submit failed', text: String(err.message || err) });
      else alert('Submit failed: ' + (err.message || err));
    } finally {
      rjSubmit.disabled = false;
      rjSubmit.textContent = 'Submit';
    }
  });
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

// rcpa-task-validation-reply.js
// rcpa-task-validation-reply.js
(function () {
  const ENDPOINT = '../php-backend/rcpa-qms-tab-counters.php';
  const SSE_URL  = '../php-backend/rcpa-qms-tab-counters-sse.php';

  // Find tab by data-href with safe nth-child fallback (1..4)
  function pickTab(tabsWrap, selector, nth) {
    return tabsWrap.querySelector('.rcpa-tab' + (selector ? `[data-href="${selector}"]` : ''))
      || tabsWrap.querySelector(`.rcpa-tab:nth-child(${nth})`);
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

  // --- cache tab & badge nodes once ---
  let btnQmsChecking, btnValid, btnInvalid, btnEvidence;
  let bQmsChecking, bValid, bInvalid, bEvidence;

  function ensureAllBadges() {
    const tabsWrap = document.querySelector('.rcpa-tabs');
    if (!tabsWrap) return false;

    // Tabs (order: QMS CHECKING, REPLIED - VALID, REPLIED - INVALID, EVIDENCE CHECKING)
    btnQmsChecking = pickTab(tabsWrap, 'rcpa-task-qms-checking.php', 1);
    btnValid       = pickTab(tabsWrap, 'rcpa-task-validation-reply.php', 2);
    btnInvalid     = pickTab(tabsWrap, 'rcpa-task-invalidation-reply.php', 3);
    btnEvidence    = pickTab(tabsWrap, 'rcpa-task-qms-corrective.php', 4);

    // Badges
    bQmsChecking = ensureBadge(btnQmsChecking, 'tabBadgeQmsChecking');
    bValid       = ensureBadge(btnValid, 'tabBadgeValid');
    bInvalid     = ensureBadge(btnInvalid, 'tabBadgeNotValid');
    bEvidence    = ensureBadge(btnEvidence, 'tabBadgeEvidence');

    return true;
  }

  // Apply counts from any source (REST/SSE)
  function applyCounts(c) {
    if (!c) return;
    if (!ensureAllBadges()) return;

    // Support old field names as fallback (closing/evidence)
    const qmsCheckingCount = c.qms_checking ?? 0;
    const validCount       = c.valid ?? c.closing ?? 0;
    const invalidCount     = c.not_valid ?? 0;
    const evidenceCount    = c.evidence_checking ?? c.evidence ?? 0;

    setBadge(bQmsChecking, qmsCheckingCount);
    setBadge(bValid,       validCount);
    setBadge(bInvalid,     invalidCount);
    setBadge(bEvidence,    evidenceCount);
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

  /* --------------- SSE live updates --------------- */
  let es;
  function startSse(restart = false) {
    try { if (restart && es) es.close(); } catch {}

    es = new EventSource(SSE_URL);

    // Server pushes: event: rcpa-tabs, data: { counts: { ... } }
    es.addEventListener('rcpa-tabs', (ev) => {
      try {
        const payload = JSON.parse(ev.data || '{}');
        if (payload && payload.counts) applyCounts(payload.counts);
      } catch { /* ignore parse errors */ }
    });

    es.onerror = () => { /* EventSource will auto-reconnect by default */ };
  }

  window.addEventListener('beforeunload', () => { try { es && es.close(); } catch {} });
  document.addEventListener('DOMContentLoaded', () => startSse());
})();
