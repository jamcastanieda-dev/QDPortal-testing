function WebSocketConnection(functionParameter) {
    console.log('good');
    let socket;
    const WS_URL = "ws://172.31.11.252:8081?user_id=123";

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
                if (message.action === 'update') {
                    functionParameter();
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
}