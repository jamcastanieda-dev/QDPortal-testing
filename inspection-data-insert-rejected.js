// Testing Type
function ViewTypeOfTesting() {
    if (viewTesting.checked) {
        viewInternalTesting.disabled = false;
        viewRtiMQ.disabled = false;
    }
    else {
        viewInternalTesting.disabled = true;
        viewRtiMQ.disabled = true;
        viewInternalTesting.checked = false;
        viewRtiMQ.checked = false;
    }
}

let viewTestingChecked = 0;

viewTesting.addEventListener('click', function () {
    if (this.checked && viewTestingChecked == 1) {
        viewTestingChecked = -1;
        this.checked = false;
    }
    viewTestingChecked++;
    ViewTypeOfTesting();
});

// Material Analysis
function ViewMaterialAnalysis() {
    if (viewMaterialAnalysisEvaluation.checked) {
        viewMaterialAnalysisXRF.disabled = false;
        viewHardnessTest.disabled = false;
        viewAllowedGrinding.disabled = true;
        viewNotAllowedGrinding.disabled = true;
    } else {
        viewMaterialAnalysisXRF.disabled = true;
        viewHardnessTest.disabled = true;
        viewAllowedGrinding.disabled = true;
        viewNotAllowedGrinding.disabled = true;
    }
}

viewMaterialAnalysisEvaluation.addEventListener('change', ViewMaterialAnalysis);

ViewMaterialAnalysis();

function ViewTypeOfGrinding() {
    if (viewHardnessTest.checked) {
        viewAllowedGrinding.disabled = false;
        viewNotAllowedGrinding.disabled = false;
    } else if (!viewHardnessTest.checked) {
        viewAllowedGrinding.disabled = true;
        viewNotAllowedGrinding.disabled = true;
        viewAllowedGrinding.checked = false;
        viewNotAllowedGrinding.checked = false;
    }
}

let viewXrfLastChecked = 0;
let viewHardnessLastChecked = 0;

viewMaterialAnalysisXRF.addEventListener('click', function () {
    if (this.checked && viewXrfLastChecked == 1) {
        viewXrfLastChecked = -1;
        this.checked = false;
    }
    viewXrfLastChecked++;
    ViewTypeOfGrinding();
});

viewHardnessTest.addEventListener('click', function () {
    if (this.checked && viewHardnessLastChecked == 1) {
        viewHardnessLastChecked = -1;
        this.checked = false;
    }
    viewHardnessLastChecked++;
    ViewTypeOfGrinding();
});

let viewRowCount = 0;

function addViewInputRow() {
    viewRowCount++;
    const additionalInputs = document.getElementById('view-additional-input');
    const newRow = document.createElement('div');
    newRow.className = 'input-fields-top view-additional-row';
    newRow.style.opacity = '0'; // Start with opacity 0 for fade-in effect
    newRow.innerHTML = `
        <div class="wbs-group">
            <input type="text" id="view-wbs-${viewRowCount}" style="margin-bottom: 0;" placeholder="Enter WBS..."">
        </div>
        <div class="description-group">
            <input type="text" id="view-desc-${viewRowCount}" style="margin-bottom: 0;" placeholder="Enter description..."">
        </div>
    `;
    additionalInputs.appendChild(newRow);

    // Trigger the fade-in animation
    setTimeout(() => {
        newRow.style.transition = 'opacity 0.3s ease-in-out';
        newRow.style.opacity = '1';
    }, 10); // Small delay to ensure the element is in the DOM before animating
    console.log(viewRowCount);
}

function removeViewInputRow() {
    const additionalInputs = document.getElementById('view-additional-input');
    const rows = additionalInputs.querySelectorAll('.view-additional-row');
    if (rows.length > 1) {
        const lastRow = rows[rows.length - 1];
        lastRow.style.transition = 'opacity 0.3s ease-in-out';
        lastRow.style.opacity = '0'; // Fade out

        // Remove the row after the transition ends
        lastRow.addEventListener('transitionend', () => {
            additionalInputs.removeChild(lastRow);
            viewRowCount--;
        }, { once: true }); // Ensure the event listener runs only once
    }
}

