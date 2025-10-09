<?php
// rcpa-assign-set.php
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
date_default_timezone_set('Asia/Manila');

if (!isset($_COOKIE['user'])) {
  http_response_code(401);
  echo json_encode(['error' => 'Not logged in']);
  exit;
}
$user = json_decode($_COOKIE['user'], true);
if (!$user || !is_array($user)) {
  http_response_code(401);
  echo json_encode(['error' => 'Invalid user cookie']);
  exit;
}
$current_user = $user;
$user_name = trim((string)($current_user['name'] ?? ''));

require '../../connection.php';
if (!isset($mysqli) || !($mysqli instanceof mysqli)) {
  if (isset($conn) && $conn instanceof mysqli)      $mysqli = $conn;
  elseif (isset($link) && $link instanceof mysqli)  $mysqli = $link;
  else                                              $mysqli = @new mysqli('localhost', 'DB_USER', 'DB_PASS', 'DB_NAME');
}
if (!$mysqli || $mysqli->connect_errno) {
  http_response_code(500);
  echo json_encode(['error' => 'Database connection not available']);
  exit;
}
$mysqli->set_charset('utf8mb4');

$dept = '';
$user_section = '';
$user_role = '';
$user_email = '';
if ($user_name !== '') {
  // Include the caller's email so we can CC them.
  $sql = "SELECT department, section, role, TRIM(email)
            FROM system_users
           WHERE LOWER(TRIM(employee_name)) = LOWER(TRIM(?))
           LIMIT 1";
  if ($st = $mysqli->prepare($sql)) {
    $st->bind_param('s', $user_name);
    $st->execute();
    $st->bind_result($d, $s, $r, $e);
    if ($st->fetch()) {
      $dept         = (string)$d;
      $user_section = (string)$s;
      $user_role    = (string)$r;
      $user_email   = (string)$e;
    }
    $st->close();
  }
}
$role_norm = strtolower(trim($user_role));
$norm = fn($x) => strtolower(trim((string)$x));

$raw = file_get_contents('php://input');
$data = json_decode($raw, true);
if (!is_array($data)) $data = $_POST;
$id = isset($data['id']) ? (int)$data['id'] : 0;
$assignee_name = trim((string)($data['assignee_name'] ?? ''));
if ($id <= 0 || $assignee_name === '') {
  http_response_code(400);
  echo json_encode(['error' => 'Missing id or assignee_name']);
  exit;
}

$sqlRow = "SELECT id, assignee, section FROM rcpa_request WHERE id=? LIMIT 1";
$st = $mysqli->prepare($sqlRow);
$st->bind_param('i', $id);
$st->execute();
$row = $st->get_result()->fetch_assoc();
$st->close();
if (!$row) {
  http_response_code(404);
  echo json_encode(['error' => 'RCPA not found']);
  exit;
}

$rcpa_dept = (string)($row['assignee'] ?? '');
$rcpa_sect = trim((string)($row['section'] ?? ''));

// Authorization checks
if ($role_norm !== 'manager' && $role_norm !== 'supervisor') {
  http_response_code(403);
  echo json_encode(['error' => 'Not allowed']);
  exit;
}
if ($norm($rcpa_dept) !== $norm($dept)) {
  http_response_code(403);
  echo json_encode(['error' => 'Not allowed (department mismatch)']);
  exit;
}
if ($rcpa_sect !== '' && $norm($rcpa_sect) !== $norm($user_section)) {
  http_response_code(403);
  echo json_encode(['error' => 'Not allowed (section mismatch)']);
  exit;
}

// Validate selected assignee belongs to same dept/section
if ($rcpa_sect === '') {
  $sqlChk = "SELECT 1 FROM system_users
              WHERE UPPER(TRIM(employee_name))=UPPER(TRIM(?))
                AND UPPER(TRIM(department))=UPPER(TRIM(?))
                AND (section IS NULL OR TRIM(section)='')
              LIMIT 1";
  $st = $mysqli->prepare($sqlChk);
  $st->bind_param('ss', $assignee_name, $rcpa_dept);
} else {
  $sqlChk = "SELECT 1 FROM system_users
              WHERE UPPER(TRIM(employee_name))=UPPER(TRIM(?))
                AND UPPER(TRIM(department))=UPPER(TRIM(?))
                AND LOWER(TRIM(section))=LOWER(TRIM(?))
              LIMIT 1";
  $st = $mysqli->prepare($sqlChk);
  $st->bind_param('sss', $assignee_name, $rcpa_dept, $rcpa_sect);
}
$st->execute();
$st->store_result();
$valid = $st->num_rows > 0;
$st->close();
if (!$valid) {
  http_response_code(422);
  echo json_encode(['error' => 'Selected employee is not in the same department/section']);
  exit;
}

