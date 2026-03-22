import { UserAuthForm } from "@/components/auth-form";
import { UserNewPasswordForm } from "@/components/auth-newpassword-form";
import { UserRegisterForm } from "@/components/auth-register-form";
import { useAuthStore } from "@/store/useAuthStore";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

export const Route = createFileRoute("/_auth/signin")({
  component: Signin,
});

/* ---------- ambient graph constellation ---------- */
function GraphConstellation() {
  const nodes = useMemo(() => {
    const items: { x: number; y: number; r: number; delay: number }[] = [];
    for (let i = 0; i < 40; i++) {
      const angle = i * 2.399963;
      const radius = 12 + (i * 2.4) % 38;
      items.push({
        x: 50 + Math.cos(angle) * radius + ((i * 7) % 12) - 6,
        y: 50 + Math.sin(angle) * radius + ((i * 11) % 12) - 6,
        r: 0.25 + (i % 4) * 0.1,
        delay: (i * 0.4) % 6,
      });
    }
    return items;
  }, []);

  const edges = useMemo(() => {
    const lines: { x1: number; y1: number; x2: number; y2: number; delay: number }[] = [];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        if (Math.sqrt(dx * dx + dy * dy) < 14) {
          lines.push({ x1: nodes[i].x, y1: nodes[i].y, x2: nodes[j].x, y2: nodes[j].y, delay: (i * 0.3) % 5 });
        }
      }
    }
    return lines;
  }, [nodes]);

  return (
    <svg
      className="absolute inset-0 h-full w-full"
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      {edges.map((e, i) => (
        <line
          key={`e${i}`}
          x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2}
          stroke="hsl(214 60% 45% / 0.10)"
          strokeWidth="0.15"
          className="animate-graph-edge"
          style={{ animationDelay: `${e.delay}s` }}
        />
      ))}
      {nodes.map((n, i) => (
        <g key={`n${i}`}>
          <circle
            cx={n.x} cy={n.y} r={n.r}
            fill="hsl(214 60% 45% / 0.12)"
            className="animate-graph-node"
            style={{ animationDelay: `${n.delay}s` }}
          />
          {i % 5 === 0 && (
            <circle
              cx={n.x} cy={n.y} r={n.r * 3}
              fill="none"
              stroke="hsl(214 60% 45% / 0.35)"
              strokeWidth="0.08"
              className="animate-graph-pulse"
              style={{ animationDelay: `${n.delay + 1}s` }}
            />
          )}
        </g>
      ))}
    </svg>
  );
}

/* ---------- main signin component ---------- */
export function Signin() {
  const signInStep = useAuthStore((state) => state.signInStep);
  const getState = useAuthStore.getState();
  useEffect(() => {}, [getState]);

  const [view, setView] = useState<"signin" | "register">("signin");

  const isNewPassword =
    signInStep === "CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED";

  return (
    <div className="relative w-dvw h-dvh overflow-hidden bg-[hsl(210_15%_96%)]">
      {/* background */}
      <div className="absolute inset-0">
        <GraphConstellation />
      </div>

      {/* centered form */}
      <div className="relative z-10 flex h-full items-center justify-center px-6">
        <div className="w-full max-w-[420px] animate-fade-in rounded-2xl bg-[hsl(220_10%_18%)] p-8 shadow-2xl">
          <h1 className="text-[26px] font-semibold tracking-tight text-white text-center mb-8">
            Log In
          </h1>

          {/* form */}
          {isNewPassword ? (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-white">
                  Set new password
                </h2>
                <p className="mt-1.5 text-sm text-[hsl(215_14%_70%)]">
                  Choose a secure password to continue
                </p>
              </div>
              <UserNewPasswordForm />
            </div>
          ) : view === "register" ? (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold tracking-tight text-white">
                Create an account
              </h2>
              <UserRegisterForm onRegistered={() => setView("signin")} />
              <p className="text-center text-sm text-[hsl(215_14%_70%)]">
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => setView("signin")}
                  className="font-medium text-[hsl(214_60%_65%)] underline underline-offset-4 hover:text-[hsl(214_60%_75%)] transition-colors"
                >
                  Sign in
                </button>
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <UserAuthForm />
              <p className="text-center text-sm text-[hsl(215_14%_70%)]">
                Don&apos;t have an account?{" "}
                <button
                  type="button"
                  onClick={() => setView("register")}
                  className="font-medium text-[hsl(214_60%_65%)] underline underline-offset-4 hover:text-[hsl(214_60%_75%)] transition-colors"
                >
                  Create one
                </button>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
