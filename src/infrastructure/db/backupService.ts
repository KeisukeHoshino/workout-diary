import type {
  BackupDocument,
  BackupServicePort,
  BackupTables,
  BackupValidationResult
} from '../../application/ports';
import { db, initializeDatabase, type WorkoutDiaryDatabase } from './database';

const tableNames = [
  'userSettings', 'exercisePresets', 'exercises', 'workoutDays', 'workoutExercises',
  'workoutSets', 'bodyWeightLogs', 'menuTemplates', 'menuTemplateExercises'
] as const satisfies readonly (keyof BackupTables)[];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function createBackupService(database: WorkoutDiaryDatabase = db): BackupServicePort {
  return {
    async exportAll() {
      const tables = Object.fromEntries(await Promise.all(tableNames.map(async (name) => [name, await database[name].toArray()]))) as unknown as BackupTables;
      return {
        formatVersion: 1,
        exportedAt: new Date().toISOString(),
        appVersion: __APP_VERSION__,
        tables
      };
    },

    validate(input: unknown): BackupValidationResult {
      const errors: string[] = [];
      if (!isRecord(input)) return { valid: false, errors: ['バックアップがJSONオブジェクトではありません。'] };
      if (input.formatVersion !== 1) errors.push('対応していないバックアップ形式です。');
      if (typeof input.exportedAt !== 'string' || Number.isNaN(Date.parse(input.exportedAt))) errors.push('出力日時が不正です。');
      if (typeof input.appVersion !== 'string') errors.push('アプリバージョンがありません。');
      if (!isRecord(input.tables)) {
        errors.push('テーブルデータがありません。');
      } else {
        for (const name of tableNames) if (!Array.isArray(input.tables[name])) errors.push(`${name} が配列ではありません。`);
      }
      if (errors.length) return { valid: false, errors };
      return { valid: true, document: input as unknown as BackupDocument };
    },

    async restore(document, mode) {
      if (mode !== 'replace') throw new Error('未対応の復元方式です。');
      const validation = this.validate(document);
      if (!validation.valid) throw new Error(validation.errors.join('\n'));
      const tables = tableNames.map((name) => database[name]);
      await database.transaction('rw', tables, async () => {
        for (const name of tableNames) {
          await database[name].clear();
          const rows = document.tables[name] as Array<{ id: string }>;
          if (rows.length) await database.table(name).bulkPut(rows);
        }
      });
      if (database === db) await initializeDatabase();
    }
  };
}

export const backupService = createBackupService();
