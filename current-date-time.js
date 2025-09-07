let formattedTime = null;

// Get Current Date & Time
function pad(number) {
    if (number < 10) {
        return '0' + number;
    } else {
        return number;
    }
}

function DateTime() {
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
    formattedTime = pad(day) + '-' + pad(month) + '-' + year + ' | ' + pad(hour) + ':' + pad(minutes) + ' ' + meridiem;
}