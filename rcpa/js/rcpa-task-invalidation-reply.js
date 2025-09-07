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
    if (t === 'REPLY CHECKING - ORIGINATOR') return `<span class="rcpa-badge badge-validation-reply-approval">REPLY CHECKING - ORIGINATOR</span>`;
    if (t === 'IN-VALIDATION REPLY APPROVAL') return `<span class="rcpa-badge badge-invalidation-reply-approval">IN-VALIDATION REPLY APPROVAL</span>`;
    if (t === 'FOR CLOSING') return `<span class="rcpa-badge badge-assignee-corrective">FOR CLOSING</span>`;
    if (t === 'FOR CLOSING APPROVAL') return `<span class="rcpa-badge badge-assignee-corrective-approval">FOR CLOSING APPROVAL</span>`;
    if (t === 'EVIDENCE CHECKING') return `<span class="rcpa-badge badge-corrective-checking">EVIDENCE CHECKING</span>`;
    if (t === 'EVIDENCE CHECKING APPROVAL') return `<span class="rcpa-badge badge-corrective-checking-approval">EVIDENCE CHECKING APPROVAL</span>`;
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
      // QA/QMS: show hamburger that opens the floating action-container
      return `
      <div class="rcpa-actions">
        <button class="rcpa-more" data-id="${safeId}" title="Actions">
          <i class="fa-solid fa-bars" aria-hidden="true"></i>
          <span class="sr-only">Actions</span>
        </button>
      </div>
    `;
    }
    // Others: show a direct "View" button (same behavior as view-button in the container)
    return `
    <div class="rcpa-actions">
      <button class="rcpa-view-only action-btn" data-id="${safeId}" title="View">View</button>
    </div>
  `;
  }


  function fmtDate(s) {
    if (!s) return '';
    const str = String(s);
    if (/^0{4}-0{2}-0{2}/.test(str)) return ''; // handle "0000-00-00 ..."
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

  // --- add these helpers below fmtDate ---
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

  function renderCloseDue(ymd) {
    if (!ymd) return '';
    const base = fmtYmd(ymd);
    const d = diffDaysFromTodayManila(ymd);
    if (d === null) return base;
    const plural = Math.abs(d) === 1 ? 'day' : 'days';
    return `${base} (${d} ${plural})`;
  }
  // --- end helpers ---

  async function load() {
    const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
    if (fType.value) params.set('type', fType.value);

    hideActions();

    tbody.innerHTML = `<tr><td colspan="10" class="rcpa-empty">Loading…</td></tr>`;

    let res;
    try {
      res = await fetch('../php-backend/rcpa-list-invalidation-reply.php?' + params.toString(), { credentials: 'same-origin' });
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
    // NEW: direct View button for non-QA/QMS
    const viewOnly = e.target.closest('.rcpa-view-only');
    if (viewOnly) {
      const id = viewOnly.getAttribute('data-id');
      if (id) document.dispatchEvent(new CustomEvent('rcpa:action', { detail: { action: 'view', id } }));
      return;
    }

    // (existing) history icon
    const hist = e.target.closest('.icon-rcpa-history');
    if (hist) {
      const id = hist.getAttribute('data-id');
      if (id) document.dispatchEvent(new CustomEvent('rcpa:action', { detail: { action: 'history', id } }));
      return;
    }

    // (existing) hamburger menu for QA/QMS
    const moreBtn = e.target.closest('.rcpa-more');
    if (!moreBtn) return;

    const id = moreBtn.dataset.id;
    if (currentTarget === moreBtn) {
      hideActions();
    } else {
      showActions(moreBtn, id);
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

  // Pagination + single remaining filter
  prevBtn.addEventListener('click', () => { if (page > 1) { page--; load(); } });
  nextBtn.addEventListener('click', () => { page++; load(); });
  fType.addEventListener('change', () => { page = 1; load(); });

  load();
})();

(function () {
  // Modal elems
  const modal = document.getElementById('rcpa-view-modal');
  const closeX = document.getElementById('rcpa-view-close');

  // Track current record for reject flow
  let currentViewId = null;

  // ---------- Disapproval quick-view modal ----------
  const rjModal = document.getElementById('reject-remarks-modal');
  const rjText = document.getElementById('reject-remarks-text');
  const rjClose = document.getElementById('reject-remarks-close');
  const rjList = document.getElementById('reject-remarks-attach-list');

  function openRejectRemarks(item) {
    if (!rjModal) return;
    if (rjText) rjText.value = item?.remarks || '';
    if (rjList) rjList.innerHTML = '';
    if (rjList) renderAttachmentsInto('reject-remarks-attach-list', item?.attachments || '');
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

  // ---------- RETURN-TO-ASSIGNEE (reject) modal ----------
  // (Make sure the corresponding HTML block for #rcpa-reject-modal is present in the page)
  const rbModal = document.getElementById('rcpa-reject-modal');
  const rbClose = document.getElementById('rcpa-reject-close');
  const rbForm = document.getElementById('rcpa-reject-form');
  const rbText = document.getElementById('rcpa-reject-remarks');
  const rbClip = document.getElementById('rcpa-reject-clip');
  const rbInput = document.getElementById('rcpa-reject-files');
  const rbBadge = document.getElementById('rcpa-reject-attach-count');
  const rbList = document.getElementById('rcpa-reject-files-list');
  const rbCancel = document.getElementById('rcpa-reject-cancel');
  const rbSubmit = document.getElementById('rcpa-reject-submit');

  function openRejectBackModal() {
    if (!rbModal) return;
    if (rbText) rbText.value = '';
    if (rbInput) rbInput.value = '';
    if (rbList) rbList.innerHTML = '';
    if (rbBadge) { rbBadge.textContent = '0'; rbBadge.hidden = true; }
    rbModal.removeAttribute('hidden');
    requestAnimationFrame(() => rbModal.classList.add('show'));
    setTimeout(() => rbText?.focus(), 80);
    document.body.style.overflow = 'hidden';
  }
  function closeRejectBackModal() {
    if (!rbModal) return;
    rbModal.classList.remove('show');
    const onEnd = (e) => {
      if (e.target !== rbModal || e.propertyName !== 'opacity') return;
      rbModal.removeEventListener('transitionend', onEnd);
      rbModal.setAttribute('hidden', '');
      document.body.style.overflow = '';
    };
    rbModal.addEventListener('transitionend', onEnd);
  }
  rbClose?.addEventListener('click', closeRejectBackModal);
  rbCancel?.addEventListener('click', closeRejectBackModal);
  rbModal?.addEventListener('click', (e) => { if (e.target === rbModal) closeRejectBackModal(); });
  rbClip?.addEventListener('click', () => rbInput?.click());

  function humanSize(n) {
    if (!n && n !== 0) return '';
    let b = Number(n);
    if (b < 1024) return b + ' B';
    const u = ['KB', 'MB', 'GB', 'TB']; let i = -1;
    do { b /= 1024; i++; } while (b >= 1024 && i < u.length - 1);
    return (b >= 10 ? b.toFixed(0) : b.toFixed(1)) + ' ' + u[i];
  }
  function renderRejectList(files) {
    if (!rbList) return;
    rbList.innerHTML = '';
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
      rbList.appendChild(row);
    });
    if (rbBadge) {
      rbBadge.textContent = String(files.length);
      rbBadge.hidden = files.length === 0;
    }
  }
  rbInput?.addEventListener('change', () => renderRejectList(rbInput.files || []));
  rbList?.addEventListener('click', (e) => {
    const btn = e.target.closest('.file-remove');
    if (!btn || !rbInput) return;
    const i = Number(btn.getAttribute('data-i'));
    const dt = new DataTransfer();
    [...rbInput.files].forEach((f, idx) => { if (idx !== i) dt.items.add(f); });
    rbInput.files = dt.files;
    renderRejectList(rbInput.files || []);
  });

  // ---------- Helpers ----------
  const setVal = (id, v) => { const el = document.getElementById(id); if (el) el.value = v ?? ''; };
  const setChecked = (id, on) => { const el = document.getElementById(id); if (el) el.checked = !!on; };
  const showCond = (id, show) => { const el = document.getElementById(id); if (el) el.hidden = !show; };
  const fmt = (s) => {
    if (!s) return '';
    const d = new Date(String(s).replace(' ', 'T'));
    return isNaN(d) ? s : d.toLocaleString();
  };
  const fmtDateOnly = (s) => {
    if (!s) return '';
    const d = new Date(String(s).replace(' ', 'T'));
    return isNaN(d) ? s : d.toLocaleDateString();
  };
  const yearFrom = (s) => {
    if (!s) return '';
    const d = new Date(String(s).replace(' ', 'T'));
    if (!isNaN(d)) return String(d.getFullYear());
    const m = String(s).match(/\b(20\\d{2}|\\d{4})\\b/);
    return m ? m[1] : '';
  };
  const escapeHTML = (s) =>
    String(s ?? '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

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

  // Attachment rendering (generic target)
  function renderAttachmentsInto(targetId, s) {
    const wrap = document.getElementById(targetId);
    if (!wrap) return;
    wrap.innerHTML = '';
    if (s == null || s === '') return;

    const escapeHtml = (t) => ('' + t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
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
      // "name|url|size" or plain URLs separated by comma/newline
      items = String(s).split(/[\\n,]+/).map(t => t.trim()).filter(Boolean).map(t => {
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
        </div>`;
      wrap.appendChild(row);
    });
  }

  // Existing originator attachments
  function renderAttachments(s) {
    renderAttachmentsInto('rcpa-view-attach-list', s);
  }

  // Reset modal
  // ---- RESET (hide rejects fieldset when empty) ----
  function clearViewForm() {
    ['v-type-external', 'v-type-internal', 'v-type-unattain', 'v-type-online', 'v-type-hs', 'v-type-mgmt']
      .forEach(id => showCond(id, false));

    [
      'rcpa-view-type', 'v-external-sem1-year', 'v-external-sem2-year', 'v-internal-sem1-year', 'v-internal-sem2-year',
      'v-project-name', 'v-wbs-number', 'v-online-year', 'v-hs-month', 'v-hs-year', 'v-mgmt-year',
      'rcpa-view-originator-name', 'rcpa-view-originator-dept', 'rcpa-view-date', 'rcpa-view-remarks',
      'rcpa-view-system', 'rcpa-view-clauses', 'rcpa-view-supervisor', 'rcpa-view-assignee',
      'rcpa-view-status', 'rcpa-view-conformance',
      'rcpa-view-not-valid-reason', 'rcpa-view-invalid-assignee-sign', 'rcpa-view-invalid-assignee-sup-sign',
      'rcpa-view-invalid-qms-sign', 'rcpa-view-invalid-originator-sign'
    ].forEach(id => setVal(id, ''));

    [
      'rcpa-view-cat-major', 'rcpa-view-cat-minor', 'rcpa-view-cat-obs',
      'rcpa-view-flag-nc', 'rcpa-view-flag-pnc',
      'rcpa-view-mgmt-q1', 'rcpa-view-mgmt-q2', 'rcpa-view-mgmt-q3', 'rcpa-view-mgmt-ytd',
      'rcpa-view-findings-not-valid'
    ].forEach(id => setChecked(id, false));

    const att = document.getElementById('rcpa-view-attach-list'); if (att) att.innerHTML = '';
    const nv = document.getElementById('rcpa-view-not-valid-attach-list'); if (nv) nv.innerHTML = '';

    // Reset rejects table rows
    const tb = document.querySelector('#rcpa-rejects-table tbody');
    if (tb) tb.innerHTML = `<tr><td class="rcpa-empty" colspan="3">No records found</td></tr>`;

    // Hide the Disapproval Remarks fieldset by default
    const fs = document.querySelector('fieldset.reject-remarks');
    if (fs) { fs.hidden = true; fs.setAttribute('aria-hidden', 'true'); }

    if (modal) modal.__rejects = [];
  }


  // Parse sem/year
  function parseSemYear(s) {
    const out = { sem1: '', sem2: '', year: '', month: '' };
    if (!s) return out;
    const str = String(s).trim();
    const parts = str.split(/[;,|/]+/).map(t => t.trim()).filter(Boolean);
    if (parts.length >= 1) out.sem1 = parts[0];
    if (parts.length >= 2) out.sem2 = parts[1];
    let m = str.match(/^(\\d{4})-(\\d{1,2})$/);
    if (m) { out.year = m[1]; out.month = String(m[2]).padStart(2, '0'); return out; }
    m = str.match(/^([A-Za-z]+)\\s+(\\d{4})$/);
    if (m) { out.month = m[1]; out.year = m[2]; return out; }
    const y = str.match(/\\b(20\\d{2})\\b/);
    if (y) out.year = y[1];
    return out;
  }

  // Fill main section
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
    setVal('rcpa-view-type', typeLabelMap[typeKey] || (row.rcpa_type || ''));

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
      if (/^\\d{2}$/.test(sy.month)) {
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

    const confNorm = String(row.conformance || '').toLowerCase().replace(/[\\s_-]+/g, ' ').trim();
    let isPNC = (confNorm === 'pnc') || confNorm.includes('potential');
    let isNC = !isPNC && (confNorm === 'nc' || /\\bnon[- ]?conformance\\b/.test(confNorm) || confNorm === 'non conformance' || confNorm === 'nonconformance');
    if (cat === 'observation') { isPNC = true; isNC = false; }
    else if (cat === 'major' || cat === 'minor') { isPNC = false; isNC = true; }
    setChecked('rcpa-view-flag-pnc', isPNC);
    setChecked('rcpa-view-flag-nc', isNC);

    setVal('rcpa-view-remarks', row.remarks);
    renderAttachments(row.remarks_attachment);

    setVal('rcpa-view-system', row.system_applicable_std_violated);
    setVal('rcpa-view-clauses', row.standard_clause_number);
    setVal('rcpa-view-supervisor', row.originator_supervisor_head);

    setVal('rcpa-view-assignee', row.assignee);
    setVal('rcpa-view-status', row.status);
    setVal('rcpa-view-conformance', row.conformance);
  }

  // IN-VALIDATION section
  function fillNotValid(nv) {
    const hasNV = !!(nv && (nv.reason_non_valid || nv.assignee_name || nv.assignee_supervisor_name || nv.attachment));
    setChecked('rcpa-view-findings-not-valid', hasNV);
    setVal('rcpa-view-not-valid-reason', nv?.reason_non_valid || '');

    const assigneeSig = [nv?.assignee_name, fmtDateOnly(nv?.assignee_date)].filter(Boolean).join(' ');
    setVal('rcpa-view-invalid-assignee-sign', assigneeSig);

    const supSig = [nv?.assignee_supervisor_name, fmtDateOnly(nv?.assignee_supervisor_date)].filter(Boolean).join(' ');
    setVal('rcpa-view-invalid-assignee-sup-sign', supSig);

    renderAttachmentsInto('rcpa-view-not-valid-attach-list', nv?.attachment || '');
  }

  // Disapproval list rendering
  // ---- REJECTS TABLE (toggle fieldset visibility) ----
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

    // Show fieldset when there is data
    if (fs) { fs.hidden = false; fs.removeAttribute('aria-hidden'); }
  }


  // Click: open one disapproval item
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

  // Show/Hide modal
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

  // VIEW action: main record -> not-valid (with rejects) -> lock & show
  document.addEventListener('rcpa:action', async (e) => {
    const { action, id } = e.detail || {};
    if (action !== 'view' || !id) return;

    clearViewForm();

    try {
      // 1) Main request (core fields)
      const res = await fetch(`../php-backend/rcpa-view-approval-invalid.php?id=${encodeURIComponent(id)}`, { credentials: 'same-origin' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const row = await res.json();
      if (!row || !row.id) { alert('Record not found.'); return; }
      fillViewModal(row);

      // 2) Invalidation reply + disapproval list
      try {
        const nvRes = await fetch(`../php-backend/rcpa-view-invalidation-reply.php?rcpa_no=${encodeURIComponent(id)}`, { credentials: 'same-origin' });
        if (nvRes.ok) {
          const nv = await nvRes.json();
          if (nv && (nv.rcpa_no || nv.reason_non_valid || nv.assignee_name || nv.attachment)) {
            fillNotValid(nv);
            renderRejectsTable(nv.rejects || []);
          } else {
            fillNotValid(null);
            renderRejectsTable([]);
          }
        } else {
          fillNotValid(null);
          renderRejectsTable([]);
        }
      } catch {
        fillNotValid(null);
        renderRejectsTable([]);
      }

      lockViewCheckboxes();
      showModal();
    } catch (err) {
      console.error(err);
      alert('Failed to load record. Please try again.');
    }
  });

  document.addEventListener('rcpa:action', async (e) => {
    const { action, id } = e.detail || {};
    if (action !== 'accept' || !id) return;

    try {
      // Confirmation (SweetAlert if present, else native confirm)
      if (window.Swal) {
        const { isConfirmed } = await Swal.fire({
          icon: 'question',
          title: 'Approve In-Validation Reply?',
          text: 'This will set the status to "IN-VALIDATION REPLY APPROVAL".',
          showCancelButton: true,
          confirmButtonText: 'Yes, approve',
          cancelButtonText: 'Cancel',
          reverseButtons: true,
          focusCancel: true
        });
        if (!isConfirmed) return;
      } else {
        const ok = confirm(
          'Approve this In-Validation Reply?\n\nThis will set the status to "IN-VALIDATION REPLY APPROVAL".'
        );
        if (!ok) return;
      }

      const fd = new FormData();
      fd.append('id', String(id));

      const res = await fetch('../php-backend/rcpa-accept-invalidation-reply.php', {
        method: 'POST',
        body: fd,
        credentials: 'same-origin'
      });
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.error || `HTTP ${res.status}`);

      const st = document.getElementById('rcpa-view-status');
      if (st) st.value = 'IN-VALIDATION REPLY APPROVAL';

      if (window.Swal) {
        await Swal.fire({
          icon: 'success',
          title: 'In-Validation Reply approved',
          text: 'Status set to "IN-VALIDATION REPLY APPROVAL".',
          timer: 1600,
          showConfirmButton: false
        });
      } else {
        alert('In-Validation Reply approved. Status set to "IN-VALIDATION REPLY APPROVAL".');
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
    const { action, id } = (e.detail || {});
    if (action !== 'reject' || !id) return;
    currentViewId = id;
    openRejectBackModal();
  });

  // Submit Return to Assignee (IN-VALID APPROVAL)
  rbForm?.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    if (!currentViewId) { alert('Missing record id.'); return; }

    const text = (rbText?.value || '').trim();
    if (!text) {
      if (window.Swal) Swal.fire({ icon: 'warning', title: 'Remarks required' });
      else alert('Please enter the reason.');
      return;
    }

    try {
      rbSubmit.disabled = true;
      rbSubmit.textContent = 'Submitting…';

      const fd = new FormData();
      fd.append('id', String(currentViewId));
      fd.append('remarks', text);
      if (rbInput && rbInput.files) {
        [...rbInput.files].forEach(f => fd.append('attachments[]', f, f.name));
      }

      // Backend endpoint for invalidation-reply rejection
      const res = await fetch('../php-backend/rcpa-reject-invalidation-reply.php', {
        method: 'POST',
        body: fd,
        credentials: 'same-origin'
      });
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.error || `HTTP ${res.status}`);

      // Reflect new status in the view modal
      const st = document.getElementById('rcpa-view-status');
      if (st) st.value = 'IN-VALID APPROVAL';

      if (window.Swal) {
        Swal.fire({
          icon: 'success',
          title: 'Invalidation Reply rejected',
          text: 'Status set to "IN-VALID APPROVAL".',
          timer: 1600,
          showConfirmButton: false
        });
      } else {
        alert('Invalidation Reply rejected. Status set to "IN-VALID APPROVAL".');
      }

      closeRejectBackModal();
      document.dispatchEvent(new CustomEvent('rcpa:refresh'));


    } catch (err) {
      console.error(err);
      if (window.Swal) Swal.fire({ icon: 'error', title: 'Submit failed', text: String(err.message || err) });
      else alert('Submit failed: ' + (err.message || err));
    } finally {
      rbSubmit.disabled = false;
      rbSubmit.textContent = 'Submit';
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

// rcpa-task-invalidation-reply.js
(function () {
  const ENDPOINT = '../php-backend/rcpa-qms-tab-counters.php';

  // Find tab by data-href with safe nth-child fallback (1..4)
  function pickTab(tabsWrap, href, nth) {
    return tabsWrap.querySelector(href ? `.rcpa-tab[data-href="${href}"]` : null)
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

  async function refreshQmsTabBadges() {
    const tabsWrap = document.querySelector('.rcpa-tabs');
    if (!tabsWrap) return;

    // Tabs order: 1) QMS CHECKING  2) REPLIED - VALID  3) REPLIED - INVALID (this page)  4) EVIDENCE CHECKING
    const btnQmsChecking = pickTab(tabsWrap, 'rcpa-task-qms-checking.php', 1);
    const btnValid = pickTab(tabsWrap, 'rcpa-task-validation-reply.php', 2);
    const btnInvalid = pickTab(tabsWrap, 'rcpa-task-invalidation-reply.php', 3);
    const btnEvidence = pickTab(tabsWrap, 'rcpa-task-qms-corrective.php', 4);

    // Badges
    const bQmsChecking = ensureBadge(btnQmsChecking, 'tabBadgeQmsChecking');
    const bValid = ensureBadge(btnValid, 'tabBadgeValid');
    const bInvalid = ensureBadge(btnInvalid, 'tabBadgeNotValid');
    const bEvidence = ensureBadge(btnEvidence, 'tabBadgeEvidence');

    try {
      const res = await fetch(ENDPOINT, { credentials: 'same-origin', headers: { 'Accept': 'application/json' } });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data || !data.ok) {
        [bQmsChecking, bValid, bInvalid, bEvidence].forEach(b => { if (b) b.hidden = true; });
        return;
      }

      // Backend already scopes visibility: QA/QMS = global, others = assignee-only
      const c = data.counts || {};
      const qmsCheckingCount = c.qms_checking ?? 0;
      const validCount = c.valid ?? c.closing ?? 0;        // fallback to 'closing' if older API
      const invalidCount = c.not_valid ?? 0;
      const evidenceCount = c.evidence_checking ?? c.evidence ?? 0;

      setBadge(bQmsChecking, qmsCheckingCount);
      setBadge(bValid, validCount);
      setBadge(bInvalid, invalidCount);
      setBadge(bEvidence, evidenceCount);

    } catch {
      [bQmsChecking, bValid, bInvalid, bEvidence].forEach(b => { if (b) b.hidden = true; });
    }
  }

  // Expose for websocket/manual refresh
  window.refreshQmsTabBadges = refreshQmsTabBadges;

  // Initial load
  document.addEventListener('DOMContentLoaded', refreshQmsTabBadges);

  // Optional: refresh via WebSocket broadcast
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

  // NEW: auto-refresh badges whenever pages fire a generic refresh event
  document.addEventListener('rcpa:refresh', () => {
    if (typeof window.refreshQmsTabBadges === 'function') {
      window.refreshQmsTabBadges();
    }
  });
})();
