/* Reject Section */
const viewRejectRemarks = document.getElementById('view-reject');
const viewRejectedBy = document.getElementById('view-rejected-by');
const rejectionSection = document.getElementById('rejected-section');

document.getElementById('inspection-tbody').addEventListener('click', function (event) {
    if (event.target.classList.contains('view-btn')) {
        const row = event.target.closest('tr');
        const inspectionNo = row.querySelector('td:nth-child(1)').dataset.inspectionNo;

        fetch('inspection-request-retrieve-reject.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                inspection_no: inspectionNo,
            })
        })
            .then(response => response.json())
            .then(data => {
                if (data.status === 'success') {
                    viewRejectRemarks.value = data.reject.remarks;
                    viewRejectedBy.textContent = 'Rejected By: ' + data.reject.remarks_by;
                    rejectionSection.style.display = 'block';
                } else {
                    rejectionSection.style.display = 'none';
                }
            })

    }
});
