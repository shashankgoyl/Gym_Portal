import { TRPCError } from "@trpc/server";
import { ENV } from "./_core/env";

/** The HP portal is intentionally a one-person wellness workspace. */
export function assertHpOwner(openId: string) {
  if (!ENV.ownerOpenId || openId !== ENV.ownerOpenId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "This private health portal is available only to its owner." });
  }
}
