document.addEventListener('DOMContentLoaded', () => {
  const customerApprovalSelect = document.getElementById('customer-approval-select');
  const uploadApprovalContainer = document.getElementById('uploadApprovalContainer');

  // Function to toggle visibility
  function toggleUploadApproval() {
    if (customerApprovalSelect.value === 'required') {
      uploadApprovalContainer.classList.remove('hidden');
    } else {
      uploadApprovalContainer.classList.add('hidden');
    }
  }

  // Initial check
  toggleUploadApproval();

  // Listen for changes
  customerApprovalSelect.addEventListener('change', toggleUploadApproval);
});

// Function to update file name display (already referenced in HTML)
function updateFileName(input) {
  const fileDisplay = input.parentElement.querySelector('.file-display');
  fileDisplay.textContent = input.files.length > 0 ? input.files[0].name : 'No file chosen';
}