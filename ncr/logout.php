<?php
// Delete the user cookie by setting it with a past expiration date
setcookie('user', '', time() - 3600, '/');

// (Optional) Prevent caching
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Cache-Control: post-check=0, pre-check=0', false);
header('Pragma: no-cache');
header('Expires: Thu, 01 Jan 1970 00:00:00 GMT');

// Redirect to login page
header('Location: ../login.php');
exit;
?>
