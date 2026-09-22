<?php
/**
 * IHA Restaurant - Core PHP Google SMTP Mail Sender
 * 
 * Handles form submissions for Table Reservations & Private Events using Google SMTP.
 * Pure Core PHP implementation (No composer packages or third-party email services required).
 */

// Set response header to JSON
header('Content-Type: application/json; charset=utf-8');

// Enable CORS if needed (optional)
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Ensure request is POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode([
        'success' => false,
        'message' => 'Invalid request method. Only POST requests are allowed.'
    ]);
    exit;
}

// -----------------------------------------------------------------------------
// GOOGLE SMTP CONFIGURATION
// -----------------------------------------------------------------------------
// 1. Authenticated Google SMTP sender account
define('GMAIL_USER', 'support.iharestaurant@gmail.com');

// 2. 16-character Google App Password for the sender account
define('GMAIL_APP_PASS', 'gcabbrgqwhtmgwhz');

// 3. Email address where you receive all reservation & celebration notifications
define('RECIPIENT_EMAIL', 'support.iharestaurant@gmail.com');

// 4. Restaurant / Brand Name
define('BRAND_NAME', 'IHA Restaurant');

// -----------------------------------------------------------------------------
// CORE PHP SMTP SOCKET FUNCTION (Pure PHP - Google SMTP Port 587 STARTTLS)
// -----------------------------------------------------------------------------
function sendGoogleSmtpMail($to, $subject, $bodyHtml, $replyToEmail, $smtpUser, $smtpPass) {
    $host = 'smtp.gmail.com';
    $port = 587;
    $timeout = 15;

    // Open stream socket connection
    $socket = @stream_socket_client("tcp://$host:$port", $errno, $errstr, $timeout);
    if (!$socket) {
        throw new Exception("Could not connect to Gmail SMTP server: $errstr ($errno)");
    }

    // Helper to read SMTP responses
    $readResponse = function($socket, $expectedCode) {
        $response = '';
        while ($line = fgets($socket, 515)) {
            $response .= $line;
            if (substr($line, 3, 1) === ' ') break;
        }
        $code = substr($response, 0, 3);
        if ($code != $expectedCode) {
            throw new Exception("SMTP Error [$code]: " . trim($response));
        }
        return $response;
    };

    // Helper to send SMTP commands
    $sendCommand = function($socket, $command) {
        fputs($socket, $command . "\r\n");
    };

    try {
        // 1. Server greeting
        $readResponse($socket, '220');

        // 2. EHLO handshake
        $hostname = isset($_SERVER['HTTP_HOST']) ? $_SERVER['HTTP_HOST'] : 'localhost';
        $sendCommand($socket, "EHLO $hostname");
        $readResponse($socket, '250');

        // 3. STARTTLS command
        $sendCommand($socket, 'STARTTLS');
        $readResponse($socket, '220');

        // 4. Enable TLS encryption
        $crypto = stream_socket_enable_crypto(
            $socket, 
            true, 
            STREAM_CRYPTO_METHOD_TLSv1_2_CLIENT | STREAM_CRYPTO_METHOD_TLSv1_3_CLIENT
        );
        if (!$crypto) {
            // Fallback for broader TLS client methods
            $crypto = stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT);
            if (!$crypto) {
                throw new Exception("Failed to initiate TLS encryption with Gmail SMTP.");
            }
        }

        // 5. Re-send EHLO after TLS established
        $sendCommand($socket, "EHLO $hostname");
        $readResponse($socket, '250');

        // 6. Authenticate via AUTH LOGIN
        $sendCommand($socket, 'AUTH LOGIN');
        $readResponse($socket, '334');

        $sendCommand($socket, base64_encode($smtpUser));
        $readResponse($socket, '334');

        $sendCommand($socket, base64_encode($smtpPass));
        $readResponse($socket, '235');

        // 7. MAIL FROM
        $sendCommand($socket, "MAIL FROM: <$smtpUser>");
        $readResponse($socket, '250');

        // 8. RCPT TO
        $sendCommand($socket, "RCPT TO: <$to>");
        $readResponse($socket, '250');

        // 9. DATA
        $sendCommand($socket, 'DATA');
        $readResponse($socket, '354');

        // Prepare Headers & Message Body
        $replyTo = !empty($replyToEmail) ? filter_var($replyToEmail, FILTER_VALIDATE_EMAIL) : $smtpUser;
        if (!$replyTo) $replyTo = $smtpUser;

        $dateHeader = date('r');
        $msgId = '<' . time() . '.' . bin2hex(random_bytes(8)) . '@gmail.com>';

        $logoPath = __DIR__ . '/assets/images/logo.png';
        if (file_exists($logoPath)) {
            $boundary = '----=_NextPart_' . md5(time() . rand());
            $logoContent = base64_encode(file_get_contents($logoPath));

            $headers  = "Date: $dateHeader\r\n";
            $headers .= "Message-ID: $msgId\r\n";
            $headers .= "MIME-Version: 1.0\r\n";
            $headers .= "Content-Type: multipart/related; boundary=\"$boundary\"\r\n";
            $headers .= "From: " . BRAND_NAME . " <$smtpUser>\r\n";
            $headers .= "Reply-To: $replyTo\r\n";
            $headers .= "To: <$to>\r\n";
            $headers .= "Subject: =?UTF-8?B?" . base64_encode($subject) . "?=\r\n";
            $headers .= "X-Mailer: Core PHP Google SMTP\r\n";
            $headers .= "Auto-Submitted: auto-generated\r\n";

            $mimeMessage  = "--$boundary\r\n";
            $mimeMessage .= "Content-Type: text/html; charset=UTF-8\r\n";
            $mimeMessage .= "Content-Transfer-Encoding: 8bit\r\n\r\n";
            $mimeMessage .= $bodyHtml . "\r\n\r\n";

            $mimeMessage .= "--$boundary\r\n";
            $mimeMessage .= "Content-Type: image/png; name=\"logo.png\"\r\n";
            $mimeMessage .= "Content-Transfer-Encoding: base64\r\n";
            $mimeMessage .= "Content-ID: <iha_logo>\r\n";
            $mimeMessage .= "Content-Disposition: inline; filename=\"logo.png\"\r\n\r\n";
            $mimeMessage .= chunk_split($logoContent) . "\r\n";
            $mimeMessage .= "--$boundary--";

            $fullMessage = $headers . "\r\n" . $mimeMessage . "\r\n.";
        } else {
            // Escape dot-stuffing for raw SMTP message lines
            $escapedBody = str_replace("\r\n.", "\r\n..", $bodyHtml);

            $headers  = "Date: $dateHeader\r\n";
            $headers .= "Message-ID: $msgId\r\n";
            $headers .= "MIME-Version: 1.0\r\n";
            $headers .= "Content-Type: text/html; charset=UTF-8\r\n";
            $headers .= "From: " . BRAND_NAME . " <$smtpUser>\r\n";
            $headers .= "Reply-To: $replyTo\r\n";
            $headers .= "To: <$to>\r\n";
            $headers .= "Subject: =?UTF-8?B?" . base64_encode($subject) . "?=\r\n";
            $headers .= "X-Mailer: Core PHP Google SMTP\r\n";
            $headers .= "Auto-Submitted: auto-generated\r\n";

            $fullMessage = $headers . "\r\n" . $escapedBody . "\r\n.";
        }

        $sendCommand($socket, $fullMessage);
        $readResponse($socket, '250');

        // 10. QUIT
        $sendCommand($socket, 'QUIT');
        fclose($socket);

        return true;
    } catch (Exception $e) {
        if (is_resource($socket)) {
            fclose($socket);
        }
        throw $e;
    }
}

