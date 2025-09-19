document.addEventListener('DOMContentLoaded', async function () {

    // File Input
    const inspectionAttachmentIcon = document.getElementById('upload-file');
    const inspectionFileUploadModal = document.getElementById('inspection-modal-upload');
    const inspectionDropZone = document.getElementById('inspection-drop-zone');
    const inspectionFileInput = document.getElementById('inspection-file-input');
    const inspectionFileList = document.getElementById('inspection-file-list');
    const inspectionConfirmButton = document.getElementById('inspection-confirm-button');
    const inspectionCloseButton = inspectionFileUploadModal.querySelector('.file-close-btn');
    const inspectionHiddenFileInput = document.getElementById('inspection-file');
    const inspectionFileDisplay = document.querySelector('#inspection-upload .file-name');
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

    incomingRadio.addEventListener('change', toggleFileUpload);
    outgoingRadio.addEventListener('change', toggleFileUpload);

    toggleFileUpload();

    const submitBtn = document.getElementById('submit-btn');
    submitBtn.addEventListener('click', async function (e) {
        e.preventDefault();
        // Inspection Request
        let company = document.querySelector('input[name="company"]:checked');
        let wbs = document.getElementById('wbs').value.trim();
        let description = document.getElementById('description').value.trim();
        let request = document.getElementById('request-dropdown').value;

        // Global Input
        let remarks = document.getElementById('remarks').value.trim();
        let requestor = document.getElementById('requestor').value.trim();
        let dateTime = document.getElementById('current-time').value.trim();

        /* Final & Sub-Assembly Inspection */
        // Value of Input
        let quantity = document.getElementById('quantity').value.trim();
        let scope = document.getElementById('scope').value.trim();
        let locationOfItem = document.getElementById('location-of-item').value.trim();
        // Value of Checkboxes
        let inspection = document.querySelector('input[name="inspection"]:checked');
        let finalInspection = document.querySelector('input[name="coverage"]:checked');
        let testing = document.querySelector('input[name="testing"]:checked');
        let typeOfTesting = document.querySelector('input[name="type-of-testing"]:checked');

        /* Incoming & Outgoing Inspection */
        // Value of Input
        let detailQuantity = document.getElementById('detail-quantity').value.trim();
        let detailScope = document.getElementById('detail-scope').value.trim();
        let vendor = document.getElementById('vendor').value.trim();
        let po = document.getElementById('po').value.trim();
        let dr = document.getElementById('dr').value.trim();
        let incomingLocationOfItem = document.getElementById('incoming-location-of-item').value.trim();
        // Value of Checkboxes
        let inspectionType = document.querySelector('input[name="inspection-type"]:checked');
        let incomingOptions = document.querySelector('input[name="incoming-options"]:checked');

        /* Dimensional Inspection */
        // Value of Input
        let dimensionNotification = document.getElementById('dimension-notification').value.trim();
        let dimensionPartName = document.getElementById('dimension-part-name').value.trim();
        let dimensionPartNo = document.getElementById('dimension-part-no').value.trim();
        let dimensionLocationOfItem = document.getElementById('dimension-location-of-item').value.trim();
        // Value of Checkboxes
        let inspectionDimension = document.querySelector('input[name="inspection-dimension"]:checked');

        /* Material Analysis */
        // Value of Input
        let materialNotification = document.getElementById('material-notification').value.trim();
        let materialPartName = document.getElementById('material-part-name').value.trim();
        let materialPartNo = document.getElementById('material-part-no').value.trim();
        let materialLocationOfItem = document.getElementById('material-location-of-item').value.trim();
        // Value of Checkboxes
        let inspectionMaterial = document.querySelector('input[name="inspection-material"]:checked');
        let xrf = document.querySelector('input[name="xrf"]:checked');
        let hardnessTest = document.querySelector('input[name="hardness"]:checked');
        let grindingOption = document.querySelector('input[name="grindingOption"]:checked');
        // Value of File Input
        let files = document.getElementById('inspection-file').files;

        /* Calibration */
        // Value of Input
        let equipmentNo = document.getElementById('equipment-no').value.trim();
        let calibrationLocationOfItem = document.getElementById('calibration-location-of-item').value.trim();

        if (!company) {
            Swal.fire({
                icon: 'warning',
                title: 'Empty Radio Button',
                text: 'Please select the radio between RTI or SSD.',
            });
            return;
        }

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
                for (let i = 1; i <= rowCount; i++) {
                    const wbs = document.getElementById('wbs-' + i);
                    const description = document.getElementById('desc-' + i);
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
                if (files.length === 0) {
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

            if (!xrf && !hardnessTest && !grindingOption) {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Please select one of: Material Analysis (XRF), Hardness Test, or Allowed/Not Allowed Grinding.'
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
            const incomingWbs = document.getElementById('wbs-1').value;
            const incomingDesc = document.getElementById('desc-1').value;

            inspectionFormData.append('inspection-type', inspectionType.value);
            inspectionFormData.append('wbs-1', incomingWbs);
            inspectionFormData.append('desc-1', incomingDesc);

        } else {
            inspectionFormData.append('wbs', wbs ? wbs : 'N/A');
            inspectionFormData.append('description', description);
        }

        inspectionFormData.append('company', company.value);
        inspectionFormData.append('request', request);
        inspectionFormData.append('remarks', remarks);
        inspectionFormData.append('requestor', requestor);
        inspectionFormData.append('current-time', dateTime);

        let inspectionNo; // will hold the returned inspection number

        inspectionFormData.append('skipEmail', '1');
        const response = await fetch('inspection-request-insert-initiator.php', {
            method: 'POST',
            body: inspectionFormData,
        });
        const data = await response.json();
        if (data.status === 'success') {
            inspectionNo = data.data.inspection_no;
            Swal.fire({
                icon: 'success',
                title: 'Success!',
                text: data.message,
            });
            // Clear form fields if necessary
            document.getElementById('wbs').value = '';
            document.getElementById('description').value = '';
            document.getElementById('remarks').value = '';
            const modal = document.getElementById("inspectionModal");
            modal.style.opacity = "0";
            setTimeout(function () {
                modal.style.display = "none";
            }, 300);
            if (socket && socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({
                    action: 'request',
                    number: 1
                }));
            }
            console.log('Email list:', data);
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: data.message,
            });
            return;
        }

        if (request == "Final & Sub-Assembly Inspection") {
            // Create form data
            const finalSubInspectionForm = new FormData();
            finalSubInspectionForm.append('quantity', quantity);
            finalSubInspectionForm.append('scope', scope);
            finalSubInspectionForm.append('location-of-item', locationOfItem);
            finalSubInspectionForm.append('inspection', inspection.value);
            finalSubInspectionForm.append('inspection-no', inspectionNo);

            if (inspection.value === "final-inspection") {
                finalSubInspectionForm.append('coverage', finalInspection.value);
            }

            if (testing) {
                finalSubInspectionForm.append('type-of-testing', typeOfTesting.value);
                finalSubInspectionForm.append('testing', testing.value);
            }

            try {
                const response = await fetch('inspection-request-insert-final-sub.php', {
                    method: 'POST',
                    body: finalSubInspectionForm,
                });
                const result = await response.json();
                if (result.error) {
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: result.message,
                    });
                }
            } catch (error) {
                console.error('Final/Sub-Assembly insert error:', error);
                return;
            }

        } else if (request == "Incoming and Outgoing Inspection") {
            // Create form data
            const incomingFormData = new FormData();
            incomingFormData.append('detail-quantity', detailQuantity);
            incomingFormData.append('detail-scope', detailScope);
            incomingFormData.append('incoming-location-of-item', incomingLocationOfItem);
            incomingFormData.append('inspection-type', inspectionType.value);
            incomingFormData.append('inspection-no', inspectionNo);

            if (inspectionType.value === "incoming") {
                incomingFormData.append('vendor', vendor);
                incomingFormData.append('po', po);
                incomingFormData.append('dr', dr);
                incomingFormData.append('incoming-options', incomingOptions.value);

                const attachmentFormData = new FormData();
                attachmentFormData.append('inspection-no', inspectionNo);
                for (let i = 0; i < files.length; i++) {
                    attachmentFormData.append('inspection-file[]', files[i]); // Append each file under 'inspection-file'
                }

                // Perform AJAX request
                try {
                    const response = await fetch('inspection-request-insert-attachments.php', {
                        method: 'POST',
                        body: attachmentFormData,
                    });
                    const result = await response.json();
                    if (result.error) {
                        Swal.fire({
                            icon: 'error',
                            title: 'Error',
                            text: result.message,
                        });
                    }
                } catch (error) {
                    console.error('Attachment/s insert error:', error);
                    return;
                }

                if (rowCount > 0) {
                    for (let i = 1; i <= rowCount; i++) {
                        const wbs = document.getElementById('wbs-' + i).value;
                        const description = document.getElementById('desc-' + i).value;
                        try {
                            const response = await fetch('inspection-request-insert-incoming-wbs.php', {
                                method: 'POST',
                                body: new URLSearchParams({
                                    'wbs': wbs,
                                    'desc': description,
                                    'inspection-no': inspectionNo
                                })
                            });
                            const result = await response.json();
                            if (result.error) {
                                Swal.fire({
                                    icon: 'error',
                                    title: 'Error',
                                    text: result.message,
                                });
                            }
                        } catch (error) {
                            console.error('Incoming WBS insert error:', error);
                            return;
                        }

                    }

                }

            }

            try {
                const response = await fetch('inspection-request-insert-incoming.php', {
                    method: 'POST',
                    body: incomingFormData,
                });
                const result = await response.json();
                if (result.error) {
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: result.message,
                    });
                }
            } catch (error) {
                console.error('Incoming/Outgoing insert error:', error);
                return;
            }

        } else if (request == "Dimensional Inspection") {
            // Create form data
            const dimesionalFormData = new FormData();
            dimesionalFormData.append('dimension-notification', dimensionNotification);
            dimesionalFormData.append('dimension-part-name', dimensionPartName);
            dimesionalFormData.append('dimension-part-no', dimensionPartNo);
            dimesionalFormData.append('dimension-location-of-item', dimensionLocationOfItem);
            dimesionalFormData.append('inspection-dimension', inspectionDimension.value);
            dimesionalFormData.append('inspection-no', inspectionNo);

            try {
                const response = await fetch('inspection-request-insert-dimension.php', {
                    method: 'POST',
                    body: dimesionalFormData,
                });
                const result = await response.json();
                if (result.error) {
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: result.message,
                    });
                }
            } catch (error) {
                console.error('Dimensional Inspection insert error:', error);
                return;
            }
        } else if (request == "Material Analysis") {
            // Create form data
            const materialFormData = new FormData();
            materialFormData.append('material-notification', materialNotification);
            materialFormData.append('material-part-name', materialPartName);
            materialFormData.append('material-part-no', materialPartNo);
            materialFormData.append('material-location-of-item', materialLocationOfItem);
            materialFormData.append('inspection-material', inspectionMaterial.value);
            materialFormData.append('xrf', xrf ? xrf.value : 'none');
            materialFormData.append('hardness', hardnessTest ? hardnessTest.value : 'none');
            materialFormData.append('grindingOption', grindingOption ? grindingOption.value : 'none');
            materialFormData.append('inspection-no', inspectionNo);

            try {
                const response = await fetch('inspection-request-insert-material.php', {
                    method: 'POST',
                    body: materialFormData,
                });
                const result = await response.json();
                if (result.error) {
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: result.message,
                    });
                }
            } catch (error) {
                console.error('Material Analysis insert error:', error);
                return;
            }
        } else if (request == "Calibration") {
            // Create form data
            const calibrationFormData = new FormData();
            calibrationFormData.append('equipment-no', equipmentNo);
            calibrationFormData.append('calibration-location-of-item', calibrationLocationOfItem);
            calibrationFormData.append('inspection-no', inspectionNo);

            try {
                const response = await fetch('inspection-request-insert-calibration.php', {
                    method: 'POST',
                    body: calibrationFormData,
                });
                const result = await response.json();
                if (result.error) {
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: result.message,
                    });
                }
            } catch (error) {
                console.error('Calibration insert error:', error);
                return;
            }

        }

        try {
            const historyFormData = new FormData();
            historyFormData.append('current-time', dateTime);
            historyFormData.append('activity', 'Inspection has been requested.');
            historyFormData.append('inspection-no', inspectionNo);

            const res = await fetch('inspection-request-insert-history.php', {
                method: 'POST',
                body: historyFormData
            });
            const result = await res.json();
            if (result.error) {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: result.message,
                });
            }
        } catch (error) {
            console.error('Request History insert error:', error);
            return;
        }

        try {
            const historyFormData = new FormData();
            historyFormData.append('current-time', dateTime);
            historyFormData.append('activity', 'Inspection has been requested.');
            historyFormData.append('inspection-no', inspectionNo);

            const res = await fetch('inspection-request-insert-history-qa.php', {
                method: 'POST',
                body: historyFormData
            });
            const result = await res.json();
            if (result.error) {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: result.message,
                });
            }
        } catch (error) {
            console.error('Request History insert error:', error);
            return;
        }

        // Reset Type of Request
        dropdown.value = "Final & Sub-Assembly Inspection";
        // Clear File Input
        const fileInput = document.getElementById('inspection-file-input');
        const inspectionFile = document.getElementById('inspection-file');
        const fileList = document.getElementById('inspection-file-list');
        const fileNameDisplay = document.getElementById('file-name');

        fileInput.value = ''; // Clear the file input
        inspectionFile.value = '';
        fileList.innerHTML = ''; // Clear the file list
        fileNameDisplay.textContent = 'No file chosen'; // Reset the display message
        inspectionSelectedFiles = [];
        inspectionTempFiles = [];
        updateHiddenInput();
        updateInspectionFileDisplay();

        while (fileList.firstChild) {
            fileList.removeChild(fileList.firstChild);
        }

        // Clear Input & Textarea
        document.getElementById('quantity').value = '';
        document.getElementById('scope').value = '';
        document.getElementById('detail-quantity').value = '';
        document.getElementById('detail-scope').value = '';
        document.getElementById('vendor').value = '';
        document.getElementById('po').value = '';
        document.getElementById('dr').value = '';
        document.getElementById('material-notification').value = '';
        document.getElementById('material-part-name').value = '';
        document.getElementById('material-part-no').value = '';
        document.getElementById('material-location-of-item').value = '';
        document.getElementById('dimension-notification').value = '';
        document.getElementById('dimension-part-name').value = '';
        document.getElementById('dimension-part-no').value = '';
        document.getElementById('dimension-location-of-item').value = '';
        document.getElementById('location-of-item').value = '';
        document.getElementById('incoming-location-of-item').value = '';
        document.getElementById('calibration-location-of-item').value = '';
        document.getElementById('equipment-no').value = '';

        // Hide Elements
        document.getElementById('detail-quantity').parentElement.style.display = 'none';
        document.getElementById('detail-scope').parentElement.style.display = 'none';
        document.getElementById('vendor').parentElement.style.display = 'none';
        document.getElementById('po').parentElement.style.display = 'none';
        document.getElementById('dr').parentElement.style.display = 'none';
        document.getElementById('inspection-upload').style.display = 'none';

        // Clear Checkboxes
        const radioButtons = document.querySelectorAll('input[type="radio"]');
        radioButtons.forEach(radio => {
            radio.checked = false;
        });

        // Functions
        MaterialAnalysis();
        FinalAndSubAssemblyInpsection();
        loadInspections();

        // Variables
        xrfLastChecked = 0;
        hardnessLastChecked = 0;
        testingChecked = 0;
    });
});

