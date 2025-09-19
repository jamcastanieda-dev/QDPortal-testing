function formatLocalDate(d) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

// 2. Compute tomorrow’s date in local time
const today = new Date();
const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

// 3. Apply as the minimum selectable date
const dateInput = document.getElementById('reschedule-date');
dateInput.min = formatLocalDate(tomorrow);

document.getElementById('inspection-tbody').addEventListener('click', function (event) {
    if (event.target.classList.contains('view-btn')) {
        const row = event.target.closest('tr');
        inspectionNo = row.querySelector('td:nth-child(1)').textContent.trim();
    }
});

document.getElementById('reschedule-button').addEventListener('click', function () {
    let rescheduleDate = document.getElementById('reschedule-date');
    if (rescheduleDate.value == '') {
        Swal.fire({
            icon: 'error',
            title: 'Empty Date',
            text: 'Please select a date to reschedule.'
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
            fetch('inspection-update-rescheduled.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams({
                    'date_time': rescheduleDate.value,
                    inspection_no: inspectionNo
                })
            })
                .then(response => response.json())
                .then(result => {
                    if (result.success) {
                        Swal.fire({
                            icon: 'success',
                            title: 'Request Rescheduled!',
                            text: 'You have rescheduled the inspection request.'
                        }).then(() => {
                            rescheduleDate.value = '';
                            loadInspections();
                            DateTime();
                            InsertRequestHistory(inspectionNo, formattedTime, 'Inspection request has been rescheduled.');
                            InsertRequestHistoryQA(inspectionNo, formattedTime, 'Inspection request has been rescheduled.');
                            if (socket && socket.readyState === WebSocket.OPEN) {
                                socket.send(JSON.stringify({
                                    action: 'rescheduled'
                                }));
                            }
                            closeModal();
                        });
                    } else {
                        Swal.fire({
                            icon: 'error',
                            title: 'Error!',
                            text: result.error || 'Something went wrong.'
                        });
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    Swal.fire({
                        icon: 'error',
                        title: 'Request Failed',
                        text: 'Unable to connect to server.'
                    });
                });
        }
    });
});


function closeModal() {
    // Modal
    const modal = document.getElementById('viewInspectionModal');
    modal.style.display = 'none';
    modal.style.opacity = 0;
}