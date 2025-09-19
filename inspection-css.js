// Get references to the dropdown and the columns
let dropdown = document.getElementById("request-dropdown");
const col1 = document.getElementById("columnOne");
const col2 = document.getElementById("columnTwo");
const col3 = document.getElementById("columnThree");
const col4 = document.getElementById("columnFour");
const col5 = document.getElementById("columnFive");

// WBS & Description
const generalWbs = document.getElementById('general-wbs');
const incomingWbs = document.getElementById('incoming-wbs');

// Get references to the radio buttons
const incomingRadio = document.getElementById('incoming-inspection');
const outgoingRadio = document.getElementById('outgoing-inspection');
const rawMaterialsRadio = document.getElementById('raw-materials');
const fabricatedPartsRadio = document.getElementById('fabricated-parts');
const finalInspection = document.getElementById("final-inspection");
const subAssembly = document.getElementById("sub-assembly");
const fullInspection = document.getElementById("full");
const partialInspection = document.getElementById("partial");
const testing = document.getElementById("testing");
const internalTesting = document.getElementById("internal-testing");
const rtiMQ = document.getElementById("rtiMQ");
const materialAnalysisEvaluation = document.getElementById("material-analysis-evaluation");
const materialAnalysisXRF = document.getElementById("material-analysis-xrf");
const hardnessTest = document.getElementById("hardness-test");
const allowedGrinding = document.getElementById("allowed-grinding");
const notAllowedGrinding = document.getElementById("not-allowed-grinding");

// Get references to the field groups to show/hide
const quantityGroup = document.getElementById('detail-quantity').parentElement;
const scopeGroup = document.getElementById('detail-scope').parentElement;
const vendorGroup = document.getElementById('vendor').parentElement;
const poGroup = document.getElementById('po').parentElement;
const drGroup = document.getElementById('dr').parentElement;

// Function to update column visibility based on selected value using the active class
function updateColumnDisplay() {

    // Remove active class from all columns
    col1.classList.remove("active");
    col2.classList.remove("active");
    col3.classList.remove("active");
    col4.classList.remove("active");
    col5.classList.remove("active");

    // Add active class to the corresponding column based on the selected value
    if (dropdown.value === "Final & Sub-Assembly Inspection") {
        col1.classList.add("active");
        document.querySelector('.wbs-group').style.display = 'block';
        generalWbs.style.display = 'flex';
        incomingWbs.style.display = 'none';
        incomingRadio.checked = false;
    } else if (dropdown.value === "Incoming and Outgoing Inspection") {
        col2.classList.add("active");
        document.querySelector('.wbs-group').style.display = 'block';
        generalWbs.style.display = 'flex';
        incomingWbs.style.display = 'none';
        incomingRadio.checked = false;
    } else if (dropdown.value === "Dimensional Inspection") {
        col3.classList.add("active");
        document.querySelector('.wbs-group').style.display = 'block';
        generalWbs.style.display = 'flex';
        incomingWbs.style.display = 'none';
        incomingRadio.checked = false;
    } else if (dropdown.value === "Material Analysis") {
        col4.classList.add("active");
        document.querySelector('.wbs-group').style.display = 'block';
        generalWbs.style.display = 'flex';
        incomingWbs.style.display = 'none';
        incomingRadio.checked = false;
    } else if (dropdown.value === "Calibration") {
        col5.classList.add("active");
        document.querySelector('.wbs-group').style.display = 'none';
        document.getElementById('wbs').value = '';
        generalWbs.style.display = 'flex';
        incomingWbs.style.display = 'none';
        incomingRadio.checked = false;
    }
    MaterialAnalysis();
}

dropdown.addEventListener('change', updateColumnDisplay);

updateColumnDisplay();

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
        generalWbs.style.display = 'none';
        incomingWbs.style.display = 'block';
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
        generalWbs.style.display = 'flex';
        incomingWbs.style.display = 'none';

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
        generalWbs.style.display = 'flex';
        incomingWbs.style.display = 'none';
    }
}

// Add event listeners to radio buttons
incomingRadio.addEventListener('change', updateFields);
outgoingRadio.addEventListener('change', updateFields);

// Set initial state on page load
updateFields();

