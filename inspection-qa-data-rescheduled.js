let inspectionNo = null;
let privilege = null;

document.addEventListener('DOMContentLoaded', function () {

    function fetchInspectionData() {

        const actionContainer = document.getElementById('action-container');
        let currentTarget = null;
        let isTransitioning = false;

        const switchIcon = (iconElement, newIcon) => {
            iconElement.classList.add('icon-fade-out');

            iconElement.addEventListener('transitionend', function onFadeOut() {
                iconElement.removeEventListener('transitionend', onFadeOut);

                iconElement.classList.remove('fa-bars', 'fa-xmark');
                iconElement.classList.add(newIcon);

                iconElement.classList.remove('icon-fade-out');
                iconElement.classList.add('icon-fade-in');

                setTimeout(() => {
                    iconElement.classList.remove('icon-fade-in');
                }, 300);
            });
        };

        document.getElementById('inspection-tbody').addEventListener('click', function (event) {
            const hamburgerIcon = event.target.closest('.hamburger-icon');
            if (hamburgerIcon && !isTransitioning) {
                isTransitioning = true;

                const iconElement = hamburgerIcon.querySelector('i');
                const row = hamburgerIcon.closest('tr');
                inspectionNo = row.querySelector('td:nth-child(1)').textContent.trim();

                if (currentTarget === hamburgerIcon && !actionContainer.classList.contains('hidden')) {
                    actionContainer.classList.add('hidden');

                    switchIcon(iconElement, 'fa-bars');

                    currentTarget = null;
                    actionContainer.addEventListener('transitionend', () => {
                        isTransitioning = false;
                    }, { once: true });
                    return;
                }

                // Revert all icons
                document.querySelectorAll('.hamburger-icon i').forEach(icon => {
                    if (icon !== iconElement && icon.classList.contains('fa-xmark')) {
                        switchIcon(icon, 'fa-bars');
                    }
                });

                switchIcon(iconElement, 'fa-xmark');
                currentTarget = hamburgerIcon;

                const iconRect = hamburgerIcon.getBoundingClientRect();
                const containerWidth = actionContainer.offsetWidth || 150;
                const leftPosition = iconRect.left - containerWidth - 5;
                const topPosition = iconRect.top + (iconRect.height / 2) - (actionContainer.offsetHeight / 2);

                const handleShow = () => {
                    actionContainer.removeEventListener('transitionend', handleShow);
                    isTransitioning = false;
                };

                const handleHide = () => {
                    actionContainer.removeEventListener('transitionend', handleHide);
                    actionContainer.style.left = `${leftPosition}px`;
                    actionContainer.style.top = `${topPosition}px`;
                    actionContainer.dataset.inspectionNo = inspectionNo;

                    actionContainer.addEventListener('transitionend', handleShow);
                    actionContainer.classList.remove('hidden');
                };

                if (!actionContainer.classList.contains('hidden')) {
                    actionContainer.addEventListener('transitionend', handleHide);
                    actionContainer.classList.add('hidden');
                } else {
                    actionContainer.style.left = `${leftPosition}px`;
                    actionContainer.style.top = `${topPosition}px`;
                    actionContainer.dataset.inspectionNo = inspectionNo;
                    actionContainer.addEventListener('transitionend', handleShow);
                    actionContainer.classList.remove('hidden');
                }
            }

        });

        document.getElementById('view-button').addEventListener('click', function () {
            fetchInspectionRequest(inspectionNo);
            openModal();
            actionContainer.classList.add('hidden');
            if (currentTarget) {
                const icon = currentTarget.querySelector('i');
                switchIcon(icon, 'fa-bars');
            }
            // Remarks For Schedule
            fetch('inspection-table-remarks.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams({ inspection_no: inspectionNo })
            })
                .then(response => response.json())
                .then(data => {
                    const tbody = document.getElementById('remarks-tbody');
                    tbody.innerHTML = '';
                    document.getElementById('remarks-section').style.display = 'block';

                    // Check if data is an error or has rows returned
                    if (data.error) {
                        console.error('Error:', data.error);
                        tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;">${data.error}</td></tr>`;
                        return;
                    }

                    if (data.length > 0) {
                        // Loop through the returned data and populate the table rows
                        data.forEach(item => {
                            const row = document.createElement('tr');

                            // Create the remarks_by cell
                            const remarksByCell = document.createElement('td');
                            remarksByCell.textContent = item.remarks_by;
                            row.appendChild(remarksByCell);

                            // Create the date_time cell
                            const dateTimeCell = document.createElement('td');
                            dateTimeCell.textContent = item.date_time;
                            row.appendChild(dateTimeCell);

                            // Create the action cell (customize the action content as needed)
                            const actionCell = document.createElement('td');
                            const actionBtn = document.createElement('button');
                            actionBtn.classList.add('remarks-view-btn');
                            actionBtn.textContent = 'View';
                            actionCell.appendChild(actionBtn);
                            row.appendChild(actionCell);

                            tbody.appendChild(row);
                        });
                    } else {
                        document.getElementById('remarks-section').style.display = 'none';
                    }
                })
                .catch(error => {
                    console.error('Error fetching data:', error);
                });

            // Rescheduled Request
            fetch('inspection-table-rescheduled.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams({ inspection_no: inspectionNo })
            })
                .then(response => response.json())
                .then(data => {
                    const tbody = document.getElementById('reschedule-tbody');
                    tbody.innerHTML = '';
                    document.getElementById('reschedule-section').style.display = 'block';

                    // Check if data is an error or has rows returned
                    if (data.error) {
                        console.error('Error:', data.error);
                        tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;">${data.error}</td></tr>`;
                        return;
                    }

                    if (data.length > 0) {
                        // Loop through the returned data and populate the table rows
                        data.forEach(item => {
                            const row = document.createElement('tr');

                            // Create the remarks_by cell
                            const remarksByCell = document.createElement('td');
                            remarksByCell.textContent = item.rescheduled_by;
                            row.appendChild(remarksByCell);

                            // Create the date_time cell
                            const dateTimeCell = document.createElement('td');
                            dateTimeCell.textContent = item.date_time;
                            row.appendChild(dateTimeCell);

                            tbody.appendChild(row);
                        });
                    } else {
                        document.getElementById('reschedule-section').style.display = 'none';
                    }
                })
                .catch(error => {
                    console.error('Error fetching data:', error);
                });
        });

        document.getElementById('accept-button').addEventListener('click', function () {
            UpdateStatusToPending('inspection-table-qa-rescheduled.php');
            actionContainer.classList.add('hidden');
            if (currentTarget) {
                const icon = currentTarget.querySelector('i');
                switchIcon(icon, 'fa-bars');
            }
        });

        document.getElementById('reschedule-button').addEventListener('click', function () {
            showModal();
            actionContainer.classList.add('hidden');
            if (currentTarget) {
                const icon = currentTarget.querySelector('i');
                switchIcon(icon, 'fa-bars');
            }
        });

        // Close modal when the close button is clicked
        remarksClose.addEventListener("click", function () {
            hideModal();
        });

        // When the modal's submit button is clicked
        remarksSubmit.addEventListener("click", function () {
            UpdateStatusToForReschedule('inspection-table-qa-rescheduled.php');
        });

    }

    function fetchInspectionRequest(inspectionNo) {
        const formData = new FormData();
        formData.append('inspection_no', inspectionNo);

        fetch('inspection-request-retrieve-initiator.php', {
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
                    privilege = data.privilege;
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

    // Fetch data on page load
    fetchInspectionData();
    RetrieveHistory('inspection-tbody');
});
