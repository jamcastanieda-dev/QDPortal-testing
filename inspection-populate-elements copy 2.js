// Get references to the dropdown and the columns
const viewDropdown = document.getElementById("view-request-dropdown");
const viewCol1 = document.getElementById("view-columnOne");
const viewCol2 = document.getElementById("view-columnTwo");
const viewCol3 = document.getElementById("view-columnThree");
const viewCol4 = document.getElementById("view-columnFour");
const viewCol5 = document.getElementById("view-columnFive");

// WBS & Description
const viewIncomingWbs = document.getElementById("view-incoming-wbs");

// Get references to the radio buttons
const viewIncomingRadio = document.getElementById("view-incoming-inspection");
const viewOutgoingRadio = document.getElementById("view-outgoing-inspection");
const viewRawMaterialsRadio = document.getElementById("view-raw-materials");
const viewFabricatedPartsRadio = document.getElementById(
  "view-fabricated-parts"
);
const viewFinalInspection = document.getElementById("view-final-inspection");
const viewSubAssembly = document.getElementById("view-sub-assembly");
const viewFullInspection = document.getElementById("view-full");
const viewPartialInspection = document.getElementById("view-partial");
const viewTesting = document.getElementById("view-testing");
const viewInternalTesting = document.getElementById("view-internal-testing");
const viewRtiMQ = document.getElementById("view-rtiMQ");
const viewMaterialAnalysisEvaluation = document.getElementById(
  "view-material-analysis-evaluation"
);
const viewMaterialAnalysisXRF = document.getElementById("view-xrf");
const viewHardnessTest = document.getElementById("view-hardness");
const viewAllowedGrinding = document.getElementById("view-allowed-grinding");
const viewNotAllowedGrinding = document.getElementById(
  "view-not-allowed-grinding"
);

// Get references to the field groups to show/hide
const viewQuantityGroup = document.getElementById(
  "view-detail-quantity"
).parentElement;
const viewScopeGroup =
  document.getElementById("view-detail-scope").parentElement;
const viewVendorGroup = document.getElementById("view-vendor").parentElement;
const viewPOGroup = document.getElementById("view-po").parentElement;
const viewDRGroup = document.getElementById("view-dr").parentElement;

// Function to update column visibility based on selected value using the active class
function updateColumnDisplay() {
  const value = viewDropdown.value;

  // Remove active class from all columns
  viewCol1.classList.remove("active");
  viewCol2.classList.remove("active");
  viewCol3.classList.remove("active");
  viewCol4.classList.remove("active");
  viewCol5.classList.remove("active");

  // Add active class to the corresponding column based on the selected value
  if (value === "Final & Sub-Assembly Inspection") {
    viewCol1.classList.add("active");
    document.getElementById("view-wbs-group").style.display = "block";
    viewIncomingWbs.style.display = "none";
    viewIncomingRadio.checked = false;
  } else if (value === "Incoming and Outgoing Inspection") {
    viewCol2.classList.add("active");
    document.getElementById("view-wbs-group").style.display = "block";
    viewIncomingWbs.style.display = "none";
    viewIncomingRadio.checked = false;
  } else if (value === "Dimensional Inspection") {
    viewCol3.classList.add("active");
    document.getElementById("view-wbs-group").style.display = "block";
    viewIncomingWbs.style.display = "none";
    viewIncomingRadio.checked = false;
  } else if (value === "Material Analysis") {
    viewCol4.classList.add("active");
    document.getElementById("view-wbs-group").style.display = "block";
    viewIncomingWbs.style.display = "none";
    viewIncomingRadio.checked = false;
  } else if (value === "Calibration") {
    viewCol5.classList.add("active");
    document.getElementById("view-wbs-group").style.display = "none";
    document.getElementById("view-wbs").value = "";
    viewIncomingWbs.style.display = "none";
    viewIncomingRadio.checked = false;
  }
}

