import type {
  BodyWeightLog,
  Exercise,
  ExercisePreset,
  LocalDateString,
  MenuTemplate,
  MenuTemplateExercise,
  UserSettings,
  WorkoutDay,
  WorkoutDetail,
  WorkoutExercise,
  WorkoutSet
} from '../domain/models';

export interface WorkoutRepositoryPort {
  getWorkoutByDate(date: LocalDateString): Promise<WorkoutDetail>;
  addExerciseToDate(date: LocalDateString, exerciseId: string): Promise<void>;
  addMenuToDate(date: LocalDateString, menuTemplateId: string): Promise<void>;
  addSet(workoutExerciseId: string): Promise<void>;
  updateSet(id: string, patch: Pick<WorkoutSet, 'weightKg' | 'reps'>): Promise<void>;
  deleteSet(id: string): Promise<void>;
  deleteWorkoutExercise(id: string): Promise<void>;
  deleteWorkoutDay(date: LocalDateString): Promise<void>;
}

export interface HistorySummary {
  date: LocalDateString;
  day: WorkoutDay | null;
  weight: BodyWeightLog | null;
  exerciseCount: number;
  setCount: number;
  exerciseNames: string[];
}

export interface HistoryQueryPort {
  list(): Promise<HistorySummary[]>;
}

export interface BackupTables {
  userSettings: UserSettings[];
  exercisePresets: ExercisePreset[];
  exercises: Exercise[];
  workoutDays: WorkoutDay[];
  workoutExercises: WorkoutExercise[];
  workoutSets: WorkoutSet[];
  bodyWeightLogs: BodyWeightLog[];
  menuTemplates: MenuTemplate[];
  menuTemplateExercises: MenuTemplateExercise[];
}

export interface BackupDocument {
  formatVersion: 1;
  exportedAt: string;
  appVersion: string;
  tables: BackupTables;
}

export type BackupValidationResult =
  | { valid: true; document: BackupDocument }
  | { valid: false; errors: string[] };

export interface BackupServicePort {
  exportAll(): Promise<BackupDocument>;
  validate(input: unknown): BackupValidationResult;
  restore(document: BackupDocument, mode: 'replace'): Promise<void>;
}
