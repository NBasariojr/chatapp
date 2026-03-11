// desktop/src/preload.ts
import { contextBridge, ipcRenderer } from 'electron';

// Expose only safe APIs to the renderer process
contextBridge.exposeInMainWorld('electron', {
  appVersion: () => ipcRenderer.invoke('app:version'),
  platform: () => ipcRenderer.invoke('app:platform'),
});