// -----------------------------------------------------------------------------
// PROCESS FORM INPUTS
// -----------------------------------------------------------------------------
// Read JSON or FormData inputs
$inputData = [];
if (!empty($_POST)) {
    $inputData = $_POST;
} else {
    $rawInput = file_get_contents('php://input');
    if (!empty($rawInput)) {
        $jsonDecoded = json_decode($rawInput, true);
        if (is_array($jsonDecoded)) {
            $inputData = $jsonDecoded;
        }
    }
}

// Extract form type and field values
$formType = isset($inputData['form_type']) ? trim($inputData['form_type']) : 'reservation';
$name = isset($inputData['name']) ? htmlspecialchars(trim($inputData['name'])) : '';
$phone = isset($inputData['phone']) ? htmlspecialchars(trim($inputData['phone'])) : '';
$email = isset($inputData['email']) ? htmlspecialchars(trim($inputData['email'])) : '';
$date = isset($inputData['date']) ? htmlspecialchars(trim($inputData['date'])) : '';
$time = isset($inputData['time']) ? htmlspecialchars(trim($inputData['time'])) : '';
$table = isset($inputData['table']) ? htmlspecialchars(trim($inputData['table'])) : (isset($inputData['guests']) ? htmlspecialchars(trim($inputData['guests'])) : '');
$specialRequest = isset($inputData['special_request']) ? htmlspecialchars(trim($inputData['special_request'])) : '';
$eventType = isset($inputData['event_type']) ? htmlspecialchars(trim($inputData['event_type'])) : (isset($inputData['occasion']) ? htmlspecialchars(trim($inputData['occasion'])) : '');
$details = isset($inputData['details']) ? htmlspecialchars(trim($inputData['details'])) : '';

