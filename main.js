const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const { autoUpdater } = require('electron-updater');
const fs = require('fs');
const path = require('path');

const settingsPath = path.join(app.getPath('userData'), 'settings.json');

let mainWindow;
let settingsWindow;
let aboutWindow;

function loadSettings() {
    try {
        if (fs.existsSync(settingsPath)) {
            return JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
        }
    } catch (error) {
        console.error('Failed to load settings:', error);
    }
    // Default settings
    return {
        timerSeconds: 10,
        fontColor: '#abb2bf',
        wordColor: '#61afef',
        fontSize: 24,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
    };
}

function saveSettings(settings) {
    try {
        fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
    } catch (error) {
        console.error('Failed to save settings:', error);
    }
}

function createMainWindow() {
    mainWindow = new BrowserWindow({
        width: 350,
        height: 200,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            preload: path.join(__dirname, 'preload.js') // Security best practice
        },
        alwaysOnTop: true,
        resizable: true,
        frame: false,
        title: 'My Vocabulary',
        transparent: true,
    });

    mainWindow.loadFile('index.html');
    mainWindow.on('closed', () => { mainWindow = null; });

    autoUpdater.checkForUpdatesAndNotify();
}
function createSettingsWindow() {
  if (settingsWindow) { settingsWindow.focus(); return; }
  settingsWindow = new BrowserWindow({
    width: 500,
    height: 600,
    parent: mainWindow,          // 부모
    modal: true,                 // 모달
    alwaysOnTop: true,           // 최상위 유지
    resizable: false,
    webPreferences: { nodeIntegration: true, contextIsolation: false },
    title: 'Settings'
  });
  settingsWindow.on('closed', () => { settingsWindow = null; });
  settingsWindow.loadFile('settings.html');
}

function createAboutWindow() {
  if (aboutWindow) { aboutWindow.focus(); return; }
  aboutWindow = new BrowserWindow({
    width: 550,
    height: 650,
    parent: mainWindow,
    modal: true,
    alwaysOnTop: true,
    resizable: false,
    webPreferences: { nodeIntegration: true, contextIsolation: false },
    title: 'About My Vocabulary'
  });
  aboutWindow.on('closed', () => { aboutWindow = null; });
  aboutWindow.loadFile('about.html');
}

app.whenReady().then(() => {
    createMainWindow();
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

// IPC Handlers
ipcMain.on('open-settings-window', createSettingsWindow);
ipcMain.on('open-about-window', createAboutWindow);

ipcMain.on('open-external-link', (event, url) => {
    shell.openExternal(url);
});

ipcMain.handle('get-settings', () => {
    return loadSettings();
});

ipcMain.on('save-settings', (event, settings) => {
    saveSettings(settings);
    if (mainWindow) {
        mainWindow.webContents.send('settings-updated', settings);
    }
});

ipcMain.on('learned-words-updated', () => {
    if (mainWindow) {
        mainWindow.webContents.send('reload-words');
    }
});

ipcMain.handle('dialog:openFile', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [{ name: 'TSV Files', extensions: ['tsv', 'txt'] }]
    });
    if (canceled || filePaths.length === 0) return null;
    const filePath = filePaths[0];
    const content = fs.readFileSync(filePath, 'utf-8');
    return { filePath, content };
});

ipcMain.handle('get-userData-path', () => app.getPath('userData'));

ipcMain.on('edit-file', (event, filePath) => {
    if (!filePath) {
        dialog.showErrorBox('File Error', 'No file path is available to edit.');
        return;
    }
    shell.openPath(filePath).catch(err => {
        dialog.showErrorBox('File Open Error', `Failed to open the file: ${filePath}\n\nError: ${err.message}`);
    });
});