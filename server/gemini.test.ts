import { describe, expect, it } from "vitest";
import { createGeminiHealthPrompt } from "./gemini";

describe("createGeminiHealthPrompt", () => {
  it("includes live health context and keeps the assistant within wellness information boundaries", () => {
    const prompt = createGeminiHealthPrompt("What should I focus on?", {
      displayName: "Shashank",
      localTime: "2026-08-20T14:00:00+05:30",
      dailyLog: { waterMl: 1250, sleepMinutes: 432, healthScore: 68 },
      routines: [{ title: "Chest strength session", status: "pending", scheduledTime: "07:00" }],
      recentReplacements: [{ sourceKind: "exercise", originalItem: "Barbell bench press", replacementItem: "Machine chest press", reason: "Equipment busy" }],
      reportFindings: [{ name: "Vitamin D", value: "7.9", status: "deficient" }],
    });

    expect(prompt).toContain("water 1250 ml");
    expect(prompt).toContain("Chest strength session (pending)");
    expect(prompt).toContain("Vitamin D 7.9 (deficient)");
    expect(prompt).toContain("not medical diagnosis or treatment");
    expect(prompt).toContain("What should I focus on?");
  });
});
