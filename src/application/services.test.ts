import { describe, expect, it, vi } from 'vitest';
import { createApplicationServices, type ApplicationDependencies } from './services';

function dependencies(): ApplicationDependencies {
  return {
    initialize: vi.fn().mockResolvedValue(undefined),
    workoutRepository: {
      getWorkoutByDate: vi.fn().mockResolvedValue({ day: null, bodyWeightLog: null, exercises: [] }),
      addExerciseToDate: vi.fn(), addMenuToDate: vi.fn(), addSet: vi.fn(), updateSet: vi.fn(),
      deleteSet: vi.fn(), deleteWorkoutExercise: vi.fn(), deleteWorkoutDay: vi.fn()
    },
    bodyWeightRepository: { upsert: vi.fn() },
    exerciseRepository: {
      listActive: vi.fn().mockResolvedValue([]), listAll: vi.fn().mockResolvedValue([]), listPresets: vi.fn().mockResolvedValue([]),
      create: vi.fn(), update: vi.fn(), setActive: vi.fn(), addFromPresets: vi.fn()
    },
    menuRepository: { list: vi.fn().mockResolvedValue([]), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    graphQuery: { maxWeight: vi.fn().mockResolvedValue([]), bodyWeight: vi.fn().mockResolvedValue([]) },
    historyQuery: { list: vi.fn().mockResolvedValue([]) },
    settingsRepository: { get: vi.fn(), updateDefaultGraphRange: vi.fn(), reset: vi.fn() }
  };
}

describe('application services', () => {
  it('画面読み込み前にDBを初期化して必要なデータをまとめる', async () => {
    const deps = dependencies();
    const services = createApplicationServices(deps);
    await expect(services.workout.load('2026-01-01')).resolves.toEqual({ detail: { day: null, bodyWeightLog: null, exercises: [] }, exercises: [], menus: [] });
    expect(deps.initialize).toHaveBeenCalledOnce();
    expect(deps.workoutRepository.getWorkoutByDate).toHaveBeenCalledWith('2026-01-01');
  });

  it('更新操作を対応するPortへ委譲する', async () => {
    const deps = dependencies();
    const services = createApplicationServices(deps);
    await services.workout.updateBodyWeight('2026-01-01', 70.5);
    expect(deps.bodyWeightRepository.upsert).toHaveBeenCalledWith('2026-01-01', 70.5);
  });
});
