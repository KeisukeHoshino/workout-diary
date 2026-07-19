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

// UI はこの集約済み service だけを参照し、Dexie などの保存実装を直接知らないようにする。
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
