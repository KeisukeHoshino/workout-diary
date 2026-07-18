import { createApplicationServices } from '../application/services';
import { initializeDatabase } from '../infrastructure/db/database';
import { db } from '../infrastructure/db/database';
import { createBackupService } from '../infrastructure/db/backupService';
import {
  bodyWeightRepository,
  exerciseRepository,
  graphQuery,
  historyQuery,
  menuRepository,
  settingsRepository,
  workoutRepository
} from '../infrastructure/db/repositories/index';

export const appServices = createApplicationServices({
  initialize: initializeDatabase,
  workoutRepository,
  bodyWeightRepository,
  exerciseRepository,
  menuRepository,
  graphQuery,
  historyQuery,
  settingsRepository,
  backupService: createBackupService(db, __APP_VERSION__)
});
