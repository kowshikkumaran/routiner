import { SQLiteDataService } from './SQLiteDataService';
import { LocalStorageDataService } from './LocalStorageDataService';
import { DataService } from './DataService';

// Detect if we are running inside a Tauri container
const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

// Export the appropriate database service
export const dataService: DataService = isTauri 
  ? new SQLiteDataService() 
  : new LocalStorageDataService();

