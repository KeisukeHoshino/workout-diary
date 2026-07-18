import type {
  BodyPart,
  BodyWeightLog,
  BodyWeightPoint,
  EquipmentType,
  Exercise,
  ExercisePreset,
  GraphRange,
  LocalDateString,
  MaxWeightPoint,
  MenuTemplate,
  MenuTemplateDetail,
  UserSettings,
  WorkoutDetail,
  WorkoutSet
} from '../domain/models';

export interface WorkoutRepositoryPort {
  getWorkoutByDate(date: LocalDateString): Promise<WorkoutDetail>;
  addExerciseToDate(date: LocalDateString, exerciseId: string): Promise<void>;
  addMenuToDate(date: LocalDateString, menuId: string): Promise<void>;
  addSet(workoutExerciseId: string): Promise<void>;
  updateSet(id: string, patch: Pick<WorkoutSet, 'weightKg' | 'reps'>): Promise<void>;
  deleteSet(id: string): Promise<void>;
  deleteWorkoutExercise(id: string): Promise<void>;
  deleteWorkoutDay(date: LocalDateString): Promise<void>;
}

export interface BodyWeightRepositoryPort {
  upsert(date: LocalDateString, value: number | null): Promise<void>;
}

export interface ExerciseRepositoryPort {
  listActive(): Promise<Exercise[]>;
  listAll(): Promise<Exercise[]>;
  listPresets(): Promise<ExercisePreset[]>;
  create(input: { name: string; bodyPart: BodyPart; equipmentType: EquipmentType | null }): Promise<Exercise>;
  update(id: string, input: { name: string; bodyPart: BodyPart; equipmentType: EquipmentType | null }): Promise<Exercise>;
  setActive(id: string, active: boolean): Promise<void>;
  addFromPresets(ids: string[]): Promise<{ addedCount: number; skippedCount: number }>;
}

export interface MenuRepositoryPort {
  list(): Promise<MenuTemplateDetail[]>;
  create(input: { name: string; memo: string; exerciseIds: string[] }): Promise<MenuTemplate>;
  update(id: string, input: { name: string; memo: string; exerciseIds: string[] }): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface GraphQueryPort {
  maxWeight(exerciseId: string, range: GraphRange): Promise<MaxWeightPoint[]>;
  bodyWeight(range: GraphRange): Promise<BodyWeightPoint[]>;
}

export interface HistorySummary {
  date: LocalDateString;
  hasWorkout: boolean;
  weight: BodyWeightLog | null;
  exerciseCount: number;
  setCount: number;
  exerciseNames: string[];
}

export interface HistoryQueryPort {
  list(): Promise<HistorySummary[]>;
}

export interface SettingsRepositoryPort {
  get(): Promise<UserSettings | undefined>;
  updateDefaultGraphRange(range: GraphRange): Promise<void>;
  reset(): Promise<void>;
}
