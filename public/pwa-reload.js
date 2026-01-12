// Simple auto-reload mechanism for PWA updates
// This script checks for Service Worker updates and reloads the page

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').then(registration => {
        // Check for updates every 60 seconds
        setInterval(() => {
            registration.update()
        }, 60000)

        registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing

            if (newWorker) {
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'activated' && navigator.serviceWorker.controller) {
                        // New service worker activated, reload the page
                        console.log('New version available, reloading...')
                        window.location.reload()
                    }
                })
            }
        })
    })
}
