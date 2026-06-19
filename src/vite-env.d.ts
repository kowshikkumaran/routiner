/// <reference types="vite/client" />

interface Window {
  electron: {
    ipcRenderer: {
      invoke<T = any>(channel: string, ...args: any[]): Promise<T>;
    };
  };
}
