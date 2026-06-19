import { SQLiteDataService } from './SQLiteDataService';
import { LocalStorageDataService } from './LocalStorageDataService';
import { DataService } from './DataService';

// Detect if we are running inside an Electron container
const isElectron = typeof window !== 'undefined' && 'electron' in window;

// Export the appropriate database service
export const dataService: DataService = isElectron 
  ? new SQLiteDataService() 
  : new LocalStorageDataService();

