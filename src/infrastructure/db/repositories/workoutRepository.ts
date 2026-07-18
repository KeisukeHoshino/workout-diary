import Dexie from 'dexie';
import type { BodyWeightRepositoryPort, WorkoutRepositoryPort } from '../../../application/ports';
import type { BodyPart, LocalDateString } from '../../../domain/models';
import { uuid } from '../../../domain/rules';
import { db } from '../database';
import { now } from './shared';

async function ensureWorkoutDay(date: LocalDateString) {
  const existing = await db.workoutDays.where('date').equals(date).first();
  if (existing) return existing;
  const timestamp = now();
  const day = { id: uuid(), date, memo: '', createdAt: timestamp, updatedAt: timestamp };
  await db.workoutDays.put(day);
  return day;
}

async function addSet(workoutExerciseId: string) {
  const sets = await db.workoutSets.where('[workoutExerciseId+setNumber]')
    .between([workoutExerciseId, Dexie.minKey], [workoutExerciseId, Dexie.maxKey]).toArray();
  const last = sets[sets.length - 1];
  const timestamp = now();
  await db.workoutSets.put({ id: uuid(), workoutExerciseId, setNumber: last ? last.setNumber + 1 : 1, weightKg: last?.weightKg ?? null, reps: last?.reps ?? null, createdAt: timestamp, updatedAt: timestamp });
}

export const workoutRepository: WorkoutRepositoryPort = {
  async getWorkoutByDate(date) {
    const [day, bodyWeightLog, exercises] = await Promise.all([
      db.workoutDays.where('date').equals(date).first(),
      db.bodyWeightLogs.where('date').equals(date).first(),
      db.exercises.toArray()
    ]);
    if (!day) return { day: null, bodyWeightLog: bodyWeightLog ?? null, exercises: [] };
    const cards = await db.workoutExercises.where('[workoutDayId+sortOrder]')
      .between([day.id, Dexie.minKey], [day.id, Dexie.maxKey]).toArray();
    const rows = await Promise.all(cards.map(async (workoutExercise) => ({
      workoutExercise,
      exercise: exercises.find((exercise) => exercise.id === workoutExercise.exerciseId) ?? {
        id: workoutExercise.exerciseId, name: '削除済み種目', bodyPart: 'other' as BodyPart,
        equipmentType: null, sortOrder: 0, isActive: false, sourcePresetId: null,
        createdAt: workoutExercise.createdAt, updatedAt: workoutExercise.updatedAt
      },
      sets: await db.workoutSets.where('[workoutExerciseId+setNumber]')
        .between([workoutExercise.id, Dexie.minKey], [workoutExercise.id, Dexie.maxKey]).toArray()
    })));
    return { day, bodyWeightLog: bodyWeightLog ?? null, exercises: rows };
  },

  async addExerciseToDate(date, exerciseId) {
    await db.transaction('rw', db.workoutDays, db.workoutExercises, db.workoutSets, async () => {
      const day = await ensureWorkoutDay(date);
      const existing = await db.workoutExercises.where('workoutDayId').equals(day.id).and((item) => item.exerciseId === exerciseId).first();
      if (existing) return addSet(existing.id);
      const siblings = await db.workoutExercises.where('workoutDayId').equals(day.id).toArray();
      const timestamp = now();
      const card = { id: uuid(), workoutDayId: day.id, exerciseId, sortOrder: siblings.length ? Math.max(...siblings.map((item) => item.sortOrder)) + 10 : 10, memo: '', createdAt: timestamp, updatedAt: timestamp };
      await db.workoutExercises.put(card);
      await db.workoutSets.put({ id: uuid(), workoutExerciseId: card.id, setNumber: 1, weightKg: null, reps: null, createdAt: timestamp, updatedAt: timestamp });
    });
  },

  async addMenuToDate(date, menuId) {
    const items = await db.menuTemplateExercises.where('[menuTemplateId+sortOrder]')
      .between([menuId, Dexie.minKey], [menuId, Dexie.maxKey]).toArray();
    for (const item of items) await workoutRepository.addExerciseToDate(date, item.exerciseId);
  },
  addSet,
  async updateSet(id, patch) {
    const existing = await db.workoutSets.get(id);
    if (existing) await db.workoutSets.put({ ...existing, ...patch, updatedAt: now() });
  },
  async deleteSet(id) {
    const existing = await db.workoutSets.get(id);
    if (!existing) return;
    await db.workoutSets.delete(id);
    const siblings = await db.workoutSets.where('[workoutExerciseId+setNumber]')
      .between([existing.workoutExerciseId, Dexie.minKey], [existing.workoutExerciseId, Dexie.maxKey]).toArray();
    await Promise.all(siblings.map((set, index) => db.workoutSets.put({ ...set, setNumber: index + 1, updatedAt: now() })));
  },
  async deleteWorkoutExercise(id) {
    await db.transaction('rw', db.workoutExercises, db.workoutSets, async () => {
      await db.workoutSets.where('workoutExerciseId').equals(id).delete();
      await db.workoutExercises.delete(id);
    });
  },
  async deleteWorkoutDay(date) {
    const day = await db.workoutDays.where('date').equals(date).first();
    if (!day) return;
    await db.transaction('rw', db.workoutDays, db.workoutExercises, db.workoutSets, async () => {
      const cards = await db.workoutExercises.where('workoutDayId').equals(day.id).toArray();
      await Promise.all(cards.map((card) => db.workoutSets.where('workoutExerciseId').equals(card.id).delete()));
      await db.workoutExercises.where('workoutDayId').equals(day.id).delete();
      await db.workoutDays.delete(day.id);
    });
  }
};

export const bodyWeightRepository: BodyWeightRepositoryPort = {
  async upsert(date, value) {
    const existing = await db.bodyWeightLogs.where('date').equals(date).first();
    if (value === null) {
      if (existing) await db.bodyWeightLogs.delete(existing.id);
      return;
    }
    const timestamp = now();
    await db.bodyWeightLogs.put({ id: existing?.id ?? uuid(), date, bodyWeightKg: value, memo: existing?.memo ?? '', createdAt: existing?.createdAt ?? timestamp, updatedAt: timestamp });
  }
};
