export type UUID = string;
export type LocalDateString = `${number}-${number}-${number}`;
export type ISODateTimeString = string;
export type WeightUnit = 'kg';
export type GraphRange = '1m' | '3m' | '6m' | 'all';

export type BodyPart =
  | 'chest'
  | 'back'
  | 'legs'
  | 'shoulders'
  | 'arms'
  | 'abs'
  | 'cardio'
  | 'other';

export type EquipmentType =
  | 'barbell'
  | 'dumbbell'
  | 'machine'
  | 'cable'
  | 'bodyweight'
  | 'other';

export interface UserSettings {
  id: 'default';
  weightUnit: WeightUnit;
  defaultGraphRange: GraphRange;
  isSetupCompleted: boolean;
  createdAt: ISODateTimeString;
  updatedAt: ISODateTimeString;
}

export interface ExercisePreset {
  id: UUID;
  name: string;
  bodyPart: BodyPart;
  equipmentType: EquipmentType | null;
  sortOrder: number;
}

export interface Exercise {
  id: UUID;
  name: string;
  bodyPart: BodyPart;
  equipmentType: EquipmentType | null;
  sortOrder: number;
  isActive: boolean;
  sourcePresetId: UUID | null;
  createdAt: ISODateTimeString;
  updatedAt: ISODateTimeString;
}

export interface WorkoutDay {
  id: UUID;
  date: LocalDateString;
  memo: string;
  createdAt: ISODateTimeString;
  updatedAt: ISODateTimeString;
}

export interface WorkoutExercise {
  id: UUID;
  workoutDayId: UUID;
  exerciseId: UUID;
  sortOrder: number;
  memo: string;
  createdAt: ISODateTimeString;
  updatedAt: ISODateTimeString;
}

export interface WorkoutSet {
  id: UUID;
  workoutExerciseId: UUID;
  setNumber: number;
  weightKg: number | null;
  reps: number | null;
  createdAt: ISODateTimeString;
  updatedAt: ISODateTimeString;
}

export interface BodyWeightLog {
  id: UUID;
  date: LocalDateString;
  bodyWeightKg: number;
  memo: string;
  createdAt: ISODateTimeString;
  updatedAt: ISODateTimeString;
}

export interface MenuTemplate {
  id: UUID;
  name: string;
  memo: string;
  sortOrder: number;
  createdAt: ISODateTimeString;
  updatedAt: ISODateTimeString;
}

export interface MenuTemplateExercise {
  id: UUID;
  menuTemplateId: UUID;
  exerciseId: UUID;
  sortOrder: number;
  createdAt: ISODateTimeString;
  updatedAt: ISODateTimeString;
}

export interface WorkoutDetail {
  day: WorkoutDay | null;
  bodyWeightLog: BodyWeightLog | null;
  exercises: Array<{
    workoutExercise: WorkoutExercise;
    exercise: Exercise;
    sets: WorkoutSet[];
  }>;
}

export interface MenuTemplateDetail {
  menu: MenuTemplate;
  exercises: Array<{
    menuTemplateExercise: MenuTemplateExercise;
    exercise: Exercise;
  }>;
}

export interface MaxWeightPoint {
  date: LocalDateString;
  value: number;
  reps: number | null;
}

export interface BodyWeightPoint {
  date: LocalDateString;
  value: number;
}
