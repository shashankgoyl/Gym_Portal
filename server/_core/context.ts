import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../shared/user";
import { ENV } from "./env";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

// HP is a private, single-owner app with no sign-in flow: every request is
// authenticated as this one fixed local owner. There is nothing to verify
// (no cookie, no token) because only the person running this server can
// reach it.
const LOCAL_OWNER: User = {
  id: 1,
  openId: ENV.ownerOpenId,
  name: ENV.ownerName,
  email: null,
  loginMethod: "local",
  role: "admin",
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  return {
    req: opts.req,
    res: opts.res,
    user: LOCAL_OWNER,
  };
}
