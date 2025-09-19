<?php
// inspection-get-completed-remarks.php
include 'connection.php'; // Adjust path as needed

$inspection_no = $_POST['inspection_no'];

$stmt = $conn->prepare("SELECT remarks FROM inspection_completed_remarks WHERE inspection_no = ?");
$stmt->bind_param("i", $inspection_no);
$stmt->execute();
$result = $stmt->get_result();

$response = array();
if ($row = $result->fetch_assoc()) {
    $response['remarks'] = $row['remarks'];
} else {
    $response['remarks'] = '';
}
echo json_encode($response);
?>
