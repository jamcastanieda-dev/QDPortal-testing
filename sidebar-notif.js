// sidebar-notif.js
// NOTIF FOR RCPA
(function () {
  const AGG_ID = 'rcpa-parent-badge';
  const state = { request: 0, approval: 0, task: 0 };

  function update() {
    const el = document.getElementById(AGG_ID);
    if (!el) return; // safe if parent badge isn't on this page
    const total = (state.request || 0) + (state.approval || 0) + (state.task || 0);
    if (total > 0) {
      el.textContent = total > 99 ? '99+' : String(total);
      el.hidden = false;
      const title = `${total} RCPA notification${total > 1 ? 's' : ''} (sum of Request, Approval, Tasks)`;
      el.title = title;
      el.setAttribute('aria-label', title);
    } else {
      el.hidden = true;
      el.removeAttribute('title');
      el.removeAttribute('aria-label');
    }
  }

  // Expose aggregator hook
  window.__rcpaUpdate = function (kind, count) {
    if (!['request', 'approval', 'task'].includes(kind)) return;
    state[kind] = Number(count) || 0;
    update();
  };

  document.addEventListener('DOMContentLoaded', update);
})();

(function () {
  const BADGE_ID = 'rcpa-task-badge';
  // If your REST endpoint is actually rcpa-task-count.php, change ENDPOINT below.
  const ENDPOINT = 'rcpa/php-backend/rcpa-notif-tasks-count.php';
  const SSE_URL  = 'rcpa/php-backend/rcpa-notif-tasks-count-sse.php';

  function setBadge(count) {
    const badge = document.getElementById(BADGE_ID);
    if (!badge) return;
    const n = Number(count) || 0;
    if (n > 0) {
      badge.textContent = n > 99 ? '99+' : String(n);
      badge.hidden = false;
      const title = `${n} pending RCPA task${n > 1 ? 's' : ''}`;
      badge.title = title;
      badge.setAttribute('aria-label', title);
    } else {
      badge.hidden = true;
      badge.removeAttribute('title');
      badge.removeAttribute('aria-label');
    }
    if (typeof window.__rcpaUpdate === 'function') window.__rcpaUpdate('task', n); // report to parent
  }

  async function refreshRcpaTaskBadge() {
    try {
      const res = await fetch(ENDPOINT, { credentials: 'same-origin', headers: { 'Accept': 'application/json' } });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data && data.ok) setBadge(data.count);
      else { console.warn('Task count error:', data?.error || res.status); setBadge(0); }
    } catch (err) { console.warn('Task count fetch failed:', err); setBadge(0); }
  }

  // Live updates via SSE
  let es, monitor;
  function startSse(restart = false) {
    try { if (restart && es) es.close(); } catch {}
    if (document.hidden) return; // don't hold a stream in background tabs
    try {
      es = new EventSource(SSE_URL);
      es.addEventListener('rcpa-notif-tasks-count', (ev) => {
        try { const p = JSON.parse(ev.data || '{}'); if (p && p.ok) setBadge(p.count); } catch {}
      });
      es.onmessage = (ev) => { // default event fallback
        try { const p = JSON.parse(ev.data || '{}'); if (p && p.ok) setBadge(p.count); } catch {}
      };
      es.onerror = () => { refreshRcpaTaskBadge(); }; // safety refresh
      clearInterval(monitor);
      monitor = setInterval(() => { if (es && es.readyState === 2) startSse(true); }, 15000);
    } catch {}
  }
  function stopSse() { try { es && es.close(); } catch {}; es = null; clearInterval(monitor); }

  // Expose + boot
  window.refreshRcpaTaskBadge = refreshRcpaTaskBadge;
  document.addEventListener('DOMContentLoaded', () => { refreshRcpaTaskBadge(); startSse(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) stopSse(); else { refreshRcpaTaskBadge(); startSse(true); }});
  window.addEventListener('beforeunload', stopSse);

  // Optional websocket nudge
  if (window.socket) {
    const _onmessage = window.socket.onmessage;
    window.socket.onmessage = function (event) {
      try { const msg = JSON.parse(event.data); if (msg && msg.action === 'rcpa-request') refreshRcpaTaskBadge(); }
      catch { if (event.data === 'rcpa-request') refreshRcpaTaskBadge(); }
      if (typeof _onmessage === 'function') _onmessage.call(this, event);
    };
  }
})();