// File Input
const inspectionAttachmentIcon = document.getElementById('view-upload-file');
const inspectionFileUploadModal = document.getElementById('view-inspection-modal-upload');
const inspectionDropZone = document.getElementById('view-inspection-drop-zone');
const inspectionFileInput = document.getElementById('view-inspection-file-input');
const inspectionFileList = document.getElementById('view-inspection-file-list');
const inspectionConfirmButton = document.getElementById('view-inspection-confirm-button');
const inspectionCloseButton = inspectionFileUploadModal.querySelector('.file-close-btn');
const inspectionHiddenFileInput = document.getElementById('view-inspection-file');
const inspectionFileDisplay = document.querySelector('#view-inspection-upload .file-name');
const inspectionUpload = document.getElementById('inspection-upload');

// Initialize file arrays
let inspectionSelectedFiles = []; // Confirmed files
let inspectionTempFiles = [];     // Temporary files in the modal

// Function to display files in the modal
function displayFiles() {
    inspectionFileList.innerHTML = '';
    inspectionTempFiles.forEach((file, index) => {
        const li = document.createElement('li');
        li.textContent = file.name;
        const removeBtn = document.createElement('button');
        removeBtn.textContent = '×';
        removeBtn.addEventListener('click', () => {
            inspectionTempFiles.splice(index, 1);
            displayFiles();
        });
        li.appendChild(removeBtn);
        inspectionFileList.appendChild(li);
    });
}

// Function to update hidden file input
function updateHiddenInput() {
    const dataTransfer = new DataTransfer();
    inspectionSelectedFiles.forEach(file => dataTransfer.items.add(file));
    inspectionHiddenFileInput.files = dataTransfer.files;
}

// Function to update file name display
function updateInspectionFileDisplay() {
    inspectionFileDisplay.textContent = inspectionSelectedFiles.length === 0
        ? 'No file chosen'
        : `${inspectionSelectedFiles.length} file(s) selected`;
}

// Open file upload modal
inspectionAttachmentIcon.addEventListener('click', () => {
    inspectionTempFiles = [...inspectionSelectedFiles]; // Copy current files to temp
    displayFiles();
    inspectionFileUploadModal.classList.add('show');
});

// Close modal without saving
inspectionCloseButton.addEventListener('click', () => {
    inspectionFileUploadModal.classList.remove('show');
});

// Confirm and update files
inspectionConfirmButton.addEventListener('click', () => {
    inspectionSelectedFiles = [...inspectionTempFiles];
    updateHiddenInput();
    updateInspectionFileDisplay();
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
    displayFiles();
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
    displayFiles();
});

// Function to toggle file upload visibility
function toggleFileUpload() {
    if (incomingRadio.checked) {
        inspectionUpload.style.display = 'flex';
        inspectionUpload.style.opacity = '1';
    } else if (outgoingRadio.checked) {
        inspectionUpload.style.display = 'none';
        inspectionUpload.style.opacity = '0';
        resetFileInput(); // Reset file input when hidden
    } else {
        inspectionUpload.style.display = 'none';
        inspectionUpload.style.opacity = '0';
        resetFileInput(); // Reset file input when hidden
    }
}

// Function to reset file input
function resetFileInput() {
    inspectionFileInput.value = '';
    inspectionFileDisplay.textContent = 'No file chosen';
    inspectionSelectedFiles = [];
    inspectionTempFiles = [];
    updateHiddenInput();
    updateInspectionFileDisplay();
}

viewIncomingRadio.addEventListener('change', toggleFileUpload);
viewOutgoingRadio.addEventListener('change', toggleFileUpload);

toggleFileUpload();

