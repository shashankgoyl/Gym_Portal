export type HealthScoreInput = {
  completedRoutineCount: number;
  waterMl: number;
  sleepMinutes: number;
  workoutCompleted: boolean;
  nutritionCompleted: boolean;
};

export function calculateHealthScore(input: HealthScoreInput) {
  const routinePoints = Math.max(0, input.completedRoutineCount) * 4;
  const waterPoints = Math.min(16, Math.round((input.waterMl / 2500) * 16));
  const sleepPoints = input.sleepMinutes >= 420 ? 15 : Math.round(input.sleepMinutes / 30);
  const score = 37 + routinePoints + waterPoints + sleepPoints + (input.workoutCompleted ? 8 : 0) + (input.nutritionCompleted ? 5 : 0);
  return Math.max(0, Math.min(100, score));
}
