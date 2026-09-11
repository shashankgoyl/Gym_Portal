import { z } from "zod";
import { analyzePdfWithGemini } from "../gemini";
import { createHpHealthReport, ensureHpProfile, listHpHealthReports } from "../health-store";
import { storagePut } from "../storage";
import { protectedProcedure, router } from "../_core/trpc";
import { assertHpOwner } from "../hp-owner";

function safeFilename(filename: string) {
  return filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120) || "health-report.pdf";
}

export const reportsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    assertHpOwner(ctx.user.openId);
    await ensureHpProfile(ctx.user.openId, ctx.user.name);
    return listHpHealthReports(ctx.user.openId);
  }),
  uploadPdf: protectedProcedure.input(z.object({
    fileName: z.string().min(1).max(180),
    fileBase64: z.string().min(20).max(10_000_000),
  })).mutation(async ({ ctx, input }) => {
    assertHpOwner(ctx.user.openId);
    const fileData = Buffer.from(input.fileBase64, "base64");
    if (fileData.length === 0 || fileData.length > 7_000_000) throw new Error("Please upload a PDF smaller than 7 MB.");
    if (fileData.subarray(0, 4).toString() !== "%PDF") throw new Error("Only valid PDF health reports can be uploaded.");

    await ensureHpProfile(ctx.user.openId, ctx.user.name);
    const saved = await storagePut(`hp-health-reports/${ctx.user.openId}/${Date.now()}-${safeFilename(input.fileName)}`, fileData, "application/pdf");
    const analysis = await analyzePdfWithGemini(input.fileName, input.fileBase64).catch(() => ({
      available: false as const,
      extractedText: null,
      summary: "The report was saved securely. Add GEMINI_API_KEY to extract and explain its contents.",
      findings: [],
    }));
    const report = await createHpHealthReport({
      owner_open_id: ctx.user.openId,
      original_filename: input.fileName,
      storage_key: saved.key,
      extracted_text: analysis.extractedText,
      findings: analysis.findings,
    });
    return { report, storageUrl: saved.url, analysis };
  }),
});
