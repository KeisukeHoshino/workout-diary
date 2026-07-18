import { afterEach, describe, expect, it, vi } from 'vitest';
import { createBackupService } from './backupService';
import { WorkoutDiaryDatabase } from './database';

const databases: WorkoutDiaryDatabase[] = [];
const timestamp = '2026-01-01T00:00:00.000Z';

afterEach(async () => {
  await Promise.all(databases.map((database) => database.delete()));
  databases.length = 0;
});

function createDatabase(prefix: string) {
  const database = new WorkoutDiaryDatabase(`${prefix}-${crypto.randomUUID()}`);
  databases.push(database);
  return database;
}

describe('backup service', () => {
  it('全テーブルを出力して別DBへ復元する', async () => {
    const source = createDatabase('source');
    const target = createDatabase('target');
    await source.workoutDays.put({ id: 'day', date: '2026-01-01', memo: '記録', createdAt: timestamp, updatedAt: timestamp });
    const backup = await createBackupService(source, 'test').exportAll();
    expect(backup).toMatchObject({ formatVersion: 1, appVersion: 'test', databaseVersion: 4 });
    await createBackupService(target, 'test').restore(backup, 'replace');
    expect(await target.workoutDays.get('day')).toMatchObject({ memo: '記録' });
  });

  it('不正形式と重複IDをDB変更前に拒否する', async () => {
    const database = createDatabase('invalid');
    const service = createBackupService(database, 'test');
    expect(service.validate({ formatVersion: 99 }).valid).toBe(false);
    const backup = await service.exportAll();
    backup.tables.workoutDays = [
      { id: 'day', date: '2026-01-01', memo: '', createdAt: timestamp, updatedAt: timestamp },
      { id: 'day', date: '2026-01-02', memo: '', createdAt: timestamp, updatedAt: timestamp }
    ];
    expect(service.validate(backup)).toMatchObject({ valid: false });
  });

  it('存在しない種目参照を警告として保持する', async () => {
    const database = createDatabase('warning');
    const service = createBackupService(database, 'test');
    const backup = await service.exportAll();
    backup.tables.workoutDays = [{ id: 'day', date: '2026-01-01', memo: '', createdAt: timestamp, updatedAt: timestamp }];
    backup.tables.workoutExercises = [{ id: 'card', workoutDayId: 'day', exerciseId: 'missing', sortOrder: 10, memo: '', createdAt: timestamp, updatedAt: timestamp }];
    const result = service.validate(backup);
    expect(result.valid).toBe(true);
    if (result.valid) expect(result.warnings[0]).toContain('missing');
  });

  it('復元途中の失敗をロールバックする', async () => {
    const database = createDatabase('rollback');
    const service = createBackupService(database, 'test');
    await database.workoutDays.put({ id: 'original', date: '2026-01-01', memo: '保持', createdAt: timestamp, updatedAt: timestamp });
    const backup = await service.exportAll();
    backup.tables.workoutDays = [{ id: 'replacement', date: '2026-02-01', memo: '置換', createdAt: timestamp, updatedAt: timestamp }];
    const spy = vi.spyOn(database.workoutDays, 'bulkPut').mockRejectedValueOnce(new Error('write failed'));
    await expect(service.restore(backup, 'replace')).rejects.toThrow('write failed');
    expect(await database.workoutDays.get('original')).toMatchObject({ memo: '保持' });
    expect(await database.workoutDays.get('replacement')).toBeUndefined();
    spy.mockRestore();
  });
});
