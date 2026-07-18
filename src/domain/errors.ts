export class DuplicateExerciseNameError extends Error {
  constructor(name: string) {
    super(`${name} はすでにマイ種目に登録されています。`);
    this.name = 'DuplicateExerciseNameError';
  }
}
