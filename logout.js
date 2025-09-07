document.addEventListener('DOMContentLoaded', () => {
    const profileImage = document.querySelector('.profile-image');
    const logoutButton = document.getElementById('logoutButton');

    // Toggle logout button on profile image click
    profileImage.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent event from bubbling to document
        const isVisible = logoutButton.classList.toggle('show');
        profileImage.setAttribute('aria-expanded', isVisible ? 'true' : 'false');
    });

    // Hide logout button when clicking elsewhere
    document.addEventListener('click', (e) => {
        if (!profileImage.contains(e.target) && !logoutButton.contains(e.target)) {
            logoutButton.classList.remove('show');
            profileImage.setAttribute('aria-expanded', 'false');
        }
    });
});

document.getElementById('logoutButton').addEventListener('click', function (event) {
    event.preventDefault();  // Prevent the default link action

    const logoutUrl = this.href; // Get the URL from the link

    // Display the confirmation dialog using SweetAlert2
    Swal.fire({
        title: 'Logout?',
        text: "Do you want to logout?",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes',
        cancelButtonText: 'No'
    }).then((result) => {
        if (result.isConfirmed) {
            // If confirmed, navigate to the logout URL
            window.location.href = logoutUrl;
        }
    });
});