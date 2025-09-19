document.addEventListener('DOMContentLoaded', function () {

    let inspectionNo = null;

    // Get references to the dropdown and the columns
    const dropdown = document.getElementById("view-request-dropdown");
    const col1 = document.getElementById("view-columnOne");
    const col2 = document.getElementById("view-columnTwo");
    const col3 = document.getElementById("view-columnThree");
    const col4 = document.getElementById("view-columnFour");

    // Get references to the radio buttons
    const incomingRadio = document.getElementById('view-incoming-inspection');
    const outgoingRadio = document.getElementById('view-outgoing-inspection');
    const rawMaterialsRadio = document.getElementById('view-raw-materials');
    const fabricatedPartsRadio = document.getElementById('view-fabricated-parts');

    // Get references to the field groups to show/hide
    const quantityGroup = document.getElementById('view-detail-quantity').parentElement;
    const scopeGroup = document.getElementById('view-detail-scope').parentElement;
    const vendorGroup = document.getElementById('view-vendor').parentElement;
    const poGroup = document.getElementById('view-po').parentElement;
    const drGroup = document.getElementById('view-dr').parentElement;

    // Function to update column visibility based on selected value using the active class
    function updateColumnDisplay() {
        const value = dropdown.value;

        // Remove active class from all columns
        col1.classList.remove("active");
        col2.classList.remove("active");
        col3.classList.remove("active");
        col4.classList.remove("active");

        // Add active class to the corresponding column based on the selected value
        if (value === "Final & Sub-Assembly Inspection") {
            col1.classList.add("active");
        } else if (value === "Incoming and Outgoing Inspection") {
            col2.classList.add("active");
        } else if (value === "Dimensional Inspection") {
            col3.classList.add("active");
        } else if (value === "Calibration") {
            col4.classList.add("active");
        }
    }

    // Function to update field visibility
    function updateFields() {
        if (incomingRadio.checked) {
            // Show all fields for Incoming Inspection
            quantityGroup.style.display = 'flex';
            scopeGroup.style.display = 'flex';
            vendorGroup.style.display = 'flex';
            poGroup.style.display = 'flex';
            drGroup.style.display = 'flex';
            rawMaterialsRadio.disabled = false;
            fabricatedPartsRadio.disabled = false;
        } else if (outgoingRadio.checked) {
            // Show Quantity and Scope for Outgoing Inspection
            quantityGroup.style.display = 'flex';
            scopeGroup.style.display = 'flex';
            // Hide Vendor, PO, and DR
            vendorGroup.style.display = 'none';
            poGroup.style.display = 'none';
            drGroup.style.display = 'none';
            rawMaterialsRadio.disabled = true;
            rawMaterialsRadio.checked = false;
            fabricatedPartsRadio.disabled = true;
            fabricatedPartsRadio.checked = false;
        } else {
            // Neither is checked, hide all fields
            quantityGroup.style.display = 'none';
            scopeGroup.style.display = 'none';
            vendorGroup.style.display = 'none';
            poGroup.style.display = 'none';
            drGroup.style.display = 'none';
            rawMaterialsRadio.disabled = true;
            rawMaterialsRadio.checked = false;
            fabricatedPartsRadio.disabled = true;
            fabricatedPartsRadio.checked = false;
        }
    }

    function fetchInspectionData() {
        fetch('inspection-qa-table.php', {
            method: 'POST',
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                const tbody = document.getElementById('inspection-tbody');
                tbody.innerHTML = ''; // Clear previous data

                if (data.status === 'success' && Array.isArray(data.inspections)) {
                    data.inspections.forEach(inspection => {
                        const row = document.createElement('tr');

                        row.innerHTML = `
                <td>${inspection.inspection_no}</td>
                <td>${inspection.wbs}</td>
                <td>${inspection.description}</td>
                <td>${inspection.request}</td>
                <td class="${inspection.status === 'PENDING' ? 'status-pending' : ''}">${inspection.status}</td>
                <td>
                  <button class="view-button" data-inspection='${JSON.stringify(inspection)}'>View</button>
                </td>
              `;

                        tbody.appendChild(row);
                    });

                    // Attach event listener to the view buttons
                    // Replace the forEach loop in fetchInspectionData with event delegation
                    document.getElementById('inspection-tbody').addEventListener('click', function (event) {
                        if (event.target.classList.contains('view-button')) {
                            const row = event.target.closest('tr');
                            inspectionNo = row.querySelector('td:nth-child(1)').textContent.trim();
                            console.log('Inspection No:', inspectionNo);
                            fetchInspectionRequest(inspectionNo);
                            openModal();
                        }
                    });


                } else {
                    const noDataRow = document.createElement('tr');
                    noDataRow.innerHTML = `<td colspan="6" style="text-align:center;">No Inspection Data Found</td>`;
                    tbody.appendChild(noDataRow);
                }
            })
            .catch(error => {
                console.error('Error fetching inspection data:', error);
            });
    }

    function fetchInspectionRequest(inspectionNo) {
        const formData = new FormData();
        formData.append('inspection_no', inspectionNo);

        fetch('inspection-initiator-retrieve.php', {
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
                if (data.status === 'success') {
                    populateInspectionRequest(data.data, inspectionNo);
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: data.message
                    });
                }
            })
            .catch(error => {
                console.error('Fetch error:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Failed to load inspection data'
                });
            });
    }


    function populateInspectionRequest(data, inspectionNo) {
        const wbs = document.getElementById('view-wbs');
        const description = document.getElementById('view-description');

        wbs.value = data.wbs;
        description.value = data.description;

        // Check for different inspection types
        if (data.request === "Final & Sub-Assembly Inspection") {
            dropdown.value = "Final & Sub-Assembly Inspection";
            updateColumnDisplay();
            fetchFinalSubRequest(inspectionNo);
        } else if (data.request === "Incoming and Outgoing Inspection") {
            dropdown.value = "Incoming and Outgoing Inspection";
            updateColumnDisplay();
            fetchIncomingOutgoingRequest(inspectionNo);
        } else if (data.request === "Dimensional Inspection") {
            dropdown.value = "Dimensional Inspection";
            updateColumnDisplay();
            fetchDimensionalRequest(inspectionNo);
        } else if (data.request === "Calibration") {
            dropdown.value = "Calibration";
            updateColumnDisplay();
        }

    }

    function fetchFinalSubRequest(inspectionNo) {
        const formData = new FormData();
        formData.append('inspection_no', inspectionNo);

        fetch('inspection-final-sub-retrieve.php', {
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
                if (data.status === 'success') {
                    populateFinalSubAssemblyInspection(data.data);
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: data.message
                    });
                }
            })
            .catch(error => {
                console.error('Fetch error:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Failed to load inspection data'
                });
            });
    }

    // Function to Populate Final & Sub-Assembly Inspection Fields
    function populateFinalSubAssemblyInspection(data) {
        if (data.type_of_inspection == "final-inspection") {
            document.getElementById('view-final-inspection').checked = true;
        } else if (data.type_of_inspection == "sub-assembly") {
            document.getElementById('view-sub-assembly').checked = true;
        }

        if (data.final_inspection == "full") {
            document.getElementById('view-full').checked = true;
        } else if (data.final_inspection == "partial") {
            document.getElementById('view-partial').checked = true;
        }

        document.getElementById('view-quantity').value = data.quantity || '';

        if (data.testing == "testing") {
            document.getElementById('view-testing').checked = true;
        }

        if (data.type_of_testing == "internal-testing") {
            document.getElementById('view-internal-testing').checked = true;
        } else if (data.type_of_testing == "rti-mq") {
            document.getElementById('view-rtiMQ').checked = true;
        }

        document.getElementById('view-scope').value = data.scope || '';
        document.getElementById('view-remarks').value = data.remarks || '';
        document.getElementById('view-requestor').value = data.requestor || '';
        document.getElementById('view-current-time').value = data.date_time || '';
    }

    function fetchDimensionalRequest(inspectionNo) {
        const formData = new FormData();
        formData.append('inspection_no', inspectionNo);

        fetch('inspection-dimension-retrieve.php', {
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
                if (data.status === 'success') {
                    populateDimensionalInspection(data.data);
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: data.message
                    });
                }
            })
            .catch(error => {
                console.error('Fetch error:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Failed to load inspection data'
                });
            });
    }

    // Function to Populate Dimensional Inspection Fields
    function populateDimensionalInspection(data) {
        if (data.type_of_inspection == "dimensional") {
            document.getElementById('view-dimensional-inspection').checked = true;
        } else if (data.type_of_inspection == "material") {
            document.getElementById('view-material-analysis-evaluation').checked = true;
        }

        if (data.type_of_material == "xrf") {
            document.getElementById('view-material-analysis-xrf').checked = true;
        } else if (data.type_of_material == "hardness") {
            document.getElementById('view-hardness-test').checked = true;
        }

        if (data.type_of_hardness == "allowed") {
            document.getElementById('view-allowed-grinding').checked = true;
        } else if (data.type_of_hardness == "notAllowed") {
            document.getElementById('view-not-allowed-grinding').checked = true;
        }

        document.getElementById('view-notification').value = data.notification;
        document.getElementById('view-part-name').value = data.part_name;
        document.getElementById('view-part-no').value = data.part_no;
        document.getElementById('view-remarks').value = data.remarks;
        document.getElementById('view-requestor').value = data.requestor;
        document.getElementById('view-current-time').value = data.date_time;

    }

    function fetchIncomingOutgoingRequest(inspectionNo) {
        const formData = new FormData();
        formData.append('inspection_no', inspectionNo);

        fetch('inspection-incoming-retrieve.php', {
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
                if (data.status === 'success') {
                    populateIncomingOutgoingRequest(data.data, inspectionNo);
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: data.message
                    });
                }
            })
            .catch(error => {
                console.error('Fetch error:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Failed to load inspection data'
                });
            });
    }

    // Function to Populate Final & Sub-Assembly Inspection Fields
    function populateIncomingOutgoingRequest(data, inspectionNo) {
        const inspectionAttachments = document.getElementById('inspection-attachments');
        const attachmentsContainer = document.getElementById('view_attachments');
        if (data.type_of_inspection == "incoming") {
            document.getElementById('view-incoming-inspection').checked = true;
            fetchInspectionAttachments(inspectionNo);
            inspectionAttachments.style.display = 'block';
            updateFields();
        } else if (data.type_of_inspection == "outgoing") {
            document.getElementById('view-outgoing-inspection').checked = true;
            updateFields();
            attachmentsContainer.innerHTML = ''; // Clear previous attachments
            inspectionAttachments.style.display = 'none';
        }

        if (data.type_of_incoming_inspection == "raw-mats") {
            document.getElementById('view-raw-materials').checked = true;
        } else if (data.type_of_incoming_inspection == "fab-parts") {
            document.getElementById('view-fabricated-parts').checked = true;
        }

        document.getElementById('view-detail-quantity').value = data.quantity;
        document.getElementById('view-detail-scope').value = data.scope;
        document.getElementById('view-vendor').value = data.vendor;
        document.getElementById('view-po').value = data.po_no;
        document.getElementById('view-dr').value = data.dr_no;
        document.getElementById('view-remarks').value = data.remarks;
        document.getElementById('view-requestor').value = data.requestor;
        document.getElementById('view-current-time').value = data.date_time;

    }

    function fetchInspectionAttachments(inspectionNo) {
        const formData = new FormData();
        formData.append('inspection_no', inspectionNo);

        fetch('inspection-attachments-retrieve.php', {
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
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: data.message
                    });
                }
            })
            .catch(error => {
                console.error('Fetch error:', error);
                const attachmentsContainer = document.getElementById('view_attachments');
                attachmentsContainer.innerHTML = '<p>Failed to load attachments.</p>';
            });
    }

    function openModal() {
        // Modal
        const modal = document.getElementById('viewInspectionModal');
        modal.style.display = 'block';
        modal.style.opacity = 1;
    }

    const closeModalBtn = document.getElementById("view-close-button");
    closeModalBtn.onclick = () => {
        const modal = document.getElementById('viewInspectionModal');
        modal.style.display = 'none';
    }

    // Fetch data on page load
    fetchInspectionData();
});
