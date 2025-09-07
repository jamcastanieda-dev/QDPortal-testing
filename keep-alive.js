setInterval(function () {
    fetch(window.location.pathname + '?keepalive=1', {
        cache: "no-store"
    });
}, 5 * 60 * 1000); // Every 5 minutes