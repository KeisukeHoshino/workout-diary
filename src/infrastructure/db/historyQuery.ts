import type { HistoryQueryPort } from '../../application/ports';
import { db } from './database';

export const historyQuery: HistoryQueryPort = {
  async list() {
    const [days, bodyWeights, workoutExercises, sets, exercises] = await Promise.all([
      db.workoutDays.toArray(),
      db.bodyWeightLogs.toArray(),
      db.workoutExercises.toArray(),
      db.workoutSets.toArray(),
      db.exercises.toArray()
    ]);
    const dates = [...new Set([...days.map((day) => day.date), ...bodyWeights.map((log) => log.date)])]
      .sort((a, b) => b.localeCompare(a));

    return dates.map((date) => {
      const day = days.find((item) => item.date === date) ?? null;
      const cards = day ? workoutExercises.filter((item) => item.workoutDayId === day.id) : [];
      const cardIds = new Set(cards.map((card) => card.id));
      const exerciseById = new Map(exercises.map((exercise) => [exercise.id, exercise.name]));
      return {
        date,
        day,
        weight: bodyWeights.find((item) => item.date === date) ?? null,
        exerciseCount: cards.length,
        setCount: sets.filter((set) => cardIds.has(set.workoutExerciseId)).length,
        exerciseNames: cards.flatMap((card) => {
          const name = exerciseById.get(card.exerciseId);
          return name ? [name] : [];
        }).slice(0, 3)
      };
    });
  }
};
