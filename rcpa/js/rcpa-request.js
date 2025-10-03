(() => {
  const requestBtn = document.getElementById('rcpa-req-btn');
  const modal = document.getElementById('rcpa-request-modal');
  const closeModal = document.getElementById('rcpa-close-modal');

  // --- NEW: tiny helpers for required handling + SweetAlert errors ---
  function swalError(msg, focusSel) {
    Swal.fire({ icon: 'warning', title: 'Missing required info', text: msg });
    if (focusSel) {
      const el = document.querySelector(focusSel);
      if (el && typeof el.focus === 'function') setTimeout(() => el.focus(), 0);
    }
  }

  function categorySelected() {
    const fs = document.querySelector('fieldset.category');
    if (!fs) return false;
    return !!(fs.querySelector('input[name="cat_major"]:checked')
      || fs.querySelector('input[name="cat_minor"]:checked')
      || fs.querySelector('input[name="cat_observation"]:checked'));
  }

  function removeRequiredWithin(root) {
    if (!root) return;
    root.querySelectorAll('[required]').forEach(el => el.removeAttribute('required'));
  }

  // Toggle required attributes that *do* work with native validity.
  // Things like “at least one checkbox in a group with different names” will be custom-validated at submit.
  function setTypeRequirements(type) {
    const blocks = {
      external: document.getElementById('type-external'),
      internal: document.getElementById('type-internal'),
      unattain: document.getElementById('type-unattain'),
      online: document.getElementById('type-online'),
      '5s': document.getElementById('type-hs'),
      mgmt: document.getElementById('type-mgmt')
    };

    // 1) Remove [required] from *all* type blocks first
    Object.values(blocks).forEach(el => removeRequiredWithin(el));

    // 2) Add [required] only to fields that are truly required for the active type
    switch (type) {
      case 'unattain': {
        const pn = document.querySelector('#type-unattain input[name="project_name"]');
        const wbs = document.querySelector('#type-unattain input[name="wbs_number"]');
        pn?.setAttribute('required', '');
        wbs?.setAttribute('required', '');
        break;
      }
      case 'online': {
        const y = document.querySelector('#type-online input[name="online_year"]');
        y?.setAttribute('required', '');
        break;
      }
      case '5s': {
        // Month is chosen by user; Year is auto-filled/readonly
        const m = document.querySelector('#type-hs select[name="hs_month"]');
        m?.setAttribute('required', '');
        break;
      }
      case 'mgmt': {
        const y = document.querySelector('#type-mgmt input[name="mgmt_year"]');
        y?.setAttribute('required', '');
        // Quarter selection (“one of”) is validated custom at submit.
        break;
      }
      // external/internal: validated custom (semester pick). No native [required] here helps.
    }
  }

  // Custom validation that HTML5 can't express well
  function validateTypeSpecificOnSubmit(form) {
    const fd = new FormData(form);
    const type = fd.get('rcpa_type');

    if (!type) {
      swalError('Please select an RCPA Type.', '#rcpa-type');
      return false;
    }

    if (type === 'external') {
      const s1 = fd.get('external_sem1_pick');
      const s2 = fd.get('external_sem2_pick');
      if (!s1 && !s2) {
        swalError('For External QMS Audit, choose either 1st Sem or 2nd Sem.', '#type-external input[name="external_sem1_pick"]');
        return false;
      }
    }

    if (type === 'internal') {
      const s1 = fd.get('internal_sem1_pick');
      const s2 = fd.get('internal_sem2_pick');
      if (!s1 && !s2) {
        swalError('For Internal Quality Audit, choose either 1st Sem or 2nd Sem.', '#type-internal input[name="internal_sem1_pick"]');
        return false;
      }
    }

    if (type === 'mgmt') {
      const q1 = fd.get('mgmt_q1'), q2 = fd.get('mgmt_q2'), q3 = fd.get('mgmt_q3'), ytd = fd.get('mgmt_ytd');
      if (!q1 && !q2 && !q3 && !ytd) {
        swalError('For Management Objective, select a quarter (Q1, Q2, Q3) or YTD.', '#type-mgmt input[name="mgmt_q1"]');
        return false;
      }
    }

    if (type === 'online') {
      const y = (fd.get('online_year') || '').trim();
      if (!/^\d{4}$/.test(y)) {
        swalError('Please enter a valid 4-digit year for On-Line.', '#type-online input[name="online_year"]');
        return false;
      }
    }

    if (type === '5s') {
      if (!fd.get('hs_month')) {
        swalError('Please select a month for 5S / Health & Safety Concerns.', '#type-hs select[name="hs_month"]');
        return false;
      }
    }

    if (type === 'unattain') {
      if (!(fd.get('project_name') || '').trim()) {
        swalError('Project Name is required for Un-attainment.', '#type-unattain input[name="project_name"]');
        return false;
      }
      if (!(fd.get('wbs_number') || '').trim()) {
        swalError('WBS Number is required for Un-attainment.', '#type-unattain input[name="wbs_number"]');
        return false;
      }
    }

    return true;
  }


  // Clear all form controls inside a container
  function clearInputs(root) {
    if (!root) return;
    root.querySelectorAll('input, select, textarea').forEach(el => {
      if (el.type === 'checkbox' || el.type === 'radio') {
        el.checked = false;
      } else if (el.tagName === 'SELECT') {
        el.selectedIndex = 0;
      } else {
        el.value = '';
      }
    });
  }

  // Prefill static year/month ONLY within a specific block
  function prefillStaticYearsIn(root) {
    if (!root) return;
    const now = new Date();
    const year = String(now.getFullYear());

    const lockReadOnly = inp => {
      if (!inp) return;
      inp.readOnly = true;
      inp.setAttribute('aria-readonly', 'true');
      inp.addEventListener('keydown', e => e.preventDefault());
    };

    // keep auto year values/read-only
    [['online_year', year], ['hs_year', year], ['mgmt_year', year]].forEach(([name, val]) => {
      const el = root.querySelector(`input[name="${name}"]`);
      if (el && !el.value) el.value = val;
      if (el) lockReadOnly(el);
    });

    // hs_month is now a <select>; no default value set here
  }


  /* ------------------ Real-time datetime ------------------ */
  let originatorClock = null;

  const pad2 = n => String(n).padStart(2, '0');

  function isoForDatetimeLocal(d, withSeconds = true) {
    const y = d.getFullYear();
    const m = pad2(d.getMonth() + 1);
    const dd = pad2(d.getDate());
    const hh = pad2(d.getHours());
    const mm = pad2(d.getMinutes());
    const ss = pad2(d.getSeconds());
    return withSeconds ? `${y}-${m}-${dd}T${hh}:${mm}:${ss}` : `${y}-${m}-${dd}T${hh}:${mm}`;
  }

  function startClock(input, serverNowMsOrIso) {
    if (originatorClock) clearInterval(originatorClock);
    input.type = 'datetime-local';
    input.readOnly = true;
    input.step = input.step || '1';

    let serverMs = Date.now();
    if (typeof serverNowMsOrIso === 'number') serverMs = serverNowMsOrIso;
    else if (typeof serverNowMsOrIso === 'string') {
      const t = Date.parse(serverNowMsOrIso);
      if (!Number.isNaN(t)) serverMs = t;
    }
    const offset = serverMs - Date.now();

    const tick = () => {
      input.value = isoForDatetimeLocal(new Date(Date.now() + offset), true);
    };
    tick();
    originatorClock = setInterval(tick, 1000);
  }

  function stopClock() {
    if (originatorClock) clearInterval(originatorClock);
    originatorClock = null;
  }

  /* ------------------ Modal open/close ------------------ */
  function showModal() {
    modal.classList.add('show');

    // reset visible type section
    const select = document.getElementById('rcpa-type');
    if (select) {
      select.value = '';
      document.querySelectorAll('.type-conditional').forEach(el => el.hidden = true);
    }

    populateOriginator();
    loadAssigneeOptions();

    // make sure Choices dropdown is not stuck open when reopening
    const sup = document.getElementById('originatorSupervisor');
    if (sup?._choices) {
      sup._choices.hideDropdown();
      sup._choices.clearInput();
      const wrap = sup.closest('.choices');
      if (wrap) wrap.classList.remove('is-open');
    }
  }

  function hideModal() {
    stopClock();
    clearOriginatorSupervisor();
    clearAssignee();
    resetRCPAForm();
    modal.classList.remove('show');
  }

  function resetRCPAForm() {
    const form = modal.querySelector('form.rcpa-form');
    if (!form) return;

    // Clear every input/select/textarea in the form
    clearInputs(form);

    // Clear/close Choices + native select
    resetSupervisorSelect();
    resetAssigneeSelect();

    // Hide all conditional blocks and clear the type select
    const typeSelect = document.getElementById('rcpa-type');
    if (typeSelect) typeSelect.value = '';
    document.querySelectorAll('.type-conditional').forEach(el => (el.hidden = true));

    // Clear attachments
    if (window.__rcpaResetAttachments) {
      window.__rcpaResetAttachments();
    } else {
      const fileInput = document.getElementById('finding_files');
      if (fileInput) {
        fileInput.value = '';
        try { fileInput.files = new DataTransfer().files; } catch { }
      }
      const badge = document.getElementById('attach_count');
      const list = document.getElementById('attach_list');
      if (badge) { badge.hidden = true; badge.textContent = '0'; }
      if (list) list.innerHTML = '';
    }
  }

  requestBtn?.addEventListener('click', showModal);
  closeModal?.addEventListener('click', hideModal);

  /* ------------------ RCPA type switcher ------------------ */
  const typeSelect = document.getElementById('rcpa-type');
  const typeBlocks = {
    external: document.getElementById('type-external'),
    internal: document.getElementById('type-internal'),
    unattain: document.getElementById('type-unattain'),
    online: document.getElementById('type-online'),
    '5s': document.getElementById('type-hs'),
    mgmt: document.getElementById('type-mgmt')
  };

  function updateType() {
    const v = typeSelect.value;

    // Hide & clear everything that is NOT selected
    Object.entries(typeBlocks).forEach(([key, el]) => {
      if (!el) return;
      if (key !== v) {
        el.hidden = true;
        // Clear values
        clearInputs(el);
        // Also remove any [required] left behind
        removeRequiredWithin(el);
      }
    });

    // Show the selected block and prefill its static fields
    const active = typeBlocks[v];
    if (active) {
      active.hidden = false;
      prefillStaticYearsIn(active);
    }

    // NEW: toggle required attributes based on the selected type
    setTypeRequirements(v);
  }


  if (typeSelect) {
    typeSelect.addEventListener('change', updateType);
    updateType();
  }

  /* ------------------ Attachments ------------------ */
  (function initAttachments() {
    const input = document.getElementById('finding_files');
    const badge = document.getElementById('attach_count');
    const list = document.getElementById('attach_list');
    if (!input || !badge || !list) return;

    const dt = new DataTransfer();
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const fmt = n => {
      let i = 0, v = n || 0;
      while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
      return `${v >= 10 || i === 0 ? Math.round(v) : v.toFixed(1)} ${units[i]}`;
    };

    function render() {
      list.innerHTML = '';
      Array.from(dt.files).forEach((f, i) => {
        const row = document.createElement('div');
        row.className = 'file-chip';
        row.innerHTML = `
          <i class="fa-solid fa-paperclip" aria-hidden="true"></i>
          <div class="file-info">
            <div class="name" title="${f.name}">${f.name}</div>
            <div class="sub">${fmt(f.size)}</div>
          </div>
          <button type="button" class="file-remove" aria-label="Remove ${f.name}" data-idx="${i}"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>`;
        list.appendChild(row);
      });
      const n = dt.files.length;
      badge.hidden = n === 0;
      if (n) badge.textContent = n;
      input.files = dt.files;
      if (n === 0) input.value = '';
    }

    window.__rcpaResetAttachments = function () {
      while (dt.items.length) dt.items.remove(0);
      render();
    };

    input.addEventListener('change', () => {
      Array.from(input.files).forEach(f => dt.items.add(f));
      render();
    });
    list.addEventListener('click', e => {
      const btn = e.target.closest('.file-remove');
      if (!btn) return;
      dt.items.remove(+btn.dataset.idx);
      render();
    });
  })();

  /* ------------------ Category exclusivity + flags ------------------ */
  (function initCategory() {
    const fs = document.querySelector('fieldset.category');
    if (!fs) return;
    const major = fs.querySelector('input[name="cat_major"]');
    const minor = fs.querySelector('input[name="cat_minor"]');
    const obs = fs.querySelector('input[name="cat_observation"]');
    const cats = [major, minor, obs].filter(Boolean);

    const flags = document.querySelector('.desc-flags');
    const nc = flags?.querySelector('input[name="nc_flag"]');
    const pnc = flags?.querySelector('input[name="pnc_flag"]');
    [nc, pnc].forEach(el => {
      if (!el) return;
      el.setAttribute('aria-disabled', 'true');
      el.tabIndex = -1;
      el.addEventListener('click', e => e.preventDefault());
      el.addEventListener('keydown', e => e.preventDefault());
    });

    function setFlags(useNC, usePNC) { if (nc) nc.checked = !!useNC; if (pnc) pnc.checked = !!usePNC; }
    function sync() {
      const isMajor = !!major?.checked;
      const isMinor = !!minor?.checked;
      const isObs = !!obs?.checked;
      if (isMajor || isMinor) setFlags(true, false);
      else if (isObs) setFlags(false, true);
      else setFlags(false, false);
    }
    fs.addEventListener('change', e => {
      if (!cats.includes(e.target)) return;
      if (e.target.checked) cats.forEach(cb => { if (cb !== e.target) cb.checked = false; });
      sync();
    });
    sync();
  })();

  /* ------------------ Prefill year/month (read-only) ------------------ */
  function lockReadOnly(inp) {
    if (!inp) return;
    inp.readOnly = true;
    inp.setAttribute('aria-readonly', 'true');
    inp.addEventListener('keydown', e => e.preventDefault());
  }

  /* ------------------ Mgmt quarters: only one ------------------ */
  (function initMgmtQuarters() {
    const wrap = document.querySelector('#type-mgmt .quarters-inline');
    if (!wrap) return;
    const boxes = Array.from(wrap.querySelectorAll('input[type="checkbox"]'));
    wrap.addEventListener('change', e => {
      if (!boxes.includes(e.target)) return;
      if (e.target.checked) boxes.forEach(b => { if (b !== e.target) b.checked = false; });
    });
  })();

  /* ------------------ Semester checkbox pairs ------------------ */
  function semesterCheckboxPair(blockId, prefix) {
    const block = document.getElementById(blockId);
    if (!block) return;
    const pick1 = block.querySelector(`input[name="${prefix}_sem1_pick"]`);
    const pick2 = block.querySelector(`input[name="${prefix}_sem2_pick"]`);
    const y1 = block.querySelector(`input[name="${prefix}_sem1_year"]`);
    const y2 = block.querySelector(`input[name="${prefix}_sem2_year"]`);
    if (!pick1 || !pick2 || !y1 || !y2) return;

    [y1, y2].forEach(lockReadOnly);

    function apply(changed) {
      const year = String(new Date().getFullYear());
      if (changed === pick1 && pick1.checked) pick2.checked = false;
      if (changed === pick2 && pick2.checked) pick1.checked = false;
      if (pick1.checked) { y1.value = year; y2.value = ''; }
      else if (pick2.checked) { y2.value = year; y1.value = ''; }
      else { y1.value = ''; y2.value = ''; }
    }
    pick1.addEventListener('change', () => apply(pick1));
    pick2.addEventListener('change', () => apply(pick2));
    apply(); // init
  }
  semesterCheckboxPair('type-external', 'external');
  semesterCheckboxPair('type-internal', 'internal');

  /* ------------------ Originator fetch + start clock ------------------ */
  async function populateOriginator() {
    const nameInput = document.querySelector('input[name="originator_name"]');
    const deptInput = document.querySelector('input[name="originator_dept"]');
    const dateInput = document.querySelector('input[name="originator_date"]');
    if (!nameInput || !deptInput || !dateInput) return;

    try {
      const res = await fetch('../php-backend/rcpa-get-originator.php', {
        credentials: 'same-origin',
        headers: { 'Accept': 'application/json' }
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Failed to load');

      nameInput.value = data.name || '';
      deptInput.value = data.department || '';
      startClock(dateInput, typeof data.server_now !== 'undefined' ? data.server_now : data.date);

      const role = (data.role || '').toLowerCase();
      const label = document.querySelector('label[for="originatorSupervisor"]');
      const select = document.getElementById('originatorSupervisor');

      if (label && select) {
        if (role === 'manager') {
          // Hide and not required (as before)
          label.hidden = true;
          select.hidden = true;
          select.removeAttribute('required');
          select.value = '';
        } else if (role === 'supervisor') {
          // Show but NOT required
          label.hidden = false;
          select.hidden = false;
          select.removeAttribute('required');
        } else {
          // Everyone else: show and required
          label.hidden = false;
          select.hidden = false;
          select.setAttribute('required', '');
        }
      }

      if (role === 'manager') {
        setSupervisorVisibility(false);                 // hidden, not required
      } else if (role === 'supervisor') {
        setSupervisorVisibility(true, /* required */ false); // visible, NOT required
        loadSupervisorOptions();
      } else {
        setSupervisorVisibility(true, /* required */ true);  // visible, required
        loadSupervisorOptions();
      }
    } catch (err) {
      console.error('Originator fetch failed:', err);
      startClock(dateInput, Date.now()); // fallback to client time
      setSupervisorVisibility(true, /* required */ true);
      loadSupervisorOptions();
    }
  }

  function setSupervisorVisibility(show, required = true) {
    const label = document.querySelector('label[for="originatorSupervisor"]');
    const select = document.getElementById('originatorSupervisor');
    if (!label || !select) return;

    label.hidden = !show;

    // Hide Choices container if present, else the native select
    const choicesWrapper = select.closest('.choices');
    if (choicesWrapper) choicesWrapper.hidden = !show;
    else select.hidden = !show;

    // manage required flag separately
    if (!show) {
      select.removeAttribute('required');
    } else {
      if (required) select.setAttribute('required', '');
      else select.removeAttribute('required');
    }
  }


  /* Load supervisor options only when needed */
  async function loadSupervisorOptions() {
    const select = document.getElementById('originatorSupervisor');
    if (!select) return;

    // Remove native placeholder so Choices can own the placeholder row
    const placeholder = select.querySelector('option[value=""]');
    if (placeholder) placeholder.remove();

    // Avoid re-loading options from the server more than once
    if (!select.dataset.loaded) {
      try {
        const r = await fetch('../php-backend/rcpa-get-supervisor.php?format=select', { cache: 'no-store' });
        if (r.ok) {
          const html = await r.text();
          if (html) {
            select.insertAdjacentHTML('beforeend', html);
            select.dataset.loaded = '1';
          }
        }
      } catch (e) { /* ignore */ }
    }

    // Initialize Choices ONCE per life of the select (will be destroyed on close)
    if (window.Choices && !select._choices) {
      select._choices = new Choices(select, {
        searchEnabled: true,
        placeholder: true,
        placeholderValue: '— Select —',
        allowHTML: false,
        itemSelectText: '',
        shouldSort: true,
        searchPlaceholderValue: 'Search name…',
        position: 'bottom'
      });
    }
  }

  function resetSupervisorSelect() {
    const sup = document.getElementById('originatorSupervisor');
    if (!sup) return;

    // Destroy the Choices instance so we get a fresh, closed control next time
    if (sup._choices) {
      try { sup._choices.destroy(); } catch (e) { }
      sup._choices = null;
    }

    // There should no longer be a .choices wrapper; but if one remains, remove it.
    const wrap = sup.closest('.choices');
    if (wrap) {
      wrap.parentNode.insertBefore(sup, wrap);
      wrap.remove();
    }

    // Reset native select state
    sup.value = '';
    sup.selectedIndex = 0;
    sup.hidden = false; // ensure it shows until Choices re-inits
  }

  function clearOriginatorSupervisor() {
    const el = document.getElementById('originatorSupervisor');
    if (!el) return;

    // If Choices.js is active, clear its UI state
    if (el._choices) {
      el._choices.hideDropdown();
      el._choices.removeActiveItems();
      el._choices.clearInput();
    }

    // Reset the native select
    el.value = '';
    el.selectedIndex = 0;
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  /* ------------------ Assignee dropdown (departments + employees) ------------------ */
  async function loadAssigneeOptions() {
    const select = document.getElementById('assigneeSelect');
    if (!select) return;

    // ✅ DO NOT remove the placeholder for assignee; ensure one exists & is selected
    let ph = select.querySelector('option[value=""]');
    if (!ph) {
      select.insertAdjacentHTML(
        'afterbegin',
        '<option value="" disabled selected hidden>— Select —</option>'
      );
      ph = select.querySelector('option[value=""]');
    } else {
      ph.disabled = true;
      ph.hidden = true;
      ph.selected = true;
    }

    // Only fetch once
    if (!select.dataset.loaded) {
      try {
        const r = await fetch('../php-backend/rcpa-get-assignees.php?format=select', { cache: 'no-store' });
        if (r.ok) {
          const html = await r.text();
          if (html) {
            // Add options AFTER the placeholder so index 0 remains the blank
            ph.insertAdjacentHTML('afterend', html);
            select.dataset.loaded = '1';
          }
        }
      } catch (e) {
        console.error('Assignee options load failed:', e);
      }
    }

    // Make sure no auto-selection happened
    select.value = '';
    if (ph) ph.selected = true;

    // Initialize Choices once
    if (window.Choices && !select._choices) {
      select._choices = new Choices(select, {
        searchEnabled: true,
        placeholder: true,
        placeholderValue: '— Select —',
        allowHTML: false,
        itemSelectText: '',
        shouldSort: false,
        searchPlaceholderValue: 'Search department or person…',
        position: 'bottom'
      });
    }
  }


  function resetAssigneeSelect() {
    const sel = document.getElementById('assigneeSelect');
    if (!sel) return;

    if (sel._choices) {
      try { sel._choices.destroy(); } catch (e) { }
      sel._choices = null;
    }

    const wrap = sel.closest('.choices');
    if (wrap) {
      wrap.parentNode.insertBefore(sel, wrap);
      wrap.remove();
    }

    // Ensure placeholder exists and is selected
    let ph = sel.querySelector('option[value=""]');
    if (!ph) {
      sel.insertAdjacentHTML('afterbegin', '<option value="" disabled selected hidden>— Select —</option>');
      ph = sel.querySelector('option[value=""]');
    }
    sel.value = '';
    if (ph) ph.selected = true;
    sel.selectedIndex = 0;
    sel.hidden = false;
  }

  function clearAssignee() {
    const sel = document.getElementById('assigneeSelect');
    if (!sel) return;

    if (sel._choices) {
      sel._choices.hideDropdown();
      sel._choices.removeActiveItems();
      sel._choices.clearInput();
    }

    // Reset the native value too
    sel.value = '';
    sel.selectedIndex = 0;
    sel.dispatchEvent(new Event('change', { bubbles: true }));
  }

  /* ------------------ Submit RCPA request (SweetAlert CONFIRM + loader) ------------------ */
  (function initSubmit() {
    const form = document.querySelector('#rcpa-request-modal form.rcpa-form');
    const submitBtn = document.getElementById('rcpa-submit-request');
    if (!form || !submitBtn) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      // A) Category required (one of the three)
      if (!categorySelected()) {
        swalError('Please choose a Category (Major, Minor, or Observation).', 'fieldset.category input[type="checkbox"]');
        return;
      }

      // B) Assignee required (work with/without Choices.js)
      const assigneeSel = document.getElementById('assigneeSelect');
      let assigneeVal = '';
      if (assigneeSel) {
        if (assigneeSel._choices && typeof assigneeSel._choices.getValue === 'function') {
          const v = assigneeSel._choices.getValue(true); // string or array (values only)
          assigneeVal = Array.isArray(v) ? (v[0] || '') : (v || '');
        } else {
          assigneeVal = assigneeSel.value || '';
        }
      }
      if (!assigneeVal) {
        swalError('Please select an Assignee (Department).', '#assigneeSelect');
        return;
      }
      // B1.5) Require at least one attachment

      // C) Type-specific requirements (semester/quarter/etc.)
      if (!validateTypeSpecificOnSubmit(form)) {
        return;
      }

      const filesInput = document.getElementById('finding_files');
      if (!filesInput || !filesInput.files || filesInput.files.length === 0) {
        swalError('Please attach at least one evidence file.', 'label[for="finding_files"]');
        return;
      }

      // Native validation first
      if (!form.reportValidity()) return;

      // Confirm first
      const confirmResult = await Swal.fire({
        icon: 'question',
        title: 'Submit RCPA request?',
        html: 'Please review your details before submitting.',
        showCancelButton: true,
        confirmButtonText: 'Yes, submit',
        cancelButtonText: 'Review again',
        reverseButtons: true,
        focusCancel: true,
        allowOutsideClick: () => !Swal.isLoading(),
        showLoaderOnConfirm: true,
        preConfirm: async () => {
          try {
            const fd = new FormData(form);

            // --- computed fields (same logic as before) ---
            const type = fd.get('rcpa_type');

            // sem_year
            let semYear = '';
            if (type === 'external') {
              if (fd.get('external_sem1_pick')) semYear = `1st Sem – ${fd.get('external_sem1_year') || ''}`;
              else if (fd.get('external_sem2_pick')) semYear = `2nd Sem – ${fd.get('external_sem2_year') || ''}`;
            } else if (type === 'internal') {
              if (fd.get('internal_sem1_pick')) semYear = `1st Sem – ${fd.get('internal_sem1_year') || ''}`;
              else if (fd.get('internal_sem2_pick')) semYear = `2nd Sem – ${fd.get('internal_sem2_year') || ''}`;
            } else if (type === 'online') {
              semYear = (fd.get('online_year') || '').trim();
            } else if (type === '5s') {
              const m = (fd.get('hs_month') || '').trim();
              const y = (fd.get('hs_year') || '').trim();
              if (m || y) semYear = `${m} ${y}`.trim();
            } else if (type === 'mgmt') {
              semYear = (fd.get('mgmt_year') || '').trim();
            }
            fd.set('sem_year_calc', semYear);

            // quarter (mgmt)
            let quarter = '';
            if (type === 'mgmt') {
              if (fd.get('mgmt_q1')) quarter = 'Q1';
              else if (fd.get('mgmt_q2')) quarter = 'Q2';
              else if (fd.get('mgmt_q3')) quarter = 'Q3';
              else if (fd.get('mgmt_ytd')) quarter = 'YTD';
            }
            fd.set('quarter_calc', quarter);

            // category + conformance
            let category = '';
            if (fd.get('cat_major')) category = 'Major';
            else if (fd.get('cat_minor')) category = 'Minor';
            else if (fd.get('cat_observation')) category = 'Observation';
            fd.set('category_calc', category);

            let conformance = '';
            if (category === 'Observation') conformance = 'Potential Non-conformance';
            else if (category === 'Major' || category === 'Minor') conformance = 'Non-conformance';
            fd.set('conformance_calc', conformance);

            // datetime-local → DATETIME
            const dt = (fd.get('originator_date') || '').replace('T', ' ');
            fd.set('date_request_calc', dt);

            // Submit (loader shows because of showLoaderOnConfirm)
            const res = await fetch('../php-backend/rcpa-submit-request.php', {
              method: 'POST',
              body: fd,
              credentials: 'same-origin'
            });

            let data;
            try {
              data = await res.json();
            } catch {
              throw new Error(`Invalid server response (HTTP ${res.status}).`);
            }

            if (!res.ok || !data.ok) {
              throw new Error(data?.error || `Submit failed (HTTP ${res.status})`);
            }

            // Return data to the then-handler
            return data;
          } catch (err) {
            // Show error text inside the modal without closing it
            Swal.showValidationMessage(err.message || 'Something went wrong.');
            return false;
          }
        }
      });

      // If user cancelled or there was a validation message, stop here
      if (!confirmResult.isConfirmed || !confirmResult.value) return;

      // Success modal (or convert to toast if you prefer)
      const data = confirmResult.value; // { ok: true, id: ... }
      await Swal.fire({
        icon: 'success',
        title: 'Submitted!',
        text: 'RCPA Request created successfully.',
        confirmButtonText: 'OK',
        allowOutsideClick: false
      });

      refreshRcpaTable();

      // Highlight the new row after reload
      if (data?.id) {
        setTimeout(() => {
          const row = document.querySelector(`#rcpa-table tbody tr td:first-child`);
          if (row && row.textContent.trim() === String(data.id)) {
            row.parentElement.classList.add('rcpa-row-new');

            // Optionally stop blinking after 10 seconds
            setTimeout(() => {
              row.parentElement.classList.remove('rcpa-row-new');
            }, 20000);
          }
        }, 500); // wait a bit until table reloads
      }

      // Optionally broadcast so other clients update, too
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ action: 'rcpa-request' }));
        alert("sent"); // remove this noisy alert
      }

      // Close & reset modal using your existing helpers
      if (typeof window.__rcpaResetAttachments === 'function') window.__rcpaResetAttachments();
      try { hideModal(); } catch {
        form.reset();
        document.getElementById('rcpa-request-modal')?.classList.remove('show');
      }
    });
  })();

  function labelForType(t) {
    const key = (t || '').toLowerCase();
    const TYPE_LABELS = {
      external: 'External QMS Audit',
      internal: 'Internal Quality Audit',
      unattain: 'Un-attainment of delivery target of Project',
      online: 'On-Line',
      '5s': '5S Audit / Health & Safety Concerns',
      mgmt: 'Management Objective'
    };
    return TYPE_LABELS[key] ?? (t || '');
  }

  (function initRcpaList() {
    const tbody = document.querySelector('#rcpa-table tbody');
    const pageInfo = document.getElementById('rcpa-page-info');
    const totalEl = document.getElementById('rcpa-total');
    const prevBtn = document.getElementById('rcpa-prev');
    const nextBtn = document.getElementById('rcpa-next');

    const fStatus = document.getElementById('rcpa-filter-status');
    const fType = document.getElementById('rcpa-filter-type');

    // History modal
    const historyModal = document.getElementById('rcpa-history-modal');
    const historyTitle = document.getElementById('rcpa-history-title');
    const historyBody = document.getElementById('rcpa-history-body');
    const historyClose = document.getElementById('rcpa-history-close');

    let page = 1;
    const pageSize = 10;
    let total = 0;

    // ⚡ track latest seen id for SSE resume
    let lastSeenId = 0;
    let es = null;

    // ---- helpers
    const esc = (s) => String(s ?? '').replace(/[&<>"'`=\/]/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '`': '&#96;', '=': '&#61;', '/': '&#47;'
    }[c] || c));

    function labelForType(t) {
      const key = String(t ?? '').toLowerCase().trim();
      const map = {
        external: 'External QMS Audit',
        internal: 'Internal Quality Audit',
        unattain: 'Un-attainment of delivery target of Project',
        online: 'On-Line',
        '5s': '5S Audit / Health & Safety Concerns',
        mgmt: 'Management Objective'
      };
      return map[key] ?? (t ?? '');
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
      const v = String(c ?? '').toLowerCase();
      if (v === 'major') return `<span class="rcpa-badge badge-cat-major">Major</span>`;
      if (v === 'minor') return `<span class="rcpa-badge badge-cat-minor">Minor</span>`;
      if (v === 'observation') return `<span class="rcpa-badge badge-cat-obs">Observation</span>`;
      return '';
    }

    function fmtDate(s) {
      if (!s) return '';
      if (/^0{4}-0{2}-0{2}/.test(String(s))) return '';
      const d = new Date(String(s).replace(' ', 'T'));
      if (isNaN(d)) return esc(String(s));
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
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const d = new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00`);
      if (isNaN(d)) return s;
      return `${months[d.getMonth()]} ${String(d.getDate()).padStart(2, '0')}, ${d.getFullYear()}`;
    }

    /* Closing due date helpers (Manila) */
    const MANILA_OFFSET = '+08:00'; // PHT, no DST

    function todayYmdManila() {
      const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit'
      }).formatToParts(new Date());
      const get = t => parts.find(p => p.type === t).value;
      return `${get('year')}-${get('month')}-${get('day')}`;
    }
    function dateAtMidnightManila(ymd) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(ymd))) return null;
      return new Date(`${ymd}T00:00:00${MANILA_OFFSET}`);
    }
    function diffDaysFromTodayManila(ymd) {
      const a = dateAtMidnightManila(todayYmdManila());
      const b = dateAtMidnightManila(ymd);
      if (!a || !b) return null;
      return Math.trunc((b - a) / (24 * 60 * 60 * 1000));
    }
    function renderCloseDue(ymd) {
      if (!ymd || /^\s*$/.test(String(ymd))) {
        return '<span class="rcpa-muted">No closing due date yet</span>';
      }
      const base = fmtYmd(ymd);
      const d = diffDaysFromTodayManila(ymd);
      if (d === null) return base;
      return `${base} (${d} ${Math.abs(d) === 1 ? 'day' : 'days'})`;
    }
    // Styled close-due cell with thresholds:
    // >25 days = badge-cat-obs, >7 days = badge-cat-minor, <=7 days = badge-cat-major
    function formatCloseDueCell(ymd) {
      if (!ymd || /^\s*$/.test(String(ymd))) {
        return '<span class="rcpa-muted">No closing due date yet</span>';
      }
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


    // parse SQL DATETIME as local
    function parseSQLDateTime(s) {
      if (!s) return null;
      const m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/);
      if (!m) return new Date(s);
      return new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0));
    }
    function timeAgo(input) {
      const d = input instanceof Date ? input : parseSQLDateTime(input);
      if (!d || isNaN(d)) return '';
      const now = new Date();
      const diffMs = d.getTime() - now.getTime();
      const absSec = Math.round(Math.abs(diffMs) / 1000);
      if (absSec < 30) return 'just now';
      const units = [
        { s: 365 * 24 * 60 * 60, n: 'year' },
        { s: 30 * 24 * 60 * 60, n: 'month' },
        { s: 7 * 24 * 60 * 60, n: 'week' },
        { s: 24 * 60 * 60, n: 'day' },
        { s: 60 * 60, n: 'hour' },
        { s: 60, n: 'minute' },
        { s: 1, n: 'second' },
      ];
      for (const { s, n } of units) {
        const v = Math.floor(absSec / s);
        if (v >= 1) return diffMs < 0 ? `${v} ${n}${v === 1 ? '' : 's'} ago` : `in ${v} ${n}${v === 1 ? '' : 's'}`;
      }
      return '';
    }

    // ---- history modal
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
                <td>${fmtDate(h.date_time)}${(() => { const ago = timeAgo(h.date_time); return ago ? `<span class="rcpa-ago">(${ago})</span>` : ''; })()}</td>
                <td>${esc(h?.name)}</td>
                <td>${esc(h?.activity)}</td>
              </tr>`).join('')}
          </tbody>
        </table>`;
      } catch (err) {
        console.error(err);
        historyBody.innerHTML = `<div class="rcpa-empty">Failed to load history.</div>`;
      }
    }

    // ---- main list
    async function load() {
      tbody.innerHTML = `<tr><td colspan="10" class="rcpa-empty">Loading…</td></tr>`;

      const qs = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        status: fStatus?.value ?? '',
        type: fType?.value ?? ''
      });

      try {
        const res = await fetch(`../php-backend/rcpa-list-request.php?${qs.toString()}`, { credentials: 'same-origin' });
        const data = await res.json();
        if (!res.ok || !data?.ok) throw new Error(data?.error || `HTTP ${res.status}`);

        total = Number.isFinite(data?.total) ? data.total : 0;
        const rows = Array.isArray(data?.rows) ? data.rows : [];

        if (rows.length === 0) {
          tbody.innerHTML = `<tr><td colspan="10" class="rcpa-empty">No records found.</td></tr>`;
        } else {
          tbody.innerHTML = rows.map(r => {
            const id = r?.id ?? '';
            const s = String(r?.status || '').toUpperCase();
            const needsBlink = (
              s === 'REPLY CHECKING - ORIGINATOR' ||
              s === 'EVIDENCE CHECKING - ORIGINATOR' ||
              s === 'INVALID APPROVAL - ORIGINATOR'
            );
            const rowClass = needsBlink ? 'rcpa-row-alert' : '';

            return `