// Final & Sub-Assembly Inspection
function FinalAndSubAssemblyInpsection() {
    if (finalInspection.checked) {
        fullInspection.disabled = false;
        partialInspection.disabled = false;
        testing.disabled = false;
    }
    else {
        fullInspection.disabled = true;
        partialInspection.disabled = true;
        fullInspection.checked = false;
        partialInspection.checked = false;
        testing.disabled = true;
        testing.checked = false;
        internalTesting.disabled = true;
        internalTesting.checked = false;
        rtiMQ.disabled = true;
        rtiMQ.checked = false;
    }
}

finalInspection.addEventListener('change', FinalAndSubAssemblyInpsection);
subAssembly.addEventListener('change', FinalAndSubAssemblyInpsection);

FinalAndSubAssemblyInpsection();

// Testing Type
function TypeOfTesting() {
    if (testing.checked) {
        internalTesting.disabled = false;
        rtiMQ.disabled = false;
    }
    else {
        internalTesting.disabled = true;
        rtiMQ.disabled = true;
        internalTesting.checked = false;
        rtiMQ.checked = false;
    }
}

let testingChecked = 0;

testing.addEventListener('click', function () {
    if (this.checked && testingChecked == 1) {
        testingChecked = -1;
        this.checked = false;
    }
    testingChecked++;
    TypeOfTesting();
});


// Material Analysis
function MaterialAnalysis() {
    if (materialAnalysisEvaluation.checked) {
        materialAnalysisXRF.disabled = false;
        hardnessTest.disabled = false;
        allowedGrinding.disabled = false;
        notAllowedGrinding.disabled = false;
    } else {
        materialAnalysisXRF.disabled = true;
        hardnessTest.disabled = true;
        allowedGrinding.disabled = true;
        notAllowedGrinding.disabled = true;
    }
}

materialAnalysisEvaluation.addEventListener('change', MaterialAnalysis);

MaterialAnalysis();


let xrfLastChecked = 0;
let hardnessLastChecked = 0;
let allowedLastChecked = 0;
let notAllowedLastChecked = 0;

materialAnalysisXRF.addEventListener('click', function () {
    if (this.checked && xrfLastChecked == 1) {
        xrfLastChecked = -1;
        this.checked = false;
    }
    xrfLastChecked++;
});

hardnessTest.addEventListener('click', function () {
    if (this.checked && hardnessLastChecked == 1) {
        hardnessLastChecked = -1;
        this.checked = false;
    }
    hardnessLastChecked++;
});

allowedGrinding.addEventListener('click', function () {
    if (this.checked && allowedLastChecked === 1) {
        allowedLastChecked = -1;
        this.checked = false;
    }
    allowedLastChecked++;
});

notAllowedGrinding.addEventListener('click', function () {
    if (this.checked && notAllowedLastChecked === 1) {
        notAllowedLastChecked = -1;
        this.checked = false;
    }
    notAllowedLastChecked++;
});

// Function to pad single-digit numbers with a leading zero
function pad(number) {
    if (number < 10) {
        return '0' + number;
    } else {
        return number;
    }
}

function updateTime() {
    var now = new Date();
    var day = now.getDate();          // Day of the month (1-31)
    var month = now.getMonth() + 1;   // Month (0-11, so add 1)
    var year = now.getFullYear();     // Full year (e.g., 2023)
    var hour = now.getHours();        // Hour (0-23)
    var minutes = now.getMinutes();   // Minutes (0-59)
    var hour = now.getHours();
    // Determine if it's AM or PM
    var meridiem = hour < 12 ? "AM" : "PM";
    // Format the string as day-month-year | hour:minutes
    var formattedTime = pad(day) + '-' + pad(month) + '-' + year + ' | ' + pad(hour) + ':' + pad(minutes) + ' ' + meridiem;
    document.getElementById('current-time').value = formattedTime;
}
updateTime(); // Set the initial time immediately
setInterval(updateTime, 1000); // Update every second

let rowCount = 1;

