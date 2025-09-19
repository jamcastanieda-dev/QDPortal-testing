/* Reject Section */
const rejectModal = document.getElementById('reject-modal');
const rejectClose = document.getElementById('reject-close');
const rejectSubmit = document.getElementById('reject-submit');
const rejectRemarks = document.getElementById('reject-remarks');

// Function remarksto show the modal by adding the "show" class
function showRejectModal() {
    rejectModal.classList.add('show');
}

// Function to hide the modal and clear the textarea
function hideRejectModal() {
    rejectModal.classList.remove('show');
    rejectRemarks.value = '';
}