// Quick Validation
if (empty($name) || empty($phone)) {
    echo json_encode([
        'success' => false,
        'message' => 'Please fill in all required fields (Name and Phone).'
    ]);
    exit;
}

// Validate reservation date to prevent past dates
if (!empty($date) && strtotime($date) < strtotime(date('Y-m-d'))) {
    echo json_encode([
        'success' => false,
        'message' => 'Reservation date cannot be in the past. Please select today or a future date.'
    ]);
    exit;
}

// Check configuration credentials
if (GMAIL_USER === 'your-gmail-address@gmail.com' || GMAIL_APP_PASS === 'your-16-digit-app-password') {
    echo json_encode([
        'success' => false,
        'message' => 'SMTP credentials not configured in send_mail.php yet. Please update GMAIL_USER and GMAIL_APP_PASS.'
    ]);
    exit;
}

// -----------------------------------------------------------------------------
// BUILD ELEGANT HTML EMAIL TEMPLATE
// -----------------------------------------------------------------------------
if ($formType === 'celebration') {
    $occasion = !empty($eventType) ? $eventType : 'Birthday / Anniversary Celebration';
    $emoji = (stripos($occasion, 'Birthday') !== false) ? '🎂' : '💍';
    $subject = "$emoji New $occasion Reservation from $name";
    $title = "New $occasion Reservation";
    $cakeRequests = !empty($details) ? $details : (!empty($specialRequest) ? $specialRequest : 'None');
    $fieldsHtml = "
        <tr>
            <td style='padding: 10px; font-weight: bold; color: #d4af37; border-bottom: 1px solid #233d26;'>Occasion:</td>
            <td style='padding: 10px; color: #ffffff; font-weight: bold; font-size: 15px; border-bottom: 1px solid #233d26;'>$occasion</td>
        </tr>
        <tr>
            <td style='padding: 10px; font-weight: bold; color: #d4af37; border-bottom: 1px solid #233d26;'>Guest Name:</td>
            <td style='padding: 10px; color: #ffffff; border-bottom: 1px solid #233d26;'>$name</td>
        </tr>
        <tr>
            <td style='padding: 10px; font-weight: bold; color: #d4af37; border-bottom: 1px solid #233d26;'>Phone Number:</td>
            <td style='padding: 10px; color: #ffffff; border-bottom: 1px solid #233d26;'><a href='tel:$phone' style='color: #8ed69d; text-decoration: none;'>$phone</a></td>
        </tr>
        <tr>
            <td style='padding: 10px; font-weight: bold; color: #d4af37; border-bottom: 1px solid #233d26;'>Celebration Date & Time:</td>
            <td style='padding: 10px; color: #ffffff; border-bottom: 1px solid #233d26;'>" . (!empty($time) ? "$date at $time" : $date) . "</td>
        </tr>
        <tr>
            <td style='padding: 10px; font-weight: bold; color: #d4af37; border-bottom: 1px solid #233d26;'>Selected Table / Area:</td>
            <td style='padding: 10px; color: #ffffff; border-bottom: 1px solid #233d26;'>" . (!empty($table) ? $table : 'Open Seating') . "</td>
        </tr>
        <tr>
            <td style='padding: 10px; font-weight: bold; color: #d4af37; border-bottom: 1px solid #233d26;'>Cake & Special Requests:</td>
            <td style='padding: 10px; color: #ffffff; border-bottom: 1px solid #233d26;'>" . nl2br($cakeRequests) . "</td>
        </tr>
    ";
} elseif ($formType === 'event') {
    $subject = "🎉 New Event Inquiry from " . $name;
    $title = "New Private Event Inquiry";
    $fieldsHtml = "
        <tr>
            <td style='padding: 10px; font-weight: bold; color: #d4af37; border-bottom: 1px solid #233d26;'>Guest Name:</td>
            <td style='padding: 10px; color: #ffffff; border-bottom: 1px solid #233d26;'>$name</td>
        </tr>
        <tr>
            <td style='padding: 10px; font-weight: bold; color: #d4af37; border-bottom: 1px solid #233d26;'>Phone Number:</td>
            <td style='padding: 10px; color: #ffffff; border-bottom: 1px solid #233d26;'><a href='tel:$phone' style='color: #8ed69d; text-decoration: none;'>$phone</a></td>
        </tr>
        <tr>
            <td style='padding: 10px; font-weight: bold; color: #d4af37; border-bottom: 1px solid #233d26;'>Event Date:</td>
            <td style='padding: 10px; color: #ffffff; border-bottom: 1px solid #233d26;'>" . (!empty($date) ? $date : 'N/A') . "</td>
        </tr>
        <tr>
            <td style='padding: 10px; font-weight: bold; color: #d4af37; border-bottom: 1px solid #233d26;'>Event Type:</td>
            <td style='padding: 10px; color: #ffffff; border-bottom: 1px solid #233d26;'>$eventType</td>
        </tr>
        <tr>
            <td style='padding: 10px; font-weight: bold; color: #d4af37; border-bottom: 1px solid #233d26;'>Event Details:</td>
            <td style='padding: 10px; color: #ffffff; border-bottom: 1px solid #233d26;'>" . (!empty($details) ? nl2br($details) : 'N/A') . "</td>
        </tr>
    ";
} else {
    $subject = "🍽️ New Table Reservation from " . $name;
    $title = "New Table Reservation Request";
    $fieldsHtml = "
        <tr>
            <td style='padding: 10px; font-weight: bold; color: #d4af37; border-bottom: 1px solid #233d26;'>Guest Name:</td>
            <td style='padding: 10px; color: #ffffff; border-bottom: 1px solid #233d26;'>$name</td>
        </tr>
        <tr>
            <td style='padding: 10px; font-weight: bold; color: #d4af37; border-bottom: 1px solid #233d26;'>Phone Number:</td>
            <td style='padding: 10px; color: #ffffff; border-bottom: 1px solid #233d26;'><a href='tel:$phone' style='color: #8ed69d; text-decoration: none;'>$phone</a></td>
        </tr>
        <tr>
            <td style='padding: 10px; font-weight: bold; color: #d4af37; border-bottom: 1px solid #233d26;'>Email Address:</td>
            <td style='padding: 10px; color: #ffffff; border-bottom: 1px solid #233d26;'><a href='mailto:$email' style='color: #8ed69d; text-decoration: none;'>$email</a></td>
        </tr>
        <tr>
            <td style='padding: 10px; font-weight: bold; color: #d4af37; border-bottom: 1px solid #233d26;'>Date & Time:</td>
            <td style='padding: 10px; color: #ffffff; border-bottom: 1px solid #233d26;'>$date at $time</td>
        </tr>
        <tr>
            <td style='padding: 10px; font-weight: bold; color: #d4af37; border-bottom: 1px solid #233d26;'>Booked Table:</td>
            <td style='padding: 10px; color: #ffffff; border-bottom: 1px solid #233d26;'>$table</td>
        </tr>
        <tr>
            <td style='padding: 10px; font-weight: bold; color: #d4af37; border-bottom: 1px solid #233d26;'>Special Request:</td>
            <td style='padding: 10px; color: #ffffff; border-bottom: 1px solid #233d26;'>" . (!empty($specialRequest) ? nl2br($specialRequest) : 'None') . "</td>
        </tr>
    ";
}

