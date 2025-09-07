function InspectionRequestDashboard() {
    // Count the number of inspection request
    fetch('inspection-count-request.php')
        .then(response => response.json())
        .then(data => {
            if (data.status == 'success') {
                document.getElementById('total-request').textContent = data.count;
            }
        })
        .catch(error => {
            console.error('Error fetching data:', error);
        });

    // Count the number of RTI request
    fetch('inspection-count-company-rti.php')
        .then(response => response.json())
        .then(data => {
            if (data.status == 'success') {
                document.getElementById('rti-request').textContent = data.count;
            }
        })
        .catch(error => {
            console.error('Error fetching data:', error);
        });

    // Count the number of SSD request
    fetch('inspection-count-company-ssd.php')
        .then(response => response.json())
        .then(data => {
            if (data.status == 'success') {
                document.getElementById('ssd-request').textContent = data.count;
            }
        })
        .catch(error => {
            console.error('Error fetching data:', error);
        });

    // Count the number of received
    fetch('inspection-count-received.php')
        .then(response => response.json())
        .then(data => {
            document.getElementById('count-received').textContent = data.count;
        })
        .catch(error => {
            console.error('Error fetching data:', error);
        });

    // Count the number of pending
    fetch('inspection-count-pending.php')
        .then(response => response.json())
        .then(data => {
            document.getElementById('count-pending').textContent = data.count;
        })
        .catch(error => {
            console.error('Error fetching data:', error);
        });

    // Count the number of completed
    fetch('inspection-count-completed.php')
        .then(response => response.json())
        .then(data => {
            document.getElementById('count-completed').textContent = data.count;
        })
        .catch(error => {
            console.error('Error fetching data:', error);
        });

    // Count the number of rescheduled
    fetch('inspection-notification-for-reschedule.php')
        .then(response => response.json())
        .then(data => {
            document.getElementById('count-for-reschedule').textContent = data.count;
        })
        .catch(error => {
            console.error('Error fetching data:', error);
        });

    // Count the number of for rescheduled
    fetch('inspection-notification-rescheduled.php')
        .then(response => response.json())
        .then(data => {
            document.getElementById('count-rescheduled').textContent = data.count;
        })
        .catch(error => {
            console.error('Error fetching data:', error);
        });

    // Count the number of rejected
    fetch('inspection-notification-rejected.php')
        .then(response => response.json())
        .then(data => {
            document.getElementById('count-rejected').textContent = data.count;
        })
        .catch(error => {
            console.error('Error fetching data:', error);
        });

    // Count the number of cancelled
    fetch('inspection-notification-cancelled.php')
        .then(response => response.json())
        .then(data => {
            document.getElementById('count-cancelled').textContent = data.count;
        })
        .catch(error => {
            console.error('Error fetching data:', error);
        });

    // Count the number of failed
    fetch('inspection-notification-failed.php')
        .then(response => response.json())
        .then(data => {
            document.getElementById('count-failed').textContent = data.count;
        })
        .catch(error => {
            console.error('Error fetching data:', error);
        });

    async function TypeOfRequestChart() {
        // fire off all 5 fetches in parallel
        const [
            { count: finalSubAssembly },
            { count: incomingOutgoing },
            { count: materialAnalysis },
            { count: dimensional },
            { count: calibration }
        ] = await Promise.all([
            fetch('inspection-count-final-sub.php').then(r => r.json()),
            fetch('inspection-count-incoming-outgoing.php').then(r => r.json()),
            fetch('inspection-count-material-analysis.php').then(r => r.json()),
            fetch('inspection-count-dimensional.php').then(r => r.json()),
            fetch('inspection-count-calibration.php').then(r => r.json()),
        ]);

        // build your options once you have all the data
        const options = {
            series: [
                finalSubAssembly,
                incomingOutgoing,
                materialAnalysis,
                dimensional,
                calibration
            ],
            chart: {
                width: 380,
                type: 'pie',
            },
            labels: [
                'Final & Sub-Assembly',
                'Incoming & Outgoing',
                'Material Analysis',
                'Dimensional',
                'Calibration'
            ],
            responsive: [{
                breakpoint: 480,
                options: {
                    chart: { width: 200 },
                    legend: { position: 'bottom' }
                }
            }]
        };

        // render it
        const chart = new ApexCharts(
            document.getElementById("request-chart"),
            options
        );
        chart.render();
    }

    // call it
    TypeOfRequestChart();

    // 1) Define your endpoints and their matching series names:
    const endpoints = [
        { name: 'Final & Sub-Assembly', url: 'inspection-count-week-final-sub.php' },
        { name: 'Incoming & Outgoing', url: 'inspection-count-week-incoming-outgoing.php' },
        { name: 'Material Analysis', url: 'inspection-count-week-material-analysis.php' },
        { name: 'Dimensional', url: 'inspection-count-week-dimensional.php' },
        { name: 'Calibration', url: 'inspection-count-week-calibration.php' }
    ];

    // 2) Fire off all fetches in parallel:
    const fetches = endpoints.map(ep =>
        fetch(ep.url)
            .then(res => {
                if (!res.ok) throw new Error(`HTTP ${res.status} on ${ep.url}`);
                return res.json();
            })
            .then(json => {
                if (json.status !== 'success') {
                    throw new Error(`API error on ${ep.url}: ${json.message || 'unknown'}`);
                }
                // Expecting json.counts to have monday…sunday
                return {
                    name: ep.name,
                    // Order: Monday → Sunday
                    data: [
                        json.counts.monday,
                        json.counts.tuesday,
                        json.counts.wednesday,
                        json.counts.thursday,
                        json.counts.friday,
                        json.counts.saturday,
                        json.counts.sunday
                    ]
                };
            })
    );

    Promise.all(fetches)
        .then(seriesData => {
            // 3) Build your chart options with the fetched series
            const options = {
                series: seriesData,
                chart: {
                    type: 'bar',
                    height: 320,
                    toolbar: {
                        show: false
                    }
                },
                plotOptions: {
                    bar: {
                        horizontal: false,
                        columnWidth: '55%',
                        borderRadius: 5,
                        borderRadiusApplication: 'end'
                    }
                },
                dataLabels: { enabled: false },
                stroke: { show: true, width: 2, colors: ['transparent'] },
                xaxis: {
                    categories: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
                },
                yaxis: { title: { text: 'Requests' } },
                fill: { opacity: 1 },
                tooltip: {
                    y: { formatter: val => `Requests: ${val}` }
                }
            };

            // 4) Render chart
            const chart = new ApexCharts(document.getElementById('column-chart'), options);
            chart.render();
        })
        .catch(err => {
            console.error('Error loading weekly inspection counts:', err);
            // You could show an error message in the UI here…
        });
}

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
            if (message.action === 'change' || message.action == 'approved' || message.action == 'rescheduled' || message.action == 'request' || message.action == 'approval') {
                InspectionRequestDashboard();
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

document.addEventListener('DOMContentLoaded', () => {
    InspectionRequestDashboard();
    connectWebSocket();
});

var modal = document.getElementById('inspection-modal');
var closeModalBtn = document.getElementsByClassName('dashboard-close-btn')[0];

closeModalBtn.onclick = function () {
    modal.style.display = 'none';
    modal.classList.remove('show');
    document.getElementById('filter-wbs').value = '';
    document.getElementById('filter-request').value = '';
    document.getElementById('filter-status').value = '';
};

let inspectionNo = null;
let requestStatus = null;
let privilege = null;
let statusReq = null;
let requestType = null


document.getElementById('inspection-tbody').addEventListener('click', function (event) {

    function fetchAndDisplayCompletedRemarks(inspectionNo) {
        const remarksTextarea = document.getElementById('view-completed-remarks');
        if (!remarksTextarea) return;
        remarksTextarea.value = 'Loading...';

        fetch('inspection-get-completed-remarks.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ inspection_no: inspectionNo })
        })
            .then(r => r.json())
            .then(data => {
                if (data && data.remarks) {
                    remarksTextarea.value = data.remarks;
                } else {
                    remarksTextarea.value = 'No completion remarks available.';
                }
            })
            .catch(err => {
                console.error('Error fetching completion remarks:', err);
                remarksTextarea.value = 'Error fetching completion remarks.';
            });
    }

    function fetchAndDisplayOutgoingItems(inspectionNo) {
        const container = document.getElementById('view-outgoing-rows');
        container.innerHTML = '<div>Loading...</div>';

        const formData = new FormData();
        formData.append('inspection_no', inspectionNo);

        fetch('inspection-get-outgoing-items.php', {
            method: 'POST',
            body: formData
        })
            .then(response => {
                if (!response.ok) throw new Error('Network error');
                return response.json();
            })
            .then(data => {
                container.innerHTML = '';
                if (!data.length) {
                    container.innerHTML = '<div>No outgoing items found.</div>';
                    return;
                }

                // Create a header row with labels only once
                const headerRow = document.createElement('div');
                headerRow.classList.add('outgoing-row');
                headerRow.innerHTML = `
            <div class="detail-group">
                <label>Item:</label>
            </div>
            <div class="detail-group">
                <label>Quantity:</label>
            </div>
        `;
                container.appendChild(headerRow);

                // Create a row for each item without labels
                data.forEach((item, index) => {
                    const rowDiv = document.createElement('div');
                    rowDiv.classList.add('outgoing-row');

                    rowDiv.innerHTML = `
                <div class="detail-group">
                    <input type="text" id="view-outgoing-item-${index + 1}" name="outgoing-item[]" value="${item.item}" readonly />
                </div>
                <div class="detail-group">
                    <input type="text" id="view-outgoing-quantity-${index + 1}" name="outgoing-quantity[]" value="${item.quantity}" readonly />
                </div>
            `;
                    container.appendChild(rowDiv);
                });
            })
            .catch(() => {
                container.innerHTML = '<div>Error loading outgoing items.</div>';
            });
    }

    function fetchAndDisplayDimensionalAttachments(inspectionNo) {
        const attachmentList = document.getElementById('view-dimensional-attachments-list');
        attachmentList.innerHTML = "<li>Loading attachments...</li>";

        const formData = new FormData();
        formData.append('inspection_no', inspectionNo);

        fetch('inspection-get-dimensional-attachments.php', {
            method: 'POST',
            body: formData
        })
            .then(response => {
                if (!response.ok) throw new Error('Network error');
                return response.json();
            })
            .then(data => {
                attachmentList.innerHTML = '';
                if (data.length === 0) {
                    attachmentList.innerHTML = "<li>No attachment.</li>";
                } else {
                    data.forEach(item => {
                        const li = document.createElement('li');
                        li.textContent = item.attachment;
                        li.style.cursor = 'pointer';
                        li.title = 'Open attachment in new tab';
                        li.addEventListener('click', () => {
                            window.open(`${item.attachment}`, '_blank');
                        });
                        attachmentList.appendChild(li);
                    });
                }
            })
            .catch(() => {
                attachmentList.innerHTML = "<li>Error loading attachments.</li>";
            });
    }

    function fetchAndDisplayMaterialAttachments(inspectionNo) {
        const attachmentList = document.getElementById('view-material-attachments-list');
        attachmentList.innerHTML = "<li>Loading attachments...</li>";

        const formData = new FormData();
        formData.append('inspection_no', inspectionNo);

        fetch('inspection-get-material-attachments.php', {
            method: 'POST',
            body: formData
        })
            .then(response => {
                if (!response.ok) throw new Error('Network error');
                return response.json();
            })
            .then(data => {
                attachmentList.innerHTML = '';
                if (data.length === 0) {
                    attachmentList.innerHTML = "<li>No attachment.</li>";
                } else {
                    data.forEach(item => {
                        const li = document.createElement('li');
                        li.textContent = item.attachment;
                        li.style.cursor = 'pointer';
                        li.title = 'Open attachment in new tab';
                        li.addEventListener('click', () => {
                            window.open(`${item.attachment}`, '_blank');
                        });
                        attachmentList.appendChild(li);
                    });
                }
            })
            .catch(() => {
                attachmentList.innerHTML = "<li>Error loading attachments.</li>";
            });
    }

    if (event.target.classList.contains('view-btn')) {
        const row = event.target.closest('tr');
        inspectionNo = row.querySelector('td:nth-child(1)').textContent.trim();
        requestStatus = row.querySelector('td:nth-child(6)').textContent.trim();  // (kept if you still need it)
        statusReq = row.querySelector('td:nth-child(12)').textContent.trim();     // used for status checks
        requestType = row.querySelector('td:nth-child(8)').textContent.trim();

        // --- REJECTED section ---
        if (statusReq === "REJECTED") {
            document.getElementById('request-rejected').style.display = 'block';
            document.getElementById('rejected-attachments-section').style.display = 'block';
            // hide completed section if showing rejected
            const completedSec = document.getElementById('request-completed');
            if (completedSec) completedSec.style.display = 'none';

            // Fetch rejected remarks
            fetch('inspection-get-rejected-remarks.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({ inspection_no: inspectionNo })
            })
                .then(response => response.json())
                .then(data => {
                    const remarksTextarea = document.getElementById('request-rejected-remarks');
                    if (data && data.remarks) {
                        remarksTextarea.value = data.remarks;
                    } else {
                        remarksTextarea.value = 'No remarks available.';
                    }
                })
                .catch(error => {
                    console.error('Error fetching rejected remarks:', error);
                });

            // Fetch rejected attachments
            fetch('inspection-get-rejected-attachment-initiator.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({ inspection_no: inspectionNo })
            })
                .then(response => response.json())
                .then(data => {
                    const list = document.getElementById('rejected-attachments-list');
                    list.innerHTML = '';

                    if (data && data.length > 0) {
                        data.forEach(item => {
                            const li = document.createElement('li');
                            const link = document.createElement('a');
                            link.href = `${item.attachment}`;
                            link.textContent = item.attachment;
                            link.target = '_blank';
                            li.appendChild(link);
                            list.appendChild(li);
                        });
                    } else {
                        const li = document.createElement('li');
                        li.textContent = 'No attachments.';
                        list.appendChild(li);
                    }
                })
                .catch(error => {
                    console.error('Error fetching rejected attachments:', error);
                });
        } else {
            document.getElementById('request-rejected').style.display = 'none';
            document.getElementById('rejected-attachments-section').style.display = 'none';

            // --- COMPLETED / PASSED section ---
            if (
                statusReq === 'COMPLETED' ||
                statusReq === 'PASSED' ||
                statusReq === 'PASSED W/ FAILED'
            ) {
                const completedSec = document.getElementById('request-completed');
                if (completedSec) completedSec.style.display = 'block';
                fetchAndDisplayCompletedRemarks(inspectionNo);
            } else {
                const completedSec = document.getElementById('request-completed');
                if (completedSec) completedSec.style.display = 'none';
            }
        }

        // Outgoing items
        if (requestType === 'Outgoing Inspection') {
            document.getElementById('view-outgoing-extra-fields').style.display = 'block';
            fetchAndDisplayOutgoingItems(inspectionNo);
        } else {
            document.getElementById('view-outgoing-extra-fields').style.display = 'none';
        }

        // Common fetches
        fetchInspectionRequest(inspectionNo);
        fetchAndDisplayDimensionalAttachments(inspectionNo);
        fetchAndDisplayMaterialAttachments(inspectionNo);

        // PASSED W/ FAILED attachments logic (checks backend status)
        fetch('inspection-get-passed-failed-attachments.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ inspection_no: inspectionNo })
        })
            .then(response => response.json())
            .then(data => {
                const viewDiv = document.getElementById('view-passed-failed-file');
                const ul = document.getElementById('passed-failed-attachments');
                ul.innerHTML = '';

                const oldInfoBlock = document.getElementById('attachment-info-block');
                if (oldInfoBlock) oldInfoBlock.remove();

                if (data.length > 0) {
                    viewDiv.style.display = 'block';

                    const infoDiv = document.createElement('div');
                    infoDiv.className = 'attachment-info';
                    infoDiv.id = 'attachment-info-block';
                    infoDiv.innerHTML =
                        `<div><strong>Document No:</strong> ${data[0].document_no || '-'}</div>` +
                        `<div><strong>Completed By:</strong> ${data[0].completed_by || '-'}</div>` +
                        `<div><strong>Acknowledged By:</strong> ${data[0].acknowledged_by || '-'}</div>`;
                    viewDiv.insertBefore(infoDiv, ul);

                    data.forEach(item => {
                        const li = document.createElement('li');
                        const link = document.createElement('a');
                        link.href = item.completed_attachments;
                        link.target = '_blank';
                        link.textContent = item.completed_attachments;
                        li.appendChild(link);
                        ul.appendChild(li);
                    });
                } else {
                    viewDiv.style.display = 'none';
                }
            })
            .catch(error => {
                console.error('Error fetching PASSED W/ FAILED attachments:', error);
            });

        // Remarks list
        fetch('inspection-table-remarks.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ inspection_no: inspectionNo })
        })
            .then(response => response.json())
            .then(data => {
                const tbody = document.getElementById('remarks-tbody');
                tbody.innerHTML = '';
                document.getElementById('remarks-section').style.display = 'block';

                if (data.error) {
                    console.error('Error:', data.error);
                    tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;">${data.error}</td></tr>`;
                    return;
                }

                if (data.length > 0) {
                    data.forEach(item => {
                        const row = document.createElement('tr');
                        row.setAttribute('data-inspection-no', inspectionNo);

                        const remarksByCell = document.createElement('td');
                        remarksByCell.textContent = item.remarks_by;
                        row.appendChild(remarksByCell);

                        const dateTimeCell = document.createElement('td');
                        dateTimeCell.textContent = item.date_time;
                        row.appendChild(dateTimeCell);

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

        // Rescheduled list
        fetch('inspection-table-rescheduled.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ inspection_no: inspectionNo })
        })
            .then(response => response.json())
            .then(data => {
                const tbody = document.getElementById('reschedule-tbody');
                tbody.innerHTML = '';
                document.getElementById('reschedule-section').style.display = 'block';

                if (data.error) {
                    console.error('Error:', data.error);
                    tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;">${data.error}</td></tr>`;
                    return;
                }

                if (data.length > 0) {
                    data.forEach(item => {
                        const row = document.createElement('tr');
                        const remarksByCell = document.createElement('td');
                        remarksByCell.textContent = item.rescheduled_by;
                        row.appendChild(remarksByCell);

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
                if (data.data.painting === 'y') {
                    document.getElementById('inspection-completed-attachments').style.display = 'none';
                    document.getElementById('inspection-rejected-attachments').style.display = 'none';
                    return;
                } else if (data.data.status == 'COMPLETED' || data.data.status == 'PASSED') {
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

RetrieveHistory('inspection-tbody');