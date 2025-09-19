const $wbs = document.getElementById('filter-wbs');
const $req = document.getElementById('filter-request');
const $tbody = document.getElementById('inspection-tbody');
let tableMode = 'REQUESTED'; // Start with REQUESTED mode

const requestBtn = document.getElementById('requestBtn');
const peCalibrationBtn = document.getElementById('peCalibrationBtn');

// ---- Realtime counts via polling ----
const COUNT_POLL_MS = 1000; // adjust as needed
let countIntervalId = null;
let isUpdatingCounts = false;

// Debounce helper to avoid firing too often
function debounce(fn, delay = 300) {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn(...args), delay);
    };
}

// Load table with filters applied
function loadInspections(statusFilter) {
    // If called from an event handler, ignore the event object and fall back to current mode
    if (statusFilter && typeof statusFilter !== 'string') {
        statusFilter = tableMode;
    }

    const params = new URLSearchParams();
    if ($wbs.value.trim()) params.append('wbs', $wbs.value.trim());
    if ($req.value) params.append('request', $req.value);
    if (statusFilter) params.append('status', statusFilter);

    fetch('inspection-table-qa-request.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString()
    })
        .then(response => response.text())
        .then(html => {
            $tbody.innerHTML = html.trim() || '<tr><td colspan="9">No records found.</td></tr>';
            setupPagination(document.querySelector('.inspection-table'));
        })
        .catch(error => {
            console.error('Error loading table:', error);
            $tbody.innerHTML = '<tr><td colspan="9">Error loading data.</td></tr>';
        });
}

// Debounced typing filter (always uses current tableMode)
const loadDebounced = debounce(() => loadInspections(tableMode), 300);

// Bind input events
$wbs.addEventListener('input', loadDebounced);
$req.addEventListener('change', () => loadInspections(tableMode));

let socket;
const WS_URL = "ws://172.31.11.252:8082?user_id=123";

function connectWebSocket() {
    // Avoid duplicate sockets if this function gets called again somehow
    if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
        return;
    }

    socket = new WebSocket(WS_URL);

    socket.onopen = function () {
        console.log("Connected to WebSocket server");
        socket.send("Hello from the client!");
    };

    socket.onmessage = function (event) {
        console.log("Message received from WebSocket server:", event.data);
        try {
            const message = JSON.parse(event.data);
            if (message.action === 'request' || message.action === 'change' || message.action === 'approval' || message.action === 'approved') {
                loadInspections(tableMode); // keep current tab/mode
                updateInspectionCounts();   // refresh counts immediately on WS events
            }
        } catch {
            // Plain text fallback
            if (event.data === "Hello from the client!") {
                console.log("Received greeting from server.");
            }
        }
    };

    socket.onerror = function (error) {
        console.error("WebSocket error:", error);
    };

    socket.onclose = function (event) {
        console.log("WebSocket connection closed:", event);
        // Attempt reconnection if abnormal closure (code 1006 or not clean)
        if (event.code === 1006 || !event.wasClean) {
            console.log("Attempting to reconnect in 1 second...");
            setTimeout(connectWebSocket, 1000);
        }
    };
}

requestBtn.addEventListener('click', function () {
    tableMode = 'REQUESTED';
    requestBtn.classList.add('active');
    peCalibrationBtn.classList.remove('active');
    loadInspections(tableMode);
});

peCalibrationBtn.addEventListener('click', function () {
    tableMode = 'PE CALIBRATION';
    peCalibrationBtn.classList.add('active');
    requestBtn.classList.remove('active');
    loadInspections(tableMode);
});

function updateInspectionCounts() {
    // Prevent overlapping requests if the network is slow
    if (isUpdatingCounts) return;
    isUpdatingCounts = true;

    fetch('inspection-notif-cali-received.php')
        .then(res => res.json())
        .then(counts => {
            document.getElementById('requestCount').textContent = counts.requested;
            document.getElementById('peCalibrationCount').textContent = counts.pe_calibration;
        })
        .catch(err => console.error('Error updating counts:', err))
        .finally(() => {
            isUpdatingCounts = false;
        });
}

function startCountPolling() {
    if (countIntervalId) return; // already polling
    countIntervalId = setInterval(updateInspectionCounts, COUNT_POLL_MS);
}

function stopCountPolling() {
    if (!countIntervalId) return;
    clearInterval(countIntervalId);
    countIntervalId = null;
}

// One clean init on page load
document.addEventListener('DOMContentLoaded', function () {
    // Initial UI state
    tableMode = 'REQUESTED';
    requestBtn.classList.add('active');
    peCalibrationBtn.classList.remove('active');

    updateInspectionCounts();
    startCountPolling();      // <— realtime via interval
    loadInspections(tableMode);
    connectWebSocket();

    // Pause polling when tab not visible, resume when visible
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            stopCountPolling();
        } else {
            updateInspectionCounts(); // immediate refresh on return
            startCountPolling();
        }
    });

    // Extra nudge when window regains focus
    window.addEventListener('focus', updateInspectionCounts);
});

// Clean up on unload
window.addEventListener('beforeunload', () => {
    stopCountPolling();
    try {
        if (socket && socket.readyState === WebSocket.OPEN) socket.close();
    } catch (_) {}
});
