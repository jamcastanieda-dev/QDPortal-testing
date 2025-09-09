<?php
// ../../send-email.php
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require __DIR__ . '/vendor/autoload.php';

function sendEmailNotification($toRecipients, $subject, $htmlBody, $altBody = '', $ccRecipients = []) {
    $results = [
        'success' => [],
        'failed' => []
    ];

    $toRecipients = is_array($toRecipients) ? $toRecipients : [$toRecipients];
    $ccRecipients = is_array($ccRecipients) ? $ccRecipients : [$ccRecipients];

    if (empty($toRecipients)) {
        return $results;
    }

    $mail = new PHPMailer(true);

    try {
        $mail->isSMTP();
        $mail->Host       = 'smtp.office365.com';
        $mail->SMTPAuth   = true;
        $mail->Username   = 'pid.ojt@motolite.com';
        $mail->Password   = 'kdskszlnwxkdxggh';
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Port       = 587;

        $mail->setFrom('pid.ojt@motolite.com', 'QD Portal');

        foreach ($toRecipients as $email) {
            $mail->addAddress($email);
        }

        foreach ($ccRecipients as $ccEmail) {
            $mail->addCC($ccEmail);
        }

        $mail->isHTML(true);
        $mail->Subject = $subject;
        $mail->Body    = $htmlBody;
        $mail->AltBody = $altBody ?: strip_tags($htmlBody);
        $mail->SMTPDebug = 4;
        $mail->Debugoutput = 'error_log';

        $mail->send();
        $results['success'] = array_merge($toRecipients, $ccRecipients);
    } catch (Exception $e) {
        error_log("Email failed: {$mail->ErrorInfo}");
        $results['failed'] = array_merge($toRecipients, $ccRecipients);
    }

    return $results;
}