<tr class="${rowClass}">
  <td>${esc(id)}</td>
  <td>${esc(labelForType(r?.rcpa_type))}</td>
  <td>${badgeForCategory(r?.category)}</td>
  <td>${fmtDate(r?.date_request)}</td>
  <td>${formatCloseDueCell(r?.close_due_date)}</td>
  <td>${badgeForStatus(r?.status)}</td>
  <td>${esc(r?.originator_name)}</td>
  <td>${esc(
  (() => {
    const assignee = r?.section ? `${r.assignee} - ${r.section}` : r?.assignee;
    const assigneeName = r?.assignee_name ? ` (${r.assignee_name})` : '';
    return assignee + assigneeName;
  })()
)}</td>

  <td><button type="button" class="rcpa-btn rcpa-view" data-id="${esc(id)}">View</button></td>
  <td>
    <i class="fa-solid fa-clock-rotate-left icon-rcpa-history"
       data-id="${esc(id)}" role="button" tabindex="0"
       title="View history"></i>
  </td>
</tr>`;
          }).join('');
        }

        const maxPage = Math.max(1, Math.ceil(total / pageSize));
        page = Math.min(page, maxPage);
        pageInfo.textContent = `Page ${page} of ${maxPage}`;
        totalEl.textContent = `${total} record${total === 1 ? '' : 's'}`;
        prevBtn.disabled = page <= 1;
        nextBtn.disabled = page >= maxPage;

        // ⚡ update lastSeenId based on what we rendered
        const maxId = rows.reduce((m, r) => Math.max(m, Number(r.id || 0)), lastSeenId);
        if (maxId > lastSeenId) lastSeenId = maxId;

      } catch (err) {
        console.error(err);
        tbody.innerHTML = `<tr><td colspan="10" class="rcpa-empty">Failed to load records.</td></tr>`;
        pageInfo.textContent = `Page 1`;
        totalEl.textContent = `0 records`;
        prevBtn.disabled = true;
        nextBtn.disabled = true;
      }
    }

    // Optional custom reload event
    document.addEventListener('rcpa:reload', () => load());

    prevBtn?.addEventListener('click', () => { if (page > 1) { page--; load(); } });
    nextBtn?.addEventListener('click', () => { page++; load(); });
    [fStatus, fType].forEach(el => el?.addEventListener('change', () => { page = 1; load(); }));

    // History icon events
    tbody.addEventListener('click', (e) => {
      const icon = e.target.closest('.icon-rcpa-history');
      if (icon) {
        const rcpaId = icon.getAttribute('data-id');
        if (rcpaId) openHistoryModal(rcpaId);
      }
    });
    tbody.addEventListener('keydown', (e) => {
      const icon = e.target.closest('.icon-rcpa-history');
      if (icon && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        const rcpaId = icon.getAttribute('data-id');
        if (rcpaId) openHistoryModal(rcpaId);
      }
    });
    historyClose?.addEventListener('click', closeHistoryModal);
    historyModal?.addEventListener('click', (e) => {
      if (e.target === historyModal) closeHistoryModal();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeHistoryModal();
    });

    // expose reload
    window.__rcpaTable = window.__rcpaTable || {};
    window.__rcpaTable.reload = function () { load(); };

    // ⚡ start SSE to auto-reload when a NEW request appears for this originator
    function startSse() {
      if (es) { try { es.close(); } catch { } }
      es = new EventSource(`../php-backend/rcpa-requests-sse.php?since=${lastSeenId}`);
      es.addEventListener('rcpa', (e) => {
        try {
          const data = JSON.parse(e.data || '{}');
          if (data && data.max_id) {
            lastSeenId = Math.max(lastSeenId, Number(data.max_id));
            load(); // Keep filters/page; just refresh quietly
          } else {
            load();
          }
        } catch {
          load();
        }
      });
      es.onerror = () => {
        // EventSource auto-reconnects; nothing to do
      };
    }

    // Initial load then SSE
    load();
    startSse();
  })();

  /* ------------------ VIEW MODAL: open when ".rcpa-view" is clicked ------------------ */
  (function initRcpaViewModal() {
    const $ = s => document.querySelector(s);
    const byId = id => document.getElementById(id);

    // === Disapproval (Reject) Remarks quick-view modal (read-only) ===
    const rjModal = byId('reject-remarks-modal');
    const rjText = byId('reject-remarks-text');
    const rjImg = byId('reject-remarks-image');
    const rjClose = byId('reject-remarks-close');

    function ensureRejectFilesList() {
      let el = byId('reject-remarks-files');
      if (el) return el;
      el = document.createElement('div');
      el.id = 'reject-remarks-files';
      el.className = 'attach-list';
      const remarksStack = rjText?.closest('.stack');
      if (remarksStack && remarksStack.parentNode) {
        remarksStack.parentNode.insertBefore(el, remarksStack.nextSibling);
      } else {
        rjModal?.querySelector('.modal-content')?.appendChild(el);
      }
      return el;
    }
    function renderRejectFiles(listEl, attachments) {
      if (!listEl) return;
      listEl.innerHTML = '';
      let arr = [];
      try {
        arr = typeof attachments === 'string' ? JSON.parse(attachments || '[]')
          : (Array.isArray(attachments) ? attachments
            : (attachments && Array.isArray(attachments.files) ? attachments.files : []));
      } catch { arr = []; }

      arr.forEach(a => {
        const name = a?.name || a?.url?.split('/').pop() || 'Attachment';
        const url = a?.url || '#';
        const row = document.createElement('div');
        row.className = 'file-chip';
        row.innerHTML = `
        <i class="fa-solid fa-paperclip" aria-hidden="true"></i>
        <div class="file-info">
          <div class="name"><a href="${url}" target="_blank" rel="noopener">${name}</a></div>
          <div class="sub">${a?.mime || ''} ${a?.size ? `• ${a.size} bytes` : ''}</div>
        </div>`;
        listEl.appendChild(row);
      });
    }
    function firstImageUrlFrom(attachments) {
      try {
        const arr = typeof attachments === 'string'
          ? JSON.parse(attachments || '[]')
          : (Array.isArray(attachments) ? attachments
            : (attachments && Array.isArray(attachments.files) ? attachments.files : []));
        const img = arr.find(a => {
          const mime = String(a?.mime || '').toLowerCase();
          const url = String(a?.url || '');
          return mime.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(url);
        });
        return img ? img.url : null;
      } catch { return null; }
    }
    function autoGrowTextarea(el) {
      if (!el) return;
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 600) + 'px';
    }
    function openRejectRemarks(text, attachments) {
      if (!rjModal) { alert(text || ''); return; }
      if (rjText) { rjText.value = text || ''; autoGrowTextarea(rjText); }
      renderRejectFiles(ensureRejectFilesList(), attachments);
      if (rjImg) {
        const imgUrl = firstImageUrlFrom(attachments);
        if (imgUrl) { rjImg.src = imgUrl; rjImg.style.display = ''; }
        else { rjImg.removeAttribute('src'); rjImg.style.display = 'none'; }
      }
      rjModal.classList.add('show');
      rjModal.setAttribute('aria-hidden', 'false');
      document.body.classList.add('modal-open');
      setTimeout(() => rjClose?.focus(), 0);
    }
    function closeRejectRemarks() {
      if (!rjModal) return;
      rjModal.classList.remove('show');
      rjModal.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('modal-open');
      if (rjText) rjText.value = '';
      if (rjImg) { rjImg.removeAttribute('src'); rjImg.style.display = 'none'; }
      const listEl = byId('reject-remarks-files');
      if (listEl) listEl.innerHTML = '';
    }

    // --- Visibility rules based on Status ---
    function shouldHideAssigneeValidationByStatus(statusStr) {
      const s = String(statusStr || byId('rcpa-view-status')?.value || '')
        .trim().toUpperCase();
      return new Set([
        'INVALID APPROVAL',
        'INVALIDATION REPLY',
        'INVALIDATION REPLY APPROVAL',
        'INVALID APPROVAL - ORIGINATOR',
        'CLOSED (INVALID)'
      ]).has(s);
    }
    function shouldHideInvalidReplyByStatus(statusStr) {
      const s = String(statusStr || byId('rcpa-view-status')?.value || '')
        .trim().toUpperCase();
      return new Set([
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
      ]).has(s);
    }

    rjClose?.addEventListener('click', closeRejectRemarks);
    rjModal?.addEventListener('click', (e) => { if (e.target === rjModal) closeRejectRemarks(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeRejectRemarks(); });

    // === Approval (Approve) Remarks quick-view modal (read-only) ===
    const apModal = byId('approve-remarks-modal');
    const apText = byId('approve-remarks-text');
    const apClose = byId('approve-remarks-close');

    function ensureApproveFilesList() {
      let el = byId('approve-remarks-files');
      if (el) return el;
      el = document.createElement('div');
      el.id = 'approve-remarks-files';
      el.className = 'attach-list';
      const remarksStack = apText?.closest('.stack');
      if (remarksStack && remarksStack.parentNode) {
        remarksStack.parentNode.insertBefore(el, remarksStack.nextSibling);
      } else {
        apModal?.querySelector('.modal-content')?.appendChild(el);
      }
      return el;
    }
    function renderApproveFiles(listEl, attachments) {
      if (!listEl) return;
      listEl.innerHTML = '';
      let arr = [];
      try {
        arr = typeof attachments === 'string' ? JSON.parse(attachments || '[]')
          : (Array.isArray(attachments) ? attachments
            : (attachments && Array.isArray(attachments.files) ? attachments.files : []));
      } catch { arr = []; }

      arr.forEach(a => {
        const name = a?.name || a?.url?.split('/').pop() || 'Attachment';
        const url = a?.url || '#';
        const row = document.createElement('div');
        row.className = 'file-chip';
        row.innerHTML = `
      <i class="fa-solid fa-paperclip" aria-hidden="true"></i>
      <div class="file-info">
        <div class="name"><a href="${url}" target="_blank" rel="noopener">${name}</a></div>
        <div class="sub">${a?.mime || ''} ${a?.size ? `• ${a.size} bytes` : ''}</div>
      </div>`;
        listEl.appendChild(row);
      });
    }

    function openApproveRemarks(text, attachments) {
      if (!apModal) { alert(text || ''); return; }
      if (apText) {
        apText.value = text || '';
        (function autoGrowTextarea(el) { el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 600) + 'px'; })(apText);
      }
      renderApproveFiles(ensureApproveFilesList(), attachments);

      apModal.removeAttribute('hidden');            // ✅ make it displayable
      requestAnimationFrame(() => apModal.classList.add('show')); // smoother

      apModal.setAttribute('aria-hidden', 'false');
      document.body.classList.add('modal-open');
      setTimeout(() => apClose?.focus(), 0);
    }

    function closeApproveRemarks() {
      if (!apModal) return;
      apModal.classList.remove('show');
      apModal.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('modal-open');
      if (apText) apText.value = '';
      const listEl = byId('approve-remarks-files');
      if (listEl) listEl.innerHTML = '';
    }

    apClose?.addEventListener('click', closeApproveRemarks);
    apModal?.addEventListener('click', (e) => { if (e.target === apModal) closeApproveRemarks(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeApproveRemarks(); });


    // === ORIGINATOR ACTIONS (Approve / Disapprove back) ===
    const actionsBar = byId('rcpa-originator-actions');
    const approveBtn = byId('rcpa-approve-btn');
    const disapproveBtn = byId('rcpa-disapprove-btn');
    const resubmitBtn = byId('rcpa-resubmit-btn'); // NEW

    // Disapprove form modal (with upload)
    const rejectModal = byId('rcpa-reject-modal');
    const rejectClose = byId('rcpa-reject-close');
    const rejectForm = byId('rcpa-reject-form');
    const rejectRemarks = byId('rcpa-reject-remarks');
    const rejectClip = byId('rcpa-reject-clip');
    const rejectFiles = byId('rcpa-reject-files');
    const rejectBadge = byId('rcpa-reject-attach-count');
    const rejectFilesList = byId('rcpa-reject-files-list');
    const rejectCancel = byId('rcpa-reject-cancel');

    async function confirmProceed(title, text, confirmText) {
      if (window.Swal) {
        const res = await Swal.fire({
          icon: 'question', title, text,
          showCancelButton: true,
          confirmButtonText: confirmText || 'Yes',
          cancelButtonText: 'Cancel'
        });
        return !!res.isConfirmed;
      }
      return window.confirm(`${title}\n\n${text}`);
    }
    function openRejectFormModal() {
      if (!rejectModal) return;
      if (rejectRemarks) rejectRemarks.value = '';
      if (rejectFiles) rejectFiles.value = '';
      if (rejectFilesList) rejectFilesList.innerHTML = '';
      if (rejectBadge) { rejectBadge.textContent = '0'; rejectBadge.hidden = true; }
      rejectModal.hidden = false;
      rejectModal.classList.add('show');
      document.body.classList.add('modal-open');
      setTimeout(() => rejectRemarks?.focus(), 0);
    }
    function closeRejectFormModal() {
      if (!rejectModal) return;
      rejectModal.classList.remove('show');
      document.body.classList.remove('modal-open');
      setTimeout(() => { rejectModal.hidden = true; }, 150);
    }
    function updateRejectFilesUI() {
      const files = rejectFiles?.files || [];
      if (rejectBadge) { rejectBadge.textContent = String(files.length); rejectBadge.hidden = files.length === 0; }
      if (rejectFilesList) {
        rejectFilesList.innerHTML = '';
        Array.from(files).forEach(f => {
          const row = document.createElement('div');
          row.className = 'file-chip';
          row.innerHTML = `
          <i class="fa-solid fa-paperclip" aria-hidden="true"></i>
          <div class="file-info">
            <div class="name">${f.name}</div>
            <div class="sub">${(f.type || '')} ${f.size ? `• ${f.size} bytes` : ''}</div>
          </div>`;
          rejectFilesList.appendChild(row);
        });
      }
    }
    rejectClip?.addEventListener('click', () => rejectFiles?.click());
    rejectFiles?.addEventListener('change', updateRejectFilesUI);
    rejectClose?.addEventListener('click', closeRejectFormModal);
    rejectCancel?.addEventListener('click', closeRejectFormModal);
    rejectModal?.addEventListener('click', (e) => { if (e.target === rejectModal) closeRejectFormModal(); });

    // === Utilities ===
    const fmtDateTimeLocal = (s) => {
      if (!s) return '';
      const d = new Date(String(s).replace(' ', 'T'));
      return isNaN(d) ? s : d.toLocaleString();
    };
    function escapeHTML(s) {
      return String(s ?? '')
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }
    function fmtDateInputValue(s) {
      if (!s) return '';
      const d = new Date(String(s).replace(' ', 'T'));
      if (!isNaN(d)) {
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
      }
      const m = String(s).match(/(\d{4}-\d{2}-\d{2})/);
      return m ? m[1] : '';
    }
    function pickFrom(obj, ...keys) {
      for (const k of keys) if (k in (obj || {})) {
        const v = obj[k]; if (v !== undefined && v !== null && String(v).trim?.() !== '') return v;
      }
      return '';
    }
    function normalizeFiles(v) {
      try {
        if (!v) return [];
        if (Array.isArray(v)) return v;
        if (typeof v === 'string') {
          const s = v.trim();
          if (!s) return [];
          if (s.startsWith('[')) return JSON.parse(s);
          return s.split(',').map(u => {
            const url = u.trim();
            return url ? { name: url.split('/').pop(), url } : null;
          }).filter(Boolean);
        }
        if (v && Array.isArray(v.files)) return v.files;
      } catch { }
      return [];
    }
    function renderAttachmentsInto(listId, arr) {
      const list = document.getElementById(listId);
      if (!list) return;
      list.innerHTML = '';
      const files = Array.isArray(arr) ? arr : [];
      files.forEach((f) => {
        let name = '', url = '', size = '';
        if (typeof f === 'string') { name = f.split('/').pop(); url = f; }
        else if (f && typeof f === 'object') {
          name = f.name || f.filename || '';
          url = f.url || f.href || '';
          size = f.size ? String(f.size) : (f.filesize || '');
        }
        const linkStart = url ? `<a href="${url}" target="_blank" rel="noopener noreferrer" title="${name}">` : `<span title="${name}">`;
        const linkEnd = url ? `</a>` : `</span>`;
        const row = document.createElement('div');
        row.className = 'file-chip';
        row.innerHTML = `
        <i class="fa-solid fa-paperclip" aria-hidden="true"></i>
        <div class="file-info">
          <div class="name">${linkStart}${name || 'Attachment'}${linkEnd}</div>
          <div class="sub">${size || ''}</div>
        </div>`;
        list.appendChild(row);
      });
    }

    // === Status Flow (VIEW) ===
    // === Status Flow (VIEW) ===
    // === Status Flow (VIEW) ===
    (function initStatusFlowView() {
      const viewModal = document.getElementById('rcpa-view-modal');

      // One-time CSS (kept same visual rules you already use)
      if (!document.getElementById('rcpa-status-flow-css')) {
        const st = document.createElement('style');
        st.id = 'rcpa-status-flow-css';
        st.textContent = `
      /* colors for labels per state */
      #rcpa-status-flow .flow-label{color:#9ca3af; font-size:.78rem;}
      #rcpa-status-flow .flow-step.next .flow-label{color:#6b7280;}
      #rcpa-status-flow .flow-step.done .flow-label{color:#22c55e;}

      /* green progress over nodes */
      #rcpa-status-flow .rcpa-flow::before{z-index:0;}
      #rcpa-status-flow .rcpa-flow::after{z-index:2;}
      #rcpa-status-flow .flow-node{z-index:1;}

      /* compact top text */
      #rcpa-status-flow .flow-top{font-size:.8rem;}
      #rcpa-status-flow .flow-top .flow-date{font-size:.75rem;}
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
        if (typeof fmtDateInputValue === 'function') return fmtDateInputValue(s);
        const m = String(s || '').match(/\d{4}-\d{2}-\d{2}/);
        if (m) return m[0];
        const d = new Date(String(s || '').replace(' ', 'T'));
        return isNaN(d) ? '' : d.toISOString().slice(0, 10);
      }

      function ensureFieldset() { return document.getElementById('rcpa-status-flow') || null; }

      function ensureSteps(fs, steps) {
        const ol = fs.querySelector('#rcpa-flow');
        if (!ol) return;
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
        <div class="flow-label">${key}</div>
      `;
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

          // VALID path
          case 'VALID APPROVAL': return [PH.VALID_APPROVAL];
          case 'VALIDATION REPLY': return [PH.VALIDATION_REPLY];
          case 'REPLY CHECKING - ORIGINATOR': return [PH.REPLY_CHECKING_ORIG];
          case 'FOR CLOSING': return [PH.FOR_CLOSING];
          case 'FOR CLOSING APPROVAL': return [PH.FOR_CLOSING_APPROVAL];
          case 'EVIDENCE CHECKING': return [PH.EVIDENCE_CHECKING];
          case 'EVIDENCE CHECKING - ORIGINATOR': return [PH.EVIDENCE_CHECKING_ORIG];
          case 'EVIDENCE APPROVAL': return [PH.FINAL_APPROVAL_VALID];
          case 'CLOSED (VALID)': return [PH.FINAL_APPROVAL_VALID];

          // INVALID path
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

        if (latestValid && latestInvalid) {
          return (toTs(latestValid.date_time) >= toTs(latestInvalid.date_time)) ? 'valid' : 'invalid';
        }
        if (latestValid) return 'valid';
        if (latestInvalid) return 'invalid';
        return null;
      }

      function resetStatusFlow() {
        const fs = ensureFieldset();
        if (!fs) return;
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
        const fs = ensureFieldset();
        if (!fs) return;
        resetStatusFlow();
        if (!rcpaNo) return;

        const statusNow = String(document.getElementById('rcpa-view-status')?.value || '')
          .trim().toUpperCase();

        // 🔒 CLOSED state flags (NEW)
        const isClosedValid = statusNow === 'CLOSED (VALID)';
        const isClosedInvalid = statusNow === 'CLOSED (INVALID)';
        const isClosed = isClosedValid || isClosedInvalid;

        // Load history
        let rows = [];
        try {
          const res = await fetch(`../php-backend/rcpa-history.php?id=${encodeURIComponent(rcpaNo)}`, {
            credentials: 'same-origin',
            headers: { 'Accept': 'application/json' }
          });
          const data = await res.json().catch(() => ({}));
          rows = Array.isArray(data?.rows) ? data.rows : [];
        } catch { rows = []; }

        // 🔒 KEY CHANGE:
        // If current status is ASSIGNEE PENDING -> never decide a branch.
        let STEPS = PRE_STEPS.slice();
        if (statusNow !== 'ASSIGNEE PENDING') {
          const statusInValid = VALID_CHAIN.includes(statusNow);
          const statusInInvalid = INVALID_CHAIN.includes(statusNow);
          const branch = statusInValid ? 'valid' : (statusInInvalid ? 'invalid' : pickBranch(rows));
          STEPS = PRE_STEPS.concat(branch === 'valid' ? VALID_CHAIN : branch === 'invalid' ? INVALID_CHAIN : []);
        }

        ensureSteps(fs, STEPS);

        // Map step -> most recent row
        const toTs = (s) => { const d = new Date(String(s || '').replace(' ', 'T')); return isNaN(d) ? 0 : d.getTime(); };
        const stepData = Object.fromEntries(STEPS.map(k => [k, { name: '—', date: '', ts: 0 }]));

        rows.forEach(r => {
          const act = r?.activity || '';
          STEPS.forEach(step => {
            const tests = stepTests(step);
            if (!tests.length) return;
            if (matches(act, tests)) {
              const ts = toTs(r.date_time);
              if (ts >= (stepData[step].ts || 0)) stepData[step] = { name: r?.name || '—', date: r?.date_time || '', ts };
            }
          });
        });

        // Clamp future (including current)
        const cutoffIdx = STEPS.indexOf(statusNow);
        if (cutoffIdx >= 0) {
          STEPS.forEach((k, i) => { if (i > cutoffIdx) stepData[k] = { name: '—', date: '', ts: 0 }; });
        }

        // 🔒 CLOSED behavior (NEW):
        // - mark CLOSED node with same actor/date as the specified approval step
        if (isClosedValid && stepData['EVIDENCE APPROVAL']?.date) {
          stepData['CLOSED (VALID)'] = { ...stepData['EVIDENCE APPROVAL'] };
        }
        if (isClosedInvalid && stepData['INVALID APPROVAL - ORIGINATOR']?.date) {
          stepData['CLOSED (INVALID)'] = { ...stepData['INVALID APPROVAL - ORIGINATOR'] };
        }

        // Fill DOM: past -> initials+date; current/future -> default actor + —/TBD
        const items = fs.querySelectorAll('.flow-step');
        items.forEach(li => {
          const key = li.getAttribute('data-key') || li.querySelector('.flow-label')?.textContent?.trim().toUpperCase();
          const info = stepData[key] || { name: '—', date: '' };
          const idx = STEPS.indexOf(key);

          // When CLOSED, suppress "current" state so final node renders as completed.
          const isFuture = !isClosed && (cutoffIdx >= 0 && idx > cutoffIdx);
          const isCurrent = !isClosed && (cutoffIdx >= 0 && idx === cutoffIdx);

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

        // done/next: mark all steps done if CLOSED so the final node is green
        let doneCount = 0;
        for (let i = 0; i < STEPS.length; i++) {
          if (stepData[STEPS[i]]?.date) doneCount = i + 1; else break;
        }
        if (isClosed) {
          doneCount = STEPS.length;
        } else if (cutoffIdx >= 0) {
          doneCount = Math.min(doneCount, cutoffIdx);
        }

        items.forEach((li, idx) => {
          li.classList.remove('done', 'next');
          if (idx < doneCount) li.classList.add('done');
          else if (idx === doneCount) li.classList.add('next');
        });

        // progress: stop before next node (clamped)
        const GAP_TARGET = 0.25;
        const STOP_BEFORE_NEXT_PX = 8;
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

    function toggleValidationBlocks(mode) {
      const showNC = mode === 'nc';
      const showPNC = mode === 'pnc';
      const nodes = [];

      const findingsLabel = byId('rcpa-view-findings-valid')?.closest('label');
      if (findingsLabel) nodes.push(findingsLabel);
      document.querySelectorAll('.field-rootcause').forEach(el => nodes.push(el));
      const validAttach = byId('rcpa-view-valid-attach'); if (validAttach) nodes.push(validAttach);
      document.querySelectorAll('.checkbox-for-non-conformance').forEach(el => nodes.push(el));
      document.querySelectorAll('.checkbox-for-potential-non-conformance').forEach(el => nodes.push(el));
      document.querySelectorAll('.correction-grid').forEach(el => nodes.push(el));

      nodes.forEach(el => el.hidden = true);

      if (showNC) {
        if (findingsLabel) findingsLabel.hidden = false;
        document.querySelectorAll('.field-rootcause').forEach(el => el.hidden = false);
        if (validAttach) validAttach.hidden = false;
        document.querySelectorAll('.checkbox-for-non-conformance').forEach(el => el.hidden = false);
        document.querySelectorAll('.correction-grid:not(.preventive-grid)').forEach(el => el.hidden = false);
      } else if (showPNC) {
        document.querySelectorAll('.checkbox-for-potential-non-conformance').forEach(el => el.hidden = false);
        document.querySelectorAll('.preventive-grid').forEach(el => el.hidden = false);
      }
    }

    // === Why-Why Analysis VIEW (auto-injected button + modal) ===
    function ensureWhyWhyButton() {
      if (document.getElementById('rcpa-view-open-why')) return;
      const label = byId('rcpa-view-findings-valid')?.closest('label.inline-check');
      if (!label) return;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.id = 'rcpa-view-open-why';
      btn.className = 'rcpa-btn rcpa-btn-secondary';
      btn.style.marginLeft = '8px';
      btn.textContent = 'Why-Why Analysis';
      label.appendChild(btn);
    }
    // Create Why-Why modal (if not present)
    let whyViewModal = byId('rcpa-why-view-modal');
    if (!whyViewModal) {
      const tpl = document.createElement('div');
      tpl.innerHTML = `
      <div class="modal-overlay" id="rcpa-why-view-modal" hidden aria-modal="true" role="dialog" aria-labelledby="rcpa-why-view-title">
        <div class="modal-content">
          <button type="button" class="close-btn" id="rcpa-why-view-close" aria-label="Close">×</button>
          <h2 id="rcpa-why-view-title" style="margin-top:0;">Why-Why Analysis</h2>
          <label for="rcpa-why-view-desc">Description of Findings</label>
          <div style="margin-top:8px;margin-bottom:16px;">
            <textarea id="rcpa-why-view-desc" readonly style="width:100%;min-height:110px;padding:10px;resize:vertical;"></textarea>
          </div>
          <div id="rcpa-why-view-list" style="display:flex;flex-direction:column;gap:12px;"></div>
          <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:14px;">
            <button type="button" class="rcpa-btn" id="rcpa-why-view-ok">Close</button>
          </div>
        </div>
      </div>`.trim();
      document.body.appendChild(tpl.firstElementChild);
      whyViewModal = byId('rcpa-why-view-modal');
      // 2-col style
      if (!byId('rcpa-why-two-col-style')) {
        const style = document.createElement('style');
        style.id = 'rcpa-why-two-col-style';
        style.textContent = `
        #rcpa-why-view-modal #rcpa-why-view-list.two-col{
          display:grid !important; grid-template-columns:1fr 1fr; gap:12px;
        }
        @media(max-width:720px){#rcpa-why-view-modal #rcpa-why-view-list.two-col{grid-template-columns:1fr;}}
      `;
        document.head.appendChild(style);
      }
    }
    const whyViewClose = byId('rcpa-why-view-close');
    const whyViewOk = byId('rcpa-why-view-ok');
    const whyViewDesc = byId('rcpa-why-view-desc');
    const whyViewList = byId('rcpa-why-view-list');
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
      const id = parseInt(byId('rcpa-view-modal')?.dataset.rcpaId || '0', 10);
      if (!id) return;

      if (whyViewDesc) whyViewDesc.value = '';
      if (whyViewList) whyViewList.innerHTML = '<div class="rcpa-empty">Loading…</div>';

      fetch(`../php-backend/rcpa-why-analysis-list.php?rcpa_no=${encodeURIComponent(id)}`, { credentials: 'same-origin' })
        .then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
        .then(data => {
          const desc = data?.description_of_findings || '';
          if (whyViewDesc) whyViewDesc.value = desc;
          const items = Array.isArray(data?.rows) ? data.rows : [];
          renderWhyViewList(items);
        })
        .catch(() => { if (whyViewList) whyViewList.innerHTML = `<div class="rcpa-empty">Failed to load analysis.</div>`; });

      const m = byId('rcpa-why-view-modal');
      if (m) {
        m.removeAttribute('hidden');
        requestAnimationFrame(() => m.classList.add('show'));
        document.body.style.overflow = 'hidden';
      }
    }
    function closeWhyView() {
      const m = byId('rcpa-why-view-modal');
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
    whyViewClose?.addEventListener('click', closeWhyView);
    whyViewOk?.addEventListener('click', closeWhyView);
    whyViewModal?.addEventListener('click', (e) => { if (e.target === whyViewModal) closeWhyView(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && whyViewModal && !whyViewModal.hidden) closeWhyView(); });

    function bindWhyWhyButton() {
      ensureWhyWhyButton();
      const btn = byId('rcpa-view-open-why');
      if (btn && !btn.dataset.boundWhy) {
        btn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); openWhyViewModal(); });
        btn.dataset.boundWhy = '1';
      }
    }

    // === Main view modal wiring ===
    const viewModal = byId('rcpa-view-modal');
    if (!viewModal) return;

    const closeEls = [byId('rcpa-view-close')];
    closeEls.forEach(el => el?.addEventListener('click', hideViewModal));
    viewModal.addEventListener('click', (e) => { if (e.target === viewModal) hideViewModal(); });

    function showViewModal() { viewModal.hidden = false; viewModal.classList.add('show'); }
    function hideViewModal() {
      viewModal.classList.remove('show');
      setTimeout(() => { viewModal.hidden = true; clearViewModal(); }, 150);
    }

    function clearViewModal() {
      [
        '#rcpa-view-type',
        '#rcpa-view-originator-name', '#rcpa-view-originator-dept',
        '#rcpa-view-date', '#rcpa-view-remarks', '#rcpa-view-system',
        '#rcpa-view-clauses', '#rcpa-view-supervisor', '#rcpa-view-assignee',
        '#rcpa-view-status', '#rcpa-view-conformance'
      ].forEach(sel => { const el = $(sel); if (el) el.value = ''; });

      ['#rcpa-view-mgmt-q1', '#rcpa-view-mgmt-q2', '#rcpa-view-mgmt-q3', '#rcpa-view-mgmt-ytd',
        '#rcpa-view-flag-nc', '#rcpa-view-flag-pnc',
        '#rcpa-view-cat-major', '#rcpa-view-cat-minor', '#rcpa-view-cat-obs'
      ].forEach(sel => { const el = $(sel); if (el) el.checked = false; });

      // validation & evidence
      ['#rcpa-view-root-cause', '#rcpa-view-correction', '#rcpa-view-corrective',
        '#rcpa-view-preventive', '#rcpa-view-corrective-remarks',
        '#rcpa-view-not-valid-reason',
        // Evidence Checking (new)
        '#rcpa-view-ev-remarks'
      ].forEach(sel => { const el = $(sel); if (el) el.value = ''; });

      ['#rcpa-view-findings-valid', '#rcpa-view-for-nc-valid', '#rcpa-view-for-pnc',
        '#rcpa-view-findings-not-valid'
      ].forEach(sel => { const el = $(sel); if (el) el.checked = false; });

      // Evidence Checking yes/no (new)
      ['#rcpa-view-ev-action-yes', '#rcpa-view-ev-action-no'
      ].forEach(sel => { const el = $(sel); if (el) el.checked = false; });

      ['#rcpa-view-correction-target', '#rcpa-view-correction-done',
        '#rcpa-view-corrective-target', '#rcpa-view-corrective-done',
        '#rcpa-view-preventive-target', '#rcpa-view-preventive-done'
      ].forEach(sel => { const el = $(sel); if (el) el.value = ''; });

      ['#rcpa-view-valid-attach-list', '#rcpa-view-corrective-attach-list', '#rcpa-view-attach-list',
        '#rcpa-view-not-valid-attach-list',
        // Evidence Checking attachments (new)
        '#rcpa-view-ev-attach-list'
      ].forEach(sel => { const el = $(sel); if (el) el.innerHTML = ''; });

      // signatures (invalid section)
      ['#rcpa-view-invalid-assignee-sign', '#rcpa-view-invalid-assignee-sup-sign',
        '#rcpa-view-invalid-qms-sign', '#rcpa-view-invalid-originator-sign'
      ].forEach(sel => { const el = $(sel); if (el) el.value = ''; });

      // Hide optional fieldsets by default
      const fsRejects = document.querySelector('fieldset.rejects');
      const fsValidation = document.querySelector('fieldset.validation:not(.validation-invalid)');
      const fsEvidence = document.querySelector('fieldset.corrective-evidence');
      const fsInvalid = document.querySelector('fieldset.validation-invalid');
      const fsEvCheck = document.querySelector('#rcpa-view-evidence'); // Evidence Checking (new)
      if (fsRejects) fsRejects.hidden = true;
      if (fsValidation) fsValidation.hidden = true;
      if (fsEvidence) fsEvidence.hidden = true;
      if (fsInvalid) fsInvalid.hidden = true;
      if (fsEvCheck) fsEvCheck.hidden = true; // hide by default

      // Follow-up: reset & hide
      const fuDateEl = byId('rcpa-view-followup-date');
      if (fuDateEl) fuDateEl.value = '';
      const fuRemEl = byId('rcpa-view-followup-remarks');
      if (fuRemEl) fuRemEl.value = '';
      const fuListEl = byId('rcpa-view-followup-attach-list');
      if (fuListEl) fuListEl.innerHTML = '';
      const fsFollow = byId('rcpa-view-followup');
      if (fsFollow) fsFollow.hidden = true;


      toggleValidationBlocks('');

      byId('rcpa-view-modal')?.__clearStatusFlow?.();


      if (window.__clearViewTypeFields) window.__clearViewTypeFields();
      if (actionsBar) actionsBar.hidden = true;

      // approvals reset
      clearApprovalsTable();
      const fsApprovals = document.querySelector('fieldset.approvals');
      if (fsApprovals) fsApprovals.hidden = true;
      const hostForAp = byId('rcpa-view-modal');
      if (hostForAp) hostForAp.__approvals = [];


      clearRejectsTable();
    }

    function renderAttachments(arr) {
      const list = byId('rcpa-view-attach-list');
      if (!list) return;
      list.innerHTML = '';
      const files = Array.isArray(arr) ? arr : [];
      files.forEach((f) => {
        let name = '', url = '', size = '';
        if (typeof f === 'string') { name = f.split('/').pop(); url = f; }
        else if (f && typeof f === 'object') {
          name = f.name || f.filename || '';
          url = f.url || f.href || '';
          size = f.size ? String(f.size) : (f.filesize || '');
        }
        const linkStart = url ? `<a href="${url}" target="_blank" rel="noopener noreferrer" title="${name}">` : `<span title="${name}">`;
        const linkEnd = url ? `</a>` : `</span>`;
        const row = document.createElement('div');
        row.className = 'file-chip';
        row.innerHTML = `
        <i class="fa-solid fa-paperclip" aria-hidden="true"></i>
        <div class="file-info">
          <div class="name">${linkStart}${name || 'Attachment'}${linkEnd}</div>
          <div class="sub">${size || ''}</div>
        </div>`;
        list.appendChild(row);
      });
    }

    function clearRejectsTable() {
      const tb = document.querySelector('#rcpa-rejects-table tbody');
      if (!tb) return;
      tb.innerHTML = `<tr><td class="rcpa-empty" colspan="3">No records found</td></tr>`;
    }

    function clearApprovalsTable() {
      const tb = document.querySelector('#rcpa-approvals-table tbody');
      if (!tb) return;
      tb.innerHTML = `<tr><td class="rcpa-empty" colspan="3">No records found</td></tr>`;
    }

    function renderRejectsTable(items) {
      const tb = document.querySelector('#rcpa-rejects-table tbody');
      const fsRejects = document.querySelector('fieldset.rejects');
      if (!tb) return;

      const list = Array.isArray(items) ? items : [];
      if (!list.length) {
        tb.innerHTML = `<tr><td class="rcpa-empty" colspan="3">No records found</td></tr>`;
        if (fsRejects) fsRejects.hidden = true;
        return;
      }
      if (fsRejects) fsRejects.hidden = false;

      const host = byId('rcpa-view-modal');
      if (host) host.__rejects = list;

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
        </tr>`;
      }).join('');
    }

    function renderApprovalsTable(items) {
      const tb = document.querySelector('#rcpa-approvals-table tbody');
      const fs = document.querySelector('fieldset.approvals');
      if (!tb) return;

      const list = Array.isArray(items) ? items : [];
      if (!list.length) {
        tb.innerHTML = `<tr><td class="rcpa-empty" colspan="3">No records found</td></tr>`;
        if (fs) fs.hidden = true;
        return;
      }
      if (fs) fs.hidden = false;

      const host = byId('rcpa-view-modal');
      if (host) host.__approvals = list;

      tb.innerHTML = list.map((row, i) => {
        const type = escapeHTML(row.type || '');
        const when = (() => {
          const d = new Date(String(row.created_at).replace(' ', 'T'));
          return isNaN(d) ? escapeHTML(row.created_at || '') : escapeHTML(d.toLocaleString());
        })();
        return `
      <tr>
        <td>${type || '-'}</td>
        <td>${when || '-'}</td>
        <td><button type="button" class="rcpa-btn rcpa-approval-view" data-idx="${i}">View</button></td>
      </tr>`;
      }).join('');
    }

    (function hookRejectsActions() {
      const table = byId('rcpa-rejects-table');
      if (!table) return;
      table.addEventListener('click', (e) => {
        const btn = e.target.closest('.rcpa-reject-view');
        if (!btn) return;
        const host = byId('rcpa-view-modal');
        const cache = (host && host.__rejects) || [];
        const idx = parseInt(btn.getAttribute('data-idx'), 10);
        const item = cache[idx];
        if (!item) return;
        openRejectRemarks(item.remarks || '', item.attachments);
      });
    })();

    (function hookApprovalsActions() {
      const table = byId('rcpa-approvals-table');
      if (!table) return;
      table.addEventListener('click', (e) => {
        const btn = e.target.closest('.rcpa-approval-view');
        if (!btn) return;
        const host = byId('rcpa-view-modal');
        const cache = (host && host.__approvals) || [];
        const idx = parseInt(btn.getAttribute('data-idx'), 10);
        const item = cache[idx];
        if (!item) return;
        // server may send "attachments" (normalized) or legacy "attachment"
        openApproveRemarks(item.remarks || '', item.attachments ?? item.attachment);
      });
    })();


    // Lock checkboxes (view-only)
    (function lockViewCheckboxes() {
      const sels = [
        '#rcpa-view-cat-major', '#rcpa-view-cat-minor', '#rcpa-view-cat-obs',
        '#rcpa-view-flag-nc', '#rcpa-view-flag-pnc',
        '#rcpa-view-mgmt-q1', '#rcpa-view-mgmt-q2', '#rcpa-view-mgmt-q3', '#rcpa-view-mgmt-ytd',
        '#v-external-sem1-pick', '#v-external-sem2-pick',
        '#v-internal-sem1-pick', '#v-internal-sem2-pick',
        '#rcpa-view-findings-valid', '#rcpa-view-for-nc-valid', '#rcpa-view-for-pnc',
        '#rcpa-view-findings-not-valid', '#rcpa-view-ev-action-yes', '#rcpa-view-ev-action-no'
      ];
      sels.forEach(sel => {
        const el = $(sel);
        if (!el) return;
        el.setAttribute('aria-disabled', 'true');
        el.tabIndex = -1;
        el.addEventListener('click', e => e.preventDefault());
        el.addEventListener('keydown', e => e.preventDefault());
      });
    })();

    // === Open and populate ===
    async function openViewForId(id) {
      try {
        clearViewModal();
        showViewModal();

        const remarks = byId('rcpa-view-remarks');
        if (remarks) remarks.value = 'Loading…';
        const rejTbody = document.querySelector('#rcpa-rejects-table tbody');
        if (rejTbody) rejTbody.innerHTML = `<tr><td class="rcpa-empty" colspan="3">Loading…</td></tr>`;

        const res = await fetch(`../php-backend/rcpa-get-request.php?id=${encodeURIComponent(id)}`, {
          credentials: 'same-origin',
          headers: { 'Accept': 'application/json' }
        });

        viewModal.dataset.rcpaId = String(id);


        let data;
        try { data = await res.json(); }
        catch { throw new Error(`Invalid server response (HTTP ${res.status})`); }
        if (!res.ok || !data.ok) throw new Error(data?.error || `Failed (HTTP ${res.status})`);

        const r = data.row || {};

        // Basic fields
        byId('rcpa-view-type').value = labelForType(r.rcpa_type);
        byId('rcpa-view-originator-name').value = r.originator_name || '';
        byId('rcpa-view-originator-dept').value = r.originator_department || '';
        byId('rcpa-view-date').value = fmtDateTimeLocal(r.date_request);
        byId('rcpa-view-remarks').value = r.remarks || '';
        byId('rcpa-view-system').value = r.system_applicable_std_violated || '';
        byId('rcpa-view-clauses').value = r.standard_clause_number || '';
        byId('rcpa-view-supervisor').value = r.originator_supervisor_head || '';
        const assigneeDisplay = (r.section && String(r.section).trim())
          ? `${r.assignee || ''} - ${r.section}`
          : (r.assignee || '');
        byId('rcpa-view-assignee').value = assigneeDisplay.trim();
        byId('rcpa-view-status').value = r.status || '';
        byId('rcpa-view-modal')?.__renderStatusFlow?.(id);
        byId('rcpa-view-conformance').value = r.conformance || '';

        // Show/Hide Originator actions
        const statusNow = String(byId('rcpa-view-status')?.value || '').trim().toUpperCase();

        // Show action bar if we are in any “originator acts” state OR REJECTED
        const showActionBar =
          statusNow === 'REPLY CHECKING - ORIGINATOR' ||
          statusNow === 'EVIDENCE CHECKING - ORIGINATOR' ||
          statusNow === 'INVALID APPROVAL - ORIGINATOR' ||
          statusNow === 'REJECTED'; // NEW

        if (actionsBar) actionsBar.hidden = !showActionBar;

        // hide all buttons by default
        if (approveBtn) approveBtn.style.display = 'none';
        if (disapproveBtn) disapproveBtn.style.display = 'none';
        if (resubmitBtn) resubmitBtn.style.display = 'none';

        // show correct buttons for this status
        if (
          statusNow === 'REPLY CHECKING - ORIGINATOR' ||
          statusNow === 'EVIDENCE CHECKING - ORIGINATOR' ||
          statusNow === 'INVALID APPROVAL - ORIGINATOR'
        ) {
          if (approveBtn) approveBtn.style.display = '';
          if (disapproveBtn) disapproveBtn.style.display = '';
        } else if (statusNow === 'REJECTED') {
          if (resubmitBtn) resubmitBtn.style.display = ''; // NEW
        }


        // Category
        (function setCategory() {
          const v = (r.category || '').trim().toLowerCase();
          const set = (sel, on) => { const el = $(sel); if (el) el.checked = !!on; };
          set('#rcpa-view-cat-major', v === 'major');
          set('#rcpa-view-cat-minor', v === 'minor');
          set('#rcpa-view-cat-obs', v === 'observation');
        })();

        // Conformance flags → infer NC/PNC
        let __isPNC = false, __isNC = false;
        (function setConformance() {
          const set = (sel, on) => { const el = $(sel); if (el) el.checked = !!on; };
          const confRaw = (r.conformance || '').trim().toLowerCase();
          if (confRaw) {
            __isPNC = confRaw.startsWith('potential');
            __isNC = !__isPNC && (confRaw.includes('non-conformance') || confRaw.includes('non conformance') || confRaw.includes('nonconformance'));
          } else {
            const cat = (r.category || '').trim().toLowerCase();
            __isPNC = (cat === 'observation');
            __isNC = (cat === 'major' || cat === 'minor');
          }
          set('#rcpa-view-flag-pnc', __isPNC);
          set('#rcpa-view-flag-nc', __isNC);
        })();

        // Type-specific sections
        window.__fillViewType?.(r);

        // Validation / Corrective / Preventive
        (function fillValidationAndActions() {
          const fsValidation = document.querySelector('fieldset.validation');
          const mode = (r.validation_mode || '').toLowerCase() || (__isNC ? 'nc' : (__isPNC ? 'pnc' : ''));
          toggleValidationBlocks(mode);

          const setChk = (sel, on) => { const el = $(sel); if (el) el.checked = !!on; };
          const setVal = (sel, v) => { const el = $(sel); if (el) el.value = v || ''; };
          const setDate = (sel, v) => { const el = $(sel); if (el) el.value = fmtDateInputValue(v); };

          setChk('#rcpa-view-findings-valid', (mode === 'nc' || mode === 'pnc'));
          setChk('#rcpa-view-for-nc-valid', mode === 'nc');
          setChk('#rcpa-view-for-pnc', mode === 'pnc');

          setVal('#rcpa-view-root-cause', pickFrom(r, 'root_cause', 'validation_root_cause'));
          setVal('#rcpa-view-correction', pickFrom(r, 'correction', 'immediate_correction'));
          setDate('#rcpa-view-correction-target', pickFrom(r, 'correction_target_date', 'correction_target'));
          setDate('#rcpa-view-correction-done', pickFrom(r, 'correction_date_completed', 'correction_date_done', 'correction_done_date'));
          setVal('#rcpa-view-corrective', pickFrom(r, 'corrective', 'corrective_action'));
          setDate('#rcpa-view-corrective-target', pickFrom(r, 'corrective_target_date', 'corrective_target'));
          setDate('#rcpa-view-corrective-done', pickFrom(r, 'corrective_date_completed', 'corrective_date_done', 'corrective_done_date'));
          setVal('#rcpa-view-preventive', pickFrom(r, 'preventive_action', 'preventive'));
          setDate('#rcpa-view-preventive-target', pickFrom(r, 'preventive_target_date', 'preventive_target'));
          setDate('#rcpa-view-preventive-done', pickFrom(r, 'preventive_date_completed', 'preventive_date_done'));

          const validFiles = normalizeFiles(pickFrom(r, 'validation_attachments', 'valid_attachments', 'validation_files', 'attachments_validation', 'attachment'));
          renderAttachmentsInto('rcpa-view-valid-attach-list', validFiles);

          const hasValidation =
            (mode === 'nc' && (
              !!pickFrom(r, 'root_cause') ||
              !!pickFrom(r, 'correction') ||
              !!pickFrom(r, 'corrective') ||
              (validFiles && validFiles.length)
            )) ||
            (mode === 'pnc' && (
              !!pickFrom(r, 'preventive_action') ||
              (validFiles && validFiles.length)
            ));

          if (fsValidation) fsValidation.hidden = !hasValidation;
        })();

        // Main attachments & rejects
        renderAttachments(r.attachments);
        renderRejectsTable(data.rejects || []);
        renderApprovalsTable(data.approvals || []);


        // Corrective Evidence
        (function fillCorrectiveEvidence() {
          const fsEvidence = document.querySelector('fieldset.corrective-evidence');
          const remarks = pickFrom(r, 'corrective_evidence_remarks');
          const files = normalizeFiles(pickFrom(r, 'corrective_evidence_attachments', 'attachments_corrective_evidence'));
          byId('rcpa-view-corrective-remarks').value = remarks || '';
          renderAttachmentsInto('rcpa-view-corrective-attach-list', files);
          const hasEvidence = (!!(remarks && String(remarks).trim() !== '')) || (files && files.length);
          if (fsEvidence) fsEvidence.hidden = !hasEvidence;
        })();

        // Evidence Checking (Verification of Implementation)
        (function fillEvidenceChecking() {
          const fs = document.getElementById('rcpa-view-evidence');
          if (!fs) return;

          const actionRaw = String(r.evidence_action_done || '').trim().toLowerCase();
          const remarks = r.evidence_remarks || '';
          const files = Array.isArray(r.evidence_attachments) ? r.evidence_attachments : [];

          // set checkboxes exclusively
          const yesEl = document.getElementById('rcpa-view-ev-action-yes');
          const noEl = document.getElementById('rcpa-view-ev-action-no');
          if (yesEl) yesEl.checked = (actionRaw === 'yes' || actionRaw === 'y' || actionRaw === 'true' || actionRaw === '1');
          if (noEl) noEl.checked = (actionRaw === 'no' || actionRaw === 'n' || actionRaw === 'false' || actionRaw === '0');

          // remarks
          const remEl = document.getElementById('rcpa-view-ev-remarks');
          if (remEl) remEl.value = remarks || '';

          // attachments
          renderAttachmentsInto('rcpa-view-ev-attach-list', files);

          // show only if any data present
          const hasData = !!(actionRaw || (remarks && String(remarks).trim() !== '') || (files && files.length));
          fs.hidden = !hasData;
        })();

        // Follow-up for Effectiveness (show only when data exists)
        (function fillFollowUp() {
          const fs = byId('rcpa-view-followup');
          if (!fs) return;

          const tgt = r.follow_up_target_date || '';
          const notes = r.follow_up_remarks || '';

          // ✅ normalize all possible formats: JSON string, array, or { files: [...] }
          const files = normalizeFiles(r.follow_up_attachments);

          const dateEl = byId('rcpa-view-followup-date');
          if (dateEl) dateEl.value = fmtDateInputValue(tgt);

          const remEl = byId('rcpa-view-followup-remarks');
          if (remEl) remEl.value = notes || '';

          renderAttachmentsInto('rcpa-view-followup-attach-list', files);

          const hasData = !!(tgt || (notes && String(notes).trim() !== '') || (files && files.length));
          fs.hidden = !hasData;
        })();

        // Findings INVALIDation Reply
        (function fillInvalidReply() {
          const fsInvalid = document.querySelector('fieldset.validation-invalid');
          const inv = data.findings_invalid;
          if (!inv) { if (fsInvalid) fsInvalid.hidden = true; return; }

          const invalidCheckbox = byId('rcpa-view-findings-not-valid');
          const invalidReason = byId('rcpa-view-not-valid-reason');
          invalidCheckbox.checked = true;
          invalidReason.value = inv.reason_non_valid || '';
          renderAttachmentsInto('rcpa-view-not-valid-attach-list', inv.attachment);

          if (fsInvalid) fsInvalid.hidden = false;
        })();

        // --- Force visibility rules based on status (overrides any content-based show) ---
        (() => {
          const fsValidation = document.querySelector('fieldset.validation:not(.validation-invalid)');
          const fsInvalid = document.querySelector('fieldset.validation-invalid');

          if (fsValidation && shouldHideAssigneeValidationByStatus(statusNow)) {
            fsValidation.hidden = true;
          }
          if (fsInvalid && shouldHideInvalidReplyByStatus(statusNow)) {
            fsInvalid.hidden = true;
          }
        })();


        // Bind Why-Why button after content exists
        bindWhyWhyButton();

      } catch (err) {
        hideViewModal();
        if (window.Swal) Swal.fire({ icon: 'error', title: 'Unable to open', text: err?.message || 'Failed to load the request.' });
        else alert(err?.message || 'Failed to load the request.');
      }
    }

    // Hook “View” buttons in your table
    const tbody = document.querySelector('#rcpa-table tbody');
    if (tbody) {
      tbody.addEventListener('click', (e) => {
        const btn = e.target.closest('.rcpa-view');
        if (!btn) return;
        const id = btn.getAttribute('data-id');
        if (!id) return;
        openViewForId(id);
      });
    }

    // === Originator Approve ===
    approveBtn?.addEventListener('click', async () => {
      const id = parseInt(byId('rcpa-view-modal')?.dataset.rcpaId || '0', 10);
      if (!id) return;

      const statusNow = String(byId('rcpa-view-status')?.value || '').trim().toUpperCase();
      let endpoint = '', confirmTitle = '', confirmText = '', successText = '';
      if (statusNow === 'REPLY CHECKING - ORIGINATOR') {
        endpoint = '../php-backend/rcpa-approve-originator-reply.php';
        confirmTitle = 'Approve validation reply?';
        confirmText = 'This will set the status to FOR CLOSING.';
        successText = 'Status updated to FOR CLOSING.';
      } else if (statusNow === 'EVIDENCE CHECKING - ORIGINATOR') {
        endpoint = '../php-backend/rcpa-approve-originator-evidence.php';
        confirmTitle = 'Approve evidence?';
        confirmText = 'This will move the request to EVIDENCE APPROVAL.';
        successText = 'Status updated to EVIDENCE APPROVAL.';
      } else if (statusNow === 'INVALID APPROVAL - ORIGINATOR') {
        endpoint = '../php-backend/rcpa-approve-originator-invalid.php';
        confirmTitle = 'Approve INVALID reply?';
        confirmText = 'This will move the request to CLOSED (INVALID).';
        successText = 'Status updated to CLOSED (INVALID).';
      } else {
        return;
      }

      const ok = await confirmProceed(confirmTitle, confirmText, 'Yes, approve');
      if (!ok) return;

      try {
        approveBtn.disabled = true;
        const res = await fetch(endpoint, {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.ok) throw new Error(data?.error || `Approve failed (HTTP ${res.status})`);

        if (typeof refreshRcpaTable === 'function') { try { await refreshRcpaTable(); } catch { } }
        hideViewModal();

        if (window.Swal) Swal.fire({ icon: 'success', title: 'Approved', text: successText });
        else alert('Approved. ' + successText);
      } catch (err) {
        if (window.Swal) Swal.fire({ icon: 'error', title: 'Approve failed', text: err?.message || 'Unexpected error.' });
        else alert(err?.message || 'Approve failed.');
      } finally {
        approveBtn.disabled = false;
      }
    });

    // === Originator Disapprove (return back) ===
    disapproveBtn?.addEventListener('click', openRejectFormModal);

    rejectForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = parseInt(byId('rcpa-view-modal')?.dataset.rcpaId || '0', 10);
      if (!id) return;

      const statusNow = String(byId('rcpa-view-status')?.value || '').trim().toUpperCase();
      const remarks = (rejectRemarks?.value || '').trim();
      if (!remarks) {
        if (window.Swal) Swal.fire({ icon: 'warning', title: 'Remarks required', text: 'Please provide the reason.' });
        else alert('Please provide the reason.');
        return;
      }

      let endpoint = '', confirmTitle = '', confirmText = '', successText = '';
      if (statusNow === 'REPLY CHECKING - ORIGINATOR') {
        endpoint = '../php-backend/rcpa-disapprove-originator-reply.php';
        confirmTitle = 'Return to QMS/QA Team?';
        confirmText = 'This will set the status to VALIDATION REPLY and record your reason.';
        successText = 'Status updated to VALIDATION REPLY.';
      } else if (statusNow === 'EVIDENCE CHECKING - ORIGINATOR') {
        endpoint = '../php-backend/rcpa-disapprove-originator-evidence.php';
        confirmTitle = 'Return for more evidence?';
        confirmText = 'This will set the status to EVIDENCE CHECKING and record your reason.';
        successText = 'Status updated to EVIDENCE CHECKING.';
      } else if (statusNow === 'INVALID APPROVAL - ORIGINATOR') {
        endpoint = '../php-backend/rcpa-disapprove-originator-invalid.php';
        confirmTitle = 'Return INVALID reply?';
        confirmText = 'This will move the request to QMS CHECKING.';
        successText = 'Status updated to QMS CHECKING.';
      } else {
        return;
      }

      const ok = await confirmProceed(confirmTitle, confirmText, 'Yes, submit');
      if (!ok) return;

      try {
        const fd = new FormData(rejectForm);
        fd.append('id', String(id));
        fd.append('remarks', remarks);

        const res = await fetch(endpoint, { method: 'POST', credentials: 'same-origin', body: fd });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.ok) throw new Error(data?.error || `Disapprove failed (HTTP ${res.status})`);

        closeRejectFormModal();
        if (typeof refreshRcpaTable === 'function') { try { await refreshRcpaTable(); } catch { } }
        hideViewModal();

        if (window.Swal) Swal.fire({ icon: 'success', title: 'Returned', text: successText });
        else alert('Returned. ' + successText);
      } catch (err) {
        if (window.Swal) Swal.fire({ icon: 'error', title: 'Submit failed', text: err?.message || 'Unexpected error.' });
        else alert(err?.message || 'Submit failed.');
      }
    });

    resubmitBtn?.addEventListener('click', async () => {
      const id = parseInt(document.getElementById('rcpa-view-modal')?.dataset.rcpaId || '0', 10);
      if (!id) return;

      const confirmMsg =
        'This will resubmit the request. ' +
        'If an Originator Supervisor/Head is set, it will route for their approval; ' +
        'otherwise it will go to QMS CHECKING.';

      const ok = await (window.Swal
        ? Swal.fire({
          icon: 'question',
          title: 'Resubmit this request?',
          text: confirmMsg,
          showCancelButton: true,
          confirmButtonText: 'Yes, resubmit',
          cancelButtonText: 'Cancel',
        }).then(r => r.isConfirmed)
        : Promise.resolve(window.confirm(confirmMsg))
      );
      if (!ok) return;

      try {
        resubmitBtn.disabled = true;

        // optional: show a brief loading modal while we call the API
        let loadingSwal;
        if (window.Swal) {
          loadingSwal = Swal.fire({
            title: 'Resubmitting…',
            didOpen: () => Swal.showLoading(),
            allowOutsideClick: false,
            allowEscapeKey: false,
            allowEnterKey: false,
            showConfirmButton: false
          });
        }

        const res = await fetch('../php-backend/rcpa-resubmit-request.php', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id }),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.ok) throw new Error(data?.error || `Resubmit failed (HTTP ${res.status})`);

        // refresh table, close view modal
        if (typeof refreshRcpaTable === 'function') {
          try { await refreshRcpaTable(); } catch { /* ignore */ }
        }
        const vm = document.getElementById('rcpa-view-modal');
        if (vm) { vm.classList.remove('show'); setTimeout(() => (vm.hidden = true), 150); }

        const newStatus = (data.status || 'QMS CHECKING').toUpperCase();

        if (window.Swal) {
          Swal.fire({
            icon: 'success',
            title: 'Resubmitted',
            text: `Request moved to ${newStatus}.`
          });
        } else {
          alert(`Resubmitted. Request moved to ${newStatus}.`);
        }
      } catch (err) {
        if (window.Swal) {
          Swal.fire({ icon: 'error', title: 'Resubmit failed', text: err?.message || 'Unexpected error.' });
        } else {
          alert(err?.message || 'Resubmit failed.');
        }
      } finally {
        resubmitBtn.disabled = false;
      }
    });

    // === Type blocks helpers ===
    (function initRcpaViewModalEnhancements() {
      const vTypeBlocks = {
        external: byId('v-type-external'),
        internal: byId('v-type-internal'),
        unattain: byId('v-type-unattain'),
        online: byId('v-type-online'),
        '5s': byId('v-type-hs'),
        mgmt: byId('v-type-mgmt')
      };
      function showOnlyViewType(t) {
        Object.values(vTypeBlocks).forEach(el => { if (el) el.hidden = true; });
        const active = vTypeBlocks[t];
        if (active) active.hidden = false;
      }
      function clearViewTypeFields() {
        [
          '#v-external-sem1-year', '#v-external-sem2-year',
          '#v-internal-sem1-year', '#v-internal-sem2-year',
          '#v-project-name', '#v-wbs-number',
          '#v-online-year', '#v-hs-month', '#v-hs-year', '#v-mgmt-year'
        ].forEach(sel => { const el = $(sel); if (el) el.value = ''; });

        ['#v-external-sem1-pick', '#v-external-sem2-pick',
          '#v-internal-sem1-pick', '#v-internal-sem2-pick',
          '#rcpa-view-mgmt-q1', '#rcpa-view-mgmt-q2', '#rcpa-view-mgmt-q3', '#rcpa-view-mgmt-ytd'
        ].forEach(sel => { const el = $(sel); if (el) el.checked = false; });

        Object.values(vTypeBlocks).forEach(el => { if (el) el.hidden = true; });
      }
      window.__clearViewTypeFields = clearViewTypeFields;

      window.__fillViewType = function (r) {
        const t = String(r.rcpa_type || '').toLowerCase();
        showOnlyViewType(t);

        const setVal = (id, v) => { const el = byId(id); if (el) el.value = v; };
        const setChk = (id, v) => { const el = byId(id); if (el) el.checked = !!v; };

        setVal('rcpa-view-type', labelForType(r.rcpa_type));

        if (t === 'external' || t === 'internal') {
          const pick = (function parseSemPick(str) {
            const s = String(str || '').toLowerCase();
            if (s.includes('1st')) return 'sem1';
            if (s.includes('2nd')) return 'sem2';
            return '';
          })(r.sem_year);
          const year = (String(r.sem_year || '').match(/(\d{4})/) || [, ''])[1];

          if (t === 'external') {
            setChk('v-external-sem1-pick', pick === 'sem1');
            setChk('v-external-sem2-pick', pick === 'sem2');
            setVal('v-external-sem1-year', pick === 'sem1' ? year : '');
            setVal('v-external-sem2-year', pick === 'sem2' ? year : '');
          } else {
            setChk('v-internal-sem1-pick', pick === 'sem1');
            setChk('v-internal-sem2-pick', pick === 'sem2');
            setVal('v-internal-sem1-year', pick === 'sem1' ? year : '');
            setVal('v-internal-sem2-year', pick === 'sem2' ? year : '');
          }
        } else if (t === 'unattain') {
          setVal('v-project-name', r.project_name || '');
          setVal('v-wbs-number', r.wbs_number || '');
        } else if (t === 'online') {
          setVal('v-online-year', r.sem_year || '');
        } else if (t === '5s') {
          const s = String(r.sem_year || '').toLowerCase();
          const year = (s.match(/(\d{4})/) || [, ''])[1];
          const month = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'].find(m => s.includes(m));
          setVal('v-hs-month', month ? month.charAt(0).toUpperCase() + month.slice(1) : '');
          setVal('v-hs-year', year || '');
        } else if (t === 'mgmt') {
          setVal('v-mgmt-year', r.sem_year || '');
          const q = String(r.quarter || '').toLowerCase();
          setChk('rcpa-view-mgmt-q1', q === 'q1');
          setChk('rcpa-view-mgmt-q2', q === 'q2');
          setChk('rcpa-view-mgmt-q3', q === 'q3');
          setChk('rcpa-view-mgmt-ytd', q === 'ytd');
        }
      };
    })();

    // Helper: type label
    function labelForType(t) {
      const key = String(t || '').toLowerCase().trim();
      return ({
        external: 'External QMS Audit',
        internal: 'Internal Quality Audit',
        unattain: 'Un-attainment of delivery target of Project',
        online: 'On-Line',
        '5s': '5s Audit / Health & Safety Concerns',
        mgmt: 'Management Objective'
      }[key] || (t || ''));
    }
  })();

})();

