"use strict";
const e = require("electron");
e.contextBridge.exposeInMainWorld("electron", {
  appVersion: () => e.ipcRenderer.invoke("app:version"),
  platform: () => e.ipcRenderer.invoke("app:platform"),
});
