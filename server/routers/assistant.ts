import { z } from "zod";
import { askGemini } from "../gemini";
import { ensureHpProfile, getHpAssistantContext } from "../health-store";
import { protectedProcedure, router } from "../_core/trpc";
import { assertHpOwner } from "../hp-owner";

export const assistantRouter = router({
  chat: protectedProcedure.input(z.object({ question: z.string().trim().min(1).max(2000), localTime: z.string().datetime() })).mutation(async ({ ctx, input }) => {
    assertHpOwner(ctx.user.openId);
    await ensureHpProfile(ctx.user.openId, ctx.user.name);
    const logDate = input.localTime.slice(0, 10);
    const storedContext = await getHpAssistantContext(ctx.user.openId, logDate);
    return askGemini(input.question, { ...storedContext, localTime: input.localTime });
  }),
});
