import { trpc } from "@/lib/trpc";
import { useMemo } from "react";

// HP has no sign-in flow: the server always answers `auth.me` with the fixed
// local owner (see server/_core/context.ts), so this hook just exposes that
// as a normal "authenticated" state. Kept as a hook (rather than a constant)
// so the rest of the app can keep using the same loading/isAuthenticated
// shape it always has.
export function useAuth() {
  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  const state = useMemo(
    () => ({
      user: meQuery.data ?? null,
      loading: meQuery.isLoading,
      error: meQuery.error ?? null,
      isAuthenticated: Boolean(meQuery.data),
    }),
    [meQuery.data, meQuery.error, meQuery.isLoading]
  );

  return {
    ...state,
    refresh: () => meQuery.refetch(),
  };
}