// Function to update field visibility
function updateFields() {
  if (viewIncomingRadio.checked) {
    // Show all fields for Incoming Inspection
    viewQuantityGroup.style.display = "flex";
    viewScopeGroup.style.display = "flex";
    viewVendorGroup.style.display = "flex";
    viewPOGroup.style.display = "flex";
    viewDRGroup.style.display = "flex";
    viewRawMaterialsRadio.checked = false;
    viewFabricatedPartsRadio.checked = false;
    viewIncomingWbs.style.display = "block";
    document.getElementById("view-wbs-section").style.display = "none";
  } else if (viewOutgoingRadio.checked) {
    // Show Quantity and Scope for Outgoing Inspection
    viewQuantityGroup.style.display = "flex";
    viewScopeGroup.style.display = "flex";
    // Hide Vendor, PO, and DR
    viewVendorGroup.style.display = "none";
    viewPOGroup.style.display = "none";
    viewDRGroup.style.display = "none";
    viewRawMaterialsRadio.checked = false;
    viewFabricatedPartsRadio.checked = false;
    viewIncomingWbs.style.display = "none";
    document.getElementById("view-wbs-section").style.display = "none";
  } else {
    // Neither is checked, hide all fields
    viewQuantityGroup.style.display = "none";
    viewScopeGroup.style.display = "none";
    viewVendorGroup.style.display = "none";
    viewPOGroup.style.display = "none";
    viewDRGroup.style.display = "none";
    viewRawMaterialsRadio.disabled = true;
    viewRawMaterialsRadio.checked = false;
    viewFabricatedPartsRadio.disabled = true;
    viewFabricatedPartsRadio.checked = false;
    viewIncomingWbs.style.display = "none";
    document.getElementById("view-wbs-section").style.display = "none";
  }
}

function ViewFinalAndSubAssemblyInpsection() {
  if (viewFinalInspection.checked) {
    viewFullInspection.disabled = false;
    viewPartialInspection.disabled = false;
    viewTesting.disabled = false;
  } else {
    viewFullInspection.disabled = true;
    viewPartialInspection.disabled = true;
    viewFullInspection.checked = false;
    viewPartialInspection.checked = false;
    viewTesting.disabled = true;
    viewTesting.checked = false;
    viewInternalTesting.disabled = true;
    viewInternalTesting.checked = false;
    viewRtiMQ.disabled = true;
    viewRtiMQ.checked = false;
  }
}

viewFinalInspection.addEventListener(
  "change",
  ViewFinalAndSubAssemblyInpsection
);
viewSubAssembly.addEventListener("change", ViewFinalAndSubAssemblyInpsection);

ViewFinalAndSubAssemblyInpsection();

function populateInspectionRequest(data, inspectionNo) {
  if (data.company == "rti") {
    document.getElementById("view-rti").checked = true;
  } else if (data.company == "ssd") {
    document.getElementById("view-ssd").checked = true;
  }

  const wbs = document.getElementById("view-wbs");
  const description = document.getElementById("view-description");
  const remarks = document.getElementById("view-remarks");
  const requestor = document.getElementById("view-requestor");
  const dateTime = document.getElementById("view-current-time");

  remarks.value = data.remarks;
  requestor.value = data.requestor;
  dateTime.value = data.date_time;

  // Check for different inspection types
  if (data.request === "Final & Sub-Assembly Inspection") {
    viewDropdown.value = "Final & Sub-Assembly Inspection";
    updateColumnDisplay();
    fetchFinalSubRequest(inspectionNo);
    wbs.value = data.wbs;
    description.value = data.description;
    viewIncomingWbs.style.display = "none";
    document.getElementById("view-wbs-section").style.display = "flex";
  } else if (data.request === "Incoming and Outgoing Inspection") {
    viewDropdown.value = "Incoming and Outgoing Inspection";
    updateColumnDisplay();
    fetchIncomingOutgoingRequest(inspectionNo);
    wbs.value = data.wbs;
    description.value = data.description;
    viewIncomingWbs.style.display = "none";
    document.getElementById("view-wbs-section").style.display = "flex";
  } else if (data.request === "Dimensional Inspection") {
    viewDropdown.value = "Dimensional Inspection";
    updateColumnDisplay();
    fetchDimensionalRequest(inspectionNo);
    wbs.value = data.wbs;
    description.value = data.description;
    viewIncomingWbs.style.display = "none";
    document.getElementById("view-wbs-section").style.display = "flex";
  } else if (data.request === "Material Analysis") {
    viewDropdown.value = "Material Analysis";
    updateColumnDisplay();
    fetchMaterialAnalysis(inspectionNo);
    wbs.value = data.wbs;
    description.value = data.description;
    viewIncomingWbs.style.display = "none";
    document.getElementById("view-wbs-section").style.display = "flex";
  } else if (data.request === "Calibration") {
    viewDropdown.value = "Calibration";
    updateColumnDisplay();
    fetchCalibration(inspectionNo);
    wbs.value = data.wbs;
    description.value = data.description;
    viewIncomingWbs.style.display = "none";
    document.getElementById("view-wbs-section").style.display = "flex";
  }
}

