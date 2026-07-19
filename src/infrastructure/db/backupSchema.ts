import { z } from 'zod';

// バックアップ復元は外部JSONを読むため、型定義とは別に実行時schemaで検証する。
const id = z.string().min(1);
const localDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const dateTime = z.string().datetime();
const bodyPart = z.enum(['chest', 'back', 'quadriceps', 'hamstrings', 'frontDelts', 'sideDelts', 'rearDelts', 'biceps', 'triceps', 'abs', 'cardio', 'other']);
const equipment = z.enum(['barbell', 'dumbbell', 'machine', 'cable', 'bodyweight', 'other']).nullable();

const settings = z.object({ id: z.literal('default'), weightUnit: z.literal('kg'), defaultGraphRange: z.enum(['1m', '3m', '6m', 'all']), isSetupCompleted: z.boolean(), createdAt: dateTime, updatedAt: dateTime }).strict();
const preset = z.object({ id, name: z.string(), bodyPart, equipmentType: equipment, sortOrder: z.number().finite() }).strict();
const exercise = z.object({ id, name: z.string(), bodyPart, equipmentType: equipment, sortOrder: z.number().finite(), isActive: z.boolean(), sourcePresetId: id.nullable(), createdAt: dateTime, updatedAt: dateTime }).strict();
const workoutDay = z.object({ id, date: localDate, memo: z.string(), createdAt: dateTime, updatedAt: dateTime }).strict();
const workoutExercise = z.object({ id, workoutDayId: id, exerciseId: id, sortOrder: z.number().finite(), memo: z.string(), createdAt: dateTime, updatedAt: dateTime }).strict();
const workoutSet = z.object({ id, workoutExerciseId: id, setNumber: z.number().int().positive(), weightKg: z.number().finite().nonnegative().nullable(), reps: z.number().int().nonnegative().nullable(), createdAt: dateTime, updatedAt: dateTime }).strict();
const weightLog = z.object({ id, date: localDate, bodyWeightKg: z.number().finite().positive(), memo: z.string(), createdAt: dateTime, updatedAt: dateTime }).strict();
const menu = z.object({ id, name: z.string(), memo: z.string(), sortOrder: z.number().finite(), createdAt: dateTime, updatedAt: dateTime }).strict();
const menuExercise = z.object({ id, menuTemplateId: id, exerciseId: id, sortOrder: z.number().finite(), createdAt: dateTime, updatedAt: dateTime }).strict();

export const backupDocumentSchema = z.object({
  formatVersion: z.literal(1),
  exportedAt: dateTime,
  appVersion: z.string().min(1),
  databaseVersion: z.number().int().positive(),
  tables: z.object({
    userSettings: z.array(settings), exercisePresets: z.array(preset), exercises: z.array(exercise),
    workoutDays: z.array(workoutDay), workoutExercises: z.array(workoutExercise), workoutSets: z.array(workoutSet),
    bodyWeightLogs: z.array(weightLog), menuTemplates: z.array(menu), menuTemplateExercises: z.array(menuExercise)
  }).strict()
}).strict();

export type ParsedBackupDocument = z.infer<typeof backupDocumentSchema>;
