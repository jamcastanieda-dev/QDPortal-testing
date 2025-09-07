(function () {
  const BADGE_ID = 'rcpa-task-badge';
  const ENDPOINT = '../php-backend/rcpa-notif-tasks-count.php';

  function setBadge(count) {
    const badge = document.getElementById(BADGE_ID);
    if (!badge) return;
    const n = Number(count) || 0;
    if (n > 0) {
      badge.textContent = n > 99 ? '99+' : String(n);
      badge.hidden = false;
      badge.title = `${n} pending RCPA task${n > 1 ? 's' : ''}`;
      badge.setAttribute('aria-label', badge.title);
    } else {
      badge.hidden = true;
      badge.removeAttribute('title');
      badge.removeAttribute('aria-label');
    }
  }

  async function refreshRcpaTaskBadge() {
    try {
      const res = await fetch(ENDPOINT, {
        credentials: 'same-origin',
        headers: { 'Accept': 'application/json' }
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data && data.ok) {
        setBadge(data.count);
      } else {
        // hide on error; keep console for debugging
        console.warn('Task count error:', data?.error || res.status);
        setBadge(0);
      }
    } catch (err) {
      console.warn('Task count fetch failed:', err);
      setBadge(0);
    }
  }

  // Expose for later real-time updates (WebSocket, intervals, etc.)
  window.refreshRcpaTaskBadge = refreshRcpaTaskBadge;

  // Initial load
  document.addEventListener('DOMContentLoaded', refreshRcpaTaskBadge);

  // Optional: if you already use a WebSocket, update on RCPA events
  if (window.socket) {
    const _onmessage = window.socket.onmessage;
    window.socket.onmessage = function (event) {
      try {
        const msg = JSON.parse(event.data);
        if (msg && msg.action === 'rcpa-request') {
          refreshRcpaTaskBadge();
        }
      } catch {
        if (event.data === 'rcpa-request') refreshRcpaTaskBadge();
      }
      if (typeof _onmessage === 'function') _onmessage.call(this, event);
    };
  }
})();

(function () {
  const BADGE_ID = 'rcpa-approval-badge';
  const ENDPOINT = '../php-backend/rcpa-notif-approval-count.php';

  function setBadge(count) {
    const badge = document.getElementById(BADGE_ID);
    if (!badge) return;
    const n = Number(count) || 0;
    if (n > 0) {
      badge.textContent = n > 99 ? '99+' : String(n);
      badge.hidden = false;
      badge.title = `${n} pending approval ${n > 1 ? 'items' : 'item'}`;
      badge.setAttribute('aria-label', badge.title);
    } else {
      badge.hidden = true;
      badge.removeAttribute('title');
      badge.removeAttribute('aria-label');
    }
  }

  async function refreshRcpaApprovalBadge() {
    try {
      const res = await fetch(ENDPOINT, {
        credentials: 'same-origin',
        headers: { 'Accept': 'application/json' }
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data && data.ok) {
        setBadge(data.count);
      } else {
        console.warn('Approval count error:', data?.error || res.status);
        setBadge(0);
      }
    } catch (err) {
      console.warn('Approval count fetch failed:', err);
      setBadge(0);
    }
  }

  // Expose for manual/real-time refresh if needed
  window.refreshRcpaApprovalBadge = refreshRcpaApprovalBadge;

  // Initial load
  document.addEventListener('DOMContentLoaded', refreshRcpaApprovalBadge);

  // Optional: refresh when your socket broadcasts related events
  if (window.socket) {
    const _onmessage = window.socket.onmessage;
    window.socket.onmessage = function (event) {
      try {
        const msg = JSON.parse(event.data);
        if (msg && (msg.action === 'rcpa-approval' || msg.action === 'rcpa-request')) {
          refreshRcpaApprovalBadge();
        }
      } catch {
        // simple text fallback
        if (event.data === 'rcpa-approval' || event.data === 'rcpa-request') {
          refreshRcpaApprovalBadge();
        }
      }
      if (typeof _onmessage === 'function') _onmessage.call(this, event);
    };
  }
})();

(function () {
  const BADGE_ID = 'rcpa-request-badge';
  const ENDPOINT = '../php-backend/rcpa-notif-request-count.php';

  function setBadge(count) {
    const badge = document.getElementById(BADGE_ID);
    if (!badge) return;
    const n = Number(count) || 0;
    if (n > 0) {
      badge.textContent = n > 99 ? '99+' : String(n);
      badge.hidden = false;
      badge.title = `${n} pending request${n > 1 ? 's' : ''}`;
      badge.setAttribute('aria-label', badge.title);
    } else {
      badge.hidden = true;
      badge.removeAttribute('title');
      badge.removeAttribute('aria-label');
    }
  }

  async function refreshRcpaRequestBadge() {
    try {
      const res  = await fetch(ENDPOINT, { credentials: 'same-origin', headers: { 'Accept': 'application/json' } });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data && data.ok) {
        setBadge(data.count);
      } else {
        console.warn('Request count error:', data?.error || res.status);
        setBadge(0);
      }
    } catch (err) {
      console.warn('Request count fetch failed:', err);
      setBadge(0);
    }
  }

  // Expose for live updates
  window.refreshRcpaRequestBadge = refreshRcpaRequestBadge;

  // Initial load
  document.addEventListener('DOMContentLoaded', refreshRcpaRequestBadge);

  // Optional: refresh via WebSocket broadcast
  if (window.socket) {
    const prev = window.socket.onmessage;
    window.socket.onmessage = function (event) {
      try {
        const msg = JSON.parse(event.data);
        if (msg && msg.action === 'rcpa-request') refreshRcpaRequestBadge();
      } catch {
        if (event.data === 'rcpa-request') refreshRcpaRequestBadge();
      }
      if (typeof prev === 'function') prev.call(this, event);
    };
  }
})();