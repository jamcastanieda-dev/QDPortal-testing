/* Reject Section */
const rejectModal = document.getElementById('reject-modal');
const rejectClose = document.getElementById('reject-close');
const rejectSubmit = document.getElementById('reject-submit');
const rejectRemarks = document.getElementById('reject-remarks');

// Store files in an array so you can keep old files + add new ones
let selectedFiles = []; // Moved to higher scope to be accessible

// Function to show the modal by adding the "show" class
function showRejectModal() {
    rejectModal.classList.add('show');
}

// Function to hide the modal, clear the textarea, and reset selected files
function hideRejectModal() {
    rejectModal.classList.remove('show');
    rejectRemarks.value = ''; // Clear textarea
    selectedFiles = []; // Clear selected files
    const fileListDiv = document.getElementById('reject-file-list');
    fileListDiv.innerHTML = ''; // Clear file list UI
}

document.addEventListener('DOMContentLoaded', function () {
    const paperclip = document.querySelector('.reject-paperclip-icon');
    const fileInput = document.getElementById('reject-attachments');
    const fileListDiv = document.getElementById('reject-file-list');

    // Helper to update the file list UI
    function renderFileList() {
        fileListDiv.innerHTML = '';
        selectedFiles.forEach((file, idx) => {
            const item = document.createElement('div');
            item.className = 'reject-file-item';

            const name = document.createElement('span');
            name.className = 'reject-file-name';
            name.textContent = file.name;

            const removeBtn = document.createElement('button');
            removeBtn.className = 'reject-file-remove';
            removeBtn.innerHTML = '&times;';
            removeBtn.title = 'Remove file';
            removeBtn.onclick = function () {
                selectedFiles.splice(idx, 1);
                renderFileList();
            };

            item.appendChild(name);
            item.appendChild(removeBtn);
            fileListDiv.appendChild(item);
        });
    }

    // Open file picker on icon click
    paperclip.addEventListener('click', function () {
        fileInput.value = ''; // Reset so re-selecting same file triggers change
        fileInput.click();
    });

    // Handle file selection
    fileInput.addEventListener('change', function () {
        if (fileInput.files.length > 0) {
            // For each new file, add it to selectedFiles if not already added by name
            for (let newFile of fileInput.files) {
                const already = selectedFiles.some(f => f.name === newFile.name && f.size === newFile.size && f.lastModified === newFile.lastModified);
                if (!already) selectedFiles.push(newFile);
            }
            renderFileList();
        }
    });

    // Expose selectedFiles for form submission or AJAX upload
    window.getRejectSelectedFiles = () => selectedFiles;
});