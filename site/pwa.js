const installButton = document.getElementById('installAppButton');
let pendingInstallPrompt;

window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    pendingInstallPrompt = event;
    installButton.hidden = false;
});

installButton.addEventListener('click', async () => {
    if (!pendingInstallPrompt) return;
    pendingInstallPrompt.prompt();
    await pendingInstallPrompt.userChoice;
    pendingInstallPrompt = null;
    installButton.hidden = true;
});

window.addEventListener('appinstalled', () => {
    pendingInstallPrompt = null;
    installButton.hidden = true;
});

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./service-worker.js').catch(error => {
            console.error('Service worker registration failed:', error);
        });
    });
}
