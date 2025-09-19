let socket;
const WS_URL = "ws://172.31.11.252:8082?user_id=123";

function connectWebSocket() {
    socket = new WebSocket(WS_URL);

    // Handle WebSocket connection open event
    socket.onopen = function (event) {
        console.log("Connected to WebSocket server");
        socket.send("Hello from the client!");
    };

    // Handle incoming WebSocket messages
    socket.onmessage = function (event) {
        console.log("Message received from WebSocket server:", event.data);

        // Attempt to parse the message as JSON
        try {
            const message = JSON.parse(event.data);

            // If the message action is 'update', reload circuit options and fetch circuits
            if (message.action === 'change' || message.action == 'approved' || message.action == 'rescheduled') {
                fetch('inspection-table.php')
                    .then(response => response.text()) // Expect HTML as response
                    .then(data => {
                        let inspectionTable = document.getElementById('inspection-tbody');
                        inspectionTable.innerHTML = data;
                        setupPagination(inspectionTable);
                    });
            }
        } catch (error) {
            // If parsing fails, handle the message as plain text
            console.log("Received plain text message:", event.data);
            if (event.data === "Hello from the client!") {
                console.log("Received greeting from server.");
            }
        }
    };

    // Handle WebSocket errors
    socket.onerror = function (error) {
        console.error("WebSocket error:", error);
    };

    // Handle WebSocket connection close event and attempt reconnection if needed
    socket.onclose = function (event) {
        console.log("WebSocket connection closed:", event);
        // Attempt reconnection if abnormal closure (code 1006 or not clean)
        if (event.code === 1006 || !event.wasClean) {
            console.log("Attempting to reconnect in 1 seconds...");
            setTimeout(connectWebSocket, 1000);
        }
    };
}

document.addEventListener("DOMContentLoaded", () => {
    connectWebSocket();
});

let inspectionNo = null;
let requestStatus = null;
let privilege = null;

document.addEventListener('DOMContentLoaded', function () {

    function fetchInspectionData() {
        fetch('inspection-table-ppic.php')
            .then(response => response.text()) // Expect HTML as response
            .then(data => {
                let inspectionTable = document.getElementById('inspection-tbody');
                inspectionTable.innerHTML = data;
                setupPagination(inspectionTable);
            });

        document.getElementById('inspection-tbody').addEventListener('click', function (event) {
            if (event.target.classList.contains('view-btn')) {
                const row = event.target.closest('tr');
                inspectionNo = row.querySelector('td:nth-child(1)').textContent.trim();
                requestStatus = row.querySelector('td:nth-child(6)').textContent.trim();
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

                    if (data.data.status == 'COMPLETED' || data.data.status == 'PASSED') {
                        document.getElementById('inspection-completed-attachments').style.display = 'block';
                        document.getElementById('inspection-rejected-attachments').style.display = 'none';
                        fetchInspectionCompletedAttachments(inspectionNo);
                    } else if (data.data.status == 'FAILED' && data.data.approval == 'FAILED') {
                        document.getElementById('inspection-completed-attachments').style.display = 'none';
                        document.getElementById('inspection-rejected-attachments').style.display = 'block';
                        fetchInspectionRejectedAttachments(inspectionNo);
                    } else {
                        document.getElementById('inspection-completed-attachments').style.display = 'none';
                        document.getElementById('inspection-rejected-attachments').style.display = 'none';
                    }
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