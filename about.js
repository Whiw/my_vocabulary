const { ipcRenderer } = require('electron');

document.getElementById('paypal-btn').addEventListener('click', () => {
    ipcRenderer.send('open-external-link', 'https://paypal.me/whiw215');
});

document.getElementById('patreon-btn').addEventListener('click', () => {
    ipcRenderer.send('open-external-link', 'https://www.patreon.com/c/Whiw');
});