function fetchInspectionAttachmentsForRequestor(inspectionNo) {
    const formData = new FormData();
    formData.append('inspection_no', inspectionNo);

    fetch('inspection-request-retrieve-attachments.php', {
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
            const attachmentsContainer = document.getElementById('view_attachments');
            attachmentsContainer.innerHTML = ''; // Clear previous attachments
            if (data.status === 'success') {
                if (requestStatus == 'REJECTED' || requestStatus == 'CANCELLED') {
                    document.getElementById('view-inspection-upload').style.display = 'flex';
                    if (data.files.length === 0) {
                        attachmentsContainer.innerHTML = '<p>No attachments found.</p>';
                    } else {
                        data.files.forEach(file => {
                            // Extract filename using both / and \ for compatibility
                            const fileName = file.split('/').pop().split('\\').pop();

                            // 1) Create a wrapper div
                            const item = document.createElement('div');
                            item.classList.add('attachment-item');

                            // 2) Create the link
                            const fileLink = document.createElement('a');
                            fileLink.href = file;
                            fileLink.textContent = fileName;
                            fileLink.target = '_blank';
                            fileLink.classList.add('attachment-link');

                            // 3) Create the trash icon (outside the link)
                            const trashIcon = document.createElement('i');
                            trashIcon.classList.add('fa-solid', 'fa-trash-can', 'delete-icon');
                            // Optional: wire up delete logic
                            const deleteFileForm = new FormData();
                            deleteFileForm.append('inspection-no', inspectionNo);
                            deleteFileForm.append('file-name', 'inspection-documents/' + fileName);
                            trashIcon.addEventListener('click', () => {
                                fetch('inspection-request-delete-attachments.php', {
                                    method: 'POST',
                                    body: deleteFileForm
                                })
                                    .then(response => response.json()) // Expect HTML as response
                                    .then(data => {
                                        if (data.status == 'success') {
                                            fetchInspectionAttachmentsForRequestor(inspectionNo);
                                        }
                                    });
                            });

                            // 4) Assemble
                            item.appendChild(fileLink);
                            item.appendChild(trashIcon);
                            attachmentsContainer.appendChild(item);
                        });
                    }
                } else {
                    document.getElementById('view-inspection-upload').style.display = 'none';
                    if (data.files.length === 0) {
                        attachmentsContainer.innerHTML = '<p>No attachments found.</p>';
                    } else {
                        data.files.forEach(file => {
                            // Extract filename using both / and \ for compatibility
                            const fileName = file.split('/').pop().split('\\').pop();

                            const fileLink = document.createElement('a');
                            fileLink.href = `${file}`;
                            fileLink.textContent = fileName;
                            fileLink.target = '_blank';
                            fileLink.classList.add('attachment-link');
                            attachmentsContainer.appendChild(fileLink);
                        });
                    }
                }
            } else {
                console.log(data.message);
            }
        })
        .catch(error => {
            console.error('Fetch error:', error);
            const attachmentsContainer = document.getElementById('view_attachments');
            attachmentsContainer.innerHTML = '<p>Failed to load attachments.</p>';
        });
}

document.getElementById('cancel-button').addEventListener('click', () => {

    Swal.fire({
        title: 'Are you sure?',
        text: 'Do you want to cancel the Inspection Request?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes',
        cancelButtonText: 'No',
    })
        .then((result) => {
            if (result.isConfirmed) {
                fetch('inspection-update-cancel.php', {
                    method: 'POST',
                    body: new URLSearchParams({
                        'inspection-no': inspectionNo
                    })
                })
                    .then(response => response.json()) // Expect HTML as response
                    .then(data => {
                        if (data.status == 'success') {
                            DateTime();
                            InsertRequestHistory(inspectionNo, formattedTime, 'Inspection request has been cancelled.');
                            InsertRequestHistoryQA(inspectionNo, formattedTime, 'Inspection request has been cancelled.');
                            loadInspections();
                            const modal = document.getElementById("viewInspectionModal");
                            modal.style.opacity = "0";
                            setTimeout(function () {
                                modal.style.display = "none";
                            }, 300);
                            Swal.fire({
                                icon: 'success',
                                title: 'Request Cancelled!',
                                text: 'Inspection Request has been cancelled.',
                                showConfirmButton: false,
                                timer: 1500
                            });
                            if (socket && socket.readyState === WebSocket.OPEN) {
                                socket.send(JSON.stringify({
                                    action: 'change',
                                }));
                            }
                        }
                    });
            }
        })
});

