const { app, BrowserWindow, ipcMain, shell, Menu, Tray, nativeImage } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let tray = null;
let serverProcess = null;
const isDev = process.env.ELECTRON_DEV === 'true';

// Server configuration
const SERVER_PORT = 3000;
const SERVER_URL = `http://localhost:${SERVER_PORT}`;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    title: 'Chrona - Roleplay Universe',
    icon: path.join(__dirname, '../public/logo.png'),
    webPreferences: {
      preload: path.join(__dirname, 'Preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
    },
    frame: true,
    backgroundColor: '#0a0a0a',
    show: false,
  });

  // Load the app
  if (isDev) {
    mainWindow.loadURL(SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadURL(SERVER_URL);
  }

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  // Handle window close
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createTray() {
  const iconPath = path.join(__dirname, '../public/logo.png');
  const trayIcon = nativeImage.createFromPath(iconPath);
  
  tray = new Tray(trayIcon.resize({ width: 16, height: 16 }));
  
  const contextMenu = Menu.buildFromTemplate([
    { 
      label: 'Open Chrona', 
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    },
    { type: 'separator' },
    { 
      label: 'Quit', 
      click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
  ]);
  
  tray.setToolTip('Chrona - Roleplay Universe');
  tray.setContextMenu(contextMenu);
  
  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

function startServer() {
  return new Promise((resolve, reject) => {
    const projectRoot = path.join(__dirname, '..');
    
    console.log('Starting Chrona server...');
    
    // Start the Next.js server directly
    serverProcess = spawn('bun', ['x', 'next', 'dev', '-p', SERVER_PORT.toString()], {
      cwd: projectRoot,
      shell: true,
      env: { ...process.env, PORT: SERVER_PORT.toString() },
      stdio: ['ignore', 'pipe', 'pipe']
    });

    serverProcess.stdout.on('data', (data) => {
      const output = data.toString();
      console.log(`[Server] ${output}`);
      if (output.includes('Ready') || output.includes('Local:')) {
        resolve();
      }
    });

    serverProcess.stderr.on('data', (data) => {
      console.error(`[Server Error] ${data.toString()}`);
    });

    serverProcess.on('error', (error) => {
      console.error('Failed to start server:', error);
      reject(error);
    });

    // Timeout after 30 seconds
    setTimeout(() => {
      resolve(); // Continue anyway
    }, 30000);
  });
}

function stopServer() {
  if (serverProcess) {
    console.log('Stopping server...');
    
    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', serverProcess.pid, '/f', '/t']);
    } else {
      serverProcess.kill('SIGTERM');
    }
    
    serverProcess = null;
  }
}

// App lifecycle events
app.whenReady().then(async () => {
  try {
    // Start the server first
    await startServer();
    
    // Create window and tray
    createWindow();
    createTray();
    
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  } catch (error) {
    console.error('Failed to start app:', error);
    app.quit();
  }
});

app.on('before-quit', () => {
  app.isQuitting = true;
  stopServer();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC handlers for communication with renderer
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('open-external', async (event, url) => {
  await shell.openExternal(url);
});

ipcMain.handle('minimize-window', () => {
  mainWindow?.minimize();
});

ipcMain.handle('maximize-window', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});

ipcMain.handle('close-window', () => {
  mainWindow?.close();
});
