let rowCount = 1;

function addInputRow() {
    rowCount++;
    const additionalInputs = document.querySelector('.additional-inputs');
    const newRow = document.createElement('div');
    newRow.className = 'input-fields-top additional-row';
    newRow.style.opacity = '0'; // Start with opacity 0 for fade-in effect
    newRow.innerHTML = `
        <div class="input-group number-div">
            <input type="text" id="number-${rowCount}" class="custom-input short-input" value="${rowCount}" readonly>
        </div>
        <div class="input-group title-group">
            <input type="text" id="desc-${rowCount}" class="custom-input">
        </div>
        <div class="input-group">
            <input type="text" id="wbs-${rowCount}" class="custom-input">
        </div>
    `;
    additionalInputs.appendChild(newRow);

    // Trigger the fade-in animation
    setTimeout(() => {
        newRow.style.transition = 'opacity 0.3s ease-in-out';
        newRow.style.opacity = '1';
    }, 10); // Small delay to ensure the element is in the DOM before animating
}

function removeInputRow() {
    const additionalInputs = document.querySelector('.additional-inputs');
    const rows = additionalInputs.querySelectorAll('.additional-row');
    if (rows.length > 0) {
        const lastRow = rows[rows.length - 1];
        lastRow.style.transition = 'opacity 0.3s ease-in-out';
        lastRow.style.opacity = '0'; // Fade out

        // Remove the row after the transition ends
        lastRow.addEventListener('transitionend', () => {
            additionalInputs.removeChild(lastRow);
            rowCount--;
        }, { once: true }); // Ensure the event listener runs only once
    }
}