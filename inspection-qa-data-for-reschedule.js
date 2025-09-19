let privilege = null;

document.addEventListener('DOMContentLoaded', function () {

    let inspectionNo = null;

    function fetchInspectionData() {

        document.getElementById('inspection-tbody').addEventListener('click', function (event) {
            if (event.target.classList.contains('view-btn')) {
                const row = event.target.closest('tr');
                inspectionNo = row.querySelector('td:nth-child(1)').textContent.trim();
                fetchInspectionRequest(inspectionNo);

                // Remarks For Schedule
                fetch('inspection-table-remarks.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    body: new URLSearchParams({ inspection_no: inspectionNo })
                })
                    .then(response => response.json())
                    .then(data => {
                        const tbody = document.getElementById('remarks-tbody');
                        tbody.innerHTML = '';
                        document.getElementById('remarks-section').style.display = 'block';

                        // Check if data is an error or has rows returned
                        if (data.error) {
                            console.error('Error:', data.error);
                            tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;">${data.error}</td></tr>`;
                            return;
                        }

                        if (data.length > 0) {
                            // Loop through the returned data and populate the table rows
                            data.forEach(item => {
                                const row = document.createElement('tr');

                                // Create the remarks_by cell
                                const remarksByCell = document.createElement('td');
                                remarksByCell.textContent = item.remarks_by;
                                row.appendChild(remarksByCell);

                                // Create the date_time cell
                                const dateTimeCell = document.createElement('td');
                                dateTimeCell.textContent = item.date_time;
                                row.appendChild(dateTimeCell);

                                // Create the action cell (customize the action content as needed)
                                const actionCell = document.createElement('td');
                                const actionBtn = document.createElement('button');
                                actionBtn.classList.add('remarks-view-btn');
                                actionBtn.textContent = 'View';
                                actionCell.appendChild(actionBtn);
                                row.appendChild(actionCell);

                                tbody.appendChild(row);
                            });
                        } else {
                            document.getElementById('remarks-section').style.display = 'none';
                        }
                    })
                    .catch(error => {
                        console.error('Error fetching data:', error);
                    });

                // Rescheduled Request
                fetch('inspection-table-rescheduled.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    body: new URLSearchParams({ inspection_no: inspectionNo })
                })
                    .then(response => response.json())
                    .then(data => {
                        const tbody = document.getElementById('reschedule-tbody');
                        tbody.innerHTML = '';
                        document.getElementById('reschedule-section').style.display = 'block';

                        // Check if data is an error or has rows returned
                        if (data.error) {
                            console.error('Error:', data.error);
                            tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;">${data.error}</td></tr>`;
                            return;
                        }

                        if (data.length > 0) {
                            // Loop through the returned data and populate the table rows
                            data.forEach(item => {
                                const row = document.createElement('tr');

                                // Create the remarks_by cell
                                const remarksByCell = document.createElement('td');
                                remarksByCell.textContent = item.rescheduled_by;
                                row.appendChild(remarksByCell);

                                // Create the date_time cell
                                const dateTimeCell = document.createElement('td');
                                dateTimeCell.textContent = item.date_time;
                                row.appendChild(dateTimeCell);

                                tbody.appendChild(row);
                            });
                        } else {
                            document.getElementById('reschedule-section').style.display = 'none';
                        }
                    })
                    .catch(error => {
                        console.error('Error fetching data:', error);
                    });

                openModal();
            }
        });

    }

    function fetchInspectionRequest(inspectionNo) {
        const formData = new FormData();
        formData.append('inspection_no', inspectionNo);

        fetch('inspection-request-retrieve-initiator.php', {
            method: 'POST',
            body: formData
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                if (data.status === 'success') {
                    populateInspectionRequest(data.data, inspectionNo);
                    privilege = data.privilege;
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: data.message
                    });
                }
            })
            .catch(error => {
                console.error('Fetch error:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Failed to load inspection data'
                });
            });
    }

    // Fetch data on page load
    fetchInspectionData();
    RetrieveHistory('inspection-tbody');
});
