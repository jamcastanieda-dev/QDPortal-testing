document.addEventListener('DOMContentLoaded', async function () {

    let dimensionalSelectedFiles = [];
    let materialSelectedFiles = [];

    // file dimensional and material
    document.getElementById('dimension-file').addEventListener('change', function (e) {
        const newFiles = Array.from(e.target.files);

        newFiles.forEach(file => {
            if (!dimensionalSelectedFiles.some(f => f.name === file.name && f.size === file.size)) {
                dimensionalSelectedFiles.push(file);
            }
        });

        updateDimensionalAttachmentsList();
    });
    document.getElementById('material-analysis-file').addEventListener('change', function (e) {
        const newFiles = Array.from(e.target.files);

        newFiles.forEach(file => {
            if (!materialSelectedFiles.some(f => f.name === file.name && f.size === file.size)) {
                materialSelectedFiles.push(file);
            }
        });

        updateMaterialAttachmentsList();
    });


    function removeDimensionalFile(index) {
        dimensionalSelectedFiles.splice(index, 1);
        updateDimensionalAttachmentsList();
    }
    function removeMaterialFile(index) {
        materialSelectedFiles.splice(index, 1);
        updateMaterialAttachmentsList();
    }

    function updateDimensionalAttachmentsList() {
        const list = document.getElementById('dimensional-attachments-list');
        list.innerHTML = '';

        dimensionalSelectedFiles.forEach((file, index) => {
            const li = document.createElement('li');
            const span = document.createElement('span');
            span.textContent = file.name;

            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-btn';
            removeBtn.innerHTML = '&times;';
            removeBtn.onclick = () => removeDimensionalFile(index);

            li.appendChild(span);
            li.appendChild(removeBtn);
            list.appendChild(li);
        });
    }
    function updateMaterialAttachmentsList() {
        const list = document.getElementById('material-analysis-attachments-list');
        list.innerHTML = '';

        materialSelectedFiles.forEach((file, index) => {
            const li = document.createElement('li');
            const span = document.createElement('span');
            span.textContent = file.name;

            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-btn';
            removeBtn.innerHTML = '&times;';
            removeBtn.onclick = () => removeMaterialFile(index);

            li.appendChild(span);
            li.appendChild(removeBtn);
            list.appendChild(li);
        });
    }

    const nested = document.querySelector('.nested-outgoing-options');
    const companyRadios = document.querySelectorAll('input[name="company"]');
    const inspectRadios = document.querySelectorAll('input[name="inspection-type"]');
    const paintingRadio = document.getElementById('painting-inspection');
    const outgoingRadio = document.getElementById('outgoing-inspection');
    const incomingRadio = document.getElementById('incoming-inspection');

    function toggleNested() {
        const companySel = document.querySelector('input[name="company"]:checked')?.value;
        const inspectSel = document.querySelector('input[name="inspection-type"]:checked')?.value;

        // only show if SSD *and* Outgoing
        if (companySel === 'ssd' && inspectSel === 'outgoing') {
            nested.style.display = '';
        } else {
            nested.style.display = 'none';
        }
    }

    companyRadios.forEach(r => r.addEventListener('change', toggleNested));
    inspectRadios.forEach(r => r.addEventListener('change', toggleNested));
    toggleNested();

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

        // capture outgoing sub-option
        let outgoingOption = document.querySelector('input[name="outgoing-options"]:checked');

        // ─── PAINTING SPECIAL CASE ─────────────────────────────────────────────
        if (inspectionType?.value === 'outgoing' && outgoingOption?.value === 'painting') {
            // 0) Build the main inspection record payload
            const paintForm = new FormData();
            paintForm.append('company', company.value);
            paintForm.append('wbs', wbs);
            paintForm.append('description', description);
            paintForm.append('request', request);
            paintForm.append('inspection-type', 'outgoing');
            paintForm.append('outgoing-options', 'painting');
            paintForm.append('remarks', remarks);
            paintForm.append('requestor', requestor);
            paintForm.append('current-time', dateTime);
            paintForm.append('skipEmail', '1');

            // 1) Insert the main request
            const resp = await fetch('inspection-request-insert-initiator.php', {
                method: 'POST',
                body: paintForm
            });
            const json = await resp.json();
            if (json.status !== 'success') {
                return Swal.fire({ icon: 'error', title: 'Error', text: json.message });
            }

            const inspNo = json.data.inspection_no;

            // 2) Log the custom history entry
            const hist = new FormData();
            hist.append('inspection-no', inspNo);
            hist.append('current-time', dateTime);
            hist.append('activity', 'Outgoing - Painting inspection made');
            await fetch('inspection-request-insert-history.php', { method: 'POST', body: hist });
            await fetch('inspection-request-insert-history-qa.php', { method: 'POST', body: hist });

            // 3) Insert the WBS row
            await fetch('inspection-request-insert-incoming-wbs.php', {
                method: 'POST',
                body: new URLSearchParams({
                    'wbs': wbs,
                    'desc': description,
                    'inspection-no': inspNo
                })
            });

            // 4) Insert the incoming‐details row
            const incomingForm = new FormData();
            incomingForm.append('detail-quantity', detailQuantity);
            incomingForm.append('detail-scope', detailScope);
            incomingForm.append('incoming-location-of-item', incomingLocationOfItem);
            incomingForm.append('inspection-type', 'outgoing');
            incomingForm.append('inspection-no', inspNo);

            if (paintingRadio.checked) {
                incomingForm.append('painting', 'y');
            }

            function clearInspectionFields() {
                document.getElementById('wbs').value = '';
                document.getElementById('description').value = '';
                document.getElementById('remarks').value = '';
                document.getElementById('quantity').value = '';
                document.getElementById('scope').value = '';
                document.getElementById('detail-quantity').value = '';
                document.getElementById('detail-scope').value = '';
                document.getElementById('vendor').value = '';
                document.getElementById('po').value = '';
                document.getElementById('dr').value = '';
                document.getElementById('incoming-location-of-item').value = '';
                // ...and so on for any other relevant fields you want to clear
                // Clear radios
                document.querySelectorAll('input[type="radio"]').forEach(radio => radio.checked = false);
            }



            // 4a) painting flag: only send 'y' when the painting radio is checked
            if (document.getElementById('painting-inspection').checked) {
                incomingForm.append('painting', 'y');
            }
            await fetch('inspection-request-insert-incoming.php', {
                method: 'POST',
                body: incomingForm
            });

            // 5) Notify and close modal
            return Swal.fire({
                icon: 'success',
                title: 'Painting Complete',
                text: 'Your Outgoing – Painting inspection has been recorded.'
            })
                .then(() => {
                    clearInspectionFields();
                    // fade out and hide the modal
                    const modal = document.getElementById("inspectionModal");
                    modal.style.opacity = "0";
                    setTimeout(() => {
                        modal.style.display = "none";
                    }, 300);
                });
        }
        // ───────────────────────────────────────────────────────────────────────────

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
                // Build from DOM rather than a drifting rowCount
                const wbsEls = Array.from(document.querySelectorAll('#incoming-wbs input[id^="wbs-"]'));
                const rowTotal = wbsEls.length;

                for (let idx = 1; idx <= rowTotal; idx++) {
                    const wbsEl = document.getElementById(`wbs-${idx}`);
                    const descEl = document.getElementById(`desc-${idx}`);

                    // If either field is missing, stop gracefully (avoid null.value crash)
                    if (!wbsEl || !descEl) {
                        Swal.fire({
                            icon: 'warning',
                            title: 'Row mismatch',
                            text: `Row ${idx} is missing its WBS or Description input. Please add it back or remove the row.`,
                        });
                        return;
                    }

                    if (!wbsEl.value.trim() || !descEl.value.trim()) {
                        Swal.fire({
                            icon: 'warning',
                            title: 'Empty WBS or Description',
                            text: `Please enter the WBS and Description for row ${idx} before submitting.`,
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

            if (dimensionalSelectedFiles.length === 0) {
                Swal.fire({
                    icon: 'warning',
                    title: 'Missing Attachment',
                    text: 'Please attach at least one file before submitting.'
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

            if (materialSelectedFiles.length === 0) {
                Swal.fire({
                    icon: 'warning',
                    title: 'Missing Attachment',
                    text: 'Please attach at least one file before submitting.'
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
            const w1 = document.getElementById('wbs-1');
            const d1 = document.getElementById('desc-1');

            inspectionFormData.append('inspection-type', inspectionType.value);
            inspectionFormData.append('wbs-1', w1 ? w1.value : '');
            inspectionFormData.append('desc-1', d1 ? d1.value : '');
        } else {
            inspectionFormData.append('wbs', wbs ? wbs : 'N/A');
            inspectionFormData.append('description', description);
        }

        inspectionFormData.append('company', company.value);
        inspectionFormData.append('request', request);
        inspectionFormData.append('remarks', remarks);
        inspectionFormData.append('requestor', requestor);
        inspectionFormData.append('current-time', dateTime);

        let inspectionNo;

        try {
            // 1) Create the main inspection record (must succeed first)
            inspectionFormData.append('skipEmail', '1');
            const initRes = await postForm('inspection-request-insert-initiator.php', inspectionFormData, 'Initiator');
            inspectionNo = initRes.data.inspection_no;

            // 2) Branch-specific inserts (each must succeed; otherwise we abort)
            if (request == "Final & Sub-Assembly Inspection") {
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
                await postForm('inspection-request-insert-final-sub.php', finalSubInspectionForm, 'Final/Sub-Assembly');

            } else if (request == "Incoming and Outgoing Inspection") {
                const incomingFormData = new FormData();
                incomingFormData.append('detail-quantity', detailQuantity);
                incomingFormData.append('detail-scope', detailScope);
                incomingFormData.append('incoming-location-of-item', incomingLocationOfItem);
                incomingFormData.append('inspection-type', inspectionType.value);
                incomingFormData.append('inspection-no', inspectionNo);

                if (inspectionType.value === "incoming") {
                    // Incoming-specific fields
                    incomingFormData.append('vendor', vendor);
                    incomingFormData.append('po', po);
                    incomingFormData.append('dr', dr);
                    incomingFormData.append('incoming-options', incomingOptions.value);

                    // 2a) Attachments (fail-fast)
                    const attachmentFormData = new FormData();
                    attachmentFormData.append('inspection-no', inspectionNo);
                    for (let i = 0; i < files.length; i++) {
                        attachmentFormData.append('inspection-file[]', files[i]);
                    }
                    await postForm('inspection-request-insert-attachments.php', attachmentFormData, 'Incoming Attachments');

                    // 2b) WBS rows (fail-fast on any row)
                    // 2b) WBS rows (iterate DOM, not rowCount)
                    const wbsNodes = Array.from(document.querySelectorAll('#incoming-wbs input[id^="wbs-"]'));
                    for (let i = 0; i < wbsNodes.length; i++) {
                        const idx = i + 1;
                        const wbsEl = document.getElementById(`wbs-${idx}`);
                        const descEl = document.getElementById(`desc-${idx}`);

                        if (!wbsEl || !descEl) {
                            throw new Error(`Incoming WBS #${idx}: missing WBS or Description input`);
                        }

                        const qtyEl = (idx === 1)
                            ? document.getElementById('quantity-incoming')
                            : document.getElementById(`quantity-incoming-${idx}`);

                        const wbsVal = wbsEl.value.trim();
                        const descVal = descEl.value.trim();
                        const qtyVal = (qtyEl && qtyEl.value != null) ? qtyEl.value.trim() : '';

                        // Optional: enforce qty if required by your rules
                        // if (!qtyVal) { throw new Error(`Incoming WBS #${idx}: quantity is required`); }

                        const wbsForm = new URLSearchParams({
                            'wbs': wbsVal,
                            'desc': descVal,
                            'quantity': qtyVal,
                            'inspection-no': inspectionNo
                        });

                        const wbsResp = await fetch('inspection-request-insert-incoming-wbs.php', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
                            body: wbsForm
                        });
                        const wbsJson = await wbsResp.json();
                        assertOk(wbsJson, `Incoming WBS #${idx}`);
                    }

                } else {
                    // Outgoing: capture outgoing items/qty rows
                    incomingFormData.set('inspection-type', 'outgoing'); // ensure correct value
                    document.querySelectorAll('#outgoing-rows .outgoing-row').forEach(row => {
                        const item = row.querySelector('input[name="outgoing-item[]"]')?.value.trim() || '';
                        const qty = row.querySelector('input[name="outgoing-quantity[]"]')?.value.trim() || '';
                        if (item !== '' || qty !== '') {
                            incomingFormData.append('outgoing-item[]', item);
                            incomingFormData.append('outgoing-quantity[]', qty);
                        }
                    });
                }

                // 2c) Incoming/Outgoing details (single endpoint)
                await postForm('inspection-request-insert-incoming.php', incomingFormData, 'Incoming/Outgoing');

            } else if (request == "Dimensional Inspection") {
                const dimesionalFormData = new FormData();
                dimesionalFormData.append('dimension-notification', dimensionNotification);
                dimesionalFormData.append('dimension-part-name', dimensionPartName);
                dimesionalFormData.append('dimension-part-no', dimensionPartNo);
                dimesionalFormData.append('dimension-location-of-item', dimensionLocationOfItem);
                dimesionalFormData.append('inspection-dimension', inspectionDimension.value);
                dimesionalFormData.append('inspection-no', inspectionNo);
                dimensionalSelectedFiles.forEach(file => dimesionalFormData.append('dimension-file[]', file));
                await postForm('inspection-request-insert-dimension.php', dimesionalFormData, 'Dimensional');

            } else if (request == "Material Analysis") {
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
                materialSelectedFiles.forEach(file => materialFormData.append('material-analysis-file[]', file));
                await postForm('inspection-request-insert-material.php', materialFormData, 'Material Analysis');

            } else if (request == "Calibration") {
                const calibrationFormData = new FormData();
                calibrationFormData.append('equipment-no', equipmentNo);
                calibrationFormData.append('calibration-location-of-item', calibrationLocationOfItem);
                calibrationFormData.append('inspection-no', inspectionNo);
                await postForm('inspection-request-insert-calibration.php', calibrationFormData, 'Calibration');
            }

            // 3) Shared history inserts (run only if everything above succeeded)
            const historyFormData = new FormData();
            historyFormData.append('current-time', dateTime);
            historyFormData.append('activity', 'Inspection has been requested.');
            historyFormData.append('inspection-no', inspectionNo);

            await postForm('inspection-request-insert-history.php', historyFormData, 'History');
            await postForm('inspection-request-insert-history-qa.php', historyFormData, 'History QA');

            // 4) Now it's safe to show success + reset UI (unchanged logic, just moved later)
            await Swal.fire({
                icon: 'success',
                title: 'Success!',
                text: initRes.message || 'Request saved.',
            });

            // --- begin: your original UI reset logic (moved here) ---
            dimensionalSelectedFiles.length = 0; updateDimensionalAttachmentsList();
            materialSelectedFiles.length = 0; updateMaterialAttachmentsList();

            const incomingWbsContainer = document.getElementById('incoming-wbs');
            if (incomingWbsContainer) {
                incomingWbsContainer.querySelectorAll('input[type="text"]').forEach(i => i.value = '');
                const additionalInputs = incomingWbsContainer.querySelector('.additional-inputs');
                if (additionalInputs) additionalInputs.innerHTML = '';
            }

            const rowsWrap = document.getElementById('outgoing-rows');
            if (rowsWrap) {
                rowsWrap.innerHTML = `
            <div class="outgoing-row">
                <div class="detail-group">
                    <label for="outgoing-item-1">Item:</label>
                    <input type="text" id="outgoing-item-1" name="outgoing-item[]" placeholder="Enter item" />
                </div>
                <div class="detail-group">
                    <label for="outgoing-quantity-1">Quantity:</label>
                    <input type="text" id="outgoing-quantity-1" name="outgoing-quantity[]" placeholder="Enter quantity" min="0" step="1" />
                </div>
            </div>
        `;
            }
            const remBtn = document.getElementById('outgoing-remove');
            if (remBtn) remBtn.disabled = true;
            if (typeof outgoingIndex !== 'undefined') { outgoingIndex = rowsWrap ? rowsWrap.children.length : 0; }
            if (typeof updateMinusState === 'function') { updateMinusState(); }

            document.getElementById('wbs').value = '';
            document.getElementById('description').value = '';
            document.getElementById('remarks').value = '';

            const modal = document.getElementById("inspectionModal");
            modal.style.opacity = "0";
            setTimeout(() => { modal.style.display = "none"; }, 300);

            if (socket && socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({ action: 'request', number: 1 }));
            }

            // Reset Type of Request
            dropdown.value = "Final & Sub-Assembly Inspection";

            // Clear File Input (modal)
            const fileInput = document.getElementById('inspection-file-input');
            const inspectionFile = document.getElementById('inspection-file');
            const fileList = document.getElementById('inspection-file-list');
            const fileNameDisplay = document.getElementById('file-name');
            fileInput.value = '';
            inspectionFile.value = '';
            fileList.innerHTML = '';
            fileNameDisplay.textContent = 'No file chosen';
            inspectionSelectedFiles = [];
            inspectionTempFiles = [];
            updateHiddenInput();
            updateInspectionFileDisplay();
            while (fileList.firstChild) fileList.removeChild(fileList.firstChild);

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

            // Clear radios
            document.querySelectorAll('input[type="radio"]').forEach(r => r.checked = false);

            // Functions
            MaterialAnalysis();
            FinalAndSubAssemblyInpsection();
            loadInspections();

            // Variables
            xrfLastChecked = 0;
            hardnessLastChecked = 0;
            testingChecked = 0;
            // --- end: original UI reset logic ---
        } catch (err) {
            console.error(err);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: err?.message || 'Something went wrong while saving your request.'
            });
            // IMPORTANT: we stop here — nothing else runs after a failure
            return;
        }

    });

    // Painting

    paintingRadio.addEventListener('change', () => {
        if (paintingRadio.checked) {
            outgoingRadio.checked = true;
            toggleNested();
        }
    });

    // --- API helpers: consistent success check + fail-fast ---
    function assertOk(json, urlLabel) {
        // Accept either {status:'success'} or {error:false}; treat others as failure
        if (!json || typeof json !== 'object') {
            throw new Error(`${urlLabel}: invalid or empty response`);
        }
        if ((json.status && json.status !== 'success') || json.error === true) {
            throw new Error(json.message || `${urlLabel}: request failed`);
        }
        return json;
    }
    async function postForm(url, formData, urlLabel = url) {
        const resp = await fetch(url, { method: 'POST', body: formData });
        let json;
        try { json = await resp.json(); } catch (_) {
            throw new Error(`${urlLabel}: response was not JSON`);
        }
        return assertOk(json, urlLabel);
    }


});