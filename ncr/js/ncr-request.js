
(function () {
    const openBtn = document.getElementById('ncr-req-btn');
    const modal = document.getElementById('ncr-modal');
    const closeBtn = document.getElementById('ncr-modal-close');

    function openModal() {
        modal.classList.add('show');
        modal.setAttribute('aria-hidden', 'false');
        // focus the close button for accessibility
        closeBtn && closeBtn.focus();
    }
    function closeModal() {
        modal.classList.remove('show');
        modal.setAttribute('aria-hidden', 'true');
        openBtn && openBtn.focus();
    }

    openBtn && openBtn.addEventListener('click', openModal);
    closeBtn && closeBtn.addEventListener('click', closeModal);

    // click outside content to close
    modal && modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    // ESC to close
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('show')) closeModal();
    });
})();