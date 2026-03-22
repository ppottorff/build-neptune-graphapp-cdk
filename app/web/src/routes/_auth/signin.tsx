import { UserAuthForm } from "@/components/auth-form";
import { UserNewPasswordForm } from "@/components/auth-newpassword-form";
import { useAuthStore } from "@/store/useAuthStore";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { ScatterChart } from "lucide-react";

export const Route = createFileRoute("/_auth/signin")({
  component: Signin,
});
export function Signin() {
  const signInStep = useAuthStore((state) => state.signInStep);

  const getState = useAuthStore.getState();
  useEffect(() => {}, [getState]);

  return (
    <div className="w-dvw h-dvh lg:grid lg:grid-cols-2">
      <div className="flex items-center justify-center py-12">
        <div className="mx-auto grid w-[350px] gap-6">
          {signInStep !== "CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED" ? (
            <>
              <div className="grid gap-2 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <ScatterChart className="h-7 w-7 text-primary" />
                  <span className="text-lg font-semibold tracking-tight">Neptune GraphApp</span>
                </div>
                <h1 className="text-2xl font-bold tracking-tight">Sign in</h1>
                <p className="text-sm text-muted-foreground">
                  Enter your credentials to continue
                </p>
              </div>
              <UserAuthForm />
            </>
          ) : (
            <>
              <div className="flex flex-col space-y-2 text-center">
                <h1 className="text-2xl font-semibold tracking-tight">
                  Change your password
                </h1>
                <p className="text-sm text-muted-foreground">
                  Enter your new and confirm password
                </p>
              </div>
              <UserNewPasswordForm />
            </>
          )}
        </div>
      </div>
      <div className="hidden lg:flex items-center justify-center bg-secondary/50">
        <img src="/graph.jpg" className="max-h-[80vh] rounded-lg object-contain" />
      </div>
    </div>
  );
}
