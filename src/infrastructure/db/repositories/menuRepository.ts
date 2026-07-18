import type { MenuRepositoryPort } from '../../../application/ports';
import { uuid } from '../../../domain/rules';
import { db } from '../database';
import { now } from './shared';

export const menuRepository: MenuRepositoryPort = {
  async list() {
    const [menus, rows, exercises] = await Promise.all([db.menuTemplates.orderBy('sortOrder').toArray(), db.menuTemplateExercises.toArray(), db.exercises.toArray()]);
    return menus.map((menu) => ({
      menu,
      exercises: rows.filter((row) => row.menuTemplateId === menu.id).sort((a, b) => a.sortOrder - b.sortOrder)
        .map((row) => ({ menuTemplateExercise: row, exercise: exercises.find((exercise) => exercise.id === row.exerciseId)! }))
        .filter((item) => Boolean(item.exercise))
    }));
  },
  async create(input) {
    const menus = await db.menuTemplates.toArray();
    const timestamp = now();
    const menu = { id: uuid(), name: input.name, memo: input.memo, sortOrder: menus.length ? Math.max(...menus.map((item) => item.sortOrder)) + 10 : 10, createdAt: timestamp, updatedAt: timestamp };
    await db.transaction('rw', db.menuTemplates, db.menuTemplateExercises, async () => {
      await db.menuTemplates.put(menu);
      await db.menuTemplateExercises.bulkPut([...new Set(input.exerciseIds)].map((exerciseId, index) => ({ id: uuid(), menuTemplateId: menu.id, exerciseId, sortOrder: (index + 1) * 10, createdAt: timestamp, updatedAt: timestamp })));
    });
    return menu;
  },
  async update(id, input) {
    const exerciseIds = [...new Set(input.exerciseIds)];
    const timestamp = now();
    await db.transaction('rw', db.menuTemplates, db.menuTemplateExercises, async () => {
      const menu = await db.menuTemplates.get(id);
      if (!menu) throw new Error('更新するメニューが見つかりません。');
      await db.menuTemplates.put({ ...menu, name: input.name, memo: input.memo, updatedAt: timestamp });
      await db.menuTemplateExercises.where('menuTemplateId').equals(id).delete();
      await db.menuTemplateExercises.bulkPut(exerciseIds.map((exerciseId, index) => ({ id: uuid(), menuTemplateId: id, exerciseId, sortOrder: (index + 1) * 10, createdAt: timestamp, updatedAt: timestamp })));
    });
  },
  async delete(id) {
    await db.transaction('rw', db.menuTemplates, db.menuTemplateExercises, async () => {
      await db.menuTemplateExercises.where('menuTemplateId').equals(id).delete();
      await db.menuTemplates.delete(id);
    });
  }
};
