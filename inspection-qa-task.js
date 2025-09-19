const forApprovalModal = document.getElementById('for-approval-modal');
const closeModal = document.getElementById('close-modal');

function redirectToPage(url) {
    window.location.href = url;
}

// QA Task
document.getElementById('received').addEventListener('click', function () {
    redirectToPage('inspection-section-received.php');
    document.getElementById('notification-received').style.display = 'none';
    numberOfRequest = 0;
});

document.getElementById('pending').addEventListener('click', function () {
    redirectToPage('inspection-section-pending.php');
});

document.getElementById('for-reschedule').addEventListener('click', function () {
    redirectToPage('inspection-section-for-reschedule.php');
});

document.getElementById('rescheduled').addEventListener('click', function () {
    redirectToPage('inspection-section-rescheduled.php');
});

document.getElementById('completed').addEventListener('click', function () {
    redirectToPage('inspection-section-completed.php');
});

document.getElementById('rejected').addEventListener('click', function () {
    redirectToPage('inspection-section-rejected.php');
});

document.getElementById('failed').addEventListener('click', function () {
    redirectToPage('inspection-section-failed.php');
});

document.getElementById('cancelled').addEventListener('click', function () {
    redirectToPage('inspection-section-cancelled.php');
});

document.getElementById('for-approval').addEventListener('click', function () {
    forApprovalModal.classList.add('active');
});

// Hide modal
closeModal.addEventListener('click', () => {
    forApprovalModal.classList.remove('active');
});

forApprovalModal.addEventListener('click', e => {
    if (e.target === forApprovalModal) {
        forApprovalModal.classList.remove('active');
    }
});

// For Approval
document.getElementById('completion-button').addEventListener('click', () => {
    redirectToPage('inspection-section-for-approval-completion.php');
});

document.getElementById('reschedule-button').addEventListener('click', () => {
    redirectToPage('inspection-section-for-approval-reschedule.php');
});

document.getElementById('failure-button').addEventListener('click', () => {
    redirectToPage('inspection-section-for-approval-failure.php');
});
