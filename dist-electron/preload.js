import { contextBridge as n, ipcRenderer as o } from "electron";
n.exposeInMainWorld("electron", {
  ipcRenderer: {
    invoke: (e, ...r) => o.invoke(e, ...r)
  }
});
