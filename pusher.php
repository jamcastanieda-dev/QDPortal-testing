<?php
require __DIR__ . '/vendor/autoload.php';

// load .env
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__);
$dotenv->load();

$pusher = new Pusher\Pusher(
    $_ENV['PUSHER_KEY'],
    $_ENV['PUSHER_SECRET'],
    $_ENV['PUSHER_APP_ID'],
    [
        'cluster' => $_ENV['PUSHER_CLUSTER'],
        'useTLS'  => true,
    ]
);
