function InsertRequestHistory(inspectionNo, dateTime, historyActivity) {
    const historyFormData = new FormData();
    historyFormData.append('inspection-no', inspectionNo);
    historyFormData.append('current-time', dateTime);
    historyFormData.append('activity', historyActivity);

    fetch('inspection-request-insert-history.php', {
        method: 'POST',
        body: historyFormData
    })
        .then(response => response.json())
        .then(data => {
            if (data.status == 'error') {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: data.message,
                });
            }
        });
}

function InsertRequestHistoryQA(inspectionNo, dateTime, historyActivity) {
    const historyFormData = new FormData();
    historyFormData.append('inspection-no', inspectionNo);
    historyFormData.append('current-time', dateTime);
    historyFormData.append('activity', historyActivity);

    fetch('inspection-request-insert-history-qa.php', {
        method: 'POST',
        body: historyFormData
    })
        .then(response => response.json())
        .then(data => {
            if (data.status == 'error') {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: data.message,
                });
            }
        });
}