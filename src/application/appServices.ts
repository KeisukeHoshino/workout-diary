import type { GraphRange, LocalDateString } from '../domain/models';
import { backupService } from '../infrastructure/db/backupService';
import { db, initializeDatabase } from '../infrastructure/db/database';
import { historyQuery } from '../infrastructure/db/historyQuery';
import {
  bodyWeightRepository,
  exerciseRepository,
  graphRepository,
  menuRepository,
  settingsRepository,
  workoutRepository
} from '../infrastructure/db/repositories';

async function ready() {
  await initializeDatabase();
}

export const workoutUseCases = {
  async load(date: LocalDateString) {
    await ready();
    const [workout, exercises, menus] = await Promise.all([
      workoutRepository.getWorkoutByDate(date), exerciseRepository.listActive(), menuRepository.list()
    ]);
    return { workout, exercises, menus };
  },
  addExercise: workoutRepository.addExerciseToDate.bind(workoutRepository),
  addMenu: workoutRepository.addMenuToDate.bind(workoutRepository),
  addSet: workoutRepository.addSet.bind(workoutRepository),
  updateSet: workoutRepository.updateSet.bind(workoutRepository),
  deleteSet: workoutRepository.deleteSet.bind(workoutRepository),
  deleteExercise: workoutRepository.deleteWorkoutExercise.bind(workoutRepository),
  deleteWorkout: workoutRepository.deleteWorkoutDay.bind(workoutRepository),
  updateBodyWeight: bodyWeightRepository.upsert.bind(bodyWeightRepository)
};

export const historyUseCases = {
  async list() { await ready(); return historyQuery.list(); },
  deleteWorkout: workoutRepository.deleteWorkoutDay.bind(workoutRepository)
};

export const graphUseCases = {
  async initialize() {
    await ready();
    const [settings, exercises] = await Promise.all([settingsRepository.get(), exerciseRepository.listActive()]);
    return { settings, exercises };
  },
  listMaxWeightPoints: (exerciseId: string, range: GraphRange) => graphRepository.listMaxWeightPoints(exerciseId, range),
  listBodyWeightPoints: (range: GraphRange) => graphRepository.listBodyWeightPoints(range)
};

export const exerciseUseCases = { initialize: ready, ...exerciseRepository };
export const menuUseCases = { initialize: ready, ...menuRepository, listExercises: exerciseRepository.listActive };

export const settingsUseCases = {
  async get() { await ready(); return settingsRepository.get(); },
  updateDefaultGraphRange: settingsRepository.updateDefaultGraphRange,
  exportBackup: backupService.exportAll.bind(backupService),
  validateBackup: backupService.validate.bind(backupService),
  restoreBackup: backupService.restore.bind(backupService),
  async reset() { await db.delete(); await db.open(); await ready(); }
};
