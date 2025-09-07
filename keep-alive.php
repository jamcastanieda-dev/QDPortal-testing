<?php
// --- KEEPALIVE ENDPOINT ---
if (isset($_GET['keepalive'])) {
    // Just touch the session and respond
    echo 'alive';
    exit;
}
?>