document.getElementById('resubmit-button').addEventListener('click', (e) => {
    e.preventDefault();

    // Inspection Request
    let company = document.querySelector('input[name="view-company"]:checked');
    let wbs = document.getElementById('view-wbs').value.trim();
    let description = document.getElementById('view-description').value.trim();
    let request = document.getElementById('view-request-dropdown').value;

    // Global Input
    let remarks = document.getElementById('view-remarks').value.trim();
    let requestor = document.getElementById('view-requestor').value.trim();
    let dateTime = document.getElementById('current-time').value.trim();

    /* Final & Sub-Assembly Inspection */
    // Value of Input
    let quantity = document.getElementById('view-quantity').value.trim();
    let scope = document.getElementById('view-scope').value.trim();
    let locationOfItem = document.getElementById('view-location-of-item').value.trim();
    // Value of Checkboxes
    let inspection = document.querySelector('input[name="view-inspection"]:checked');
    let finalInspection = document.querySelector('input[name="view-coverage"]:checked');
    let testing = document.querySelector('input[name="view-testing"]:checked');
    let typeOfTesting = document.querySelector('input[name="view-type-of-testing"]:checked');

    /* Incoming & Outgoing Inspection */
    // Value of Input
    let detailQuantity = document.getElementById('view-detail-quantity').value.trim();
    let detailScope = document.getElementById('view-detail-scope').value.trim();
    let vendor = document.getElementById('view-vendor').value.trim();
    let po = document.getElementById('view-po').value.trim();
    let dr = document.getElementById('view-dr').value.trim();
    let incomingLocationOfItem = document.getElementById('view-incoming-location-of-item').value.trim();
    // Value of Checkboxes
    let inspectionType = document.querySelector('input[name="view-inspection-type"]:checked');
    let incomingOptions = document.querySelector('input[name="view-incoming-options"]:checked');

    /* Dimensional Inspection */
    // Value of Input
    let dimensionNotification = document.getElementById('view-dimension-notification').value.trim();
    let dimensionPartName = document.getElementById('view-dimension-part-name').value.trim();
    let dimensionPartNo = document.getElementById('view-dimension-part-no').value.trim();
    let dimensionLocationOfItem = document.getElementById('view-dimension-location-of-item').value.trim();
    // Value of Checkboxes
    let inspectionDimension = document.querySelector('input[name="view-inspection-dimension"]:checked');

    /* Material Analysis */
    // Value of Input
    let materialNotification = document.getElementById('view-material-notification').value.trim();
    let materialPartName = document.getElementById('view-material-part-name').value.trim();
    let materialPartNo = document.getElementById('view-material-part-no').value.trim();
    let materialLocationOfItem = document.getElementById('view-material-location-of-item').value.trim();
    // Value of Checkboxes
    let inspectionMaterial = document.querySelector('input[name="view-inspection-material"]:checked');
    let xrf = document.querySelector('input[name="view-xrf"]:checked');
    let hardnessTest = document.querySelector('input[name="view-hardness"]:checked');
    let grindingOption = document.querySelector('input[name="view-grindingOption"]:checked');
    // Value of File Input
    let files = document.getElementById('view-inspection-file').files;
    const count = document.getElementsByClassName('attachment-link').length;

    /* Calibration */
    // Value of Input
    let equipmentNo = document.getElementById('view-equipment-no').value.trim();
    let calibrationLocationOfItem = document.getElementById('view-calibration-location-of-item').value.trim();

    // Dropdown List Data Insertion
    if (request === "Final & Sub-Assembly Inspection") {

        if (!quantity || !scope || !remarks || !locationOfItem) {
            Swal.fire({
                icon: 'warning',
                title: 'Empty Fields',
                text: 'Please fill in all fields before submitting.',
            });
            return;
        }

        if (!inspection) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Please select a inspection option.'
            });
            return;
        }

        if (!finalInspection && inspection.value == 'final-inspection') {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Please select between full or partial.'
            });
            return;
        }

        if (!typeOfTesting && testing) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Please select a type of testing.'
            });
            return;
        }

    } else if (request === "Incoming and Outgoing Inspection") {
        if (!inspectionType) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Please select between Incoming and Outgoing inspection.'
            });
            return;
        }

        if (!incomingOptions && inspectionType.value == "incoming") {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Please select a type of incoming inspection.'
            });
            return;
        }
        if (inspectionType.value == "outgoing") {
            if (!detailQuantity || !detailScope || !remarks || !incomingLocationOfItem) {
                Swal.fire({
                    icon: 'warning',
                    title: 'Empty Fields',
                    text: 'Please fill in all fields before submitting.',
                });
                return;
            }
        } else if (inspectionType.value == "incoming") {
            for (let i = 1; i <= viewRowCount; i++) {
                const wbs = document.getElementById('view-wbs-' + i);
                const description = document.getElementById('view-desc-' + i);
                if (wbs.value == '' || description.value == '') {
                    Swal.fire({
                        icon: 'warning',
                        title: 'Empty WBS or Description',
                        text: 'Please enter the wbs or description before submitting.',
                    });
                    return;
                }

            }

            if (!detailQuantity || !detailScope || !remarks || !vendor || !po || !dr || !incomingLocationOfItem) {
                Swal.fire({
                    icon: 'warning',
                    title: 'Empty Fields',
                    text: 'Please fill in all fields before submitting.',
                });
                return;
            }


            if (files.length === 0 && count == 0) {
                Swal.fire("Warning", "Please select at least one file.", "warning");
                return;
            }

        }

    } else if (request === "Dimensional Inspection") {

        if (!dimensionNotification || !dimensionPartName || !dimensionPartNo || !remarks || !dimensionLocationOfItem) {
            Swal.fire({
                icon: 'warning',
                title: 'Empty Fields',
                text: 'Please fill in all fields before submitting.',
            });
            return;
        }

        if (!inspectionDimension) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Please check the Dimensional Inspection checkbox.'
            });
            return;
        }
    } else if (request === "Material Analysis") {

        if (!materialNotification || !materialPartName || !materialPartNo || !remarks || !materialLocationOfItem) {
            Swal.fire({
                icon: 'warning',
                title: 'Empty Fields',
                text: 'Please fill in all fields before submitting.',
            });
            return;
        }

        if (!inspectionMaterial) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Please check the Material Analysis checkbox.'
            });
            return;
        }

        if (!xrf && !hardnessTest) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Please select between XRF or Hardness Test checkbox.'
            });
            return;
        }

        if (document.getElementById('view-hardness').checked == true && !grindingOption) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Please select between Allowed or Not Allowed Grinding option.'
            });
            return;
        }
    } else if (request === "Calibration") {
        if (!equipmentNo || !remarks || !calibrationLocationOfItem) {
            Swal.fire({
                icon: 'warning',
                title: 'Empty Fields',
                text: 'Please fill in all fields before submitting.',
            });
            return;
        }
    }

    if (request == "Calibration") {
        if (!description) {
            Swal.fire({
                icon: 'warning',
                title: 'Empty Description',
                text: 'Please fill the Description before submitting.',
            });
            return;
        }
    } else if (request == "Incoming and Outgoing Inspection" && inspectionType.value == 'outgoing') {
        if (!wbs || !description) {
            Swal.fire({
                icon: 'warning',
                title: 'Empty Fields',
                text: 'Please fill the empty fields before submitting.',
            });
            return;
        }
    } else if (request == "Final & Sub-Assembly Inspection" || request == "Material Analysis" || request == "Dimensional Inspection") {
        if (!wbs || !description) {
            Swal.fire({
                icon: 'warning',
                title: 'Empty Fields',
                text: 'Please fill the empty fields before submitting.',
            });
            return;
        }
    }
    const inspectionFormData = new FormData();
    // Create form data
    if (request == 'Incoming and Outgoing Inspection' && inspectionType.value == 'incoming') {
        const incomingWbs = document.getElementById('view-wbs-1').value;
        const incomingDesc = document.getElementById('view-desc-1').value;

        inspectionFormData.append('view-inspection-type', inspectionType.value);
        inspectionFormData.append('view-wbs-1', incomingWbs);
        inspectionFormData.append('view-desc-1', incomingDesc);

    } else {
        inspectionFormData.append('view-wbs', wbs ? wbs : 'N/A');
        inspectionFormData.append('view-description', description);
    }

    inspectionFormData.append('view-company', company.value);
    inspectionFormData.append('view-request', request);
    inspectionFormData.append('view-remarks', remarks);
    inspectionFormData.append('view-requestor', requestor);
    inspectionFormData.append('current-time', dateTime);
    inspectionFormData.append('inspection-no', inspectionNo);

    fetch('inspection-request-update-initiator.php', {
        method: 'POST',
        body: inspectionFormData,
    })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                Swal.fire({
                    icon: 'success',
                    title: 'Success!',
                    text: data.message,
                });
                loadInspections();
                // Clear form fields if necessary
                document.getElementById('view-wbs').value = '';
                document.getElementById('view-description').value = '';
                document.getElementById('view-remarks').value = '';
                const modal = document.getElementById("viewInspectionModal");
                modal.style.opacity = "0";
                setTimeout(function () {
                    modal.style.display = "none";
                }, 300);
                DateTime();
                InsertRequestHistory(inspectionNo, formattedTime, 'Inspection request has been resubmitted.');
                InsertRequestHistoryQA(inspectionNo, formattedTime, 'Inspection request has been resubimitted.');
                if (socket && socket.readyState === WebSocket.OPEN) {
                    socket.send(JSON.stringify({
                        action: 'request',
                        number: 1
                    }));
                }
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: data.message,
                });
                return;
            }
        })


    fetch('inspection-request-delete-reject.php', {
        method: 'POST',
        body: new URLSearchParams({
            'inspection-no': inspectionNo
        })
    })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: data.message,
                });
            }
        })



    if (request == "Final & Sub-Assembly Inspection") {
        // Create form data
        const finalSubInspectionForm = new FormData();
        finalSubInspectionForm.append('inspection-no', inspectionNo);
        finalSubInspectionForm.append('view-quantity', quantity);
        finalSubInspectionForm.append('view-scope', scope);
        finalSubInspectionForm.append('view-location-of-item', locationOfItem);
        finalSubInspectionForm.append('view-inspection', inspection.value);

        if (inspection.value === "final-inspection") {
            finalSubInspectionForm.append('view-coverage', finalInspection.value);
        }

        if (testing) {
            finalSubInspectionForm.append('view-type-of-testing', typeOfTesting.value);
            finalSubInspectionForm.append('view-testing', testing.value);
        }

        try {
            fetch('inspection-request-update-final-sub.php', {
                method: 'POST',
                body: finalSubInspectionForm,
            })
                .then(response => response.json())
                .then(data => {
                    if (data.error) {
                        Swal.fire({
                            icon: 'error',
                            title: 'Error',
                            text: data.message,
                        });
                    }
                })
        } catch (error) {
            console.error('Final/Sub-Assembly update error:', error);
            return;
        }

    } else if (request == "Incoming and Outgoing Inspection") {
        // Create form data
        const incomingFormData = new FormData();
        incomingFormData.append('inspection-no', inspectionNo);
        incomingFormData.append('view-detail-quantity', detailQuantity);
        incomingFormData.append('view-detail-scope', detailScope);
        incomingFormData.append('view-incoming-location-of-item', incomingLocationOfItem);
        incomingFormData.append('view-inspection-type', inspectionType.value);

        if (inspectionType.value === "incoming") {
            incomingFormData.append('view-vendor', vendor);
            incomingFormData.append('view-po', po);
            incomingFormData.append('view-dr', dr);
            incomingFormData.append('view-incoming-options', incomingOptions.value);

            const attachmentFormData = new FormData();
            attachmentFormData.append('inspection-no', inspectionNo);
            for (let i = 0; i < files.length; i++) {
                attachmentFormData.append('view-inspection-file[]', files[i]); // Append each file under 'inspection-file'
            }

            // Perform AJAX request
            if (files.length != 0) {
                try {
                    fetch('inspection-request-update-attachments.php', {
                        method: 'POST',
                        body: attachmentFormData,
                    })
                        .then(response => response.json())
                        .then(data => {
                            if (data.error) {
                                Swal.fire({
                                    icon: 'error',
                                    title: 'Error',
                                    text: data.message,
                                });
                            }
                        })
                } catch (error) {
                    console.error('Attachment/s insert error:', error);
                    return;
                }
            }

            asyncIncomingWbs(inspectionNo, viewRowCount);
        }

        try {
            fetch('inspection-request-update-incoming.php', {
                method: 'POST',
                body: incomingFormData,
            })
                .then(response => response.json())
                .then(data => {
                    if (data.error) {
                        Swal.fire({
                            icon: 'error',
                            title: 'Error',
                            text: data.message,
                        });
                    }
                })
        } catch (error) {
            console.error('Incoming/Outgoing update error:', error);
            return;
        }

    } else if (request == "Dimensional Inspection") {
        // Create form data
        const dimesionalFormData = new FormData();
        dimesionalFormData.append('view-dimension-notification', dimensionNotification);
        dimesionalFormData.append('view-dimension-part-name', dimensionPartName);
        dimesionalFormData.append('view-dimension-part-no', dimensionPartNo);
        dimesionalFormData.append('view-dimension-location-of-item', dimensionLocationOfItem);
        dimesionalFormData.append('view-inspection-dimension', inspectionDimension.value);
        dimesionalFormData.append('inspection-no', inspectionNo);

        try {
            fetch('inspection-request-update-dimension.php', {
                method: 'POST',
                body: dimesionalFormData,
            })
                .then(response => response.json())
                .then(data => {
                    if (data.error) {
                        Swal.fire({
                            icon: 'error',
                            title: 'Error',
                            text: data.message,
                        });
                    }
                })
        } catch (error) {
            console.error('Dimensional Inspection update error:', error);
            return;
        }
    } else if (request == "Material Analysis") {
        // Create form data
        const materialFormData = new FormData();
        materialFormData.append('view-material-notification', materialNotification);
        materialFormData.append('view-material-part-name', materialPartName);
        materialFormData.append('view-material-part-no', materialPartNo);
        materialFormData.append('view-material-location-of-item', materialLocationOfItem);
        materialFormData.append('view-inspection-material', inspectionMaterial.value);
        materialFormData.append('view-xrf', xrf ? xrf.value : 'none');
        materialFormData.append('view-hardness', hardnessTest ? hardnessTest.value : 'none');
        materialFormData.append('view-grindingOption', grindingOption ? grindingOption.value : 'none');
        materialFormData.append('inspection-no', inspectionNo);

        try {
            fetch('inspection-request-update-material.php', {
                method: 'POST',
                body: materialFormData,
            })
                .then(response => response.json())
                .then(data => {
                    if (data.error) {
                        Swal.fire({
                            icon: 'error',
                            title: 'Error',
                            text: data.message,
                        });
                    }
                })

        } catch (error) {
            console.error('Material Analysis update error:', error);
            return;
        }
    } else if (request == "Calibration") {
        // Create form data
        const calibrationFormData = new FormData();
        calibrationFormData.append('view-equipment-no', equipmentNo);
        calibrationFormData.append('view-calibration-location-of-item', calibrationLocationOfItem);
        calibrationFormData.append('inspection-no', inspectionNo);

        try {
            fetch('inspection-request-update-calibration.php', {
                method: 'POST',
                body: calibrationFormData,
            })
                .then(response => response.json())
                .then(data => {
                    if (data.error) {
                        Swal.fire({
                            icon: 'error',
                            title: 'Error',
                            text: data.message,
                        });
                    }
                })
        } catch (error) {
            console.error('Calibration update error:', error);
            return;
        }

    }

});