function fetchFinalSubRequest(inspectionNo) {
  const formData = new FormData();
  formData.append("inspection_no", inspectionNo);

  fetch("inspection-request-retrieve-final-sub.php", {
    method: "POST",
    body: formData,
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    })
    .then((data) => {
      if (data.status === "success") {
        populateFinalSubAssemblyInspection(data.data);
      } else {
        Swal.fire({
          icon: "error",
          title: "Error",
          text: data.message,
        });
      }
    })
    .catch((error) => {
      console.error("Fetch error:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to load inspection data",
      });
    });
}

// Function to Populate Final & Sub-Assembly Inspection Fields
function populateFinalSubAssemblyInspection(data) {
  if (data.type_of_inspection == "final-inspection") {
    document.getElementById("view-final-inspection").checked = true;
  } else if (data.type_of_inspection == "sub-assembly") {
    document.getElementById("view-sub-assembly").checked = true;
    document.getElementById("view-full").checked = false;
    document.getElementById("view-partial").checked = false;
    ViewFinalAndSubAssemblyInpsection();
  }

  if (data.final_inspection == "full") {
    document.getElementById("view-full").checked = true;
  } else if (data.final_inspection == "partial") {
    document.getElementById("view-partial").checked = true;
  }

  document.getElementById("view-quantity").value = data.quantity || "";

  if (data.testing == "testing") {
    document.getElementById("view-testing").checked = true;
    viewTestingChecked = 1;
  }

  if (data.type_of_testing == "internal-testing") {
    document.getElementById("view-internal-testing").checked = true;
  } else if (data.type_of_testing == "rti-mq") {
    document.getElementById("view-rtiMQ").checked = true;
  }

  document.getElementById("view-scope").value = data.scope || "";
  document.getElementById("view-location-of-item").value =
    data.location_of_item || "";
}

function fetchDimensionalRequest(inspectionNo) {
  const formData = new FormData();
  formData.append("inspection_no", inspectionNo);

  fetch("inspection-request-retrieve-dimension.php", {
    method: "POST",
    body: formData,
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    })
    .then((data) => {
      if (data.status === "success") {
        populateDimensionalInspection(data.data);
      } else {
        Swal.fire({
          icon: "error",
          title: "Error",
          text: data.message,
        });
      }
    })
    .catch((error) => {
      console.error("Fetch error:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to load inspection data",
      });
    });
}

// Function to Populate Dimensional Inspection Fields
function populateDimensionalInspection(data) {
  if (data.type_of_inspection == "dimensional") {
    document.getElementById("view-dimensional-inspection").checked = true;
  }

  document.getElementById("view-dimension-notification").value =
    data.notification;
  document.getElementById("view-dimension-part-name").value = data.part_name;
  document.getElementById("view-dimension-part-no").value = data.part_no;
  document.getElementById("view-dimension-location-of-item").value =
    data.location_of_item;
}

