/**
 * Safely opens an external URL.
 * Under Tauri, it uses the @tauri-apps/plugin-opener plugin to launch the default system browser.
 * Under web browsers, it opens the URL in a new window/tab.
 */
export async function openExternalUrl(url: string): Promise<void> {
  const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
  if (isTauri) {
    try {
      const { openUrl } = await import('@tauri-apps/plugin-opener');
      await openUrl(url);
      return;
    } catch (e) {
      console.error('Failed to open URL via Tauri:', e);
    }
  }
  
  // Fallback to web browser open behavior
  window.open(url, '_blank', 'noopener,noreferrer');
}
