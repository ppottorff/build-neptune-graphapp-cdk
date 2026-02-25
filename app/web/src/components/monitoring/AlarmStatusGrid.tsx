/**
 * AlarmStatusGrid — renders a grid of CloudWatch alarm states with
 * colour-coded badges (OK = green, ALARM = red, INSUFFICIENT_DATA = gray).
 */
import {
  CheckCircle2,
  XCircle,
  HelpCircle,
  AlertTriangle,
} from "lucide-react";
import type { MetricAlarm } from "@/lib/aws-clients";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export interface AlarmStatusGridProps {
  alarms: MetricAlarm[];
  loading?: boolean;
}

function stateIcon(state: string | undefined) {
  switch (state) {
    case "OK":
      return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    case "ALARM":
      return <XCircle className="h-4 w-4 text-red-600" />;
    case "INSUFFICIENT_DATA":
      return <HelpCircle className="h-4 w-4 text-gray-400" />;
    default:
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
  }
}

function stateBadgeClasses(state: string | undefined) {
  switch (state) {
    case "OK":
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
    case "ALARM":
      return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
    case "INSUFFICIENT_DATA":
      return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
    default:
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
  }
}

/** Derive a short human label from the alarm name */
function shortLabel(name: string | undefined): string {
  if (!name) return "Unknown";
  // Strip common prefixes like "graphApp-ObservabilityStack-"
  return name
    .replace(/^[^-]+-ObservabilityStack-/i, "")
    .replace(/[A-Z0-9]{8,}$/, "") // strip CDK hash suffix
    .replace(/-+$/, "");
}

export function AlarmStatusGrid({ alarms, loading }: AlarmStatusGridProps) {
  const alarming = alarms.filter((a) => a.StateValue === "ALARM");
  const ok = alarms.filter((a) => a.StateValue === "OK");
  const insufficient = alarms.filter(
    (a) => a.StateValue === "INSUFFICIENT_DATA"
  );
  const sorted = [...alarming, ...insufficient, ...ok];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <AlertTriangle className="h-4 w-4" />
          CloudWatch Alarms
          {alarming.length > 0 && (
            <span className="ml-auto rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-900/40 dark:text-red-400">
              {alarming.length} in alarm
            </span>
          )}
        </CardTitle>
        <CardDescription className="text-xs">
          {alarms.length} alarms configured
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 rounded" />
            ))}
          </div>
        ) : alarms.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No alarms found. Deploy the ObservabilityStack to create them.
          </p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
            {sorted.map((alarm) => (
              <div
                key={alarm.AlarmName}
                className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm ${stateBadgeClasses(alarm.StateValue)}`}
              >
                {stateIcon(alarm.StateValue)}
                <span className="truncate font-medium">
                  {shortLabel(alarm.AlarmName)}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
