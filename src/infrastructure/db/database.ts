import Dexie, { type EntityTable } from 'dexie';
import type {
  BodyWeightLog,
  Exercise,
  ExercisePreset,
  MenuTemplate,
  MenuTemplateExercise,
  UserSettings,
  WorkoutDay,
  WorkoutExercise,
  WorkoutSet
} from '../../domain/models';
import { exercisePresets } from './seedPresets';

export class WorkoutDiaryDatabase extends Dexie {
  userSettings!: EntityTable<UserSettings, 'id'>;
  exercisePresets!: EntityTable<ExercisePreset, 'id'>;
  exercises!: EntityTable<Exercise, 'id'>;
  workoutDays!: EntityTable<WorkoutDay, 'id'>;
  workoutExercises!: EntityTable<WorkoutExercise, 'id'>;
  workoutSets!: EntityTable<WorkoutSet, 'id'>;
  bodyWeightLogs!: EntityTable<BodyWeightLog, 'id'>;
  menuTemplates!: EntityTable<MenuTemplate, 'id'>;
  menuTemplateExercises!: EntityTable<MenuTemplateExercise, 'id'>;

  constructor() {
    super('workoutDiary');
    this.version(1).stores({
      userSettings: 'id',
      exercisePresets: 'id, bodyPart, name, sortOrder',
      exercises: 'id, bodyPart, isActive, sourcePresetId, sortOrder, updatedAt',
      workoutDays: 'id, &date, updatedAt',
      workoutExercises: 'id, workoutDayId, exerciseId, [workoutDayId+sortOrder]',
      workoutSets: 'id, workoutExerciseId, [workoutExerciseId+setNumber]',
      bodyWeightLogs: 'id, &date, updatedAt',
      menuTemplates: 'id, sortOrder, updatedAt',
      menuTemplateExercises: 'id, menuTemplateId, exerciseId, [menuTemplateId+sortOrder]'
    });
  }
}

export const db = new WorkoutDiaryDatabase();

export async function initializeDatabase() {
  const now = new Date().toISOString();
  const settings = await db.userSettings.get('default');
  if (!settings) {
    await db.userSettings.put({
      id: 'default',
      weightUnit: 'kg',
      defaultGraphRange: '3m',
      isSetupCompleted: true,
      createdAt: now,
      updatedAt: now
    });
  }

  if ((await db.exercisePresets.count()) === 0) {
    await db.exercisePresets.bulkPut(exercisePresets);
  }

  const existingExercises = await db.exercises.toArray();
  if (existingExercises.filter((exercise) => exercise.isActive).length === 0) {
    const existingPresetIds = new Set(existingExercises.map((exercise) => exercise.sourcePresetId).filter(Boolean));
    const initialPresets = exercisePresets.slice(0, 8);
    await db.exercises.bulkPut(initialPresets.filter((preset) => !existingPresetIds.has(preset.id)).map((preset, index) => ({
      id: crypto.randomUUID(),
      name: preset.name,
      bodyPart: preset.bodyPart,
      equipmentType: preset.equipmentType,
      sortOrder: (index + 1) * 10,
      isActive: true,
      sourcePresetId: preset.id,
      createdAt: now,
      updatedAt: now
    })));
  }
}