function fetchMaterialAnalysis(inspectionNo) {
  const formData = new FormData();
  formData.append("inspection_no", inspectionNo);

  fetch("inspection-request-retrieve-material.php", {
    method: "POST",
    body: formData,
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    })
    .then((data) => {
      if (data.status === "success") {
        pouplateMaterialAnalysis(data.data);
      } else {
        Swal.fire({
          icon: "error",
          title: "Error",
          text: data.message,
        });
      }
    })
    .catch((error) => {
      console.error("Fetch error:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to load inspection data",
      });
    });
}

function pouplateMaterialAnalysis(data) {
  if (data.type_of_inspection == "material") {
    document.getElementById("view-material-analysis-evaluation").checked = true;
  }

  if (data.xrf == "xrf") {
    document.getElementById("view-xrf").checked = true;
    viewXrfLastChecked = 1;
  }

  if (data.hardness_test == "hardness") {
    document.getElementById("view-hardness").checked = true;
    viewHardnessLastChecked = 1;
  }

  if (data.type_of_grinding == "allowed") {
    document.getElementById("view-allowed-grinding").checked = true;
  } else if (data.type_of_grinding == "notAllowed") {
    document.getElementById("view-not-allowed-grinding").checked = true;
  }

  document.getElementById("view-material-notification").value =
    data.notification;
  document.getElementById("view-material-part-name").value = data.part_name;
  document.getElementById("view-material-part-no").value = data.part_no;
  document.getElementById("view-material-location-of-item").value =
    data.location_of_item;
}

function fetchIncomingOutgoingRequest(inspectionNo) {
  const formData = new FormData();
  formData.append("inspection_no", inspectionNo);

  fetch("inspection-request-retrieve-incoming.php", {
    method: "POST",
    body: formData,
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    })
    .then((data) => {
      if (data.status === "success") {
        populateIncomingOutgoingRequest(data.data, inspectionNo);
      } else {
        Swal.fire({
          icon: "error",
          title: "Error",
          text: data.message,
        });
      }
    })
    .catch((error) => {
      console.error("Fetch error:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to load inspection data",
      });
    });
}

// Function to Populate Final & Sub-Assembly Inspection Fields
function populateIncomingOutgoingRequest(data, inspectionNo) {
  const inspectionAttachments = document.getElementById(
    "inspection-attachments"
  );
  const attachmentsContainer = document.getElementById("view_attachments");
  document.getElementById("view-incoming-inspection").disabled = true;
  document.getElementById("view-outgoing-inspection").disabled = true;
  if (data.type_of_inspection == "incoming") {
    document.getElementById("view-incoming-inspection").checked = true;
    if (privilege == "Initiator") {
      fetchInspectionAttachmentsForRequestor(inspectionNo);
    } else {
      fetchInspectionAttachments(inspectionNo);
    }
    inspectionAttachments.style.display = "block";
    updateFields();
    viewIncomingWbs.style.display = "block";
    document.getElementById("view-wbs-section").style.display = "none";
    fetchIncomingWBS(inspectionNo);
  } else if (data.type_of_inspection == "outgoing") {
    document.getElementById("view-outgoing-inspection").checked = true;
    updateFields();
    document.getElementById("view-raw-materials").disabled = true;
    document.getElementById("view-fabricated-parts").disabled = true;
    attachmentsContainer.innerHTML = ""; // Clear previous attachments
    inspectionAttachments.style.display = "none";
    viewIncomingWbs.style.display = "none";
    document.getElementById("view-wbs-section").style.display = "flex";
    if (privilege == "Initiator") {
      document.getElementById("view-inspection-upload").style.display = "none";
    }
  }

  if (data.type_of_incoming_inspection == "raw-mats") {
    document.getElementById("view-raw-materials").checked = true;
  } else if (data.type_of_incoming_inspection == "fab-parts") {
    document.getElementById("view-fabricated-parts").checked = true;
  }

  document.getElementById("view-detail-quantity").value = data.quantity;
  document.getElementById("view-detail-scope").value = data.scope;
  document.getElementById("view-vendor").value = data.vendor;
  document.getElementById("view-po").value = data.po_no;
  document.getElementById("view-dr").value = data.dr_no;
  document.getElementById("view-incoming-location-of-item").value =
    data.location_of_item;
}

