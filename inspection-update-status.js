function InsertRemarks() {

    fetch('inspection-request-insert-remarks.php', {
        method: 'POST',
        body: new URLSearchParams({
            'remarks': remarks.value,
            'current-time': formattedTime,
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
            }
        });
}

function InsertRejectionRemarks() {
    fetch('inspection-request-insert-reject.php', {
        method: 'POST',
        body: new URLSearchParams({
            'reject-remarks': rejectRemarks.value,
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
            }
        });
}

function UpdateStatusToForReschedule() {
    if (remarks.value == '') {
        Swal.fire({
            icon: 'warning',
            title: 'Empty Remarks',
            text: 'Remarks cannot be empty.'
        });
        return;
    }

    Swal.fire({
        title: 'Are you sure?',
        text: 'Do you want to reschedule the Inspection Request?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes',
        cancelButtonText: 'No',
    }).then((result) => {
        if (result.isConfirmed) {
            fetch('inspection-update-for-reschedule.php', {
                method: 'POST',
                body: new URLSearchParams({
                    'inspection_no': inspectionNo
                })
            })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        // Display SweetAlert success message
                        Swal.fire({
                            icon: 'success',
                            title: 'Reschedule Requested!',
                            text: 'Reschedule of inspection has been requested to the requestor.',
                            showConfirmButton: false,
                            timer: 1500
                        }).then(() => {
                            loadInspections();
                            DateTime();
                            InsertRequestHistoryQA(inspectionNo, formattedTime, 'Reschedule of inspection request is pending for approval.');
                            InsertRemarks();
                            hideModal();
                            if (socket && socket.readyState === WebSocket.OPEN) {
                                socket.send(JSON.stringify({
                                    action: 'approval'
                                }));
                            }
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
    });
}

function UpdateStatusToPending() {

    Swal.fire({
        title: 'Are you sure?',
        text: 'Do you want to accept the Inspection Request?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes',
        cancelButtonText: 'No',
    }).then((result) => {
        if (result.isConfirmed) {
            fetch('inspection-update-pending.php', {
                method: 'POST',
                body: new URLSearchParams({
                    'inspection_no': inspectionNo
                })
            })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        // Display SweetAlert success message
                        Swal.fire({
                            icon: 'success',
                            title: 'Request Accepted!',
                            text: 'Inspection request has been accepted.',
                            showConfirmButton: false,
                            timer: 1500
                        }).then(() => {
                            loadInspections();
                            DateTime();

                            // Use the correct message based on request type
                            let historyMessage = "Inspection request has been accepted for pending.";
                            if (data.request === 'Calibration') {
                                historyMessage = "The item has been retrieved from PE-calibration and now pending to QD";
                            }

                            InsertRequestHistory(inspectionNo, formattedTime, historyMessage);
                            InsertRequestHistoryQA(inspectionNo, formattedTime, historyMessage);

                            if (socket && socket.readyState === WebSocket.OPEN) {
                                socket.send(JSON.stringify({
                                    action: 'change',
                                }));
                            }
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
    });
}

function UpdateStatusToRejected() {
    if (rejectRemarks.value == '') {
        Swal.fire({
            icon: 'warning',
            title: 'Empty Remarks',
            text: 'Remarks cannot be empty.'
        });
        return;
    }

    Swal.fire({
        title: 'Are you sure?',
        text: 'Do you want to reject the Inspection Request?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes',
        cancelButtonText: 'No',
    }).then(async (result) => {
        if (!result.isConfirmed) return;

        // Collect files
        const files = window.getRejectSelectedFiles ? window.getRejectSelectedFiles() : [];
        const formData = new FormData();
        formData.append('inspection_no', inspectionNo);
        // keep your files
        for (let i = 0; i < files.length; i++) {
            formData.append('attachments[]', files[i]);
        }
        // if you want to store remarks server-side here too:
        // formData.append('remarks', rejectRemarks.value);

        // show loading while PHP updates + sends email
        Swal.fire({
            title: 'Sending email…',
            allowOutsideClick: false,
            showConfirmButton: false,
            didOpen: () => {
                Swal.showLoading();
            },
        });
        await new Promise(requestAnimationFrame);

        fetch('inspection-update-reject.php', {
            method: 'POST',
            body: formData
        })
            .then(resp => resp.json())
            .then(async data => {
                Swal.close();

                if (data.success) {
                    await Swal.fire({
                        icon: 'success',
                        title: 'Request Rejected!',
                        text: 'Inspection request has been rejected.',
                        showConfirmButton: false,
                        timer: 1500
                    });

                    loadInspections();
                    DateTime();
                    InsertRequestHistory(inspectionNo, formattedTime, 'Inspection request has been rejected.\nReason: "' + rejectRemarks.value + '"');
                    InsertRequestHistoryQA(inspectionNo, formattedTime, 'Inspection request has been rejected.\nReason: "' + rejectRemarks.value + '"');
                    InsertRejectionRemarks();
                    hideRejectModal();

                    if (socket && socket.readyState === WebSocket.OPEN) {
                        socket.send(JSON.stringify({ action: 'change' }));
                    }
                } else {
                    console.error('Failed to update status:', data.message);
                    Swal.fire({
                        icon: 'error',
                        title: 'Oops...',
                        text: 'Failed to update the status. Please try again.',
                    });
                }
            })
            .catch(err => {
                console.error('Error:', err);
                Swal.close();
                Swal.fire({
                    icon: 'error',
                    title: 'Oops...',
                    text: 'Something went wrong. Please try again later.',
                });
            });
    });
}

