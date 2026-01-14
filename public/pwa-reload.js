// Enhanced auto-reload mechanism for PWA updates
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').then(registration => {

        // 1. Check for updates every 30 seconds
        setInterval(() => {
            console.log('Checking for PWA updates...');
            registration.update();
        }, 30000);

        // 2. Listen for new service workers
        registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;

            console.log('New PWA version found. Installing...');

            if (newWorker) {
                newWorker.addEventListener('statechange', async () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        // New worker is waiting to activate - force it
                        console.log('New version installed. Reloading...');

                        // Optional: notify user
                        // if (confirm('New version available! Refresh now?')) {
                        //    window.location.reload();
                        // }

                        // Auto-reload
                        window.location.reload();
                    }
                });
            }
        });
    });

    // 3. Keep the page alive and check visibility
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            navigator.serviceWorker.getRegistration().then(reg => {
                if (reg) reg.update();
            });
        }
    });

    // 4. Force reload controller logic
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
            refreshing = true;
            window.location.reload();
        }
    });
}