function fetchInspectionAttachments(inspectionNo) {
  const formData = new FormData();
  formData.append("inspection_no", inspectionNo);

  fetch("inspection-request-retrieve-attachments.php", {
    method: "POST",
    body: formData,
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    })
    .then((data) => {
      const attachmentsContainer = document.getElementById("view_attachments");
      attachmentsContainer.innerHTML = ""; // Clear previous attachments
      if (data.status === "success") {
        if (data.files.length === 0) {
          attachmentsContainer.innerHTML = "<p>No attachments found.</p>";
        } else {
          data.files.forEach((file) => {
            // Extract filename using both / and \ for compatibility
            const fileName = file.split("/").pop().split("\\").pop();

            const fileLink = document.createElement("a");
            fileLink.href = `${file}`;
            fileLink.textContent = fileName;
            fileLink.target = "_blank";
            fileLink.classList.add("attachment-link");
            attachmentsContainer.appendChild(fileLink);
          });
        }
      } else {
        Swal.fire({
          icon: "error",
          title: "Error",
          text: data.message,
        });
      }
    })
    .catch((error) => {
      console.error("Fetch error:", error);
      const attachmentsContainer = document.getElementById("view_attachments");
      attachmentsContainer.innerHTML = "<p>Failed to load attachments.</p>";
    });
}

function fetchCalibration(inspectionNo) {
  const formData = new FormData();
  formData.append("inspection_no", inspectionNo);

  fetch("inspection-request-retrieve-calibration.php", {
    method: "POST",
    body: formData,
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    })
    .then((data) => {
      if (data.status === "success") {
        populateCalibrationRequest(data.data);
      } else {
        Swal.fire({
          icon: "error",
          title: "Error",
          text: data.message,
        });
      }
    })
    .catch((error) => {
      console.error("Fetch error:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to load inspection data",
      });
    });
}

function populateCalibrationRequest(data) {
  document.getElementById("view-equipment-no").value = data.equipment_no;
  document.getElementById("view-calibration-location-of-item").value =
    data.location_of_item;
}

function fetchInspectionCompletedAttachments(inspectionNo) {
  const formData = new FormData();
  formData.append("inspection_no", inspectionNo);

  fetch("inspection-request-retrieve-completed-attachments.php", {
    method: "POST",
    body: formData,
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    })
    .then((data) => {
      const attachmentsContainer = document.getElementById(
        "view_completed-attachments"
      );
      attachmentsContainer.innerHTML = ""; // Clear previous attachments
      if (data.status === "success") {
        if (data.files.length === 0) {
          attachmentsContainer.innerHTML = "<p>No attachments found.</p>";
        } else {
          data.files.forEach((file) => {
            // Extract filename using both / and \ for compatibility
            const fileName = file.split("/").pop().split("\\").pop();

            const fileLink = document.createElement("a");
            fileLink.href = `${file}`;
            fileLink.textContent = fileName;
            fileLink.target = "_blank";
            fileLink.classList.add("attachment-link");
            attachmentsContainer.appendChild(fileLink);
          });
          document.getElementById("completed-document-no").value =
            data.document_no;
          document.getElementById("completed-by").textContent =
            "Completed By: " + data.completed_by;
          if (data.acknowledged_by != null) {
            document.getElementById("acknowledged-by").textContent =
              "Acknowledged By: " + data.acknowledged_by;
            document.getElementById("acknowledged-by").style.display = "block";
          } else {
            document.getElementById("acknowledged-by").style.display = "none";
          }
        }
      } else {
        Swal.fire({
          icon: "error",
          title: "Error",
          text: data.message,
        });
      }
    });
}

