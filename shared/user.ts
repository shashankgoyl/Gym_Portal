/**
 * HP is a private, single-owner app with no sign-in flow. Every request is
 * treated as this one fixed local user, so this type exists only to keep the
 * rest of the app (tRPC context, routers, tests) strongly typed.
 */
export type User = {
  id: number;
  openId: string;
  name: string | null;
  email: string | null;
  loginMethod: string | null;
  role: "user" | "admin";
  createdAt: Date;
  updatedAt: Date;
  lastSignedIn: Date;
};
