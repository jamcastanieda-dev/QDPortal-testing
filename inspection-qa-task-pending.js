let inspectionNo = null;
let request = null;
let privilege = null;
let requestStatus = null;
let selectedFilesReject = [];
let selectedFilesCompletion = [];
let tempFilesReject = [];
let tempFilesCompletion = [];
let wbs = "";
let selectedInput = null;

function resetCompleteModal() {
  // clear the document-no field
  const docNo = document.getElementById("complete-document-no");
  if (docNo) docNo.value = "";

  // clear the hidden file input and the drop-zone UI
  const realInput = document.getElementById("complete-inspection-file");
  const list = document.getElementById("inspection-complete-file-list");
  const nameSpan = document.getElementById("complete-file-name");
  const dropInput = document.getElementById("inspection-complete-file-input");
  if (realInput) realInput.value = "";
  if (dropInput) dropInput.value = "";
  if (list) list.innerHTML = "";
  if (nameSpan) nameSpan.textContent = "No file chosen";

  // clear any staged files arrays
  selectedFilesCompletion = [];
  tempFilesCompletion = [];

  // hide & clear the Incoming-WBS section
  const wbsSection = document.getElementById("incoming-wbs-section");
  const wbsList = document.getElementById("wbs-list");
  if (wbsSection) wbsSection.style.display = "none";
  if (wbsList) wbsList.innerHTML = "";

  // reset any WBS-selection state
  wbs = "";
  selectedInput = null;
}

