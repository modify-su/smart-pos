const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('path');
const https = require('https');

// Launch local Express API & Webhook backend server
try {
  require('./server.js');
  console.log('✅ Express Backend Server Started Successfully');
} catch (err) {
  console.error('⚠️ Express Backend Warning:', err);
}

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 850,
    minWidth: 1024,
    minHeight: 700,
    title: 'Smart Stock & POS System — Devtai Shop',
    icon: path.join(__dirname, 'build/icon.ico'),
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false
    }
  });

  mainWindow.loadFile('index.html');
  Menu.setApplicationMenu(null);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ── Auto-Updater IPC Channel Handlers ──
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('check-for-updates', async (event, customUrl) => {
  return new Promise((resolve) => {
    const checkUrl = customUrl || 'https://raw.githubusercontent.com/devtai/smart-stock-pos/main/latest.json';
    https.get(checkUrl, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const currentVer = app.getVersion();
          const hasUpdate = json.version && json.version !== currentVer;
          resolve({
            success: true,
            currentVersion: currentVer,
            latestVersion: json.version || currentVer,
            hasUpdate: hasUpdate,
            releaseNotes: json.notes || 'ปรับปรุงประสิทธิภาพและแก้ไขข้อผิดพลาดในระบบ',
            downloadUrl: json.downloadUrl || ''
          });
        } catch (e) {
          resolve({ success: false, message: 'ไม่สามารถอ่านข้อมูลเวอร์ชันใหม่ได้' });
        }
      });
    }).on('error', (err) => {
      resolve({ success: false, message: 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์อัปเดตได้ (' + err.message + ')' });
    });
  });
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
