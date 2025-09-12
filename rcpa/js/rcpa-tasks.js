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
  const SSE_URL  = '../php-backend/rcpa-task-counters-sse.php';

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
      const isApprover = !!window.RCPA_IS_APPROVER;
      return (dept === 'QMS') || (dept === 'QA' && isApprover);
    } catch { return false; }
  }

  function hideCompletely(el) {
    if (!el) return;
    el.hidden = true;
    el.setAttribute('aria-hidden', 'true');
    el.tabIndex = -1;
    el.style.display = 'none';
  }

  // Cache last numbers to avoid unnecessary DOM writes
  let last = null;
  let rafToken = null;

  function applyCounts(payload) {
    if (!payload || !payload.counts) return;

    // Skip if unchanged
    const key = JSON.stringify(payload.counts);
    if (last === key) return;
    last = key;

    if (rafToken) cancelAnimationFrame(rafToken);
    rafToken = requestAnimationFrame(() => {
      const allowQms = payload.is_qms || canSeeQms();

      const bQms  = document.getElementById('badgeQms');
      const bAssignee = document.getElementById('badgeAssignee');

      // Legacy/secondary
      const bApproval = document.getElementById('badgeApproval');
      const bClosing  = document.getElementById('badgeClosing');
      const bNotValid = document.getElementById('badgeNotValid');

      // QMS Approval (card + modal)
      const bQmsApproval = document.getElementById('badgeQmsApproval');
      const bQmsReply    = document.getElementById('badgeQmsReply');
      const bQmsClosing  = document.getElementById('badgeQmsClosing');

      // Assignee Approval modal
      const bAssigneeReplyApproval      = document.getElementById('badgeAssigneeReplyApproval');
      const bAssigneeForClosingApproval = document.getElementById('badgeAssigneeForClosingApproval');

      const bClosed = document.getElementById('badgeClosed');

      // --- QMS Tasks (only for allowed users) ---
      if (bQms) setBadge(bQms, allowQms ? payload.counts.qms : 0);

      // --- Assignee Tasks ---
      setBadge(bAssignee, payload.counts.assignee_pending);

      // --- Assignee Approval (card + legacy chips) ---
      setBadge(bApproval, payload.counts.approval);
      setBadge(bClosing,  payload.counts.valid_approval ?? payload.counts.closing_approval);
      setBadge(bNotValid, payload.counts.not_valid_approval);

      const replyApprovalTotal =
        (Number(payload.counts.valid_approval) || 0) +
        (Number(payload.counts.not_valid_approval) || 0);
      setBadge(bAssigneeReplyApproval, replyApprovalTotal);
      setBadge(bAssigneeForClosingApproval, payload.counts.for_closing_approval);

      // --- QMS Approval (card + modal; hide if not allowed) ---
      const qmsApprovalTotal =
        payload.counts.qms_approval_total ??
        ((Number(payload.counts.qms_reply_approval) || 0) + (Number(payload.counts.qms_closing_approval) || 0));
      if (bQmsApproval) setBadge(bQmsApproval, allowQms ? qmsApprovalTotal : 0);
      setBadge(bQmsReply,   allowQms ? payload.counts.qms_reply_approval    : 0);
      setBadge(bQmsClosing, allowQms ? payload.counts.qms_closing_approval  : 0);

      // --- Closed ---
      setBadge(bClosed, payload.counts.closed);
    });
  }

  async function refreshTaskBadges() {
    try {
      const res = await fetch(ENDPOINT, {
        credentials: 'same-origin',
        headers: { 'Accept': 'application/json', 'Cache-Control': 'no-cache' }
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data && data.ok) {
        applyCounts(data);
      } else {
        // zero out on error
        applyCounts({ is_qms: false, counts: {
          qms:0, assignee_pending:0, approval:0, closing_approval:0, valid_approval:0, not_valid_approval:0,
          for_closing_approval:0, qms_approval_total:0, qms_reply_approval:0, qms_closing_approval:0, closed:0
        }});
        console.warn('Counters error:', data?.error || res.status);
      }
    } catch (e) {
      applyCounts({ is_qms: false, counts: {
        qms:0, assignee_pending:0, approval:0, closing_approval:0, valid_approval:0, not_valid_approval:0,
        for_closing_approval:0, qms_approval_total:0, qms_reply_approval:0, qms_closing_approval:0, closed:0
      }});
      console.warn('Counters fetch failed:', e);
    }
  }

  // Expose for websocket/manual refresh
  window.refreshTaskBadges = refreshTaskBadges;

  // Initial mount / access gating
  document.addEventListener('DOMContentLoaded', () => {
    const btnQms = document.getElementById('btnQms');
    const qmsApprovalBtn = document.getElementById('qmsApprovalBtn');
    const bQms = document.getElementById('badgeQms');

    if (!canSeeQms()) {
      hideCompletely(btnQms);
      hideCompletely(qmsApprovalBtn);
      if (bQms) bQms.hidden = true;
    } else if (bQms) {
      bQms.hidden = false;
    }
    refreshTaskBadges();
  });

  // Optional WebSocket bump
  if (window.socket) {
    const prev = window.socket.onmessage;
    window.socket.onmessage = function (event) {
      try {
        const msg = JSON.parse(event.data);
        if (msg && msg.action === 'rcpa-request') refreshTaskBadges();
      } catch {
        if (event.data === 'rcpa-request') refreshTaskBadges();
      }
      if (typeof prev === 'function') prev.call(this, event);
    };
  }

  // -------- SSE live updates --------
  let es, monitorTimer = null;

  function startSse(restart = false) {
    try { if (restart && es) es.close(); } catch {}

    // avoid holding a connection in background tabs
    if (document.hidden) return;

    try {
      es = new EventSource(SSE_URL);

      // Named event from server
      es.addEventListener('rcpa-task-counters', (ev) => {
        try {
          const payload = JSON.parse(ev.data || '{}');
          if (payload && payload.ok) applyCounts(payload);
        } catch {}
      });

      // Default message fallback
      es.onmessage = (ev) => {
        try {
          const payload = JSON.parse(ev.data || '{}');
          if (payload && payload.ok) applyCounts(payload);
        } catch {}
      };

      es.onerror = () => {
        // EventSource will retry; also do a one-shot refresh as a safety net
        refreshTaskBadges();
      };

      clearInterval(monitorTimer);
      monitorTimer = setInterval(() => {
        if (!es) return;
        if (es.readyState === 2 /* CLOSED */) startSse(true);
      }, 15000);
    } catch {
      // no EventSource support ⇒ silently ignore
    }
  }

  function stopSse() {
    try { if (es) es.close(); } catch {}
    es = null;
    clearInterval(monitorTimer);
    monitorTimer = null;
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stopSse();
    } else {
      refreshTaskBadges();
      startSse(true);
    }
  });

  document.addEventListener('DOMContentLoaded', () => startSse());
  window.addEventListener('beforeunload', stopSse);
})();
