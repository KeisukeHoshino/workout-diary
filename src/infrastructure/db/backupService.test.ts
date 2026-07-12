import { afterEach, describe, expect, it } from 'vitest';
import { createBackupService } from './backupService';
import { WorkoutDiaryDatabase } from './database';

const databases: WorkoutDiaryDatabase[] = [];

afterEach(async () => {
  await Promise.all(databases.map((database) => database.delete()));
  databases.length = 0;
});

describe('backup service', () => {
  it('exports, validates, and restores all user data', async () => {
    const source = new WorkoutDiaryDatabase(`source-${crypto.randomUUID()}`);
    const target = new WorkoutDiaryDatabase(`target-${crypto.randomUUID()}`);
    databases.push(source, target);
    const timestamp = '2026-01-01T00:00:00.000Z';
    await source.workoutDays.put({ id: 'day-1', date: '2026-01-01', memo: 'Push', createdAt: timestamp, updatedAt: timestamp });
    const backup = await createBackupService(source).exportAll();
    expect(createBackupService(target).validate(backup).valid).toBe(true);
    await createBackupService(target).restore(backup, 'replace');
    expect(await target.workoutDays.get('day-1')).toMatchObject({ memo: 'Push' });
  });

  it('rejects incomplete documents before changing the database', () => {
    const database = new WorkoutDiaryDatabase(`invalid-${crypto.randomUUID()}`);
    databases.push(database);
    const result = createBackupService(database).validate({ formatVersion: 1, tables: {} });
    expect(result.valid).toBe(false);
  });
});
