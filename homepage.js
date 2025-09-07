function updateTime() {
    const currentTimeElement = document.getElementById('date-time');

    // Get current date and time
    const now = new Date();

    // Format the date part like PHP (e.g., "April 01, 2025")
    const options = { year: 'numeric', month: 'long', day: '2-digit' };
    const datePart = new Intl.DateTimeFormat('en-US', options).format(now);

    // Format the time (12-hour format, NO SECONDS)
    let hours = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const amPm = hours >= 12 ? 'PM' : 'AM';

    // Convert 24-hour format to 12-hour format
    hours = hours % 12 || 12;

    // Construct final time string (NO SECONDS)
    const formattedTime = `${datePart} ${hours}:${minutes} ${amPm}`;

    // Update the time display
    currentTimeElement.textContent = formattedTime;
}

// Update time every second
setInterval(updateTime, 1000);

// Run immediately to show current time without delay
updateTime();
