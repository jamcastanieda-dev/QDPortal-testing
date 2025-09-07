<?php
ob_start();

// output JSON
header('Content-Type: application/json');

// Include database connection
include 'connection.php'; // Adjust path if needed

// Check for POST request
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'Invalid request']);
    exit;
}

// Get POST data
$employee_id = $_POST['employee-id'] ?? '';
$password = $_POST['password'] ?? '';

// Validate input
if (empty($employee_id) || empty($password)) {
    echo json_encode(['success' => false, 'message' => 'Please fill in all fields']);
    exit;
}

try {
    // Verify database connection
    if (!$conn) {
        throw new Exception('Database connection failed: ' . mysqli_connect_error());
    }

    // Prepare SQL query
    $stmt = $conn->prepare("SELECT employee_name, employee_password, employee_privilege FROM system_users WHERE employee_id = ?");
    if (!$stmt) {
        throw new Exception('Prepare statement failed: ' . $conn->error);
    }

    // Bind and execute
    $stmt->bind_param("i", $employee_id);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows === 1) {
        $user = $result->fetch_assoc();
        if ($password == $user['employee_password']) {
            // Set persistent cookies (30 days)
            $cookie_expiry = time() + 60 * 60 * 24 * 30; // 30 days
            $user_data = [
                'name' => $user['employee_name'],
                'privilege' => $user['employee_privilege']
            ];
            setcookie('user', json_encode($user_data), $cookie_expiry, "/", "", false, true);

            // Determine redirection based on privilege
            $redirect = match ($user['employee_privilege']) {
                'Department Head' => 'homepage-dashboard-department-head.php',
                'Initiator' => 'homepage-dashboard-initiator.php',
                'QA-Respondent' => 'homepage-dashboard-qa.php',
                'QA-Head-Inspection' => 'homepage-dashboard-qa-head.php',
                'PPIC-Inspection' => 'homepage-inspection-ppic.php',
                'QMS' => 'homepage-dashboard-qms.php',
                'Manager' => 'homepage-ppic-manager.php',
                'Job-Order Taker' => 'homepage-ppic-job-order-taker.php',
                'PMO Staff' => 'homepage-ppic-pmo-staff.php',
                'Reservation Staff' => 'homepage-ppic-reservation-staff.php',
                'QA Head' => 'homepage-qa-head.php',
                default => 'homepage-dashboard-initiator.php',
            };

            // Send success response
            echo json_encode(['success' => true, 'redirect' => $redirect]);
        } else {
            echo json_encode(['success' => false, 'message' => 'Incorrect password!']);
        }
    } else {
        echo json_encode(['success' => false, 'message' => 'User not found!']);
    }

    // Clean up
    $stmt->close();
    $conn->close();
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => 'Error: ' . $e->getMessage()]);
}

ob_end_flush();
exit;
