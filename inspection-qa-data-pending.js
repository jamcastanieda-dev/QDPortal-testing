let inspectionNo = null;
let request = null;
let privilege = null;
let selectedFilesReject = [];
let selectedFilesCompletion = [];
let tempFilesReject = [];
let tempFilesCompletion = [];

document.addEventListener('DOMContentLoaded', function () {

    /* File Upload for Inspection Request Completion */
    const completeModal = document.getElementById('complete-modal');
    const completeMainClose = document.getElementById('complete-main-close');

    const rejectModal = document.getElementById('reject-modal');
    const rejectMainClose = document.getElementById('reject-main-close');

    completeMainClose.addEventListener('click', function () {
        closeUploadFileModal(
            completeModal,
            'complete-inspection-file',
            'complete-file-name',
            'inspection-complete-file-input',
            'inspection-complete-file-list');
    });

    rejectMainClose.addEventListener('click', function () {
        closeUploadFileModal(
            rejectModal,
            'reject-inspection-file',
            'reject-file-name',
            'inspection-reject-file-input',
            'inspection-reject-file-list');
    });


    function fetchInspectionData() {

        const actionContainer = document.getElementById('action-container');
        let currentTarget = null;
        let isTransitioning = false;

        const switchIcon = (iconElement, newIcon) => {
            iconElement.classList.add('icon-fade-out');

            iconElement.addEventListener('transitionend', function onFadeOut() {
                iconElement.removeEventListener('transitionend', onFadeOut);

                iconElement.classList.remove('fa-bars', 'fa-xmark');
                iconElement.classList.add(newIcon);

                iconElement.classList.remove('icon-fade-out');
                iconElement.classList.add('icon-fade-in');

                setTimeout(() => {
                    iconElement.classList.remove('icon-fade-in');
                }, 300);
            });
        };

        document.getElementById('inspection-tbody').addEventListener('click', function (event) {
            const hamburgerIcon = event.target.closest('.hamburger-icon');
            if (hamburgerIcon && !isTransitioning) {
                isTransitioning = true;

                const iconElement = hamburgerIcon.querySelector('i');
                const row = hamburgerIcon.closest('tr');
                inspectionNo = row.querySelector('td:nth-child(1)').textContent.trim();
                request = row.querySelector('td:nth-child(4)').textContent.trim();

                if (currentTarget === hamburgerIcon && !actionContainer.classList.contains('hidden')) {
                    actionContainer.classList.add('hidden');

                    switchIcon(iconElement, 'fa-bars');

                    currentTarget = null;
                    actionContainer.addEventListener('transitionend', () => {
                        isTransitioning = false;
                    }, { once: true });
                    return;
                }

                // Revert all icons
                document.querySelectorAll('.hamburger-icon i').forEach(icon => {
                    if (icon !== iconElement && icon.classList.contains('fa-xmark')) {
                        switchIcon(icon, 'fa-bars');
                    }
                });

                switchIcon(iconElement, 'fa-xmark');
                currentTarget = hamburgerIcon;

                const iconRect = hamburgerIcon.getBoundingClientRect();
                const containerWidth = actionContainer.offsetWidth || 150;
                const leftPosition = iconRect.left - containerWidth - 5;
                const topPosition = iconRect.top + (iconRect.height / 2) - (actionContainer.offsetHeight / 2);

                const handleShow = () => {
                    actionContainer.removeEventListener('transitionend', handleShow);
                    isTransitioning = false;
                };

                const handleHide = () => {
                    actionContainer.removeEventListener('transitionend', handleHide);
                    actionContainer.style.left = `${leftPosition}px`;
                    actionContainer.style.top = `${topPosition}px`;
                    actionContainer.dataset.inspectionNo = inspectionNo;

                    actionContainer.addEventListener('transitionend', handleShow);
                    actionContainer.classList.remove('hidden');
                };

                if (!actionContainer.classList.contains('hidden')) {
                    actionContainer.addEventListener('transitionend', handleHide);
                    actionContainer.classList.add('hidden');
                } else {
                    actionContainer.style.left = `${leftPosition}px`;
                    actionContainer.style.top = `${topPosition}px`;
                    actionContainer.dataset.inspectionNo = inspectionNo;
                    actionContainer.addEventListener('transitionend', handleShow);
                    actionContainer.classList.remove('hidden');
                }
            }

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
        });

        document.getElementById('view-button').addEventListener('click', function () {
            fetchInspectionRequest(inspectionNo);
            openModal();
            actionContainer.classList.add('hidden');
            if (currentTarget) {
                const icon = currentTarget.querySelector('i');
                switchIcon(icon, 'fa-bars');
            }
        });

        document.getElementById('completed-button').addEventListener('click', function () {
            openUploadFileModal(completeModal);
            actionContainer.classList.add('hidden');
            if (currentTarget) {
                const icon = currentTarget.querySelector('i');
                switchIcon(icon, 'fa-bars');
            }
        });
        // For Completion
        UploadAttachments(
            'complete-upload-file',
            'inspection-complete-modal-upload',
            'inspection-complete-drop-zone',
            'inspection-complete-file-input',
            'inspection-complete-file-list',
            'inspection-complete-confirm-button',
            'complete-inspection-file',
            'complete-file-name',
            selectedFilesCompletion,
            tempFilesCompletion
        );

        document.getElementById('reject-button').addEventListener('click', function () {
            openUploadFileModal(rejectModal);
            actionContainer.classList.add('hidden');
            if (currentTarget) {
                const icon = currentTarget.querySelector('i');
                switchIcon(icon, 'fa-bars');
            }
        });

        // For Rejection
        UploadAttachments(
            'reject-upload-file',
            'inspection-reject-modal-upload',
            'inspection-reject-drop-zone',
            'inspection-reject-file-input',
            'inspection-reject-file-list',
            'inspection-reject-confirm-button',
            'reject-inspection-file',
            'reject-file-name',
            selectedFilesReject,
            tempFilesReject
        );

        document.getElementById('inspection-complete-button').addEventListener('click', function () {

            // Value of File Input
            let files = document.getElementById('complete-inspection-file').files;
            const documentNo = document.getElementById('complete-document-no');

            if (files.length === 0) {
                Swal.fire("Warning", "Please upload the required file documents.", "warning");
                return;
            }

            if (documentNo.value == '') {
                Swal.fire("Missing Input", "Please enter a document no.", "warning");
                return;
            }

            Swal.fire({
                title: 'Are you sure?',
                text: 'Do you want to pass the Inspection Request?',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Yes',
                cancelButtonText: 'No',
            }).then((result) => {
                if (result.isConfirmed) {
                    if (request == 'Calibration') {
                        fetch('inspection-update-completed-calibration.php', {
                            method: 'POST',
                            body: new URLSearchParams({
                                'inspection-no': inspectionNo
                            })
                        })
                            .then(response => response.json())
                            .then(data => {
                                if (data.success) {
                                    // Display SweetAlert success message
                                    Swal.fire({
                                        icon: 'success',
                                        title: 'Request Passed!',
                                        text: 'Inspection request has passed.',
                                        showConfirmButton: false,
                                        timer: 1500
                                    }).then(() => {
                                        loadInspections();
                                        fetch('inspection-request-insert-completed-notification.php', {
                                            method: 'POST',
                                            body: new URLSearchParams({
                                                'inspection-no': inspectionNo
                                            })
                                        })
                                        DateTime();
                                        InsertRequestHistory(inspectionNo, formattedTime, 'Inspection request for calibration is completed.');
                                        if (socket && socket.readyState === WebSocket.OPEN) {
                                            socket.send(JSON.stringify({
                                                action: 'approved',
                                            }));
                                        }
                                        closeUploadFileModal(
                                            completeModal,
                                            'complete-inspection-file',
                                            'complete-file-name',
                                            'inspection-reject-file-input',
                                            'inspection-reject-file-list');
                                    });
                                } else {
                                    console.error('Failed to update status:', data.message);

                                    // Display SweetAlert error message
                                    Swal.fire({
                                        icon: 'error',
                                        title: 'Oops...',
                                        text: 'Failed to update the status. Please try again.',
                                    });
                                }
                            })
                            .catch(error => {
                                console.error('Error:', error);

                                // Display SweetAlert error message
                                Swal.fire({
                                    icon: 'error',
                                    title: 'Oops...',
                                    text: 'Something went wrong. Please try again later.',
                                });
                            });
                    } else {
                        fetch('inspection-update-completed.php', {
                            method: 'POST',
                            body: new URLSearchParams({
                                'inspection-no': inspectionNo
                            })
                        })
                            .then(response => response.json())
                            .then(data => {
                                if (data.success) {
                                    // Display SweetAlert success message
                                    Swal.fire({
                                        icon: 'success',
                                        title: 'Request Passed!',
                                        text: 'Inspection request has passed.',
                                        showConfirmButton: false,
                                        timer: 1500
                                    }).then(() => {
                                        loadInspections();
                                        DateTime();
                                        InsertRequestHistory(inspectionNo, formattedTime, 'Completion of inspection request is pending for approval.');
                                        if (socket && socket.readyState === WebSocket.OPEN) {
                                            socket.send(JSON.stringify({
                                                action: 'approval',
                                            }));
                                        }
                                        closeUploadFileModal(
                                            completeModal,
                                            'complete-inspection-file',
                                            'complete-file-name',
                                            'inspection-complete-file-input',
                                            'inspection-complete-file-list');
                                    });
                                } else {
                                    console.error('Failed to update status:', data.message);

                                    // Display SweetAlert error message
                                    Swal.fire({
                                        icon: 'error',
                                        title: 'Oops...',
                                        text: 'Failed to update the status. Please try again.',
                                    });
                                }
                            })
                            .catch(error => {
                                console.error('Error:', error);

                                // Display SweetAlert error message
                                Swal.fire({
                                    icon: 'error',
                                    title: 'Oops...',
                                    text: 'Something went wrong. Please try again later.',
                                });
                            });
                    }

                    actionContainer.classList.add('hidden');
                    if (currentTarget) {
                        const icon = currentTarget.querySelector('i');
                        switchIcon(icon, 'fa-bars');
                    }

                    const attachmentFormData = new FormData();
                    attachmentFormData.append('inspection-no', inspectionNo);
                    attachmentFormData.append('complete-document-no', documentNo.value);
                    for (let i = 0; i < files.length; i++) {
                        attachmentFormData.append('complete-inspection-file[]', files[i]); // Append each file under 'inspection-file[]'
                    }

                    fetch('inspection-request-insert-completed-attachments.php', {
                        method: 'POST',
                        body: attachmentFormData,
                    })
                        .then(response => response.json())
                        .then(result => {
                            // Assuming that a success response contains { success: true, message: '...' }
                            if (result.error) {
                                // If not successful, show an error message.
                                Swal.fire({
                                    icon: 'error',
                                    title: 'Error',
                                    text: result.message,
                                });
                            } else {
                                // Success: Clear file inputs and update UI
                                const fileInput = document.getElementById('inspection-complete-file-input');
                                const inspectionFile = document.getElementById('complete-inspection-file');
                                const fileList = document.getElementById('inspection-complete-file-list');
                                const fileNameDisplay = document.getElementById('complete-file-name');

                                documentNo.value = '';
                                fileInput.value = ''; // Clear the file input
                                inspectionFile.value = '';
                                fileList.innerHTML = ''; // Clear the file list
                                fileNameDisplay.textContent = 'No file chosen'; // Reset the display message

                                // Alternatively, if you still want to remove children manually:
                                while (fileList.firstChild) {
                                    fileList.removeChild(fileList.firstChild);
                                }
                            }
                        })
                }
            });
        });

        document.getElementById('reschedule-button').addEventListener('click', function () {
            showModal();
            actionContainer.classList.add('hidden');
            if (currentTarget) {
                const icon = currentTarget.querySelector('i');
                switchIcon(icon, 'fa-bars');
            }
        });

        document.getElementById('inspection-reject-button').addEventListener('click', function () {

            // Value of File Input
            let files = document.getElementById('reject-inspection-file').files;
            const documentNo = document.getElementById('reject-document-no');
            const remarks = document.getElementById('reject-remarks');

            if (files.length === 0) {
                Swal.fire("Warning", "Please upload the required file documents.", "warning");
                return;
            }

            if (documentNo.value == '') {
                Swal.fire("Missing Input", "Please enter a document no.", "warning");
                return;
            }

            if (remarks.value == '') {
                Swal.fire("Missing Input", "Please enter the remarks.", "warning");
                return;
            }

            Swal.fire({
                title: 'Are you sure?',
                text: 'Do you want to fail the Inspection Request?',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Yes',
                cancelButtonText: 'No',
            }).then((result) => {
                if (result.isConfirmed) {
                    fetch('inspection-update-failed.php', {
                        method: 'POST',
                        body: new URLSearchParams({
                            'inspection-no': inspectionNo
                        })
                    })
                        .then(response => response.json())
                        .then(data => {
                            if (data.success) {
                                // Display SweetAlert success message
                                Swal.fire({
                                    icon: 'success',
                                    title: 'Request Failed!',
                                    text: 'Inspection request has failed.',
                                    showConfirmButton: false,
                                    timer: 1500
                                }).then(() => {
                                    loadInspections();
                                    DateTime();
                                    InsertRequestHistory(inspectionNo, formattedTime, 'Failure of inspection request is pending for approval.');
                                    if (socket && socket.readyState === WebSocket.OPEN) {
                                        socket.send(JSON.stringify({
                                            action: 'change',
                                        }));
                                    }
                                    closeUploadFileModal(
                                        rejectModal,
                                        'reject-inspection-file',
                                        'reject-file-name',
                                        'inspection-reject-file-input',
                                        'inspection-reject-file-list');
                                });
                            } else {
                                console.error('Failed to update status:', data.message);

                                // Display SweetAlert error message
                                Swal.fire({
                                    icon: 'error',
                                    title: 'Oops...',
                                    text: 'Failed to update the status. Please try again.',
                                });
                            }
                        })
                        .catch(error => {
                            console.error('Error:', error);

                            // Display SweetAlert error message
                            Swal.fire({
                                icon: 'error',
                                title: 'Oops...',
                                text: 'Something went wrong. Please try again later.',
                            });
                        });

                    actionContainer.classList.add('hidden');
                    if (currentTarget) {
                        const icon = currentTarget.querySelector('i');
                        switchIcon(icon, 'fa-bars');
                    }

                    const attachmentFormData = new FormData();
                    attachmentFormData.append('inspection-no', inspectionNo);
                    attachmentFormData.append('reject-document-no', documentNo.value);
                    for (let i = 0; i < files.length; i++) {
                        attachmentFormData.append('reject-inspection-file[]', files[i]); // Append each file under 'inspection-file[]'
                    }

                    fetch('inspection-request-insert-rejected-attachments.php', {
                        method: 'POST',
                        body: attachmentFormData,
                    })
                        .then(response => response.json())
                        .then(result => {
                            // Assuming that a success response contains { success: true, message: '...' }
                            if (result.error) {
                                // If not successful, show an error message.
                                Swal.fire({
                                    icon: 'error',
                                    title: 'Error',
                                    text: result.message,
                                });
                            } else {
                                // Success: Clear file inputs and update UI
                                const fileInput = document.getElementById('inspection-reject-file-input');
                                const inspectionFile = document.getElementById('reject-inspection-file');
                                const fileList = document.getElementById('inspection-reject-file-list');
                                const fileNameDisplay = document.getElementById('reject-file-name');

                                documentNo.value = '';
                                fileInput.value = ''; // Clear the file input
                                inspectionFile.value = '';
                                fileList.innerHTML = ''; // Clear the file list
                                fileNameDisplay.textContent = 'No file chosen'; // Reset the display message

                                // Alternatively, if you still want to remove children manually:
                                while (fileList.firstChild) {
                                    fileList.removeChild(fileList.firstChild);
                                }

                            }
                        })
                    fetch('inspection-request-insert-reject.php', {
                        method: 'POST',
                        body: new URLSearchParams({
                            'reject-remarks': remarks.value,
                            inspection_no: inspectionNo
                        })
                    })
                        .then(response => response.json())
                        .then(data => {
                            if (data.error) {
                                Swal.fire({
                                    icon: 'error',
                                    title: 'Oops...',
                                    text: 'Something went wrong. Please try again later.',
                                });
                            } else {
                                remarks.value = '';
                            }
                        });
                }
            });
        });

        // Close modal when the close button is clicked
        remarksClose.addEventListener("click", function () {
            hideModal();
        });

        // When the modal's submit button is clicked
        remarksSubmit.addEventListener("click", function () {
            UpdateStatusToForReschedule('inspection-table-qa-pending.php');
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