function fetchInspectionRejectedAttachments(inspectionNo) {
  const formData = new FormData();
  formData.append("inspection_no", inspectionNo);

  fetch("inspection-request-retrieve-failed-attachments.php", {
    method: "POST",
    body: formData,
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    })
    .then((data) => {
      const attachmentsContainer = document.getElementById(
        "view_rejected-attachments"
      );
      attachmentsContainer.innerHTML = ""; // Clear previous attachments
      if (data.status === "success") {
        if (data.files.length === 0) {
          attachmentsContainer.innerHTML = "<p>No attachments found.</p>";
        } else {
          data.files.forEach((file) => {
            // Extract filename using both / and \ for compatibility
            const fileName = file.split("/").pop().split("\\").pop();

            const fileLink = document.createElement("a");
            fileLink.href = `${file}`;
            fileLink.textContent = fileName;
            fileLink.target = "_blank";
            fileLink.classList.add("attachment-link");
            attachmentsContainer.appendChild(fileLink);
          });
          document.getElementById("rejected-document-no").value =
            data.document_no;
          document.getElementById("failed-by").textContent =
            "Failed by: " + data.failed_by;
        }
      } else {
        Swal.fire({
          icon: "error",
          title: "Error",
          text: data.message,
        });
      }
    })
    .then(
      fetch("inspection-request-retrieve-reject.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          inspection_no: inspectionNo,
        }),
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.status === "success") {
            viewRejectRemarks.value = data.reject.remarks;
            viewRejectedBy.textContent =
              "Rejected By: " + data.reject.remarks_by;
            rejectionSection.style.display = "block";
          } else {
            rejectionSection.style.display = "none";
          }
        })
    );
}

