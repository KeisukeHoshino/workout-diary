import type { BackupDocumentV1, BackupServicePort, BackupValidationResult } from '../../application/ports';
import type { WorkoutDiaryDatabase } from './database';
import { backupDocumentSchema, type ParsedBackupDocument } from './backupSchema';

function duplicates(rows: Array<{ id: string }>, table: string, errors: string[]) {
  const ids = new Set<string>();
  for (const row of rows) {
    if (ids.has(row.id)) errors.push(`${table} に重複ID ${row.id} があります。`);
    ids.add(row.id);
  }
  return ids;
}

function validateRelations(document: ParsedBackupDocument) {
  const errors: string[] = [];
  const warnings: string[] = [];
  const { tables } = document;
  duplicates(tables.userSettings, 'userSettings', errors);
  duplicates(tables.exercisePresets, 'exercisePresets', errors);
  const exerciseIds = duplicates(tables.exercises, 'exercises', errors);
  const dayIds = duplicates(tables.workoutDays, 'workoutDays', errors);
  const cardIds = duplicates(tables.workoutExercises, 'workoutExercises', errors);
  duplicates(tables.workoutSets, 'workoutSets', errors);
  duplicates(tables.bodyWeightLogs, 'bodyWeightLogs', errors);
  const menuIds = duplicates(tables.menuTemplates, 'menuTemplates', errors);
  duplicates(tables.menuTemplateExercises, 'menuTemplateExercises', errors);
  const workoutDates = new Set<string>();
  for (const day of tables.workoutDays) {
    if (workoutDates.has(day.date)) errors.push(`workoutDays の日付 ${day.date} が重複しています。`);
    workoutDates.add(day.date);
  }
  const weightDates = new Set<string>();
  for (const log of tables.bodyWeightLogs) {
    if (weightDates.has(log.date)) errors.push(`bodyWeightLogs の日付 ${log.date} が重複しています。`);
    weightDates.add(log.date);
  }
  for (const card of tables.workoutExercises) {
    if (!dayIds.has(card.workoutDayId)) errors.push(`workoutExercises ${card.id} の日別記録が存在しません。`);
    if (!exerciseIds.has(card.exerciseId)) warnings.push(`過去記録 ${card.id} は存在しない種目 ${card.exerciseId} を参照しています。`);
  }
  for (const set of tables.workoutSets) if (!cardIds.has(set.workoutExerciseId)) errors.push(`workoutSets ${set.id} の種目カードが存在しません。`);
  for (const row of tables.menuTemplateExercises) {
    if (!menuIds.has(row.menuTemplateId)) errors.push(`menuTemplateExercises ${row.id} のメニューが存在しません。`);
    if (!exerciseIds.has(row.exerciseId)) warnings.push(`メニュー明細 ${row.id} は存在しない種目 ${row.exerciseId} を参照しています。`);
  }
  return { errors, warnings };
}

export function createBackupService(database: WorkoutDiaryDatabase, appVersion: string): BackupServicePort {
  const validate = (input: unknown): BackupValidationResult => {
    const parsed = backupDocumentSchema.safeParse(input);
    if (!parsed.success) return { valid: false, errors: parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`), warnings: [] };
    const { errors, warnings } = validateRelations(parsed.data);
    if (errors.length) return { valid: false, errors, warnings };
    return { valid: true, document: parsed.data as BackupDocumentV1, warnings };
  };

  return {
    async exportAll() {
      await database.open();
      return {
        formatVersion: 1,
        exportedAt: new Date().toISOString(),
        appVersion,
        databaseVersion: database.verno,
        tables: {
          userSettings: await database.userSettings.toArray(), exercisePresets: await database.exercisePresets.toArray(),
          exercises: await database.exercises.toArray(), workoutDays: await database.workoutDays.toArray(),
          workoutExercises: await database.workoutExercises.toArray(), workoutSets: await database.workoutSets.toArray(),
          bodyWeightLogs: await database.bodyWeightLogs.toArray(), menuTemplates: await database.menuTemplates.toArray(),
          menuTemplateExercises: await database.menuTemplateExercises.toArray()
        }
      };
    },
    validate,
    async restore(document, mode) {
      if (mode !== 'replace') throw new Error('未対応の復元方式です。');
      const result = validate(document);
      if (!result.valid) throw new Error(result.errors.join('\n'));
      const t = result.document.tables;
      await database.transaction('rw', database.tables, async () => {
        await Promise.all(database.tables.map((table) => table.clear()));
        await database.userSettings.bulkPut(t.userSettings);
        await database.exercisePresets.bulkPut(t.exercisePresets);
        await database.exercises.bulkPut(t.exercises);
        await database.workoutDays.bulkPut(t.workoutDays);
        await database.workoutExercises.bulkPut(t.workoutExercises);
        await database.workoutSets.bulkPut(t.workoutSets);
        await database.bodyWeightLogs.bulkPut(t.bodyWeightLogs);
        await database.menuTemplates.bulkPut(t.menuTemplates);
        await database.menuTemplateExercises.bulkPut(t.menuTemplateExercises);
      });
    }
  };
}
