document.addEventListener("DOMContentLoaded", function () {
    const employeeName = "<?= $current_user['name']; ?>"; // Set dynamically from PHP
    fetchDepartment(employeeName);
});

function fetchDepartment(employeeName) {
    fetch(`retrieve-user-department.php?employee_name=${encodeURIComponent(employeeName)}`)
        .then(response => response.json())
        .then(data => {
            if (data.status === "success") {
                document.getElementById("initiator_dept").value = data.department;
            } else {
                Swal.fire({
                    icon: "error",
                    title: "Error",
                    text: data.message
                });
            }
        })
        .catch(error => {
            Swal.fire({
                icon: "error",
                title: "Fetch Error",
                text: "Failed to fetch department. Please try again."
            });
        });
}
