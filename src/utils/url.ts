/**
 * Safely opens an external URL.
 * Under Electron, it uses the main process shell API to launch the default system browser.
 * Under web browsers, it opens the URL in a new window/tab.
 */
export async function openExternalUrl(url: string): Promise<void> {
  const isElectron = typeof window !== 'undefined' && 'electron' in window;
  if (isElectron) {
    try {
      await window.electron.ipcRenderer.invoke('open_external_url', { url });
      return;
    } catch (e) {
      console.error('Failed to open URL via Electron:', e);
    }
  }
  
  // Fallback to web browser open behavior
  window.open(url, '_blank', 'noopener,noreferrer');
}
