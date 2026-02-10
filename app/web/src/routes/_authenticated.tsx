import { createFileRoute, redirect } from "@tanstack/react-router";

// src/routes/_authenticated.tsx
export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ context }) => {
    if (!context.auth.isAuth) {
      throw redirect({
        // @ts-ignore
        to: "/signin",
        throw: true,
        // search: {
        //   redirect: location.href,
        // },
      });
    }
  },
});
