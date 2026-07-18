import type { GraphRange, LocalDateString } from '../domain/models';
import type {
  BodyWeightRepositoryPort,
  ExerciseRepositoryPort,
  GraphQueryPort,
  HistoryQueryPort,
  MenuRepositoryPort,
  SettingsRepositoryPort,
  WorkoutRepositoryPort
} from './ports';

export interface ApplicationDependencies {
  initialize(): Promise<void>;
  workoutRepository: WorkoutRepositoryPort;
  bodyWeightRepository: BodyWeightRepositoryPort;
  exerciseRepository: ExerciseRepositoryPort;
  menuRepository: MenuRepositoryPort;
  graphQuery: GraphQueryPort;
  historyQuery: HistoryQueryPort;
  settingsRepository: SettingsRepositoryPort;
}

export function createApplicationServices(deps: ApplicationDependencies) {
  const ready = () => deps.initialize();
  return {
    workout: {
      async load(date: LocalDateString) {
        await ready();
        const [detail, exercises, menus] = await Promise.all([
          deps.workoutRepository.getWorkoutByDate(date), deps.exerciseRepository.listActive(), deps.menuRepository.list()
        ]);
        return { detail, exercises, menus };
      },
      addExercise: deps.workoutRepository.addExerciseToDate,
      addMenu: deps.workoutRepository.addMenuToDate,
      addSet: deps.workoutRepository.addSet,
      updateSet: deps.workoutRepository.updateSet,
      deleteSet: deps.workoutRepository.deleteSet,
      deleteExercise: deps.workoutRepository.deleteWorkoutExercise,
      deleteWorkout: deps.workoutRepository.deleteWorkoutDay,
      updateBodyWeight: deps.bodyWeightRepository.upsert
    },
    exercises: {
      async load() {
        await ready();
        const [exercises, presets] = await Promise.all([deps.exerciseRepository.listAll(), deps.exerciseRepository.listPresets()]);
        return { exercises, presets };
      },
      create: deps.exerciseRepository.create,
      update: deps.exerciseRepository.update,
      setActive: deps.exerciseRepository.setActive,
      addFromPresets: deps.exerciseRepository.addFromPresets
    },
    menus: {
      async load() {
        await ready();
        const [menus, exercises] = await Promise.all([deps.menuRepository.list(), deps.exerciseRepository.listActive()]);
        return { menus, exercises };
      },
      create: deps.menuRepository.create,
      update: deps.menuRepository.update,
      delete: deps.menuRepository.delete
    },
    graphs: {
      async initialize() {
        await ready();
        const [settings, exercises] = await Promise.all([deps.settingsRepository.get(), deps.exerciseRepository.listActive()]);
        return { settings, exercises };
      },
      maxWeight: (exerciseId: string, range: GraphRange) => deps.graphQuery.maxWeight(exerciseId, range),
      bodyWeight: (range: GraphRange) => deps.graphQuery.bodyWeight(range)
    },
    history: {
      async list() { await ready(); return deps.historyQuery.list(); },
      deleteWorkout: deps.workoutRepository.deleteWorkoutDay
    },
    settings: {
      async get() { await ready(); return deps.settingsRepository.get(); },
      updateDefaultGraphRange: deps.settingsRepository.updateDefaultGraphRange,
      async reset() { await deps.settingsRepository.reset(); await ready(); }
    }
  };
}

export type ApplicationServices = ReturnType<typeof createApplicationServices>;
