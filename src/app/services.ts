import { createApplicationServices } from '../application/services';
import { initializeDatabase } from '../infrastructure/db/database';
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
  settingsRepository
});