(function () {
  const BADGE_ID = 'rcpa-approval-badge';
  const ENDPOINT = 'rcpa/php-backend/rcpa-notif-approval-count.php';
  const SSE_URL  = 'rcpa/php-backend/rcpa-notif-approval-count-sse.php';

  function setBadge(count) {
    const badge = document.getElementById(BADGE_ID);
    if (!badge) return;
    const n = Number(count) || 0;
    if (n > 0) {
      badge.textContent = n > 99 ? '99+' : String(n);
      badge.hidden = false;
      const title = `${n} pending approval ${n > 1 ? 'items' : 'item'}`;
      badge.title = title;
      badge.setAttribute('aria-label', title);
    } else {
      badge.hidden = true;
      badge.removeAttribute('title');
      badge.removeAttribute('aria-label');
    }
    if (typeof window.__rcpaUpdate === 'function') window.__rcpaUpdate('approval', n); // report to parent
  }

  async function refreshRcpaApprovalBadge() {
    try {
      const res = await fetch(ENDPOINT, { credentials: 'same-origin', headers: { 'Accept': 'application/json' } });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data && data.ok) setBadge(data.count);
      else { console.warn('Approval count error:', data?.error || res.status); setBadge(0); }
    } catch (err) { console.warn('Approval count fetch failed:', err); setBadge(0); }
  }

  // SSE
  let es, monitor;
  function startSse(restart=false){
    try{ if(restart && es) es.close(); }catch{}
    if(document.hidden) return;
    try{
      es = new EventSource(SSE_URL);
      es.addEventListener('rcpa-notif-approval-count', (ev)=>{
        try{ const p = JSON.parse(ev.data||'{}'); if(p&&p.ok) setBadge(p.count); }catch{}
      });
      es.onmessage = (ev)=>{ try{ const p=JSON.parse(ev.data||'{}'); if(p&&p.ok) setBadge(p.count);}catch{} };
      es.onerror = ()=>{ refreshRcpaApprovalBadge(); };
      clearInterval(monitor);
      monitor = setInterval(()=>{ if(es && es.readyState===2) startSse(true); },15000);
    }catch{}
  }
  function stopSse(){ try{es&&es.close();}catch{} es=null; clearInterval(monitor); }

  window.refreshRcpaApprovalBadge = refreshRcpaApprovalBadge;
  document.addEventListener('DOMContentLoaded', ()=>{ refreshRcpaApprovalBadge(); startSse(); });
  document.addEventListener('visibilitychange', ()=>{ if(document.hidden) stopSse(); else { refreshRcpaApprovalBadge(); startSse(true);} });
  window.addEventListener('beforeunload', stopSse);

  if (window.socket) {
    const _onmessage = window.socket.onmessage;
    window.socket.onmessage = function (event) {
      try { const msg = JSON.parse(event.data); if (msg && (msg.action === 'rcpa-approval' || msg.action === 'rcpa-request')) refreshRcpaApprovalBadge(); }
      catch { if (event.data === 'rcpa-approval' || event.data === 'rcpa-request') refreshRcpaApprovalBadge(); }
      if (typeof _onmessage === 'function') _onmessage.call(this, event);
    };
  }
})();

(function () {
  const BADGE_ID = 'rcpa-request-badge';
  const ENDPOINT = 'rcpa/php-backend/rcpa-notif-request-count.php';
  const SSE_URL  = 'rcpa/php-backend/rcpa-notif-request-count-sse.php';

  function setBadge(count) {
    const badge = document.getElementById(BADGE_ID);
    if (!badge) return;
    const n = Number(count) || 0;
    if (n > 0) {
      badge.textContent = n > 99 ? '99+' : String(n);
      badge.hidden = false;
      const title = `${n} pending request${n > 1 ? 's' : ''}`;
      badge.title = title;
      badge.setAttribute('aria-label', title);
    } else {
      badge.hidden = true;
      badge.removeAttribute('title');
      badge.removeAttribute('aria-label');
    }
    if (typeof window.__rcpaUpdate === 'function') window.__rcpaUpdate('request', n); // report to parent
  }

  async function refreshRcpaRequestBadge() {
    try {
      const res = await fetch(ENDPOINT, { credentials: 'same-origin', headers: { 'Accept': 'application/json' } });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data && data.ok) setBadge(data.count);
      else { console.warn('Request count error:', data?.error || res.status); setBadge(0); }
    } catch (err) { console.warn('Request count fetch failed:', err); setBadge(0); }
  }

  // SSE
  let es, monitor;
  function startSse(restart=false){
    try{ if(restart && es) es.close(); }catch{}
    if(document.hidden) return;
    try{
      es = new EventSource(SSE_URL);
      es.addEventListener('rcpa-notif-request-count', (ev)=>{
        try{ const p = JSON.parse(ev.data||'{}'); if(p&&p.ok) setBadge(p.count); }catch{}
      });
      es.onmessage = (ev)=>{ try{ const p=JSON.parse(ev.data||'{}'); if(p&&p.ok) setBadge(p.count);}catch{} };
      es.onerror = ()=>{ refreshRcpaRequestBadge(); };
      clearInterval(monitor);
      monitor = setInterval(()=>{ if(es && es.readyState===2) startSse(true); },15000);
    }catch{}
  }
  function stopSse(){ try{es&&es.close();}catch{} es=null; clearInterval(monitor); }

  window.refreshRcpaRequestBadge = refreshRcpaRequestBadge;
  document.addEventListener('DOMContentLoaded', ()=>{ refreshRcpaRequestBadge(); startSse(); });
  document.addEventListener('visibilitychange', ()=>{ if(document.hidden) stopSse(); else { refreshRcpaRequestBadge(); startSse(true);} });
  window.addEventListener('beforeunload', stopSse);

  if (window.socket) {
    const prev = window.socket.onmessage;
    window.socket.onmessage = function (event) {
      try { const msg = JSON.parse(event.data); if (msg && msg.action === 'rcpa-request') refreshRcpaRequestBadge(); }
      catch { if (event.data === 'rcpa-request') refreshRcpaRequestBadge(); }
      if (typeof prev === 'function') prev.call(this, event);
    };
  }
})();
// NOTIF FOR RCPA END