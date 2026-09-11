import { describe, expect, it } from "vitest";
import { calculateHealthScore } from "./health-score";

describe("calculateHealthScore", () => {
  it("rewards completed routine, hydration, sleep, workout, and nutrition without exceeding 100", () => {
    expect(calculateHealthScore({
      completedRoutineCount: 6,
      waterMl: 2500,
      sleepMinutes: 450,
      workoutCompleted: true,
      nutritionCompleted: true,
    })).toBe(100);
  });

  it("keeps an incomplete day within the valid 0–100 score range", () => {
    expect(calculateHealthScore({
      completedRoutineCount: 0,
      waterMl: 0,
      sleepMinutes: 0,
      workoutCompleted: false,
      nutritionCompleted: false,
    })).toBe(37);
  });
});
