const $wbs = document.getElementById('filter-wbs');
const $req = document.getElementById('filter-request');
const $status = document.getElementById('filter-status');
const $tbody = document.getElementById('inspection-tbody');

// Debounce helper
function debounce(fn, delay = 300) {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn(...args), delay);
    };
}

function loadInspections() {
    const params = new URLSearchParams();
    if ($wbs.value.trim()) params.append('wbs', $wbs.value.trim());
    if ($req.value) params.append('request', $req.value);
    if ($status.value) params.append('status', $status.value);

    fetch('inspection-table.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString()
    })
        .then(r => r.text())
        .then(html => {
            $tbody.innerHTML = html.trim() || '<tr><td colspan="9">No records found.</td></tr>';
            // 👇 Call your existing pagination function
            setupPagination(document.querySelector('.inspection-table'));
        })
        .catch(err => {
            console.error('Error loading table:', err);
            $tbody.innerHTML = '<tr><td colspan="9">Error loading data.</td></tr>';
        });
}

const loadDebounced = debounce(loadInspections, 300);

$wbs.addEventListener('input', loadDebounced);
$req.addEventListener('change', loadInspections);
$status.addEventListener('change', loadInspections);

// Optional: trigger initial load
document.addEventListener('DOMContentLoaded', loadInspections);

let socket;
const WS_URL = "ws://172.31.11.252:8082?user_id=123";

function connectWebSocket() {
    socket = new WebSocket(WS_URL);

    // Handle WebSocket connection open event
    socket.onopen = function (event) {
        console.log("Connected to WebSocket server");
        socket.send("Hello from the client!");
    };

    // Handle incoming WebSocket messages
    socket.onmessage = function (event) {
        console.log("Message received from WebSocket server:", event.data);

        // Attempt to parse the message as JSON
        try {
            const message = JSON.parse(event.data);

            // If the message action is 'update', reload circuit options and fetch circuits
            if (message.action === 'change' || message.action == 'approved' || message.action == 'rescheduled' || message.action == 'request') {
                loadInspections();
            }
        } catch (error) {
            // If parsing fails, handle the message as plain text
            console.log("Received plain text message:", event.data);
            if (event.data === "Hello from the client!") {
                console.log("Received greeting from server.");
            }
        }
    };

    // Handle WebSocket errors
    socket.onerror = function (error) {
        console.error("WebSocket error:", error);
    };

    // Handle WebSocket connection close event and attempt reconnection if needed
    socket.onclose = function (event) {
        console.log("WebSocket connection closed:", event);
        // Attempt reconnection if abnormal closure (code 1006 or not clean)
        if (event.code === 1006 || !event.wasClean) {
            console.log("Attempting to reconnect in 1 seconds...");
            setTimeout(connectWebSocket, 1000);
        }
    };
}

document.addEventListener("DOMContentLoaded", () => {
    connectWebSocket();
});
