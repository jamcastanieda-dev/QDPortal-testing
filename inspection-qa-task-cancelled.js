let privilege = null;
let requestStatus = null;

document.addEventListener('DOMContentLoaded', function () {

    let inspectionNo = null;

    function fetchInspectionData() {

        document.getElementById('inspection-tbody').addEventListener('click', function (event) {

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
                const inspectionNo = row.querySelector('td:nth-child(1)').dataset.inspectionNo;
                requestStatus = row.querySelector('td:nth-child(7)').textContent.trim();

                fetch('inspection-request-delete-cancelled-notification.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: new URLSearchParams({
                        inspection_no: inspectionNo
                    })
                })
                    .then(response => response.json())
                    .then(data => {
                        if (data.status === 'success') {
                            if (socket && socket.readyState === WebSocket.OPEN) {
                                socket.send(JSON.stringify({
                                    action: 'viewed'
                                }));
                            }
                        }
                    });


                const requestType = row.querySelector('td:nth-child(4)').textContent.trim();
                if (requestType === 'Outgoing Inspection') {
                    document.getElementById('view-outgoing-extra-fields').style.display = 'block';
                    fetchAndDisplayOutgoingItems(inspectionNo);
                } else {
                    document.getElementById('view-outgoing-extra-fields').style.display = 'none';
                }
                fetchInspectionRequest(inspectionNo);
                fetchAndDisplayDimensionalAttachments(inspectionNo);
                fetchAndDisplayMaterialAttachments(inspectionNo);
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
    RetrieveHistoryQA('inspection-tbody');
});