$submissionTime = date('F j, Y, g:i a');

$emailBody = "
<!DOCTYPE html>
<html>
<head>
    <meta charset='utf-8'>
    <title>$subject</title>
</head>
<body style='margin: 0; padding: 0; background-color: #0b150c; font-family: -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, Helvetica, Arial, sans-serif;'>
    <table width='100%' cellpadding='0' cellspacing='0' style='background-color: #0b150c; padding: 30px 10px;'>
        <tr>
            <td align='center'>
                <table width='600' cellpadding='0' cellspacing='0' style='background-color: #122315; border: 1px solid #233d26; border-radius: 8px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5);'>
                    <!-- Header with High-Res Logo -->
                    <tr>
                        <td align='center' style='padding: 28px 30px; background-color: #0c1a0e; border-bottom: 2px solid #d4af37;'>
                            <img src='cid:iha_logo' alt='IHA Restaurant' style='height: 65px; max-width: 230px; width: auto; display: block; margin: 0 auto 10px auto; border: 0;' />
                            <p style='margin: 0; color: #a0c2a5; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; font-weight: 600;'>Where Nature Meets Taste</p>
                        </td>
                    </tr>
                    <!-- Title -->
                    <tr>
                        <td style='padding: 25px 30px 10px 30px;'>
                            <h2 style='margin: 0; color: #ffffff; font-size: 20px; font-weight: 500;'>$title</h2>
                            <p style='margin: 5px 0 20px 0; color: #889e8b; font-size: 13px;'>Received on $submissionTime</p>
                        </td>
                    </tr>
                    <!-- Details Table -->
                    <tr>
                        <td style='padding: 0 30px 30px 30px;'>
                            <table width='100%' cellpadding='0' cellspacing='0' style='border-collapse: collapse;'>
                                $fieldsHtml
                            </table>
                        </td>
                    </tr>
                    <!-- Footer -->
                    <tr>
                        <td align='center' style='padding: 20px; background-color: #0c1a0e; border-top: 1px solid #233d26; color: #6d8570; font-size: 12px;'>
                            Sent automatically from <strong>IHA Restaurant Website</strong> via Google SMTP.
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
";

// -----------------------------------------------------------------------------
// TRANSMIT EMAIL VIA GOOGLE SMTP
// -----------------------------------------------------------------------------
try {
    sendGoogleSmtpMail(
        RECIPIENT_EMAIL,
        $subject,
        $emailBody,
        $email,
        GMAIL_USER,
        GMAIL_APP_PASS
    );

    $successMsg = ($formType === 'celebration')
        ? 'Celebration reservation submitted! Our team will contact you shortly to plan your special occasion.'
        : (($formType === 'event')
            ? 'Event inquiry received! Our event manager will be in touch.'
            : 'Table reservation submitted! Our team will contact you shortly.');

    echo json_encode([
        'success' => true,
        'message' => $successMsg
    ]);
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Failed to send email via Google SMTP: ' . $e->getMessage()
    ]);
}
