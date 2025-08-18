const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const { autoUpdater } = require('electron-updater');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const settingsPath = path.join(app.getPath('userData'), 'settings.json');

let mainWindow, settingsWindow, aboutWindow;

function loadSettings() {
  try {
    if (fs.existsSync(settingsPath)) {
      return JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
    }
  } catch (error) {
    console.error('Failed to load settings:', error);
  }
  // Defaults
  return {
    timerSeconds: 10,
    fontColor: '#abb2bf',
    wordColor: '#61afef',
    fontSize: 24,
    fontFamily: '-apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    lastFilePath: null
  };
}
function saveSettings(settings) {
  try { fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2)); }
  catch (error) { console.error('Failed to save settings:', error); }
}

const SEED_MAIN = 'words.tsv';
const SEED_SAMPLE = 'sample_en_ko.tsv';

function getDefaultTSVFilePath() {
  const candidates = [
    path.join(process.resourcesPath || '', SEED_MAIN),
    path.join(process.resourcesPath || '', SEED_SAMPLE),

    // 개발 환경
    path.join(__dirname, 'assets', SEED_MAIN),
    path.join(__dirname, 'assets', SEED_SAMPLE)
  ];
  for (const dir of candidates) {
    try { if (fs.existsSync(dir)) return dir; } catch {}
  }
  return app.getPath('documents'); // 폴백
}

function getDefaultDialogPath() {
  const file = getDefaultTSVFilePath();
  if (file) return file; // 파일명을 주면 Windows에서 파일 이름 칸까지 미리 채워짐
  // 폴더만 지정하고 싶다면 아래로 대체:
  const dir = process.resourcesPath || path.join(__dirname, 'assets');
  return fs.existsSync(dir) ? dir : app.getPath('documents');
}

// ★ 언어 기본값 보장
function decideDefaultLanguage() {
  const loc = (app.getLocale() || 'en').toLowerCase();
  return loc.startsWith('ko') ? 'ko' : 'en';
}
function ensureLanguageSetting() {
  const s = loadSettings();
  if (!s.language) {
    s.language = decideDefaultLanguage();
    saveSettings(s);
  }
  return s.language;
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 350,
    height: 200,
    icon: path.join(__dirname, 'assets/icons/app-icon.png'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      // preload: path.join(__dirname, 'preload.js') // 실제로 쓰지 않으면 주석
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
    width: 500, height: 600,
    parent: mainWindow, modal: true, alwaysOnTop: true, resizable: false,
    webPreferences: { nodeIntegration: true, contextIsolation: false },
    title: 'Settings'
  });
  settingsWindow.on('closed', () => { settingsWindow = null; });
  settingsWindow.loadFile('settings.html');
}

function createAboutWindow() {
  if (aboutWindow) { aboutWindow.focus(); return; }
  aboutWindow = new BrowserWindow({
    width: 550, height: 650,
    parent: mainWindow, modal: true, alwaysOnTop: true, resizable: false,
    webPreferences: { nodeIntegration: true, contextIsolation: false },
    title: 'About My Vocabulary'
  });
  aboutWindow.on('closed', () => { aboutWindow = null; });
  aboutWindow.loadFile('about.html');
}

const seedName = 'words.tsv';
function ensureSeedWords() {
  const userTsv = path.join(app.getPath('userData'), seedName);
  if (fs.existsSync(userTsv)) return userTsv;

  // 빌드본: extraResources 권장 → process.resourcesPath/words.tsv
  // 개발중: __dirname 하위 assets/words.tsv
  const candidates = [
    path.join(process.resourcesPath || __dirname, 'words.tsv'),
    path.join(process.resourcesPath || __dirname, 'assets', seedName),
    path.join(__dirname, 'assets', seedName),
    path.join(__dirname, seedName),
  ];
  const src = candidates.find(p => fs.existsSync(p));
  if (src) {
    try { fs.copyFileSync(src, userTsv); }
    catch (e) { console.error('Failed to copy seed words.tsv:', e); }
  }
  return fs.existsSync(userTsv) ? userTsv : null;
}

// ===== whenReady는 하나만! =====
app.whenReady().then(() => {
  ensureLanguageSetting();
  ensureSeedWords();
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// IPC
ipcMain.on('edit-file', (event, filePath) => {
  if (!filePath) {
    dialog.showErrorBox('File Error', 'No file path is available to edit.');
    return;
  }
  try {
    if (process.platform === 'win32') {
      // 메모장으로 강제
      const child = spawn('notepad.exe', [filePath], { detached: true, stdio: 'ignore' });
      child.unref();
    } else if (process.platform === 'darwin') {
      // macOS TextEdit
      spawn('open', ['-a', 'TextEdit', filePath], { detached: true, stdio: 'ignore' }).unref();
    } else {
      // Linux 등: 기본 앱
      spawn('xdg-open', [filePath], { detached: true, stdio: 'ignore' }).unref();
    }
  } catch (err) {
    console.error('Failed to open editor explicitly, fallback to shell.openPath', err);
    shell.openPath(filePath);
  }
});

ipcMain.on('open-settings-window', createSettingsWindow);
ipcMain.on('open-about-window', createAboutWindow);
ipcMain.on('open-external-link', (_e, url) => shell.openExternal(url));

ipcMain.handle('get-settings', () => loadSettings());
ipcMain.on('save-settings', (_e, settings) => {
  saveSettings(settings);
  if (mainWindow) mainWindow.webContents.send('settings-updated', settings);
});
ipcMain.on('learned-words-updated', () => {
  if (mainWindow) mainWindow.webContents.send('reload-words');
});

ipcMain.handle('dialog:openFile', async () => {
  const defaultPath = getDefaultDialogPath();
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: 'Open TSV File',
    defaultPath,                             // ★ 여기!
    properties: ['openFile'],
    filters: [{ name: 'TSV Files', extensions: ['tsv', 'txt'] }]
  });
  if (canceled || filePaths.length === 0) return null;
  const filePath = filePaths[0];
  const content = fs.readFileSync(filePath, 'utf-8');
  return { filePath, content };
});

ipcMain.on('set-language', (_e, lang) => {
  const s = loadSettings(); s.language = lang; saveSettings(s);
  if (mainWindow) mainWindow.webContents.send('settings-updated', s);
});
ipcMain.on('set-last-file', (_e, filePath) => {
  const s = loadSettings();
  s.lastFilePath = filePath || null;
  saveSettings(s);
});

ipcMain.handle('get-userData-path', () => app.getPath('userData'));

// 자동 로드용 경로 제공
ipcMain.handle('get-default-words-path', () => {
  const p = path.join(app.getPath('userData'), seedName);
  return fs.existsSync(p) ? p : null;
});