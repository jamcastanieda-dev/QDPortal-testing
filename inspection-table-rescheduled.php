<?php
include 'connection.php';

// Check if the POST variable 'inspection_no' is set
if (isset($_POST['inspection_no'])) {
    $inspectionNo = $_POST['inspection_no'];

    // Prepare the SQL query using a prepared statement to avoid SQL injection.
    $stmt = $conn->prepare("SELECT rescheduled_by, date_time FROM inspection_reschedule WHERE inspection_no = ?");
    $stmt->bind_param("s", $inspectionNo); // bind as string - adjust if needed (e.g., "i" for integer)
    $stmt->execute();

    // Get the result and fetch all rows as an associative array.
    $result = $stmt->get_result();
    $reschedule = array();

    while ($row = $result->fetch_assoc()) {
        $reschedule[] = $row;
    }

    $stmt->close();
    $conn->close();

    // Return JSON response.
    header('Content-Type: application/json');
    echo json_encode($reschedule);
} else {
    // In case 'inspection_no' is not provided.
    header('Content-Type: application/json');
    echo json_encode(["error" => "Missing inspection number"]);
}
?>