function fetchIncomingWBS(inspectionNo) {
  fetch("inspection-request-retrieve-incoming-wbs.php", {
    method: "POST",
    body: new URLSearchParams({ inspection_no: inspectionNo }),
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.status == "success") {
        if (data.incoming.length > 0) {
          let row = null;
          const additionalInputs = document.getElementById(
            "view-additional-input"
          );
          additionalInputs.innerHTML = ""; // Clear previous rows
          viewRowCount = data.incoming.length;

          for (let i = 0; i < data.incoming.length; i++) {
            const item = data.incoming[i];
            const newRow = document.createElement("div");
            row = i + 1;
            newRow.className = "input-fields-top view-additional-row";
            newRow.style.opacity = "0";

            const passedQty = +item.passed_qty;
            const failedQty = +item.failed_qty;
            const pwfPassQty = +item.pwf_pass;
            const pwfFailQty = +item.pwf_fail;
            const passDisplay = passedQty > 0 ? passedQty : "–";
            const failDisplay = failedQty > 0 ? failedQty : "–";
            const pwfPassDisp = pwfPassQty > 0 ? pwfPassQty : "–";
            const pwfFailDisp = pwfFailQty > 0 ? pwfFailQty : "–";

            // Case: Initiator & REJECTED/CANCELLED — show editable
            if (
              privilege === "Initiator" &&
              (requestStatus === "REJECTED" || requestStatus === "CANCELLED")
            ) {
              newRow.innerHTML = `
                        <div class="wbs-group">
                            <input type="text" id="view-wbs-${row}" value="${item.wbs}"  autocomplete="off">
                        </div>
                        <div class="description-group">
                            <input type="text" id="view-desc-${row}" value="${item.description}"  autocomplete="off">
                        </div>
                    `;
            } else {
              // Only style when status is set and in one of these overall states
              if (
                item.status != null ||
                ["FOR APPROVAL", "PASSED", "PASSED W/ FAILED"].includes(
                  requestStatus
                )
              ) {
                if (item.status === "passed") {
                  newRow.innerHTML = `
                                <div class="wbs-group">
                                    
                                    <input type="text" id="view-wbs-${row}"
                                            value="${item.wbs}"
                                            class="pass-wbs"
                                            readonly>
                                </div>
                                <div class="description-group">
                                    <input type="text" id="view-desc-${row}"
                                            value="${item.description}"
                                            class="pass-wbs"
                                            readonly>
                                </div>
                                <div class="wbs-quantity-group">
                                    <input type="text" id="view-qty-${row}" style="width: 50px;"
                                            value="${passDisplay}"
                                            class="pass-wbs"
                                            readonly>
                                </div>
                            `;
                } else if (item.status === "failed") {
                  newRow.innerHTML = `
                                <div class="wbs-group">
                                    <input type="text" id="view-wbs-${row}"
                                            value="${item.wbs}"
                                            class="fail-wbs"
                                            readonly>
                                </div>
                                <div class="description-group">
                                    <input type="text" id="view-desc-${row}"
                                            value="${item.description}"
                                            class="fail-wbs"
                                            readonly>
                                </div>
                                <div class="wbs-quantity-group">
                                    <input type="text" id="view-qty-${row}" style="width: 50px;"
                                            value="${failDisplay}"
                                            class="fail-wbs"
                                            readonly>
                                </div>
                            `;
                } else if (item.status === "pwf") {
                  newRow.innerHTML = `
                                <div class="wbs-group">
                                <label>&nbsp;</label>
                                    <input type="text" id="view-wbs-${row}"
                                            value="${item.wbs}"
                                            class="pwf-wbs"
                                            readonly>
                                </div>
                                <div class="description-group">
                                <label>&nbsp;</label>
                                    <input type="text" id="view-desc-${row}"
                                            value="${item.description}"
                                            class="pwf-wbs"
                                            readonly>
                                </div>
                                <div class="wbs-quantity-group">
                                    <div class="qty-col">
                                    <label for="view-passed-qty-${row}">Passed:</label>
                                    <input type="text"
                                            id="view-passed-qty-${row}"
                                            value="${pwfPassDisp}"
                                            class="pwf-wbs"
                                            readonly>
                                    </div>
                                    <div class="qty-col">
                                    <label for="view-failed-qty-${row}">Failed:</label>
                                    <input type="text"
                                            id="view-failed-qty-${row}"
                                            value="${pwfFailDisp}"
                                            class="pwf-wbs"
                                            readonly>
                                    </div>
                                </div>
                            `;
                }
              } else {
                // default — no styling
                newRow.innerHTML = `
                            <div class="wbs-group">
                                <input type="text" id="view-wbs-${row}"
                                        value="${item.wbs}"
                                        readonly>
                            </div>
                            <div class="description-group">
                                <input type="text" id="view-desc-${row}"
                                        value="${item.description}"
                                        readonly>
                            </div>
                        `;
              }
            }

            additionalInputs.appendChild(newRow);
            // fade it in
            setTimeout(() => {
              newRow.style.transition = "opacity 0.3s ease-in-out";
              newRow.style.opacity = "1";
            }, 10);
          }
        }
      } else {
        Swal.fire({
          icon: "error",
          title: "Oops...",
          text: "Failed to fetch the data. Please try again.",
        });
      }
    })
    .catch((error) => {
      console.error("Error:", error);
      Swal.fire({
        icon: "error",
        title: "Oops...",
        text: "Something went wrong. Please try again later.",
      });
    });
}

function openModal() {
  // Modal
  const modal = document.getElementById("viewInspectionModal");
  modal.style.display = "block";
  modal.style.opacity = 1;
}

const viewCloseModalBtn = document.getElementById("view-close-button");
viewCloseModalBtn.onclick = () => {
  const modal = document.getElementById("viewInspectionModal");
  modal.style.display = "none";
  document.getElementById("view-testing").checked = false;
  document.getElementById("view-internal-testing").checked = false;
  document.getElementById("view-rtiMQ").checked = false;
  document.getElementById("view-xrf").checked = false;
  document.getElementById("view-hardness").checked = false;
  document.getElementById("view-allowed-grinding").checked = false;
  document.getElementById("view-not-allowed-grinding").checked = false;
};