function addInputRow() {
    rowCount++;
    const additionalInputs = document.querySelector('.additional-inputs');
    const newRow = document.createElement('div');
    newRow.className = 'input-fields-top additional-row';
    newRow.style.opacity = '0'; // Start with opacity 0 for fade-in effect
    newRow.innerHTML = `
        <div class="wbs-group">
            <input type="text" id="wbs-${rowCount}" style="margin-bottom: 0;" placeholder="Enter WBS..." autocomplete="off">
        </div>
        <div class="description-group">
            <input type="text" id="desc-${rowCount}" style="margin-bottom: 0;" placeholder="Enter description..." autocomplete="off">
        </div>
        <div class="qty-group">
            <input type="number" id="quantity-incoming-${rowCount}" style="margin-bottom: 0;" placeholder="Enter Quantity">
        </div>
    `;
    additionalInputs.appendChild(newRow);

    // Trigger the fade-in animation
    setTimeout(() => {
        newRow.style.transition = 'opacity 0.3s ease-in-out';
        newRow.style.opacity = '1';
    }, 10);
}


function removeInputRow() {
    const additionalInputs = document.querySelector('.additional-inputs');
    const rows = additionalInputs.querySelectorAll('.additional-row');
    if (rows.length > 0) {
        const lastRow = rows[rows.length - 1];
        lastRow.style.transition = 'opacity 0.3s ease-in-out';
        lastRow.style.opacity = '0'; // Fade out

        // Remove the row after the transition ends
        lastRow.addEventListener('transitionend', () => {
            additionalInputs.removeChild(lastRow);
            rowCount--;
        }, { once: true }); // Ensure the event listener runs only once
    }
}

// Modal Function
const modal = document.getElementById("inspectionModal");
const openModalBtn = document.getElementById("openInspectionModal");
const closeModalBtn = document.querySelector(".close-btn");

openModalBtn.onclick = function () {
    modal.style.display = "block";
    setTimeout(function () {
        modal.style.opacity = "1";
    }, 10);
}

openModalBtn.addEventListener('click', updateColumnDisplay);

closeModalBtn.onclick = function () {
    modal.style.opacity = "0";
    setTimeout(function () {
        modal.style.display = "none";
    }, 300);
}

window.onclick = function (event) {
    if (event.target === modal) {
        modal.style.opacity = "0";
        setTimeout(function () {
            modal.style.display = "none";
        }, 300);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const rowsWrap = document.getElementById('outgoing-rows');
    const addBtn = document.getElementById('outgoing-add');
    const remBtn = document.getElementById('outgoing-remove');
    const outgoingExtra = document.getElementById('outgoing-extra-fields');

    const outgoingRadio = document.getElementById('outgoing-inspection');
    const incomingRadio = document.getElementById('incoming-inspection');
    const paintingRadio = document.getElementById('painting-inspection'); // <- NEW

    let outgoingIndex = rowsWrap ? rowsWrap.children.length : 0;

    function updateMinusState() {
        if (!remBtn) return;
        remBtn.disabled = rowsWrap.children.length <= 1;
    }

    function addOutgoingRow() {
        outgoingIndex += 1;
        const row = document.createElement('div');
        row.className = 'outgoing-row';
        row.innerHTML = `
      <div class="detail-group">
        <input type="text" id="outgoing-item-${outgoingIndex}" name="outgoing-item[]" placeholder="Enter item" />
      </div>
      <div class="detail-group">
        <input type="number" id="outgoing-quantity-${outgoingIndex}" name="outgoing-quantity[]" placeholder="Enter quantity" min="0" step="1" />
      </div>`;
        rowsWrap.appendChild(row);
        updateMinusState();
    }

    function removeOutgoingRow() {
        if (rowsWrap.children.length > 1) {
            rowsWrap.lastElementChild.remove();
            updateMinusState();
        }
    }

    if (addBtn) addBtn.addEventListener('click', addOutgoingRow);
    if (remBtn) remBtn.addEventListener('click', removeOutgoingRow);

    function toggleOutgoingExtras() {
        const isOutgoing = outgoingRadio && outgoingRadio.checked;
        const isPainting = paintingRadio && paintingRadio.checked; // <- NEW
        if (outgoingExtra) {
            // show only for outgoing AND not painting
            outgoingExtra.style.display = (isOutgoing && !isPainting) ? 'block' : 'none';
        }
        if (isOutgoing && !isPainting) updateMinusState();
    }

    if (incomingRadio) incomingRadio.addEventListener('change', toggleOutgoingExtras);
    if (outgoingRadio) outgoingRadio.addEventListener('change', toggleOutgoingExtras);
    if (paintingRadio) paintingRadio.addEventListener('change', toggleOutgoingExtras); // <- NEW

    // Initialize
    updateMinusState();
    toggleOutgoingExtras();
});
