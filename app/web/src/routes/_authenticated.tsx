import { createFileRoute, redirect } from "@tanstack/react-router";
import { fetchAuthSession } from "aws-amplify/auth";
import type { AppRole } from "@/store/useAuthStore";

// src/routes/_authenticated.tsx
export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ context }) => {
    // Fast path: in-memory store already knows we're authenticated
    if (context.auth.isAuth) return;

    // On page reload the store resets, but Amplify persists tokens in
    // localStorage. Check for a live session before bouncing to sign-in.
    try {
      const session = await fetchAuthSession();
      if (session.tokens) {
        context.auth.setIsAuthenticated(true);
        // Restore roles from the JWT on reload
        const groups = (session.tokens.idToken?.payload["cognito:groups"] as AppRole[]) ?? [];
        context.auth.setRoles(groups);
        return;
      }
    } catch {
      // No valid session — fall through to redirect
    }

    throw redirect({
      // @ts-ignore
      to: "/signin",
    });
  },
});
