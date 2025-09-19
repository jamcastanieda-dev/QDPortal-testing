let inspectionTempFiles = null;
let inspectionSelectedFiles = null;


function UploadAttachments(uploadFile, modalUpload, dropZone, fileInput, fileList, confirmButton, inspectionFile, fileName, selectedFiles, tempFiles) {
    // File Input
    const inspectionAttachmentIcon = document.getElementById(uploadFile);
    const inspectionFileUploadModal = document.getElementById(modalUpload);
    const inspectionDropZone = document.getElementById(dropZone);
    const inspectionFileInput = document.getElementById(fileInput);
    const inspectionFileList = document.getElementById(fileList);
    const inspectionConfirmButton = document.getElementById(confirmButton);
    const inspectionCloseButton = inspectionFileUploadModal.querySelector('.file-close-btn');
    const inspectionHiddenFileInput = document.getElementById(inspectionFile);
    const inspectionFileDisplay = document.getElementById(fileName);

    inspectionSelectedFiles = selectedFiles;
    inspectionTempFiles = tempFiles;

    // Open file upload modal
    inspectionAttachmentIcon.addEventListener('click', () => {
        inspectionTempFiles = [...inspectionSelectedFiles]; // Copy current files to temp
        displayFiles(inspectionFileList, inspectionTempFiles);
        inspectionFileUploadModal.classList.add('show');
    });

    // Close modal without saving
    inspectionCloseButton.addEventListener('click', () => {
        // 1) Hide the modal
        inspectionFileUploadModal.classList.remove('show');

        // 2) Clear both arrays _in place_
        inspectionSelectedFiles.length = 0;
        inspectionTempFiles.length = 0;

        // 3) Reset the file‑input and UI
        inspectionFileInput.value = '';
        updateHiddenInput(inspectionSelectedFiles, inspectionHiddenFileInput);
        updateInspectionFileDisplay(inspectionFileDisplay, inspectionSelectedFiles);
        displayFiles(inspectionFileList, inspectionTempFiles);
    });


    // Confirm and update files
    inspectionConfirmButton.addEventListener('click', () => {
        inspectionSelectedFiles = [...inspectionTempFiles];
        updateHiddenInput(inspectionSelectedFiles, inspectionHiddenFileInput);
        updateInspectionFileDisplay(inspectionFileDisplay, inspectionSelectedFiles);
        inspectionFileUploadModal.classList.remove('show');
    });

    // Trigger file input on drop zone click
    inspectionDropZone.addEventListener('click', () => {
        inspectionFileInput.click();
    });

    // Handle file input change
    inspectionFileInput.addEventListener('change', () => {
        const newFiles = Array.from(inspectionFileInput.files);
        inspectionTempFiles = [...inspectionTempFiles, ...newFiles];
        displayFiles(inspectionFileList, inspectionTempFiles);
        inspectionFileInput.value = ''; // Reset input
    });

    // Drag and drop events
    inspectionDropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        inspectionDropZone.classList.add('active');
    });

    inspectionDropZone.addEventListener('dragleave', () => {
        inspectionDropZone.classList.remove('active');
    });

    inspectionDropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        inspectionDropZone.classList.remove('active');
        const newFiles = Array.from(e.dataTransfer.files);
        inspectionTempFiles = [...inspectionTempFiles, ...newFiles];
        displayFiles(inspectionFileList, inspectionTempFiles);
    });

}

// Functions for showing/hiding modals
function openUploadFileModal(modal) {
    modal.style.display = 'block';
}

function closeUploadFileModal(modal, inspectionFile, fileName, fileInput, fileList) {
    modal.style.display = 'none';

    const inspectionHiddenFileInput = document.getElementById(inspectionFile);
    const inspectionFileInput = document.getElementById(fileInput);
    const inspectionFileList = document.getElementById(fileList);
    const inspectionFileDisplay = document.getElementById(fileName);

    // 2) Clear both arrays _in place_
    inspectionSelectedFiles.length = 0;
    inspectionTempFiles.length = 0;

    // 3) Reset the file‑input and UI
    inspectionFileInput.value = '';
    updateHiddenInput(inspectionSelectedFiles, inspectionHiddenFileInput);
    updateInspectionFileDisplay(inspectionFileDisplay, inspectionSelectedFiles);
    displayFiles(inspectionFileList, inspectionTempFiles);
}


// Function to update hidden file input
function updateHiddenInput(inspectionSelectedFiles, inspectionHiddenFileInput) {
    const dataTransfer = new DataTransfer();
    inspectionSelectedFiles.forEach(file => dataTransfer.items.add(file));
    inspectionHiddenFileInput.files = dataTransfer.files;
}

// Function to update file name display
function updateInspectionFileDisplay(inspectionFileDisplay, inspectionSelectedFiles) {
    inspectionFileDisplay.textContent = inspectionSelectedFiles.length === 0
        ? 'No file chosen'
        : `${inspectionSelectedFiles.length} file(s) selected`;
}

// Function to display files in the modal
function displayFiles(inspectionFileList, inspectionTempFiles) {
    inspectionFileList.innerHTML = '';
    inspectionTempFiles.forEach((file, index) => {
        const li = document.createElement('li');
        li.textContent = file.name;
        const removeBtn = document.createElement('button');
        removeBtn.textContent = '×';
        removeBtn.addEventListener('click', () => {
            inspectionTempFiles.splice(index, 1);
            displayFiles(inspectionFileList, inspectionTempFiles);
        });
        li.appendChild(removeBtn);
        inspectionFileList.appendChild(li);
    });
}