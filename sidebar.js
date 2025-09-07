document.addEventListener('DOMContentLoaded', () => {
    const menu = document.querySelector('.sidebar-menu-list');

    menu.addEventListener('click', e => {
        // find the <a> that was clicked (or its child)
        const anchor = e.target.closest('li > a');
        if (!anchor) return;

        const li = anchor.parentElement;
        const submenu = li.querySelector('.submenu');
        // only intercept clicks on items that actually have a submenu
        if (!submenu) return;

        e.preventDefault();

        if (li.classList.contains('open')) {
            // it’s already open → close it
            li.classList.remove('open');
        } else {
            // close any other open submenu
            menu.querySelectorAll('li.open').forEach(openLi => openLi.classList.remove('open'));
            // open the one that was clicked
            li.classList.add('open');
        }
    });

    const hamburger = document.getElementById('side-hamburger')
        || document.querySelector('.side-hamburger-icon');
    const sidebar = document.getElementById('sidebar');
    const icon = hamburger.querySelector('i');

    // keep the icon fade transition
    icon.style.transition = 'opacity 0.2s ease';

    hamburger.addEventListener('click', () => {
        // toggle sidebar open/closed
        const isOpen = sidebar.classList.toggle('open');
        hamburger.setAttribute('aria-expanded', isOpen);

        // **NEW**: if we just closed the sidebar, also collapse any open submenus
        if (!isOpen) {
            document
                .querySelectorAll('#sidebar .sidebar-menu-list > li.open')
                .forEach(li => li.classList.remove('open'));
        }

        // swap the hamburger ↔ close icon with fade
        icon.style.opacity = 0;
        setTimeout(() => {
            if (isOpen) {
                icon.classList.replace('fa-bars', 'fa-times');
            } else {
                icon.classList.replace('fa-times', 'fa-bars');
            }
            icon.style.opacity = 1;
        }, 200);
    });

    // ---- CLICK OUTSIDE TO CLOSE SIDEBAR ----
    document.addEventListener('mousedown', function(event) {
        // If sidebar is open...
        if (sidebar.classList.contains('open')) {
            // ...and the click is NOT inside sidebar or hamburger...
            if (
                !sidebar.contains(event.target) &&
                !hamburger.contains(event.target)
            ) {
                sidebar.classList.remove('open');
                hamburger.setAttribute('aria-expanded', false);
                // Also collapse submenus if you want:
                document
                    .querySelectorAll('#sidebar .sidebar-menu-list > li.open')
                    .forEach(li => li.classList.remove('open'));
                // Optional: swap icon back to hamburger
                icon.classList.replace('fa-times', 'fa-bars');
            }
        }
    });
});
