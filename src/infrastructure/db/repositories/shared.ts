export function now() {
  return new Date().toISOString();
}

export function normalizeExerciseName(name: string) {
  return name.trim().normalize('NFKC').toLocaleLowerCase('ja-JP');
}
