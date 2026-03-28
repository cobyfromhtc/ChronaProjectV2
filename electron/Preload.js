const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // App info
  getVersion: () => ipcRenderer.invoke('get-app-version'),
  
  // Window controls
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  maximizeWindow: () => ipcRenderer.invoke('maximize-window'),
  closeWindow: () => ipcRenderer.invoke('close-window'),
  
  // External links
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  
  // Platform detection
  platform: process.platform,
  
  // Events
  onUpdateAvailable: (callback) => ipcRenderer.on('update-available', callback),
  onUpdateDownloaded: (callback) => ipcRenderer.on('update-downloaded', callback),
  onUpdateProgress: (callback) => ipcRenderer.on('update-progress', callback),
  
  // Remove listeners
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),
});

// Expose store for local data persistence
contextBridge.exposeInMainWorld('electronStore', {
  get: (key) => {
    try {
      const value = localStorage.getItem(`chrona_${key}`);
      return value ? JSON.parse(value) : null;
    } catch {
      return null;
    }
  },
  set: (key, value) => {
    try {
      localStorage.setItem(`chrona_${key}`, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  },
  delete: (key) => {
    try {
      localStorage.removeItem(`chrona_${key}`);
      return true;
    } catch {
      return false;
    }
  },
});

// Log when preload script is loaded
console.log('Chrona preload script loaded successfully');

// Notify renderer that electron is ready
window.addEventListener('DOMContentLoaded', () => {
  console.log('Electron API initialized');
});
