/* Remarks Section */
const viewRemarksModal = document.getElementById('reschedule-modal');
const viewRemarksClose = document.getElementById('reschedule-close');
const viewRemarks = document.getElementById('reschedule-remarks');

// Function remarksto show the modal by adding the "show" class
function viewShowModal() {
    viewRemarksModal.classList.add('show');
}

// Function to hide the modal and clear the textarea
function viewHideModal() {
    viewRemarksModal.classList.remove('show');
    viewRemarks.value = '';
}

document.getElementById('inspection-tbody-completion').addEventListener('click', function (event) {
    if (event.target.classList.contains('view-btn')) {
      const row = event.target.closest('tr');
      inspectionNo = row.querySelector('td:nth-child(1)').textContent.trim();
    }
});

document.getElementById('remarks-tbody').addEventListener('click', function (event) {
    if (event.target.classList.contains('remarks-view-btn')) {
        const row = event.target.closest('tr');
        dateTime = row.querySelector('td:nth-child(2)').textContent.trim();
        viewShowModal();

        fetch('inspection-request-retrieve-remarks.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                inspection_no: inspectionNo,
                date_time: dateTime
            })
        })
            .then(response => response.json())
            .then(data => {
                viewRemarks.value = data.remarks;
            })
            .catch(error => {
                console.error('Error fetching data:', error);
            });
    }
});

// Close modal when the close button is clicked
viewRemarksClose.addEventListener("click", function () {
    viewHideModal();
});