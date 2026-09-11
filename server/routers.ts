import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { healthRouter } from "./routers/health";
import { assistantRouter } from "./routers/assistant";
import { reportsRouter } from "./routers/reports";

export const appRouter = router({
  // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  // HP has no sign-in flow: `me` always returns the fixed local owner so the
  // client's existing auth-aware UI keeps working without any login screen.
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
  }),
  health: healthRouter,
  assistant: assistantRouter,
  reports: reportsRouter,
});

export type AppRouter = typeof appRouter;
