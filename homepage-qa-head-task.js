function redirectToPage(url) {
    window.location.href = url;
}

document.getElementById('for-approval').addEventListener('click', function () {
    redirectToPage('inspection-section-for-approval.php');
});

