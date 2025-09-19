function NotificationPopUp(phpFile, notificationIcon) {
    fetch(phpFile)
        .then(res => {
            if (!res.ok) throw new Error('Network response was not OK');
            return res.json();
        })
        .then(data => {
            const badge = document.getElementById(notificationIcon);
            if (data.count > 0) {
                badge.style.display = 'block';
                badge.innerHTML = ''; // Clear first
                badge.textContent = data.count;

                // Remove the animation
                badge.style.animation = 'none';

                // Force reflow to reset the animation
                badge.offsetHeight; // This triggers reflow

                // Reapply the animation
                badge.style.animation = 'notif 5s ease-in-out';
                console.log(data.count);
            } else {
                badge.style.display = 'none';
            }
        })

}

function CallNotification() {
    NotificationPopUp('inspection-notification-received.php', 'notification-received');
    NotificationPopUp('inspection-notification-pending.php', 'notification-pending');
    NotificationPopUp('inspection-notification-for-reschedule.php', 'notification-for-reschedule');
    NotificationPopUp('inspection-notification-rescheduled.php', 'notification-rescheduled');
    NotificationPopUp('inspection-notification-rejected.php', 'notification-rejected');
    NotificationPopUp('inspection-notification-cancelled.php', 'notification-cancelled');
    NotificationPopUp('inspection-notification-failed.php', 'notification-failed');
    NotificationPopUp('inspection-notification-completed.php', 'notification-completed');
    NotificationPopUp('inspection-notification-for-approval.php', 'notification-for-approval');
    NotificationPopUp('inspection-notification-for-completion.php', 'notification-for-completion');
    NotificationPopUp('inspection-notification-for-rescheduling.php', 'notification-for-rescheduling');
    NotificationPopUp('inspection-notification-for-failure.php', 'notification-for-failure');
}

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
            if (message.action === 'change' || message.action === 'request' || message.action == 'approved' || message.action == 'rescheduled' || message.action == 'approval') {
                const notification = document.getElementById('notification-sound');
                notification.play().catch(err => {
                    console.error('Playback failed:', err);
                });
                CallNotification();
            } else if (message.action == 'viewed') {
                CallNotification();
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

document.addEventListener('DOMContentLoaded', CallNotification);
