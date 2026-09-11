export type GeminiHealthContext = {
  displayName: string;
  localTime: string;
  dailyLog: { waterMl: number; sleepMinutes: number | null; healthScore: number | null } | null;
  routines: Array<{ title: string; status: string; scheduledTime: string }>;
  recentReplacements: Array<{ sourceKind: string; originalItem: string; replacementItem: string; reason: string }>;
  reportFindings: Array<{ name: string; value: string; status: string }>;
};

export function createGeminiHealthPrompt(question: string, context: GeminiHealthContext) {
  return `You are HP, a calm personal health-and-fitness companion. Provide concise wellness information, not medical diagnosis or treatment. Do not tell the user to start, stop, or change medication or supplements. Encourage a qualified clinician for concerning symptoms or care decisions. Avoid fear-based wording.

Current local time: ${context.localTime}
User: ${context.displayName}
Today's log: ${context.dailyLog ? `water ${context.dailyLog.waterMl} ml, sleep ${context.dailyLog.sleepMinutes ?? "not logged"} minutes, health score ${context.dailyLog.healthScore ?? "not calculated"}` : "No daily log yet"}
Routine status: ${context.routines.map((item) => `${item.scheduledTime} ${item.title} (${item.status})`).join("; ") || "No routine events logged"}
Recent substitutions: ${context.recentReplacements.map((item) => `${item.sourceKind}: ${item.originalItem} → ${item.replacementItem}; reason: ${item.reason}`).join("; ") || "None"}
Report markers supplied by the user: ${context.reportFindings.map((item) => `${item.name} ${item.value} (${item.status})`).join("; ")}

Respond in 2–5 short paragraphs. Start with a direct answer. Where relevant, suggest one small action that fits the user's present time of day. Be clear that report interpretation is educational and should be reviewed with a clinician.

User question: ${question}`;
}

export async function askGemini(question: string, context: GeminiHealthContext) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { available: false as const, answer: "Gemini is ready to connect. Add GEMINI_API_KEY in project Settings to enable personalised conversations." };

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: createGeminiHealthPrompt(question, context) }] }],
      generationConfig: { temperature: 0.35, maxOutputTokens: 700 },
    }),
  });

  if (!response.ok) throw new Error("Gemini could not respond right now. Please try again later.");
  const payload = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  const answer = payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("").trim();
  if (!answer) throw new Error("Gemini returned an empty response. Please try again.");
  return { available: true as const, answer };
}

export async function analyzePdfWithGemini(fileName: string, fileBase64: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { available: false as const, extractedText: null, summary: "Gemini is not configured yet.", findings: [] as Array<{ name: string; value: string; status: string; note: string }> };

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [
        { text: `Read this health-report PDF named ${fileName}. Extract the clinically relevant text, then return JSON only with this exact shape: {"extractedText":"...","summary":"plain-language educational summary","findings":[{"name":"test name","value":"exact value","status":"reported status","note":"brief context"}]}. Do not diagnose or advise medicine, dosing, or treatment; tell the user to review significant results with a clinician.` },
        { inlineData: { mimeType: "application/pdf", data: fileBase64 } },
      ] }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 2600, responseMimeType: "application/json" },
    }),
  });
  if (!response.ok) throw new Error("Gemini could not extract this report right now.");
  const payload = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  const raw = payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("").trim();
  if (!raw) throw new Error("Gemini returned no report analysis.");
  const parsed = JSON.parse(raw) as { extractedText?: unknown; summary?: unknown; findings?: unknown };
  return {
    available: true as const,
    extractedText: typeof parsed.extractedText === "string" ? parsed.extractedText.slice(0, 30_000) : null,
    summary: typeof parsed.summary === "string" ? parsed.summary.slice(0, 4_000) : "Report processed.",
    findings: Array.isArray(parsed.findings) ? parsed.findings.filter((item): item is { name: string; value: string; status: string; note: string } => Boolean(item) && typeof item.name === "string" && typeof item.value === "string" && typeof item.status === "string" && typeof item.note === "string").slice(0, 30) : [],
  };
}
