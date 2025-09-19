/* Remarks Section */
const remarksModal = document.getElementById('remarks-modal');
const remarksClose = document.getElementById('remarks-close');
const remarksSubmit = document.getElementById('remarks-submit');
const remarks = document.getElementById('remarks');

// Function remarksto show the modal by adding the "show" class
function showModal() {
    remarksModal.classList.add('show');
}

// Function to hide the modal and clear the textarea
function hideModal() {
    remarksModal.classList.remove('show');
    remarks.value = '';
}