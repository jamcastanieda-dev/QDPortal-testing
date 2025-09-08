/* === Modal wiring === */
(function () {
  // --- Assignee Approval modal ---
  const openBtn = document.getElementById('approvalBtn');
  const modal = document.getElementById('approval-modal');
  const closeBtn = document.getElementById('approvalClose');

  function openModal() {
    if (!modal) return;
    modal.classList.add('show');
    modal.setAttribute('aria-hidden', 'false');
    const firstBtn = modal.querySelector('.approval-actions button');
    (firstBtn || closeBtn)?.focus();
  }

  function closeModal() {
    if (!modal) return;
    modal.classList.remove('show');
    modal.setAttribute('aria-hidden', 'true');
    openBtn?.focus();
  }

  openBtn?.addEventListener('click', openModal);
  closeBtn?.addEventListener('click', closeModal);
  modal?.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal?.classList.contains('show')) closeModal();
  });

  // --- QMS Approval modal ---
  const qmsOpenBtn = document.getElementById('qmsApprovalBtn');
  const qmsModal = document.getElementById('qms-approval-modal');
  const qmsCloseBtn = document.getElementById('qmsApprovalClose');

  function openQmsModal() {
    if (!qmsModal) return;
    qmsModal.classList.add('show');
    qmsModal.setAttribute('aria-hidden', 'false');
    const firstBtn = qmsModal.querySelector('.approval-actions button');
    (firstBtn || qmsCloseBtn)?.focus();
  }

  function closeQmsModal() {
    if (!qmsModal) return;
    qmsModal.classList.remove('show');
    qmsModal.setAttribute('aria-hidden', 'true');
    qmsOpenBtn?.focus();
  }

  // Attach listener only if the element exists (it may be hidden/removed)
  if (qmsOpenBtn) qmsOpenBtn.addEventListener('click', openQmsModal);
  qmsCloseBtn?.addEventListener('click', closeQmsModal);
  qmsModal?.addEventListener('click', (e) => { if (e.target === qmsModal) closeQmsModal(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && qmsModal?.classList.contains('show')) closeQmsModal();
  });
})();

