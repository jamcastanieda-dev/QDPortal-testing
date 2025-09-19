let inspectionNo = null;
let requestStatus = null;
let privilege = null;
let typeOfRequest = null;

document.addEventListener('DOMContentLoaded', function () {

    function fetchInspectionData() {

        document.getElementById('inspection-tbody').addEventListener('click', function (event) {
            if (event.target.classList.contains('view-btn')) {
                const row = event.target.closest('tr');
                inspectionNo = row.querySelector('td:nth-child(1)').textContent.trim();
                requestStatus = row.querySelector('td:nth-child(7)').textContent.trim();
                typeOfRequest = row.querySelector('td:nth-child(4)').textContent.trim();

                if (typeOfRequest === 'Dimensional Inspection') {
                    fetch('inspection-get-dimensional-attachments.php', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                        body: new URLSearchParams({ inspection_no: inspectionNo })
                    })
                        .then(response => response.json())
                        .then(data => {
                            const list = document.getElementById('view-dimensional-attachments-list');
                            list.innerHTML = '';

                            if (data && data.length > 0) {
                                list.style.display = 'block'; // Show ul if there are items
                                data.forEach(item => {
                                    const li = document.createElement('li');
                                    li.style.cursor = 'pointer';
                                    li.title = "Open attachment";
                                    li.onclick = () => {
                                        window.open(item.attachment, '_blank');
                                    };
                                    li.textContent = item.attachment.split('/').pop();
                                    list.appendChild(li);
                                });
                            } else {
                                list.style.display = 'none'; // Hide ul if no items
                            }
                        })
                        .catch(error => {
                            console.error('Error fetching dimensional attachments:', error);
                        });

                } else if (typeOfRequest === 'Material Analysis') {
                    fetch('inspection-get-material-attachments.php', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                        body: new URLSearchParams({ inspection_no: inspectionNo })
                    })
                        .then(response => response.json())
                        .then(data => {
                            const list = document.getElementById('view-material-attachments-list');
                            list.innerHTML = '';

                            if (data && data.length > 0) {
                                list.style.display = 'block'; // Show ul if there are items
                                data.forEach(item => {
                                    const li = document.createElement('li');
                                    li.style.cursor = 'pointer';
                                    li.title = "Open attachment";
                                    li.onclick = () => {
                                        window.open(item.attachment, '_blank');
                                    };
                                    li.textContent = item.attachment.split('/').pop();
                                    list.appendChild(li);
                                });
                            } else {
                                list.style.display = 'none'; // Hide ul if no items
                            }
                        })
                        .catch(error => {
                            console.error('Error fetching material analysis attachments:', error);
                        });
                } else if (typeOfRequest === 'Outgoing Inspection') {
                    const outgoingSection = document.getElementById('view-outgoing-extra-fields');
                    const outgoingRowsContainer = document.getElementById('view-outgoing-rows');

                    // Show the section
                    outgoingSection.style.display = 'block';

                    fetch('inspection-get-outgoing-items.php', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                        body: new URLSearchParams({ inspection_no: inspectionNo })
                    })
                        .then(response => response.json())
                        .then(data => {
                            outgoingRowsContainer.innerHTML = ''; // Clear old rows

                            if (data && data.length > 0) {
                                // Create header row (labels)
                                const headerRow = document.createElement('div');
                                headerRow.classList.add('outgoing-row');

                                const itemHeader = document.createElement('div');
                                itemHeader.classList.add('detail-group');
                                const itemLabel = document.createElement('label');
                                itemLabel.textContent = 'Item:';
                                itemHeader.appendChild(itemLabel);

                                const qtyHeader = document.createElement('div');
                                qtyHeader.classList.add('detail-group');
                                const qtyLabel = document.createElement('label');
                                qtyLabel.textContent = 'Quantity:';
                                qtyHeader.appendChild(qtyLabel);

                                headerRow.appendChild(itemHeader);
                                headerRow.appendChild(qtyHeader);
                                outgoingRowsContainer.appendChild(headerRow);

                                // Now create a row for each data entry
                                data.forEach(item => {
                                    const rowDiv = document.createElement('div');
                                    rowDiv.classList.add('outgoing-row');

                                    // Item value (no label)
                                    const itemGroup = document.createElement('div');
                                    itemGroup.classList.add('detail-group');
                                    const itemInput = document.createElement('input');
                                    itemInput.type = 'text';
                                    itemInput.name = 'outgoing-item[]';
                                    itemInput.value = item.item || '';
                                    itemInput.readOnly = true;
                                    itemGroup.appendChild(itemInput);

                                    // Quantity value (no label)
                                    const qtyGroup = document.createElement('div');
                                    qtyGroup.classList.add('detail-group');
                                    const qtyInput = document.createElement('input');
                                    qtyInput.type = 'text';
                                    qtyInput.name = 'outgoing-quantity[]';
                                    qtyInput.value = item.quantity || '';
                                    qtyInput.readOnly = true;
                                    qtyGroup.appendChild(qtyInput);

                                    rowDiv.appendChild(itemGroup);
                                    rowDiv.appendChild(qtyGroup);
                                    outgoingRowsContainer.appendChild(rowDiv);
                                });
                            } else {
                                outgoingRowsContainer.innerHTML = '<p>No outgoing items found.</p>';
                            }
                        })
                        .catch(error => {
                            console.error('Error fetching outgoing items:', error);
                            outgoingRowsContainer.innerHTML = '<p>Error loading outgoing items.</p>';
                        });

                }

                // Show rejected sections if status is REJECTED
                if (requestStatus === "REJECTED") {
                    document.getElementById('request-rejected').style.display = 'block';
                    document.getElementById('rejected-attachments-section').style.display = 'block';

                    // Fetch rejected remarks
                    fetch('inspection-get-rejected-remarks.php', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded'
                        },
                        body: new URLSearchParams({ inspection_no: inspectionNo })
                    })
                        .then(response => response.json())
                        .then(data => {
                            if (data && data.remarks) {
                                document.getElementById('request-rejected-remarks').value = data.remarks;
                            } else {
                                document.getElementById('request-rejected-remarks').value = 'No remarks available.';
                            }
                        })
                        .catch(error => {
                            console.error('Error fetching rejected remarks:', error);
                        });

                    // Fetch rejected attachments
                    fetch('inspection-get-rejected-attachment-initiator.php', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded'
                        },
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
                                    link.href = `${item.attachment}`; // Replace with actual path
                                    link.textContent = item.attachment;
                                    link.target = '_blank';
                                    li.appendChild(link);
                                    list.appendChild(li);
                                });
                            } else {
                                const li = document.createElement('li');
                                li.textContent = 'No attachments found.';
                                list.appendChild(li);
                            }
                        })
                        .catch(error => {
                            console.error('Error fetching rejected attachments:', error);
                        });

                } else {
                    document.getElementById('request-rejected').style.display = 'none';
                    document.getElementById('rejected-attachments-section').style.display = 'none';
                }

                if (requestStatus === "COMPLETED" || requestStatus === "PASSED") {
                    document.getElementById('request-completed').style.display = 'block';

                    // Fetch the completion remarks
                    fetch('inspection-get-completed-remarks.php', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                        body: new URLSearchParams({ inspection_no: inspectionNo })
                    })
                        .then(response => response.json())
                        .then(data => {
                            if (data && data.remarks) {
                                document.getElementById('view-completed-remarks').value = data.remarks;
                            } else {
                                document.getElementById('view-completed-remarks').value = 'No completion remarks available.';
                            }
                        })
                        .catch(error => {
                            console.error('Error fetching completion remarks:', error);
                            document.getElementById('view-completed-remarks').value = 'Error fetching completion remarks.';
                        });
                } else {
                    document.getElementById('request-completed').style.display = 'none';
                }


                fetchInspectionRequest(inspectionNo);

                // PASSED W/ FAILED attachments logic (checks backend status)
                fetch('inspection-get-passed-failed-attachments.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    body: new URLSearchParams({ inspection_no: inspectionNo })
                })
                    .then(response => response.json())
                    .then(data => {
                        const viewDiv = document.getElementById('view-passed-failed-file');
                        const ul = document.getElementById('passed-failed-attachments');
                        ul.innerHTML = '';

                        // Remove any existing info block
                        const oldInfoBlock = document.getElementById('attachment-info-block');
                        if (oldInfoBlock) oldInfoBlock.remove();

                        if (data.length > 0) {
                            viewDiv.style.display = 'block';

                            // Add info block above the list (using the first item)
                            const infoDiv = document.createElement('div');
                            infoDiv.className = 'attachment-info';
                            infoDiv.id = 'attachment-info-block'; // Give it an ID for later removal
                            infoDiv.innerHTML =
                                `<div><strong>Document No:</strong> ${data[0].document_no || '-'}</div>` +
                                `<div><strong>Completed By:</strong> ${data[0].completed_by || '-'}</div>` +
                                `<div><strong>Acknowledged By:</strong> ${data[0].acknowledged_by || '-'}</div>`;
                            viewDiv.insertBefore(infoDiv, ul);

                            // List attachments
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

                        if (data.error) {
                            console.error('Error:', data.error);
                            tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;">${data.error}</td></tr>`;
                            return;
                        }

                        if (data.length > 0) {
                            data.forEach(item => {
                                const row = document.createElement('tr');

                                row.dataset.inspectionNo = inspectionNo;  // <-- add this line

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
                    // ─── Painting special‐case for the VIEW modal ───────────────────────────
                    if (data.data.painting === 'y') {
                        // make sure Outgoing is checked
                        document.getElementById('view-outgoing-inspection').checked = true;
                        // un-hide the nested Painting option
                        const nested = document.querySelector('#viewInspectionModal .nested-outgoing-options');
                        nested.style.display = 'block';
                        // check Painting
                        document.getElementById('view-painting-inspection').checked = true;
                    }
                    // ────────────────────────────────────────────────────────────────────────
                    if (data.data.status == 'FOR RESCHEDULE' && data.data.approval == 'RESCHEDULE APPROVED' && data.data.requestor == data.user) {
                        document.getElementById('reschedule-request').style.display = 'block';
                    } else {
                        document.getElementById('reschedule-request').style.display = 'none';
                    }
                    if (data.data.painting === 'y') {
                        document.getElementById('inspection-completed-attachments').style.display = 'none';
                        document.getElementById('inspection-rejected-attachments').style.display = 'none';
                        document.getElementById('resubmit-section').style.display = 'none';
                        document.getElementById('view-inspection-upload').style.display = 'none';
                        return;
                        // 2) Non-painting, completed inspections load attachments
                    } else if (data.data.status === 'COMPLETED' || data.data.status === 'PASSED') {
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

                    if (data.data.status == 'REQUESTED' && data.data.requestor == data.user) {
                        document.getElementById('resubmit-section').style.display = 'block';
                        document.getElementById('cancel-button').style.display = 'block';
                        document.getElementById('resubmit-button').style.display = 'none';
                        document.getElementById('for-rejected').style.display = 'none';
                    } else if (data.data.status == 'CANCELLED' && data.data.requestor == data.user) {
                        document.getElementById('resubmit-section').style.display = 'block';
                        document.getElementById('cancel-button').style.display = 'none';
                        document.getElementById('resubmit-button').style.display = 'block';
                        document.getElementById('for-rejected').style.display = 'none';

                    } else {
                        document.getElementById('resubmit-section').style.display = 'none';
                    }

                    if (data.data.status == 'REJECTED' && data.data.approval == 'REJECTED' && data.data.requestor == data.user || data.data.status == 'CANCELLED' && data.data.requestor == data.user) {
                        document.getElementById('resubmit-section').style.display = 'block';
                        document.getElementById('resubmit-button').style.display = 'block';
                        document.getElementById('view-wbs').readOnly = false;
                        document.getElementById('view-description').readOnly = false;
                        document.getElementById('view-remarks').readOnly = false;

                        // Final & Sub-Assembly Inspection
                        document.getElementById('view-final-inspection').disabled = false;
                        document.getElementById('view-sub-assembly').disabled = false;
                        document.getElementById('view-full').disabled = false;
                        document.getElementById('view-partial').disabled = false;
                        document.getElementById("view-testing").disabled = false;
                        document.getElementById("view-internal-testing").disabled = false;
                        document.getElementById("view-rtiMQ").disabled = false;
                        document.getElementById('view-quantity').readOnly = false;
                        document.getElementById('view-scope').readOnly = false;
                        document.getElementById('view-location-of-item').readOnly = false;

                        // Incoming & Outgoing Inspection
                        document.getElementById('view-raw-materials').disabled = false;
                        document.getElementById('view-fabricated-parts').disabled = false;
                        document.getElementById('view-detail-quantity').readOnly = false;
                        document.getElementById('view-detail-scope').readOnly = false;
                        document.getElementById('view-vendor').readOnly = false;
                        document.getElementById('view-po').readOnly = false;
                        document.getElementById('view-dr').readOnly = false;
                        document.getElementById('view-incoming-location-of-item').readOnly = false;
                        document.getElementById('for-rejected').style.display = 'block';
                        document.getElementById('view-attachments-label').style.display = 'none';

                        // Dimensional Inspection
                        document.getElementById('view-dimensional-inspection').disabled = false;
                        document.getElementById('view-dimension-notification').readOnly = false;
                        document.getElementById('view-dimension-part-name').readOnly = false;
                        document.getElementById('view-dimension-part-no').readOnly = false;
                        document.getElementById('view-dimension-location-of-item').readOnly = false;

                        // Material Analysis
                        document.getElementById('view-material-analysis-evaluation').disabled = false;
                        document.getElementById('view-xrf').disabled = false;
                        document.getElementById('view-hardness').disabled = false;
                        document.getElementById('view-allowed-grinding').disabled = false;
                        document.getElementById('view-not-allowed-grinding').disabled = false;
                        document.getElementById('view-material-notification').readOnly = false;
                        document.getElementById('view-material-part-name').readOnly = false;
                        document.getElementById('view-material-part-no').readOnly = false;
                        document.getElementById('view-material-location-of-item').readOnly = false;

                        // Calibration
                        document.getElementById('view-equipment-no').readOnly = false;
                        document.getElementById('view-calibration-location-of-item').readOnly = false;

                    } else {
                        document.getElementById('view-wbs').readOnly = true;
                        document.getElementById('view-description').readOnly = true;
                        document.getElementById('view-remarks').readOnly = true;

                        // Final & Sub-Assembly Inspection
                        document.getElementById('view-final-inspection').disabled = true;
                        document.getElementById('view-sub-assembly').disabled = true;
                        document.getElementById('view-full').disabled = true;
                        document.getElementById('view-partial').disabled = true;
                        document.getElementById('view-full').checked = false;
                        document.getElementById('view-partial').checked = false;
                        document.getElementById("view-testing").disabled = true;
                        document.getElementById("view-internal-testing").disabled = true;
                        document.getElementById("view-rtiMQ").disabled = true;
                        document.getElementById('view-quantity').readOnly = true;
                        document.getElementById('view-scope').readOnly = true;
                        document.getElementById('view-location-of-item').readOnly = true;

                        // Incoming & Outgoing
                        document.getElementById('view-raw-materials').disabled = true;
                        document.getElementById('view-fabricated-parts').disabled = true;
                        document.getElementById('view-detail-quantity').readOnly = true;
                        document.getElementById('view-detail-scope').readOnly = true;
                        document.getElementById('view-vendor').readOnly = true;
                        document.getElementById('view-po').readOnly = true;
                        document.getElementById('view-dr').readOnly = true;
                        document.getElementById('view-incoming-location-of-item').readOnly = true;
                        document.getElementById('for-rejected').style.display = 'none';
                        document.getElementById('view-attachments-label').style.display = 'block';

                        // Dimensional Inspection
                        document.getElementById('view-dimensional-inspection').disabled = true;
                        document.getElementById('view-dimension-notification').readOnly = true;
                        document.getElementById('view-dimension-part-name').readOnly = true;
                        document.getElementById('view-dimension-part-no').readOnly = true;
                        document.getElementById('view-dimension-location-of-item').readOnly = true;

                        // Material Analysis
                        document.getElementById('view-material-analysis-evaluation').disabled = true;
                        document.getElementById('view-xrf').disabled = true;
                        document.getElementById('view-hardness').disabled = true;
                        document.getElementById('view-allowed-grinding').disabled = true;
                        document.getElementById('view-not-allowed-grinding').disabled = true;
                        document.getElementById('view-material-notification').readOnly = true;
                        document.getElementById('view-material-part-name').readOnly = true;
                        document.getElementById('view-material-part-no').readOnly = true;
                        document.getElementById('view-material-location-of-item').readOnly = true;

                        // Calibration
                        document.getElementById('view-equipment-no').readOnly = true;
                        document.getElementById('view-calibration-location-of-item').readOnly = true;
                    }

                    if (data.data.status == 'REJECTED' && data.data.approval == 'REJECTED' || data.data.status == 'REQUESTED' && data.data.requestor == data.user) {
                        document.getElementById('cancel-button').style.display = 'block';
                    } else {
                        document.getElementById('cancel-button').style.display = 'none';
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