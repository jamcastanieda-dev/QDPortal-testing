<?php
require __DIR__ . '/vendor/autoload.php';

use Ratchet\MessageComponentInterface;
use Ratchet\ConnectionInterface;
use Ratchet\Server\IoServer;
use Ratchet\Http\HttpServer;
use Ratchet\WebSocket\WsServer;

class WebSocketServer implements MessageComponentInterface {
    protected $clients;
    protected $userData;

    public function __construct() {
        $this->clients = new \SplObjectStorage;
        $this->userData = [];
        echo "WebSocketServer instance created\n";
    }

    public function onOpen(ConnectionInterface $conn) {
        // Extract user_id from the query string (e.g., ?user_id=123)
        parse_str($conn->httpRequest->getUri()->getQuery(), $queryParams);
        $userId = $queryParams['user_id'] ?? 'Unknown';  // Default to 'Unknown' if no user_id is provided

        // Store user_id associated with the connection resource
        $this->userData[$conn->resourceId] = $userId;
        $this->clients->attach($conn);
        echo "New connection! User ID: {$userId}, Resource ID: {$conn->resourceId}\n";
    }

    public function onMessage(ConnectionInterface $from, $msg) {
        echo "Message received from {$from->resourceId}: $msg\n";

        // Broadcast the message to all clients (or specific users based on user_id)
        foreach ($this->clients as $client) {
            if ($from !== $client) {
                // Send a message to all clients, but the client will filter it based on user_id
                $client->send($msg);
            }
        }
    }

    public function onClose(ConnectionInterface $conn) {
        $userId = $this->userData[$conn->resourceId] ?? 'Unknown';
        echo "Connection {$conn->resourceId} (User: {$userId}) has disconnected\n";
        $this->clients->detach($conn);
        unset($this->userData[$conn->resourceId]);
    }

    public function onError(ConnectionInterface $conn, \Exception $e) {
        echo "An error has occurred: {$e->getMessage()}\n";
        $conn->close();
    }
}

// Start the WebSocket server on port 8082
$server = IoServer::factory(
    new HttpServer(
        new WsServer(
            new WebSocketServer()
        )
    ),
    8082,
    '0.0.0.0' // Bind to all interfaces (accessible from other machines)
);

echo "WebSocket server started on port 8082\n";
$server->run();