document.addEventListener("DOMContentLoaded", function () {
  /* File Upload for Inspection Request Completion */
  const completeModal = document.getElementById("complete-modal");
  const completeMainClose = document.getElementById("complete-main-close");

  const rejectModal = document.getElementById("reject-modal");
  const rejectMainClose = document.getElementById("reject-main-close");

  completeMainClose.addEventListener("click", function () {
    closeUploadFileModal(
      completeModal,
      "complete-inspection-file",
      "complete-file-name",
      "inspection-complete-file-input",
      "inspection-complete-file-list"
    );
    resetCompleteModal();
  });

  rejectMainClose.addEventListener("click", function () {
    closeUploadFileModal(
      rejectModal,
      "reject-inspection-file",
      "reject-file-name",
      "inspection-reject-file-input",
      "inspection-reject-file-list"
    );
    resetCompleteModal();
  });

  function fetchInspectionData() {
    const actionContainer = document.getElementById("action-container");
    let currentTarget = null;
    let isTransitioning = false;

    const switchIcon = (iconElement, newIcon) => {
      iconElement.classList.add("icon-fade-out");

      iconElement.addEventListener("transitionend", function onFadeOut() {
        iconElement.removeEventListener("transitionend", onFadeOut);

        iconElement.classList.remove("fa-bars", "fa-xmark");
        iconElement.classList.add(newIcon);

        iconElement.classList.remove("icon-fade-out");
        iconElement.classList.add("icon-fade-in");

        setTimeout(() => {
          iconElement.classList.remove("icon-fade-in");
        }, 300);
      });
    };

    document
      .getElementById("inspection-tbody")
      .addEventListener("click", function (event) {
        const hamburgerIcon = event.target.closest(".hamburger-icon");
        if (hamburgerIcon && !isTransitioning) {
          isTransitioning = true;

          const iconElement = hamburgerIcon.querySelector("i");
          const row = hamburgerIcon.closest("tr");
          inspectionNo = row
            .querySelector("td:nth-child(1)")
            .textContent.trim();
          requestStatus = row
            .querySelector("td:nth-child(7)")
            .textContent.trim();
          request = row.querySelector("td:nth-child(4)").textContent.trim();

          if (
            currentTarget === hamburgerIcon &&
            !actionContainer.classList.contains("hidden")
          ) {
            actionContainer.classList.add("hidden");

            switchIcon(iconElement, "fa-bars");

            currentTarget = null;
            actionContainer.addEventListener(
              "transitionend",
              () => {
                isTransitioning = false;
              },
              { once: true }
            );
            return;
          }

          // Revert all icons
          document.querySelectorAll(".hamburger-icon i").forEach((icon) => {
            if (icon !== iconElement && icon.classList.contains("fa-xmark")) {
              switchIcon(icon, "fa-bars");
            }
          });

          switchIcon(iconElement, "fa-xmark");
          currentTarget = hamburgerIcon;

          const iconRect = hamburgerIcon.getBoundingClientRect();
          const containerWidth = actionContainer.offsetWidth || 150;
          const leftPosition = iconRect.left - containerWidth - 5;
          const topPosition =
            iconRect.top +
            iconRect.height / 2 -
            actionContainer.offsetHeight / 2;

          const handleShow = () => {
            actionContainer.removeEventListener("transitionend", handleShow);
            isTransitioning = false;
          };

          const handleHide = () => {
            actionContainer.removeEventListener("transitionend", handleHide);
            actionContainer.style.left = `${leftPosition}px`;
            actionContainer.style.top = `${topPosition}px`;
            actionContainer.dataset.inspectionNo = inspectionNo;

            actionContainer.addEventListener("transitionend", handleShow);
            actionContainer.classList.remove("hidden");
          };

          if (!actionContainer.classList.contains("hidden")) {
            actionContainer.addEventListener("transitionend", handleHide);
            actionContainer.classList.add("hidden");
          } else {
            actionContainer.style.left = `${leftPosition}px`;
            actionContainer.style.top = `${topPosition}px`;
            actionContainer.dataset.inspectionNo = inspectionNo;
            actionContainer.addEventListener("transitionend", handleShow);
            actionContainer.classList.remove("hidden");
          }
        }

        // Remarks For Schedule
        fetch("inspection-table-remarks.php", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({ inspection_no: inspectionNo }),
        })
          .then((response) => response.json())
          .then((data) => {
            const tbody = document.getElementById("remarks-tbody");
            tbody.innerHTML = "";
            document.getElementById("remarks-section").style.display = "block";

            // Check if data is an error or has rows returned
            if (data.error) {
              console.error("Error:", data.error);
              tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;">${data.error}</td></tr>`;
              return;
            }

            if (data.length > 0) {
              // Loop through the returned data and populate the table rows
              data.forEach((item) => {
                const row = document.createElement("tr");

                // Create the remarks_by cell
                const remarksByCell = document.createElement("td");
                remarksByCell.textContent = item.remarks_by;
                row.appendChild(remarksByCell);

                // Create the date_time cell
                const dateTimeCell = document.createElement("td");
                dateTimeCell.textContent = item.date_time;
                row.appendChild(dateTimeCell);

                // Create the action cell (customize the action content as needed)
                const actionCell = document.createElement("td");
                const actionBtn = document.createElement("button");
                actionBtn.classList.add("remarks-view-btn");
                actionBtn.textContent = "View";
                actionCell.appendChild(actionBtn);
                row.appendChild(actionCell);

                tbody.appendChild(row);
              });
            } else {
              document.getElementById("remarks-section").style.display = "none";
            }
          })
          .catch((error) => {
            console.error("Error fetching data:", error);
          });

        // Rescheduled Request
        fetch("inspection-table-rescheduled.php", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({ inspection_no: inspectionNo }),
        })
          .then((response) => response.json())
          .then((data) => {
            const tbody = document.getElementById("reschedule-tbody");
            tbody.innerHTML = "";
            document.getElementById("reschedule-section").style.display =
              "block";

            // Check if data is an error or has rows returned
            if (data.error) {
              console.error("Error:", data.error);
              tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;">${data.error}</td></tr>`;
              return;
            }

            if (data.length > 0) {
              // Loop through the returned data and populate the table rows
              data.forEach((item) => {
                const row = document.createElement("tr");

                // Create the remarks_by cell
                const remarksByCell = document.createElement("td");
                remarksByCell.textContent = item.rescheduled_by;
                row.appendChild(remarksByCell);

                // Create the date_time cell
                const dateTimeCell = document.createElement("td");
                dateTimeCell.textContent = item.date_time;
                row.appendChild(dateTimeCell);

                tbody.appendChild(row);
              });
            } else {
              document.getElementById("reschedule-section").style.display =
                "none";
            }
          })
          .catch((error) => {
            console.error("Error fetching data:", error);
          });
      });

    function fetchAndDisplayOutgoingItems(inspectionNo) {
      const container = document.getElementById('view-outgoing-rows');
      container.innerHTML = '<div>Loading...</div>';

      const formData = new FormData();
      formData.append('inspection_no', inspectionNo);

      fetch('inspection-get-outgoing-items.php', {
        method: 'POST',
        body: formData
      })
        .then(response => {
          if (!response.ok) throw new Error('Network error');
          return response.json();
        })
        .then(data => {
          container.innerHTML = '';
          if (!data.length) {
            container.innerHTML = '<div>No outgoing items found.</div>';
            return;
          }

          // Create a header row with labels only once
          const headerRow = document.createElement('div');
          headerRow.classList.add('outgoing-row');
          headerRow.innerHTML = `
            <div class="detail-group">
                <label>Item:</label>
            </div>
            <div class="detail-group">
                <label>Quantity:</label>
            </div>
        `;
          container.appendChild(headerRow);

          // Create a row for each item without labels
          data.forEach((item, index) => {
            const rowDiv = document.createElement('div');
            rowDiv.classList.add('outgoing-row');

            rowDiv.innerHTML = `
                <div class="detail-group">
                    <input type="text" id="view-outgoing-item-${index + 1}" name="outgoing-item[]" value="${item.item}" readonly />
                </div>
                <div class="detail-group">
                    <input type="text" id="view-outgoing-quantity-${index + 1}" name="outgoing-quantity[]" value="${item.quantity}" readonly />
                </div>
            `;
            container.appendChild(rowDiv);
          });
        })
        .catch(() => {
          container.innerHTML = '<div>Error loading outgoing items.</div>';
        });
    }

    function fetchAndDisplayDimensionalAttachments(inspectionNo) {
      const attachmentList = document.getElementById('view-dimensional-attachments-list');
      attachmentList.innerHTML = "<li>Loading attachments...</li>";

      const formData = new FormData();
      formData.append('inspection_no', inspectionNo);

      fetch('inspection-get-dimensional-attachments.php', {
        method: 'POST',
        body: formData
      })
        .then(response => {
          if (!response.ok) throw new Error('Network error');
          return response.json();
        })
        .then(data => {
          attachmentList.innerHTML = '';
          if (data.length === 0) {
            attachmentList.innerHTML = "<li>No attachment.</li>";
          } else {
            data.forEach(item => {
              const li = document.createElement('li');
              li.textContent = item.attachment;
              li.style.cursor = 'pointer';
              li.title = 'Open attachment in new tab';
              li.addEventListener('click', () => {
                window.open(`${item.attachment}`, '_blank');
              });
              attachmentList.appendChild(li);
            });
          }
        })
        .catch(() => {
          attachmentList.innerHTML = "<li>Error loading attachments.</li>";
        });
    }

    function fetchAndDisplayMaterialAttachments(inspectionNo) {
      const attachmentList = document.getElementById('view-material-attachments-list');
      attachmentList.innerHTML = "<li>Loading attachments...</li>";

      const formData = new FormData();
      formData.append('inspection_no', inspectionNo);

      fetch('inspection-get-material-attachments.php', {
        method: 'POST',
        body: formData
      })
        .then(response => {
          if (!response.ok) throw new Error('Network error');
          return response.json();
        })
        .then(data => {
          attachmentList.innerHTML = '';
          if (data.length === 0) {
            attachmentList.innerHTML = "<li>No attachment.</li>";
          } else {
            data.forEach(item => {
              const li = document.createElement('li');
              li.textContent = item.attachment;
              li.style.cursor = 'pointer';
              li.title = 'Open attachment in new tab';
              li.addEventListener('click', () => {
                window.open(`${item.attachment}`, '_blank');
              });
              attachmentList.appendChild(li);
            });
          }
        })
        .catch(() => {
          attachmentList.innerHTML = "<li>Error loading attachments.</li>";
        });
    }

    document.getElementById("view-button").addEventListener("click", function () {
      // Get request type from the selected row
      const selectedRow = currentTarget.closest('tr');
      const requestType = selectedRow.querySelector('td:nth-child(4)').textContent.trim();

      // If Outgoing Inspection → show and load extra fields
      if (requestType === 'Outgoing Inspection') {
        document.getElementById('view-outgoing-extra-fields').style.display = 'block';
        fetchAndDisplayOutgoingItems(inspectionNo);
      } else {
        document.getElementById('view-outgoing-extra-fields').style.display = 'none';
      }

      fetchInspectionRequest(inspectionNo);
      fetchAndDisplayDimensionalAttachments(inspectionNo); // <-- New line
      fetchAndDisplayMaterialAttachments(inspectionNo);
      openModal();
      actionContainer.classList.add("hidden");
      if (currentTarget) {
        const icon = currentTarget.querySelector("i");
        switchIcon(icon, "fa-bars");
      }
    });

    document
      .getElementById("completed-button")
      .addEventListener("click", function () {
        resetCompleteModal();
        if (request == "Incoming Inspection") {
          document.getElementById("incoming-wbs-section").style.display =
            "block";
          fetch("inspection-request-retrieve-incoming-wbs.php", {
            method: "POST",
            body: new URLSearchParams({
              inspection_no: inspectionNo,
            }),
          })
            .then((response) => response.json())
            .then((data) => {
              // inside the .then(data => { ... }) where you populate #wbs-list
              if (data.status == "success" && data.incoming.length > 0) {
                const wbsList = document.getElementById("wbs-list");
                wbsList.innerHTML = "";
                data.incoming.forEach((item) => {
                  const input = document.createElement("input");
                  input.type = "text";
                  input.readOnly = true;
                  input.dataset.wbs = item.wbs;
                  input.dataset.quantity = item.quantity; // <-- needed for auto-fill
                  input.value = item.wbs;

                  // (optional) hydrate prior state so it’s visible + locked correctly
                  if ((item.pwf_pass ?? 0) > 0 || (item.pwf_fail ?? 0) > 0) {
                    input.classList.add("pwf-wbs");
                    input.dataset.pwfPass = item.pwf_pass;
                    input.dataset.pwfFail = item.pwf_fail;
                    input.value = `${item.wbs} (Passed: ${item.pwf_pass} ∕ Failed: ${item.pwf_fail})`;
                  } else if ((item.passed_qty ?? 0) > 0) {
                    input.classList.add("pass-wbs");
                    input.dataset.passedQty = item.passed_qty;
                    input.value = `${item.wbs} (Passed: ${item.passed_qty})`;
                  } else if ((item.failed_qty ?? 0) > 0) {
                    input.classList.add("fail-wbs");
                    input.dataset.failedQty = item.failed_qty;
                    input.value = `${item.wbs} (Failed: ${item.failed_qty})`;
                  }

                  wbsList.appendChild(input);
                });
                attachWbsClickHandlers(); // now that inputs exist
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
        } else {
          document.getElementById("incoming-wbs-section").style.display =
            "none";
        }
        openUploadFileModal(completeModal);
        actionContainer.classList.add("hidden");
        if (currentTarget) {
          const icon = currentTarget.querySelector("i");
          switchIcon(icon, "fa-bars");
        }
      });
    // For Completion
    UploadAttachments(
      "complete-upload-file",
      "inspection-complete-modal-upload",
      "inspection-complete-drop-zone",
      "inspection-complete-file-input",
      "inspection-complete-file-list",
      "inspection-complete-confirm-button",
      "complete-inspection-file",
      "complete-file-name",
      selectedFilesCompletion,
      tempFilesCompletion
    );

    document
      .getElementById("reject-button")
      .addEventListener("click", function () {
        openUploadFileModal(rejectModal);
        actionContainer.classList.add("hidden");
        if (currentTarget) {
          const icon = currentTarget.querySelector("i");
          switchIcon(icon, "fa-bars");
        }
      });

    // For Rejection
    UploadAttachments(
      "reject-upload-file",
      "inspection-reject-modal-upload",
      "inspection-reject-drop-zone",
      "inspection-reject-file-input",
      "inspection-reject-file-list",
      "inspection-reject-confirm-button",
      "reject-inspection-file",
      "reject-file-name",
      selectedFilesReject,
      tempFilesReject
    );

    document.getElementById("inspection-complete-button").addEventListener("click", function () {
      if (request == "Incoming Inspection") {
        const inputs = Array.from(
          document.querySelectorAll("#wbs-list input")
        );
        // find any that aren’t marked
        const unmarked = inputs.filter(
          (i) =>
            !i.classList.contains("pass-wbs") &&
            !i.classList.contains("fail-wbs") &&
            !i.classList.contains("pwf-wbs")
        );

        // if any left unmarked, warn and bail
        if (unmarked.length) {
          Swal.fire({
            icon: "warning",
            title: "Incomplete Inspection",
            text: `Please mark all ${unmarked.length} unprocessed WBS item(s) before completing.`,
          });
          return;
        }
      }

      // Value of File Input
      let files = document.getElementById("complete-inspection-file").files;
      const documentNo = document.getElementById("complete-document-no");

      if (files.length === 0) {
        Swal.fire(
          "Warning",
          "Please upload the required file documents.",
          "warning"
        );
        return;
      }

      if (documentNo.value == "") {
        Swal.fire("Missing Input", "Please enter a document no.", "warning");
        return;
      }

      Swal.fire({
        title: "Are you sure?",
        text: "Do you want to pass the Inspection Request?",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Yes",
        cancelButtonText: "No",
      }).then((result) => {
        if (result.isConfirmed) {
          if (request == "Calibration") {
            fetch("inspection-update-completed-calibration.php", {
              method: "POST",
              body: new URLSearchParams({
                "inspection-no": inspectionNo,
              }),
            })
              .then((response) => response.json())
              .then((data) => {
                if (data.success) {
                  // Display SweetAlert success message
                  Swal.fire({
                    icon: "success",
                    title: "Request Passed!",
                    text: "Inspection request has passed.",
                    showConfirmButton: false,
                    timer: 1500,
                  }).then(() => {
                    loadInspections();
                    fetch(
                      "inspection-request-insert-completed-notification.php",
                      {
                        method: "POST",
                        body: new URLSearchParams({
                          "inspection-no": inspectionNo,
                        }),
                      }
                    );
                    DateTime();
                    InsertRequestHistory(
                      inspectionNo,
                      formattedTime,
                      "Inspection request for calibration is completed."
                    );
                    InsertRequestHistoryQA(
                      inspectionNo,
                      formattedTime,
                      "Inspection request for calibration is completed."
                    );
                    if (socket && socket.readyState === WebSocket.OPEN) {
                      socket.send(
                        JSON.stringify({
                          action: "approved",
                        })
                      );
                    }
                    closeUploadFileModal(
                      completeModal,
                      "complete-inspection-file",
                      "complete-file-name",
                      "inspection-reject-file-input",
                      "inspection-reject-file-list"
                    );
                  });
                } else {
                  console.error("Failed to update status:", data.message);

                  // Display SweetAlert error message
                  Swal.fire({
                    icon: "error",
                    title: "Oops...",
                    text: "Failed to update the status. Please try again.",
                  });
                }
              })
              .catch((error) => {
                console.error("Error:", error);

                // Display SweetAlert error message
                Swal.fire({
                  icon: "error",
                  title: "Oops...",
                  text: "Something went wrong. Please try again later.",
                });
              });
          } else {
            fetch("inspection-update-completed.php", {
              method: "POST",
              body: new URLSearchParams({
                "inspection-no": inspectionNo,
              }),
            })
              .then((response) => response.json())
              .then((data) => {
                if (data.success) {
                  // if this is an Incoming Inspection, first save the per-WBS statuses
                  let chain = Promise.resolve();

                  if (request === "Incoming Inspection") {
                    // 1) collect the marked WBS inputs
                    const inputs = Array.from(
                      document.querySelectorAll("#wbs-list input")
                    );

                    const items = inputs
                      .map((input) => {
                        const originalWbs = input.dataset.wbs;
                        if (input.classList.contains("pass-wbs")) {
                          return {
                            wbs: originalWbs,
                            status: "passed",
                            passed_qty:
                              parseInt(input.dataset.passedQty, 10) || 0,
                          };
                        }
                        if (input.classList.contains("fail-wbs")) {
                          return {
                            wbs: originalWbs,
                            status: "failed",
                            failed_qty:
                              parseInt(input.dataset.failedQty, 10) || 0,
                          };
                        }
                        if (input.classList.contains("pwf-wbs")) {
                          return {
                            wbs: originalWbs,
                            status: "pwf",
                            pwf_pass:
                              parseInt(input.dataset.pwfPass, 10) || 0,
                            pwf_fail:
                              parseInt(input.dataset.pwfFail, 10) || 0,
                          };
                        }
                        return null;
                      })
                      .filter((x) => x);

                    // 2) build a FormData payload for the items
                    const itemsForm = new FormData();
                    itemsForm.append("inspection-no", inspectionNo);
                    items.forEach((it, i) => {
                      itemsForm.append(`items[${i}][wbs]`, it.wbs);
                      itemsForm.append(`items[${i}][status]`, it.status);
                      itemsForm.append(`items[${i}][passed_qty]`, it.passed_qty || 0);
                      itemsForm.append(`items[${i}][failed_qty]`, it.failed_qty || 0);
                      itemsForm.append(`items[${i}][pwf_pass]`, it.pwf_pass);
                      itemsForm.append(`items[${i}][pwf_fail]`, it.pwf_fail);
                    });

                    // 3) post to your PHP and chain off that promise
                    chain = fetch(
                      "inspection-request-update-incoming-wbs-completion.php",
                      {
                        method: "POST",
                        body: itemsForm,
                      }
                    )
                      .then((r) => r.json())
                      .then((res) => {
                        if (res.status !== "success") {
                          throw new Error(
                            res.message || "Could not save WBS statuses."
                          );
                        }
                        console.log(
                          "Incoming Inspection - WBS statuses saved"
                        );
                      });
                  }

                  // 4) once items (if any) are saved, proceed to success UI and attachments
                  chain
                    .then(() => {
                      return Swal.fire({
                        icon: "success",
                        title: "Request Passed!",
                        text: "Inspection request has passed.",
                        showConfirmButton: false,
                        timer: 1500,
                      });
                    })
                    .then(() => {
                      loadInspections();
                      DateTime();
                      InsertRequestHistoryQA(
                        inspectionNo,
                        formattedTime,
                        "Completion of inspection request is pending for approval."
                      );
                      if (socket && socket.readyState === WebSocket.OPEN) {
                        socket.send(JSON.stringify({ action: "approval" }));
                      }
                      // close the modal and reset file inputs (you already have this)
                      closeUploadFileModal(
                        completeModal,
                        "complete-inspection-file",
                        "complete-file-name",
                        "inspection-complete-file-input",
                        "inspection-complete-file-list"
                      );
                    })
                    .catch((err) => {
                      console.error(err);
                      Swal.fire(
                        "Error",
                        err.message || "Something went wrong.",
                        "error"
                      );
                    });
                } else {
                  console.error("Failed to update status:", data.message);

                  // Display SweetAlert error message
                  Swal.fire({
                    icon: "error",
                    title: "Oops...",
                    text: "Failed to update the status. Please try again.",
                  });
                }
              })
              .catch((error) => {
                console.error("Error:", error);

                // Display SweetAlert error message
                Swal.fire({
                  icon: "error",
                  title: "Oops...",
                  text: "Something went wrong. Please try again later.",
                });
              });
          }

          actionContainer.classList.add("hidden");
          if (currentTarget) {
            const icon = currentTarget.querySelector("i");
            switchIcon(icon, "fa-bars");
          }

          const attachmentFormData = new FormData();
          attachmentFormData.append("inspection-no", inspectionNo);
          attachmentFormData.append("complete-document-no", documentNo.value);
          for (let i = 0; i < files.length; i++) {
            attachmentFormData.append("complete-inspection-file[]", files[i]); // Append each file under 'inspection-file[]'
          }

          fetch("inspection-request-insert-completed-attachments.php", {
            method: "POST",
            body: attachmentFormData,
          })
            .then((response) => response.json())
            .then((result) => {
              // Assuming that a success response contains { success: true, message: '...' }
              if (result.error) {
                // If not successful, show an error message.
                Swal.fire({
                  icon: "error",
                  title: "Error",
                  text: result.message,
                });
              } else {
                // Success: Clear file inputs and update UI
                const fileInput = document.getElementById(
                  "inspection-complete-file-input"
                );
                const inspectionFile = document.getElementById(
                  "complete-inspection-file"
                );
                const fileList = document.getElementById(
                  "inspection-complete-file-list"
                );
                const fileNameDisplay =
                  document.getElementById("complete-file-name");

                documentNo.value = "";
                fileInput.value = ""; // Clear the file input
                inspectionFile.value = "";
                fileList.innerHTML = ""; // Clear the file list
                fileNameDisplay.textContent = "No file chosen"; // Reset the display message

                // Alternatively, if you still want to remove children manually:
                while (fileList.firstChild) {
                  fileList.removeChild(fileList.firstChild);
                }
              }
            });
        }
      });
    });

    document
      .getElementById("reschedule-button")
      .addEventListener("click", function () {
        showModal();
        actionContainer.classList.add("hidden");
        if (currentTarget) {
          const icon = currentTarget.querySelector("i");
          switchIcon(icon, "fa-bars");
        }
      });

    document
      .getElementById("inspection-reject-button")
      .addEventListener("click", function () {
        // Value of File Input
        let files = document.getElementById("reject-inspection-file").files;
        const documentNo = document.getElementById("reject-document-no");
        const remarks = document.getElementById("reject-remarks");

        if (files.length === 0) {
          Swal.fire(
            "Warning",
            "Please upload the required file documents.",
            "warning"
          );
          return;
        }

        if (documentNo.value == "") {
          Swal.fire("Missing Input", "Please enter a document no.", "warning");
          return;
        }

        if (remarks.value == "") {
          Swal.fire("Missing Input", "Please enter the remarks.", "warning");
          return;
        }

        Swal.fire({
          title: "Are you sure?",
          text: "Do you want to fail the Inspection Request?",
          icon: "warning",
          showCancelButton: true,
          confirmButtonText: "Yes",
          cancelButtonText: "No",
        }).then((result) => {
          if (result.isConfirmed) {
            fetch("inspection-update-failed.php", {
              method: "POST",
              body: new URLSearchParams({
                "inspection-no": inspectionNo,
              }),
            })
              .then((response) => response.json())
              .then((data) => {
                if (data.success) {
                  // Display SweetAlert success message
                  Swal.fire({
                    icon: "success",
                    title: "Request Failed!",
                    text: "Inspection request has failed.",
                    showConfirmButton: false,
                    timer: 1500,
                  }).then(() => {
                    loadInspections();
                    DateTime();
                    InsertRequestHistoryQA(
                      inspectionNo,
                      formattedTime,
                      "Failure of inspection request is pending for approval."
                    );
                    if (socket && socket.readyState === WebSocket.OPEN) {
                      socket.send(
                        JSON.stringify({
                          action: "change",
                        })
                      );
                    }
                    closeUploadFileModal(
                      rejectModal,
                      "reject-inspection-file",
                      "reject-file-name",
                      "inspection-reject-file-input",
                      "inspection-reject-file-list"
                    );
                  });
                } else {
                  console.error("Failed to update status:", data.message);

                  // Display SweetAlert error message
                  Swal.fire({
                    icon: "error",
                    title: "Oops...",
                    text: "Failed to update the status. Please try again.",
                  });
                }
              })
              .catch((error) => {
                console.error("Error:", error);

                // Display SweetAlert error message
                Swal.fire({
                  icon: "error",
                  title: "Oops...",
                  text: "Something went wrong. Please try again later.",
                });
              });

            actionContainer.classList.add("hidden");
            if (currentTarget) {
              const icon = currentTarget.querySelector("i");
              switchIcon(icon, "fa-bars");
            }

            const attachmentFormData = new FormData();
            attachmentFormData.append("inspection-no", inspectionNo);
            attachmentFormData.append("reject-document-no", documentNo.value);
            for (let i = 0; i < files.length; i++) {
              attachmentFormData.append("reject-inspection-file[]", files[i]); // Append each file under 'inspection-file[]'
            }

            fetch("inspection-request-insert-rejected-attachments.php", {
              method: "POST",
              body: attachmentFormData,
            })
              .then((response) => response.json())
              .then((result) => {
                // Assuming that a success response contains { success: true, message: '...' }
                if (result.error) {
                  // If not successful, show an error message.
                  Swal.fire({
                    icon: "error",
                    title: "Error",
                    text: result.message,
                  });
                } else {
                  // Success: Clear file inputs and update UI
                  const fileInput = document.getElementById(
                    "inspection-reject-file-input"
                  );
                  const inspectionFile = document.getElementById(
                    "reject-inspection-file"
                  );
                  const fileList = document.getElementById(
                    "inspection-reject-file-list"
                  );
                  const fileNameDisplay =
                    document.getElementById("reject-file-name");

                  documentNo.value = "";
                  fileInput.value = ""; // Clear the file input
                  inspectionFile.value = "";
                  fileList.innerHTML = ""; // Clear the file list
                  fileNameDisplay.textContent = "No file chosen"; // Reset the display message

                  // Alternatively, if you still want to remove children manually:
                  while (fileList.firstChild) {
                    fileList.removeChild(fileList.firstChild);
                  }
                }
              });
            fetch("inspection-request-insert-reject.php", {
              method: "POST",
              body: new URLSearchParams({
                "reject-remarks": remarks.value,
                inspection_no: inspectionNo,
              }),
            })
              .then((response) => response.json())
              .then((data) => {
                if (data.error) {
                  Swal.fire({
                    icon: "error",
                    title: "Oops...",
                    text: "Something went wrong. Please try again later.",
                  });
                } else {
                  remarks.value = "";
                }
              });
          }
        });
      });

    // Close modal when the close button is clicked
    remarksClose.addEventListener("click", function () {
      hideModal();
    });

    // When the modal's submit button is clicked
    remarksSubmit.addEventListener("click", function () {
      UpdateStatusToForReschedule("inspection-table-qa-pending.php");
    });
  }

  function fetchInspectionRequest(inspectionNo) {
    const formData = new FormData();
    formData.append("inspection_no", inspectionNo);

    fetch("inspection-request-retrieve-initiator.php", {
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
          populateInspectionRequest(data.data, inspectionNo);
          privilege = data.privilege;
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

  // Fetch data on page load
  fetchInspectionData();
  RetrieveHistoryQA("inspection-tbody");
});

function clearSelection() {
  document
    .querySelectorAll("#wbs-list input")
    .forEach((i) => i.classList.remove("selected-wbs"));
}

function attachWbsClickHandlers() {
  document.querySelectorAll("#wbs-list input").forEach((input) => {
    input.addEventListener("click", () => {
      // If we've already set pwfPass on this input, block reselection:
      if (input.dataset.pwfPass !== undefined) {
        Swal.fire({
          icon: "info",
          title: "Already Processed",
          text: "You’ve already entered Pass/Fail counts for this WBS item.",
        });
        return;
      }
      // otherwise do your normal selection
      clearSelection();
      input.classList.add("selected-wbs");
      selectedInput = input;
      wbs = input.value;
    });
  });
}

function handleResult(mode) {
  if (!wbs) {
    return Swal.fire({
      icon: "warning",
      title: "No WBS Selected",
      text: "Please click on a WBS item first.",
    });
  }

  // guard against re-processing / conflicting states
  if (mode === "pass") {
    if (selectedInput.dataset.pwfPass !== undefined) {
      return Swal.fire({
        icon: "info",
        title: "Already Processed",
        text: "This item already has Pass/Fail counts.",
      });
    }
    if (selectedInput.dataset.passedQty !== undefined) {
      return Swal.fire({
        icon: "info",
        title: "Already Entered",
        text: "You can’t enter passed quantity again for this item.",
      });
    }
    if (selectedInput.dataset.failedQty !== undefined) {
      return Swal.fire({
        icon: "info",
        title: "Already Entered",
        text: "This item already has a Failed quantity. Use 'Pass w/ Fail' to split counts.",
      });
    }

    const qty = parseInt(selectedInput.dataset.quantity, 10);
    if (isNaN(qty)) {
      return Swal.fire({
        icon: "error",
        title: "Missing Quantity",
        text: "No quantity found for this WBS item.",
      });
    }

    selectedInput.classList.remove("fail-wbs", "pwf-wbs");
    selectedInput.classList.add("pass-wbs");
    selectedInput.dataset.passedQty = qty;
    selectedInput.value = `${selectedInput.dataset.wbs} (Passed: ${qty})`;
    return;
  }

  if (mode === "fail") {
    if (selectedInput.dataset.pwfPass !== undefined) {
      return Swal.fire({
        icon: "info",
        title: "Already Processed",
        text: "This item already has Pass/Fail counts.",
      });
    }
    if (selectedInput.dataset.failedQty !== undefined) {
      return Swal.fire({
        icon: "info",
        title: "Already Entered",
        text: "You can’t enter failed quantity again for this item.",
      });
    }
    if (selectedInput.dataset.passedQty !== undefined) {
      return Swal.fire({
        icon: "info",
        title: "Already Entered",
        text: "This item already has a Passed quantity. Use 'Pass w/ Fail' to split counts.",
      });
    }

    const qty = parseInt(selectedInput.dataset.quantity, 10);
    if (isNaN(qty)) {
      return Swal.fire({
        icon: "error",
        title: "Missing Quantity",
        text: "No quantity found for this WBS item.",
      });
    }

    selectedInput.classList.remove("pass-wbs", "pwf-wbs");
    selectedInput.classList.add("fail-wbs");
    selectedInput.dataset.failedQty = qty;
    selectedInput.value = `${selectedInput.dataset.wbs} (Failed: ${qty})`;
    return;
  }

  // PWF: keep manual prompt as-is
  if (mode === "pwf") {
    if (selectedInput.dataset.pwfPass !== undefined) {
      return Swal.fire({
        icon: "info",
        title: "Already Entered",
        text: "You can’t enter Pass/Fail again for this item.",
      });
    }
    if (
      selectedInput.dataset.passedQty !== undefined ||
      selectedInput.dataset.failedQty !== undefined
    ) {
      return Swal.fire({
        icon: "info",
        title: "Already Entered",
        text: "This item already has a single Pass or Fail. Clear it first if you need Pass/Fail split.",
      });
    }

    Swal.fire({
      title: "Enter Passed / Failed Quantities",
      html:
        '<input id="swal-pwf-pass" type="number" min="0" class="swal2-input" placeholder="Passed">' +
        '<input id="swal-pwf-fail" type="number" min="0" class="swal2-input" placeholder="Failed">',
      focusConfirm: false,
      preConfirm: () => {
        const pass = parseInt(document.getElementById("swal-pwf-pass").value, 10);
        const fail = parseInt(document.getElementById("swal-pwf-fail").value, 10);
        if (isNaN(pass) || isNaN(fail)) {
          Swal.showValidationMessage("Both fields must be valid numbers.");
        }
        return { pass, fail };
      },
    }).then((result) => {
      if (!result.isConfirmed) return;
      const { pass, fail } = result.value;
      selectedInput.classList.remove("pass-wbs", "fail-wbs");
      selectedInput.classList.add("pwf-wbs");
      selectedInput.dataset.pwfPass = pass;
      selectedInput.dataset.pwfFail = fail;
      selectedInput.value = `${selectedInput.dataset.wbs} (Passed: ${pass} ∕ Failed: ${fail})`;
    });
  }
}


document
  .querySelector(".pass")
  .addEventListener("click", () => handleResult("pass"));
document
  .querySelector(".fail")
  .addEventListener("click", () => handleResult("fail"));
document
  .querySelector(".pwf")
  .addEventListener("click", () => handleResult("pwf"));