/* === Counters, badges, and QMS visibility === */
(function () {
  const ENDPOINT = '../php-backend/rcpa-task-counters.php';

  function setBadge(el, count) {
    if (!el) return;
    const n = Number(count) || 0;
    if (n > 0) {
      el.textContent = n > 99 ? '99+' : String(n);
      el.hidden = false;
      const title = `${n} item${n > 1 ? 's' : ''}`;
      el.title = title;
      el.setAttribute('aria-label', title);
    } else {
      el.hidden = true;
      el.textContent = '0';
      el.removeAttribute('title');
      el.removeAttribute('aria-label');
    }
  }

  // Server-computed flag preferred; fallback to department + role logic
  function canSeeQms() {
    try {
      if (typeof window.RCPA_SHOW_QMS === 'boolean') return window.RCPA_SHOW_QMS;
      const dept = String(window.RCPA_DEPARTMENT || '').trim().toUpperCase();
      const isApprover = !!window.RCPA_IS_APPROVER; // manager/supervisor from PHP
      return (dept === 'QMS') || (dept === 'QA' && isApprover);
    } catch {
      return false;
    }
  }

  function hideCompletely(el) {
    if (!el) return;
    el.hidden = true;
    el.setAttribute('aria-hidden', 'true');
    el.tabIndex = -1;
    el.style.display = 'none';
  }

  async function refreshTaskBadges() {
    const bQms = document.getElementById('badgeQms');
    const bAssignee = document.getElementById('badgeAssignee');

    // Assignee Approval badges (existing/legacy)
    const bApproval = document.getElementById('badgeApproval');
    const bClosing = document.getElementById('badgeClosing');     // VALID APPROVAL (legacy id used elsewhere)
    const bNotValid = document.getElementById('badgeNotValid');    // IN-VALID APPROVAL (legacy id used elsewhere)

    // QMS Approval card + QMS modal badges
    const bQmsApproval = document.getElementById('badgeQmsApproval');
    const bQmsReply = document.getElementById('badgeQmsReply');        // IN-VALIDATION REPLY APPROVAL
    const bQmsClosing = document.getElementById('badgeQmsClosing');    // EVIDENCE APPROVAL

    // Assignee Approval modal badges (granular)
    const bAssigneeReplyApproval = document.getElementById('badgeAssigneeReplyApproval');             // VALID + IN-VALID APPROVAL
    const bAssigneeForClosingApproval = document.getElementById('badgeAssigneeForClosingApproval');   // FOR CLOSING APPROVAL

    // CLOSED
    const bClosed = document.getElementById('badgeClosed');

    const allowQms = canSeeQms();

    try {
      const res = await fetch(ENDPOINT, { credentials: 'same-origin', headers: { 'Accept': 'application/json' } });
      const data = await res.json().catch(() => ({}));

      if (res.ok && data && data.ok && data.counts) {
        // QMS top-left badge (only for allowed users)
        if (bQms) {
          if (allowQms) setBadge(bQms, data.counts.qms);
          else setBadge(bQms, 0);
        }

        // Assignee Tasks
        setBadge(bAssignee, data.counts.assignee_pending);

        // Assignee Approval (total shown on main card; breakdown for legacy badges if present)
        setBadge(bApproval, data.counts.approval);
        setBadge(bClosing, data.counts.valid_approval ?? data.counts.closing_approval);
        setBadge(bNotValid, data.counts.not_valid_approval);

        // Assignee Approval modal badges
        const replyApprovalTotal =
          (Number(data.counts.valid_approval) || 0) +
          (Number(data.counts.not_valid_approval) || 0);
        setBadge(bAssigneeReplyApproval, replyApprovalTotal);
        setBadge(bAssigneeForClosingApproval, data.counts.for_closing_approval);

        // QMS Approval (card + modal)
        const qmsApprovalTotal =
          data.counts.qms_approval_total ??
          ((Number(data.counts.qms_reply_approval) || 0) + (Number(data.counts.qms_closing_approval) || 0));

        if (bQmsApproval) {
          if (allowQms) setBadge(bQmsApproval, qmsApprovalTotal);
          else setBadge(bQmsApproval, 0);
        }

        // Modal chips: only show counts for QMS/QA approvers
        setBadge(bQmsReply,   allowQms ? data.counts.qms_reply_approval   : 0);
        setBadge(bQmsClosing, allowQms ? data.counts.qms_closing_approval : 0);

        // CLOSED
        setBadge(bClosed, data.counts.closed);

      } else {
        if (bQms) bQms.hidden = true;
        [
          bAssignee, bApproval, bClosing, bNotValid,
          bQmsApproval, bQmsReply, bQmsClosing,
          bAssigneeReplyApproval, bAssigneeForClosingApproval,
          bClosed
        ].forEach(el => setBadge(el, 0));
        console.warn('Counters error:', data?.error || res.status);
      }
    } catch (e) {
      if (bQms) bQms.hidden = true;
      [
        bAssignee, bApproval, bClosing, bNotValid,
        bQmsApproval, bQmsReply, bQmsClosing,
        bAssigneeReplyApproval, bAssigneeForClosingApproval,
        bClosed
      ].forEach(el => setBadge(el, 0));
      console.warn('Counters fetch failed:', e);
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    const btnQms = document.getElementById('btnQms');                  // QMS TASKS button
    const qmsApprovalBtn = document.getElementById('qmsApprovalBtn');  // QMS APPROVAL button
    const bQms = document.getElementById('badgeQms');

    if (!canSeeQms()) {
      hideCompletely(btnQms);
      hideCompletely(qmsApprovalBtn);
      if (bQms) bQms.hidden = true;
    } else if (bQms) {
      bQms.hidden = false; // visible; will be populated by fetch
    }

    refreshTaskBadges();
  });

  // Expose for websocket/manual refresh
  window.refreshTaskBadges = refreshTaskBadges;
})();
