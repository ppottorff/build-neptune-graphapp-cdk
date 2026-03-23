import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Moon, Sun, Monitor, Check, User, Shield } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useTheme } from "@/components/theme-provider";
import { useAuthStore } from "@/store/useAuthStore";
import { fetchUserAttributes, fetchAuthSession } from "aws-amplify/auth";

export const Route = createFileRoute("/_authenticated/_layout/settings")({
  component: Settings,
});

const THEME_OPTIONS = [
  {
    value: "light" as const,
    label: "Light",
    description: "Classic light interface",
    icon: Sun,
  },
  {
    value: "dark" as const,
    label: "Dark",
    description: "Reduced glare, ideal for low-light",
    icon: Moon,
  },
  {
    value: "system" as const,
    label: "System",
    description: "Follows your OS preference",
    icon: Monitor,
  },
];

function Settings() {
  const { theme, setTheme, syncing } = useTheme();
  const user = useAuthStore((s) => s.user);
  const roles = useAuthStore((s) => s.roles);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const attrs = await fetchUserAttributes();
        if (attrs.email) { setEmail(attrs.email); return; }
      } catch { /* fall through to token */ }
      // Fallback: read email from the ID token
      try {
        const session = await fetchAuthSession();
        const tokenEmail = session.tokens?.idToken?.payload?.email as string | undefined;
        if (tokenEmail) { setEmail(tokenEmail); return; }
      } catch { /* ignore */ }
      setEmail(null);
    })();
  }, []);

  return (
    <main className="grid flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Settings</h1>
        <p className="text-xs text-muted-foreground">
          Manage your preferences
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Appearance</CardTitle>
          <CardDescription>
            Choose how the interface looks.{" "}
            {syncing && (
              <span className="text-muted-foreground italic">Saving…</span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            {THEME_OPTIONS.map((opt) => {
              const active = theme === opt.value;
              const Icon = opt.icon;
              return (
                <button
                  key={opt.value}
                  onClick={() => setTheme(opt.value)}
                  className={`relative flex flex-col items-center gap-2 rounded-lg border-2 p-4 text-center transition-colors ${
                    active
                      ? "border-primary bg-primary/5"
                      : "border-muted hover:border-muted-foreground/25 hover:bg-muted/50"
                  }`}
                >
                  {active && (
                    <span className="absolute right-2 top-2">
                      <Check className="h-4 w-4 text-primary" />
                    </span>
                  )}
                  <Icon className={`h-6 w-6 ${active ? "text-primary" : "text-muted-foreground"}`} />
                  <span className="text-sm font-medium">{opt.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {opt.description}
                  </span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-4 w-4" />
            User Identity
          </CardTitle>
          <CardDescription>Your user details</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-x-6 gap-y-3 sm:grid-cols-3 text-sm">
            <div>
              <span className="text-xs text-muted-foreground">Username</span>
              <p className="font-medium truncate">{user || "—"}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Email</span>
              <p className="font-medium truncate">{email || "—"}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Groups</span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {roles.length > 0 ? roles.map((role) => (
                  <span
                    key={role}
                    className="inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary"
                  >
                    <Shield className="h-3 w-3" />
                    {role}
                  </span>
                )) : (
                  <span className="text-xs text-muted-foreground italic">No groups assigned</span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