let socket;
const WS_URL = `${location.protocol === 'https:' ? 'wss' : 'ws'}://172.31.11.252:8082?user_id=123`;

function refreshRcpaTable() {
  if (window.__rcpaTable && typeof window.__rcpaTable.reload === 'function') {
    window.__rcpaTable.reload();
  } else {
    // fallback for early WebSocket messages: fire an event that the table script can hook
    document.dispatchEvent(new Event('rcpa:reload'));
  }
}

function connectWebSocket() {
  socket = new WebSocket(WS_URL);

  socket.onopen = function () {
    console.log("Connected to WebSocket server");
    socket.send("Hello from the client!");
  };

  socket.onmessage = function (event) {
    console.log("Message received from WebSocket server:", event.data);

    // Try parsing as JSON first
    try {
      const message = JSON.parse(event.data);

      // Refresh table when the server broadcasts an RCPA event
      if (message && message.action === 'rcpa-request') {
        console.log("RCPA event received → refreshing table…", message);
        refreshRcpaTable();
      }
      return;
    } catch (err) {
      // not JSON — fall through to plain text handling
    }

    // Plain text fallback
    if (event.data === "rcpa-request") {
      console.log("RCPA event (plain text) → refreshing table…");
      refreshRcpaTable();
    } else if (event.data === "Hello from the client!") {
      console.log("Received greeting from server.");
    }
  };

  socket.onerror = function (error) {
    console.error("WebSocket error:", error);
  };

  socket.onclose = function (event) {
    console.log("WebSocket connection closed:", event);
    // Attempt reconnection if abnormal closure (code 1006 or not clean)
    if (event.code === 1006 || !event.wasClean) {
      console.log("Attempting to reconnect in 1 seconds...");
      setTimeout(connectWebSocket, 1000);
    }
  };
}

document.addEventListener('DOMContentLoaded', () => {
  connectWebSocket();
});