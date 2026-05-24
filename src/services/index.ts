import { SQLiteDataService } from './SQLiteDataService';
import { DataService } from './DataService';

// Initialize and export the SQLiteDataService
export const dataService: DataService = new SQLiteDataService();
