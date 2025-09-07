<?php
include 'connection.php';

// Retrieve WBS name and description only
$sql = "SELECT wbs, description FROM wbs_lists";
$result = $conn->query($sql);

$wbsData = [];
if ($result->num_rows > 0) {
  while($row = $result->fetch_assoc()) {
    $wbsData[] = $row;
  }
}

echo json_encode($wbsData);
$conn->close();
?>
