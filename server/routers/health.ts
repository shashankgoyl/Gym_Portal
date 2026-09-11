import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { assertHpOwner } from "../hp-owner";
import { createHpMeasurement, createHpReplacement, ensureHpProfile, getHpDailyLog, getHpProfile, listHpMeasurements, updateHpPreferences, updateHpReminderPreferences, upsertHpDailyLog, upsertHpRoutineEvent } from "../health-store";

const dateInput = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

function today() {
  return new Date().toISOString().slice(0, 10);
}

async function prepareOwner(openId: string, name?: string | null) {
  assertHpOwner(openId);
  await ensureHpProfile(openId, name);
}

export const healthRouter = router({
  settings: protectedProcedure.query(async ({ ctx }) => {
    await prepareOwner(ctx.user.openId, ctx.user.name);
    return getHpProfile(ctx.user.openId);
  }),
  measurements: protectedProcedure.query(async ({ ctx }) => {
    await prepareOwner(ctx.user.openId, ctx.user.name);
    return listHpMeasurements(ctx.user.openId);
  }),
  saveMeasurement: protectedProcedure.input(z.object({
    measuredOn: dateInput.optional(),
    weightKg: z.number().min(20).max(400).nullable().optional(),
    waistCm: z.number().min(30).max(250).nullable().optional(),
    restingPulse: z.number().int().min(25).max(220).nullable().optional(),
    notes: z.string().trim().max(1000).nullable().optional(),
  }).refine((input) => input.weightKg != null || input.waistCm != null || input.restingPulse != null || Boolean(input.notes), { message: "Add at least one measurement or note." })).mutation(async ({ ctx, input }) => {
    await prepareOwner(ctx.user.openId, ctx.user.name);
    return createHpMeasurement({ owner_open_id: ctx.user.openId, measured_on: input.measuredOn ?? today(), weight_kg: input.weightKg ?? null, waist_cm: input.waistCm ?? null, resting_pulse: input.restingPulse ?? null, notes: input.notes ?? null });
  }),
  getDay: protectedProcedure.input(z.object({ date: dateInput.optional() }).optional()).query(async ({ ctx, input }) => {
    const logDate = input?.date ?? today();
    await prepareOwner(ctx.user.openId, ctx.user.name);
    return getHpDailyLog(ctx.user.openId, logDate);
  }),
  addWater: protectedProcedure.input(z.object({ date: dateInput.optional(), amountMl: z.number().int().min(1).max(1500) })).mutation(async ({ ctx, input }) => {
    const logDate = input.date ?? today();
    await prepareOwner(ctx.user.openId, ctx.user.name);
    const existing = await getHpDailyLog(ctx.user.openId, logDate);
    return upsertHpDailyLog({ owner_open_id: ctx.user.openId, log_date: logDate, water_ml: Math.min(10_000, (existing?.water_ml ?? 0) + input.amountMl) });
  }),
  saveSleep: protectedProcedure.input(z.object({ date: dateInput.optional(), bedtime: z.string().regex(/^\d{2}:\d{2}$/), wakeTime: z.string().regex(/^\d{2}:\d{2}$/), sleepMinutes: z.number().int().min(0).max(1440) })).mutation(async ({ ctx, input }) => {
    const logDate = input.date ?? today();
    await prepareOwner(ctx.user.openId, ctx.user.name);
    return upsertHpDailyLog({ owner_open_id: ctx.user.openId, log_date: logDate, bedtime: input.bedtime, wake_time: input.wakeTime, sleep_minutes: input.sleepMinutes });
  }),
  updateRoutine: protectedProcedure.input(z.object({ date: dateInput.optional(), routineKey: z.string().min(1).max(80), title: z.string().min(1).max(160), scheduledTime: z.string().regex(/^\d{2}:\d{2}$/), movedTo: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(), status: z.enum(["pending", "completed", "skipped", "replaced"]) })).mutation(async ({ ctx, input }) => {
    await prepareOwner(ctx.user.openId, ctx.user.name);
    return upsertHpRoutineEvent({ owner_open_id: ctx.user.openId, log_date: input.date ?? today(), routine_key: input.routineKey, title: input.title, scheduled_time: input.scheduledTime, moved_to: input.movedTo, status: input.status });
  }),
  recordReplacement: protectedProcedure.input(z.object({ date: dateInput.optional(), sourceKind: z.enum(["exercise", "food"]), originalItem: z.string().min(1).max(160), replacementItem: z.string().min(1).max(160), reason: z.string().trim().min(2).max(500), targetGroup: z.string().max(100).optional() })).mutation(async ({ ctx, input }) => {
    await prepareOwner(ctx.user.openId, ctx.user.name);
    return createHpReplacement({ owner_open_id: ctx.user.openId, log_date: input.date ?? today(), source_kind: input.sourceKind, original_item: input.originalItem, replacement_item: input.replacementItem, replacement_reason: input.reason, target_group: input.targetGroup });
  }),
  savePreferences: protectedProcedure.input(z.object({ foodPreferences: z.array(z.string().trim().min(1).max(80)).max(12), healthGoals: z.array(z.string().trim().min(1).max(80)).max(12) })).mutation(async ({ ctx, input }) => {
    await prepareOwner(ctx.user.openId, ctx.user.name);
    return updateHpPreferences(ctx.user.openId, input.foodPreferences, input.healthGoals);
  }),
  saveReminders: protectedProcedure.input(z.object({ morning: z.boolean(), water: z.boolean(), winddown: z.boolean() })).mutation(async ({ ctx, input }) => {
    await prepareOwner(ctx.user.openId, ctx.user.name);
    return updateHpReminderPreferences(ctx.user.openId, input);
  }),
});
