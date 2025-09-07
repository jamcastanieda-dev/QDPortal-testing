document.addEventListener('DOMContentLoaded', function () {
    // Get references to the checkboxes
    const majorCheckbox = document.getElementById('categoryMajor');
    const minorCheckbox = document.getElementById('categoryMinor');
    const observationCheckbox = document.getElementById('categoryObservation');
    const nonconformanceCheckbox = document.querySelector('input[name="nonconformanceCheckbox"][value="nonconformance"]') || document.querySelector('input[id="nonconformanceCheckbox"]:first-child');
    const potentialNonconformanceCheckbox = document.querySelector('input[name="nonconformanceCheckbox"][value="potential"]') || document.querySelector('input[id="nonconformanceCheckbox"]:last-child');
    const potentialSection = document.querySelector('.potential-nonconformance-section'); // Reference the section

    // Function to update Nonconformance checkbox states and toggle the section
    function updateNonconformance() {
        if (majorCheckbox.checked || minorCheckbox.checked) {
            nonconformanceCheckbox.checked = true;
            potentialNonconformanceCheckbox.checked = false;
            potentialNonconformanceCheckbox.disabled = true;
            potentialSection.classList.add('hidden'); // Hide the section
        } else if (observationCheckbox.checked) {
            nonconformanceCheckbox.checked = false;
            nonconformanceCheckbox.disabled = true;
            potentialNonconformanceCheckbox.checked = true;
            potentialSection.classList.remove('hidden'); // Show the section
        } else {
            potentialNonconformanceCheckbox.checked = false;
            potentialNonconformanceCheckbox.disabled = true;
            nonconformanceCheckbox.checked = false;
            nonconformanceCheckbox.disabled = true;
        }
    }

    // Function to toggle the section based on Potential Nonconformance checkbox
    function togglePotentialSection() {
        if (potentialNonconformanceCheckbox.checked) {
            potentialSection.classList.remove('hidden'); // Show the section
        } else {
            potentialSection.classList.add('hidden'); // Hide the section
        }
    }

    // Add event listeners to category checkboxes
    majorCheckbox.addEventListener('change', updateNonconformance);
    minorCheckbox.addEventListener('change', updateNonconformance);
    observationCheckbox.addEventListener('change', updateNonconformance);
    potentialNonconformanceCheckbox.addEventListener('change', updateNonconformance);
    nonconformanceCheckbox.addEventListener('change', updateNonconformance);

    // Add event listener to Potential Nonconformance checkbox
    potentialNonconformanceCheckbox.addEventListener('change', togglePotentialSection);

    // Initialize the section visibility based on the initial state
    togglePotentialSection();
});

const currentYear = new Date().getFullYear(); // Get the current year (e.g., 2023)
const externalFirstYear = document.getElementById('external-first-year-select'); // Reference the select element
const externalSecondYear = document.getElementById('external-second-year-select'); // Reference the select element
const internalFirstYear = document.getElementById('internal-first-year-select'); // Reference the select element
const internalSecondYear = document.getElementById('internal-second-year-select'); // Reference the select element

function YearSelect(yearSelection) {
    // Loop to create options from current year to current year + 20
    for (let year = currentYear; year <= currentYear + 20; year++) {
        const option = document.createElement('option'); // Create an option element
        option.value = year; // Set the value to the year
        option.text = year; // Display the year as text
        yearSelection.appendChild(option); // Add the option to the select element
    }
}

YearSelect(externalFirstYear);
YearSelect(externalSecondYear);
YearSelect(internalFirstYear);
YearSelect(internalSecondYear);