async function asyncIncomingWbs(inspectionNo, viewRowCount) {

    // Helper to delete existing incoming‐WBS rows
    async function deleteExisting() {
        const res = await fetch('inspection-request-delete-incoming-wbs.php', {
            method: 'POST',
            body: new URLSearchParams({ 'inspection-no': inspectionNo })
        });
        const data = await res.json();
        if (data.error) {
            throw new Error(data.message);
        }
    }

    // Helper to insert a single incoming‐WBS row
    async function insertRow(wbs, description) {
        const res = await fetch('inspection-request-update-incoming-wbs.php', {
            method: 'POST',
            body: new URLSearchParams({
                'inspection-no': inspectionNo,
                'view-wbs': wbs,
                'view-desc': description
            })
        });
        const data = await res.json();
        if (data.status === 'error') {
            throw new Error(data.message || 'Unknown insert error');
        }
    }

    try {
        // 2) If there's more than one row, insert each one
        if (viewRowCount > 0) {
            await deleteExisting();
            for (let i = 1; i <= viewRowCount; i++) {
                const wbs = document.getElementById(`view-wbs-${i}`).value.trim();
                const description = document.getElementById(`view-desc-${i}`).value.trim();
                await insertRow(wbs, description);
            }
        } else {
            await deleteExisting();
        }
    } catch (err) {
        console.error('Incoming WBS sync error:', err);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: err.message
        });
    }
}

// Example usage—call this when you need to sync
// syncIncomingWbs(currentInspectionNo);
