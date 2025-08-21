const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const { autoUpdater } = require('electron-updater');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { globalShortcut } = require('electron');


const isWindowsStore = !!process.windowsStore;   // Microsoft Store 설치본이면 true
const isMas         = process.mas === true;      // Mac App Store 빌드면 true
const isStoreBuild  = isWindowsStore || isMas;   // 스토어 채널 통합 플래그

if (isStoreBuild) {


}
else {

autoUpdater.on("checking-for-update", () => console.log("Checking for update..."));
autoUpdater.on("update-available", (info) => console.log("Update available:", info));
autoUpdater.on("update-not-available", (info) => console.log("No update available:", info));
autoUpdater.on("error", (err) => console.error("Update error:", err));
autoUpdater.on("download-progress", (p) => console.log(`Download progress: ${p.percent}%`));
autoUpdater.on('update-downloaded', (info) => {
  // 시스템 언어 감지
  const locale = app.getLocale(); // 예: 'ko', 'en-US', 'ja' ...

  // 다국어 메시지 정의
  const messages = {
    ko: {
      title: '업데이트 완료',
      message: '새로운 버전이 다운로드되었습니다. 지금 재시작하여 업데이트하시겠습니까?',
      buttons: ['지금 재시작', '나중에']
    },
    en: {
      title: 'Update Ready',
      message: 'A new version has been downloaded. Restart the app to install it now?',
      buttons: ['Restart Now', 'Later']
    }
  };

  // 한국어면 ko, 아니면 en으로 fallback
  const msg = locale.startsWith('ko') ? messages.ko : messages.en;

  const result = dialog.showMessageBoxSync({
    type: 'info',
    buttons: msg.buttons,
    title: msg.title,
    message: msg.message
  });

  if (result === 0) { // "지금 재시작" / "Restart Now"
    autoUpdater.quitAndInstall();
  }
});


}




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
      //preload: path.join(__dirname, 'preload.js') // 실제로 쓰지 않으면 주석
    },
    alwaysOnTop: true,
    minimizable: false,          // 사용자가 최소화 버튼으로 못 내리게
    fullscreenable: false, 
    resizable: true,
    frame: false,
    title: 'My Vocabulary',
    transparent: true,
  });

  mainWindow.loadFile('index.html');
  mainWindow.on('closed', () => { mainWindow = null; });
  
    mainWindow.setAlwaysOnTop(true, 'screen-saver'); // 'screen-saver'가 최상위 레벨
  // 모든 워크스페이스/가상데스크톱/풀스크린 위에서도 보이도록
  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
}

function createSettingsWindow() {
  if (settingsWindow) { settingsWindow.focus(); return; }
  settingsWindow = new BrowserWindow({
    width: 500,
    height: 600,
    alwaysOnTop: false,
    resizable: false,
    // 🔽 macOS에서 닫기/최소화/확대(트래픽 라이트) 확실히 노출
    frame: true,
    titleBarStyle: 'default',
    fullscreenable: false,
    closable: true,
    webPreferences: { nodeIntegration: true, contextIsolation: false },
    title: 'Settings'
  });
  settingsWindow.loadFile('settings.html');
  settingsWindow.on('closed', () => { settingsWindow = null; });

  // ⌘W 로 닫기
  settingsWindow.webContents.on('before-input-event', (e, input) => {
    if (input.meta && input.key?.toLowerCase() === 'w') {
      e.preventDefault();
      settingsWindow.close();
    }
  });
}

function createAboutWindow() {
  if (aboutWindow) { aboutWindow.focus(); return; }
  aboutWindow = new BrowserWindow({
    width: 550,
    height: 650,
    alwaysOnTop: true,
    resizable: false,
    frame: true,
    titleBarStyle: 'default',
    fullscreenable: false,
    closable: true,
    webPreferences: { nodeIntegration: true, contextIsolation: false },
    title: 'About My Vocabulary'
  });
  aboutWindow.loadFile('about.html');
  aboutWindow.on('closed', () => { aboutWindow = null; });

  aboutWindow.webContents.on('before-input-event', (e, input) => {
    if (input.meta && input.key?.toLowerCase() === 'w') {
      e.preventDefault();
      aboutWindow.close();
    }
  });
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
  
  
  autoUpdater.checkForUpdatesAndNotify();

  globalShortcut.register('CommandOrControl+Shift+I', () => {
    const win = BrowserWindow.getFocusedWindow();
    if (win) win.webContents.toggleDevTools();
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on('browser-window-created', (_e, win) => {
  win.on('minimize', (ev) => {
    ev.preventDefault();
    win.restore();
    win.show();
    win.setAlwaysOnTop(true, 'screen-saver');
  });
if (process.platform !== 'darwin') {
  win.on('hide', () => {
    win.show();
    win.setAlwaysOnTop(true, 'screen-saver');
  });
}
});

// 보수용 워치독 (안정성↑, 원치 않으면 제거 가능)
if (process.platform !== 'darwin') {
  setInterval(() => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
      mainWindow.show();
      mainWindow.setAlwaysOnTop(true, 'screen-saver');
    }
  }, 1000);
}

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

ipcMain.on('close-settings-window', () => { if (settingsWindow) settingsWindow.close(); });
ipcMain.on('close-about-window',    () => { if (aboutWindow)    aboutWindow.close(); });

ipcMain.handle('get-userData-path', () => app.getPath('userData'));

// 자동 로드용 경로 제공
ipcMain.handle('get-default-words-path', () => {
  const p = path.join(app.getPath('userData'), seedName);
  return fs.existsSync(p) ? p : null;
});