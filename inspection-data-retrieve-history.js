const modalHistory = document.getElementById('historyModal');
const closeBtn = modalHistory.querySelector('.modal-history-close');
const backdrop = modalHistory.querySelector('.modal-history-backdrop');

function openHistoryModal() {
    modalHistory.style.display = 'block';
}

function closeHistoryModal() {
    modalHistory.style.display = 'none';
}

closeBtn.addEventListener('click', closeHistoryModal);
backdrop.addEventListener('click', closeHistoryModal);

function parseCustomDateTime(str) {
    const [datePart, timePart] = str.split('|').map(s => s.trim());
    const [dd, mm, yyyy] = datePart.split('-').map(Number);
    let [time, ampm] = timePart.split(' ');
    let [hh, min] = time.split(':').map(Number);

    // convert 12-hour to 24-hour
    if (ampm === 'PM' && hh < 12) hh += 12;
    if (ampm === 'AM' && hh === 12) hh = 0;

    // Note: JS Date months are 0-indexed
    return new Date(yyyy, mm - 1, dd, hh, min);
}

// 2) Compute a human-friendly relative time string
function getRelativeTimeFrom(now, past) {
    const diffMs = now - past;
    if (diffMs < 0) return 'in the future';

    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`;

    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} hour${hrs === 1 ? '' : 's'} ago`;

    const days = Math.floor(hrs / 24);
    return `${days} day${days === 1 ? '' : 's'} ago`;
}

// For regular history (table with 'inspection-table-history.php')
function RetrieveHistory(table) {
    document.getElementById(table).addEventListener('click', function (event) {
        if (event.target.classList.contains('history-button')) {
            const row = event.target.closest('tr');
            const inspectionNoCell = row.querySelector('td[data-inspection-no]');
            if (!inspectionNoCell) {
                console.error('No inspection number cell found.');
                return;
            }
            const inspectionNo = inspectionNoCell.dataset.inspectionNo;
            openHistoryModal();

            fetch('inspection-table-history.php', {
                method: 'POST',
                body: new URLSearchParams({
                    inspection_no: inspectionNo
                })
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                if (data.status === 'success') {
                    let historyTable = document.getElementById('history-table-request');
                    historyTable.innerHTML = '';
                    for (let i = 0; i < data.history.length; i++) {
                        const pastDate = parseCustomDateTime(data.history[i].date_time);
                        const now = new Date();  // 2025-05-01T15:23:27 (Asia/Manila)
                        const relative = getRelativeTimeFrom(now, pastDate);
                        let row = `
                        <tr>
                        <td>${data.history[i].inspection_no}</td>
                        <td>${data.history[i].name}</td>
                        <td>${data.history[i].date_time} (${relative})</td>
                        <td>${data.history[i].activity}</td>
                        </tr>
                        `;
                        historyTable.innerHTML += row;
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
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Failed to load inspection data'
                });
            });
        }
    });
}

// For QA-specific history (table with 'inspection-table-history-qa.php')
function RetrieveHistoryQA(table) {
    document.getElementById(table).addEventListener('click', function (event) {
        if (event.target.classList.contains('history-button')) {
            const row = event.target.closest('tr');
            const inspectionNoCell = row.querySelector('td[data-inspection-no]');
            if (!inspectionNoCell) {
                console.error('No inspection number cell found.');
                return;
            }
            const inspectionNo = inspectionNoCell.dataset.inspectionNo;
            openHistoryModal();

            fetch('inspection-table-history-qa.php', {
                method: 'POST',
                body: new URLSearchParams({
                    inspection_no: inspectionNo
                })
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                if (data.status === 'success') {
                    let historyTable = document.getElementById('history-table-request');
                    historyTable.innerHTML = '';
                    for (let i = 0; i < data.history.length; i++) {
                        const pastDate = parseCustomDateTime(data.history[i].date_time);
                        const now = new Date();  // 2025-05-01T15:23:27 (Asia/Manila)
                        const relative = getRelativeTimeFrom(now, pastDate);
                        let row = `
                        <tr>
                        <td>${data.history[i].inspection_no}</td>
                        <td>${data.history[i].name}</td>
                        <td>${data.history[i].date_time} (${relative})</td>
                        <td>${data.history[i].activity}</td>
                        </tr>
                        `;
                        historyTable.innerHTML += row;
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
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Failed to load inspection data'
                });
            });
        }
    });
}

// For completion-specific history (also with 'inspection-table-history-qa.php')
function RetrieveHistoryCompletion(table) {
    document.getElementById(table).addEventListener('click', function (event) {
        if (event.target.classList.contains('history-button')) {
            const row = event.target.closest('tr');
            const inspectionNoCell = row.querySelector('td[data-inspection-no]');
            if (!inspectionNoCell) {
                console.error('No inspection number cell found.');
                return;
            }
            const inspectionNo = inspectionNoCell.dataset.inspectionNo;
            openHistoryModal();

            fetch('inspection-table-history-qa.php', {
                method: 'POST',
                body: new URLSearchParams({
                    inspection_no: inspectionNo
                })
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                if (data.status === 'success') {
                    let historyTable = document.getElementById('history-table-request');
                    historyTable.innerHTML = '';
                    for (let i = 0; i < data.history.length; i++) {
                        const pastDate = parseCustomDateTime(data.history[i].date_time);
                        const now = new Date();  // 2025-05-01T15:23:27 (Asia/Manila)
                        const relative = getRelativeTimeFrom(now, pastDate);
                        let row = `
                        <tr>
                        <td>${data.history[i].inspection_no}</td>
                        <td>${data.history[i].name}</td>
                        <td>${data.history[i].date_time} (${relative})</td>
                        <td>${data.history[i].activity}</td>
                        </tr>
                        `;
                        historyTable.innerHTML += row;
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
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Failed to load inspection data'
                });
            });
        }
    });
}