// Update assignee_name
$sqlUpd = "UPDATE rcpa_request SET assignee_name=? WHERE id=?";
$st = $mysqli->prepare($sqlUpd);
$st->bind_param('si', $assignee_name, $id);
$ok = $st->execute();
$err = $st->error;
$st->close();
if (!$ok) {
  http_response_code(500);
  echo json_encode(['error' => 'Failed to update assignee_name: ' . $err]);
  exit;
}

// ===== EMAIL NOTIFICATION (non-blocking) =====
try {
  require_once __DIR__ . '/../../send-email.php';

  // 1) Get the assigned person's email and normalized dept/section
  $assignee_email = '';
  $assignee_dept = '';
  $assignee_section = '';
  if ($rcpa_sect === '') {
    $sqlAss = "SELECT TRIM(email), TRIM(department), TRIM(COALESCE(section,'')) 
                 FROM system_users
                WHERE UPPER(TRIM(employee_name)) = UPPER(TRIM(?))
                  AND UPPER(TRIM(department))    = UPPER(TRIM(?))
                  AND (section IS NULL OR TRIM(section) = '')
                LIMIT 1";
    if ($stA = $mysqli->prepare($sqlAss)) {
      $stA->bind_param('ss', $assignee_name, $rcpa_dept);
      $stA->execute();
      $stA->bind_result($assignee_email, $assignee_dept, $assignee_section);
      $stA->fetch();
      $stA->close();
    }
  } else {
    $sqlAss = "SELECT TRIM(email), TRIM(department), TRIM(COALESCE(section,'')) 
                 FROM system_users
                WHERE UPPER(TRIM(employee_name)) = UPPER(TRIM(?))
                  AND UPPER(TRIM(department))    = UPPER(TRIM(?))
                  AND LOWER(TRIM(section))       = LOWER(TRIM(?))
                LIMIT 1";
    if ($stA = $mysqli->prepare($sqlAss)) {
      $stA->bind_param('sss', $assignee_name, $rcpa_dept, $rcpa_sect);
      $stA->execute();
      $stA->bind_result($assignee_email, $assignee_dept, $assignee_section);
      $stA->fetch();
      $stA->close();
    }
  }

  // 2) Build recipients
  $assignee_email = strtolower(trim((string)$assignee_email));
  $hasAssigneeTo  = filter_var($assignee_email, FILTER_VALIDATE_EMAIL);

  // CC only the current user (if they have a valid email and it's not the same as assignee)
  $caller_email = strtolower(trim((string)$user_email));
  $ccRecipients = [];
  if (filter_var($caller_email, FILTER_VALIDATE_EMAIL) && $caller_email !== $assignee_email) {
    $ccRecipients = [$caller_email];
  }

  if ($hasAssigneeTo) {
    $toRecipients = [$assignee_email];

    // 3) Compose message
    $safeHeader = function (string $s): string { return preg_replace('/[\r\n]+/', ' ', $s); };
    $deptDisplay = trim($assignee_dept . ($assignee_section !== '' ? ' - ' . $assignee_section : ''));
    $portalUrl   = 'http://rti10517/qdportal/login.php'; // TODO: move to config/env

    $subject = sprintf(
      '%s assigned %s to reply to RCPA #%d',
      $safeHeader($user_name !== '' ? $user_name : 'Supervisor'),
      $safeHeader($assignee_name),
      (int)$id
    );

    // Safe HTML variables
    $rcpaNoSafe    = (int)$id;
    $assignerSafe  = htmlspecialchars($user_name !== '' ? $user_name : 'Supervisor', ENT_QUOTES, 'UTF-8');
    $assigneeSafe  = htmlspecialchars($assignee_name, ENT_QUOTES, 'UTF-8');
    $deptDispSafe  = htmlspecialchars($deptDisplay, ENT_QUOTES, 'UTF-8');
    $portalUrlSafe = htmlspecialchars($portalUrl, ENT_QUOTES, 'UTF-8');

    $htmlBody = '
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>RCPA Assignment</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="margin:0; padding:0; background:#f3f4f6; font-family: Arial, Helvetica, sans-serif; color:#111827;">
  <div style="display:none!important; visibility:hidden; mso-hide:all; font-size:1px; line-height:1px; max-height:0; max-width:0; opacity:0; overflow:hidden;">
    ' . $assignerSafe . ' assigned ' . $assigneeSafe . ' to reply to RCPA #' . $rcpaNoSafe . '
  </div>

  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f3f4f6; padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px; background:#ffffff; border-radius:10px; overflow:hidden; box-shadow:0 1px 3px rgba(0,0,0,.08);">
          <tr>
            <td style="padding:20px 24px; background:#111827; color:#ffffff;">
              <div style="font-size:16px; letter-spacing:.4px;">QD Portal</div>
              <div style="font-size:22px; font-weight:bold; margin-top:4px;">RCPA Assignment</div>
            </td>
          </tr>

          <tr>
            <td style="padding:20px 24px 8px 24px;">
              <div style="font-size:18px; font-weight:bold; color:#111827; margin-bottom:8px;">
                RCPA #' . $rcpaNoSafe . '
              </div>
              <span style="display:inline-block; font-size:12px; font-weight:600; padding:6px 10px; border-radius:999px; background:#ecfdf5; color:#065f46; border:1px solid #a7f3d0;">
                New Assignment
              </span>
            </td>
          </tr>

          <tr>
            <td style="padding:8px 24px 0 24px; color:#374151; font-size:14px; line-height:1.6; mso-line-height-rule:exactly;">
              <p style="margin:0 0 10px 0;"><strong>' . $assignerSafe . '</strong> assigned <strong>' . $assigneeSafe . '</strong> to reply to RCPA <strong>#' . $rcpaNoSafe . '</strong>.</p>
              <p style="margin:0;">Department/Section: <strong>' . $deptDispSafe . '</strong></p>
            </td>
          </tr>

          <tr>
            <td style="padding:20px 24px 8px 24px;" align="left">
              <a href="' . $portalUrlSafe . '" target="_blank"
                 style="background:#2563eb; color:#ffffff; text-decoration:none; padding:12px 18px; border-radius:6px; display:inline-block; font-size:14px; font-weight:600;">
                Open QD Portal
              </a>
            </td>
          </tr>

          <tr>
            <td style="padding:6px 24px 0 24px; color:#6b7280; font-size:12px;">
              If the button doesn\'t work, copy and paste this link into your browser:<br>
              <a href="' . $portalUrlSafe . '" target="_blank" style="color:#2563eb; text-decoration:underline;">' . $portalUrlSafe . '</a>
            </td>
          </tr>

          <tr>
            <td style="padding:24px; color:#9ca3af; font-size:12px;">
              This is an automated message from the QD Portal. Please do not reply to this email.
            </td>
          </tr>
        </table>

        <div style="height:12px; line-height:12px;">&nbsp;</div>
      </td>
    </tr>
  </table>
</body>
</html>';

    $altBody = sprintf(
      "%s assigned %s to reply to RCPA #%d\nDepartment/Section: %s\nOpen QD Portal: %s\n",
      ($user_name !== '' ? $user_name : 'Supervisor'),
      $assignee_name,
      (int)$id,
      $deptDisplay,
      $portalUrl
    );

    // SEND: To = assignee; CC = current user (only)
    sendEmailNotification($toRecipients, $subject, $htmlBody, $altBody, $ccRecipients);
  } else {
    // No valid assignee email; skip sending (or implement a fallback here)
    error_log('RCPA assign email skipped: no valid email for assigned user "' . $assignee_name . '" (id ' . (int)$id . ')');
  }
} catch (Throwable $mailErr) {
  error_log('Assignee email notify error (id ' . (int)$id . '): ' . $mailErr->getMessage());
}
// ===== END EMAIL NOTIFICATION =====

echo json_encode(['ok' => true], JSON_UNESCAPED_UNICODE);
