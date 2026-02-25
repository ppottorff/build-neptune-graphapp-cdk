import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import {
  Activity,
  Cloud,
  Database,
  Server,
  RefreshCw,
  CheckCircle2,
  XCircle,
  HelpCircle,
  AlertTriangle,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Icons } from "@/lib/utils";
import { MetricChart } from "@/components/monitoring/MetricChart";
import { AlarmStatusGrid } from "@/components/monitoring/AlarmStatusGrid";
import { AwsHealthStatus } from "@/components/monitoring/AwsHealthStatus";
import {
  useCloudWatchMetrics,
  useCloudWatchAlarms,
  useResourceStatus,
} from "@/hooks/useMonitoring";
import { useAwsHealth } from "@/hooks/useAwsHealth";
import type { MetricDataQuery } from "@/lib/aws-clients";

export const Route = createFileRoute("/_authenticated/_layout/monitoring")({
  component: Monitoring,
});

// ─── Known resource identifiers ──────────────────────────────────────
const BASTION_INSTANCE_ID = "i-0b4bd9e067ac8b605";
const NEPTUNE_CLUSTER_ID = "neptunedbcluster-j3qjzckxw91y";

/** Actual deployed Lambda function names (from CloudFormation outputs) */
const LAMBDA_FUNCTIONS: Record<string, string> = {
  queryFn:    "graphApp-ApiStack-apiqueryFn759F258B-su8NmPkUuhbE",
  aiQueryFn:  "graphApp-ApiStack-apiaiQueryFn8E4D89B7-rMXtbqOoBF7W",
  mutationFn: "graphApp-ApiStack-apimutationFn9FBEFA00-45QqTivNIsCp",
  bulkLoadFn: "graphApp-ApiStack-apibulkLoadFn0A8D264C-BGr9AWiSBM6G",
};

// ─── GitHub Status API types ─────────────────────────────────────────
type GitHubComponentStatus =
  | "operational"
  | "degraded_performance"
  | "partial_outage"
  | "major_outage";

interface GitHubComponent {
  id: string;
  name: string;
  status: GitHubComponentStatus;
  description: string | null;
}

interface GitHubIncidentUpdate {
  body: string;
  created_at: string;
  status: string;
}

interface GitHubIncident {
  id: string;
  name: string;
  status: string;
  impact: string;
  shortlink: string;
  created_at: string;
  updated_at: string;
  incident_updates: GitHubIncidentUpdate[];
  components: GitHubComponent[];
}

const TRACKED_COMPONENT_IDS: Record<string, string> = {
  "8l4ygp009s5s": "Git Operations",
  "4230lsnqdsld": "Webhooks",
  brv1bkgrwx7q: "API Requests",
  kr09ddfgbfsf: "Issues",
  hhtssxt0f5v2: "Pull Requests",
  br0l2tvcx85d: "Actions",
  st3j38cctv9l: "Packages",
  vg70hn9s2tyj: "Pages",
};

// ─── Status indicator helpers ────────────────────────────────────────

function EC2StateBadge({ state }: { state: string }) {
  const map: Record<string, { color: string; icon: typeof CheckCircle2 }> = {
    running: {
      color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
      icon: CheckCircle2,
    },
    stopped: {
      color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
      icon: XCircle,
    },
    stopping: {
      color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
      icon: AlertTriangle,
    },
    pending: {
      color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
      icon: Clock,
    },
  };
  const info = map[state] ?? {
    color: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
    icon: HelpCircle,
  };
  const Icon = info.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${info.color}`}
    >
      <Icon className="h-4 w-4" />
      {state.charAt(0).toUpperCase() + state.slice(1)}
    </span>
  );
}

function NeptuneStateBadge({ status }: { status: string }) {
  const isUp = status === "available";
  const isStopped = status === "stopped";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${
        isUp
          ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
          : isStopped
            ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
            : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
      }`}
    >
      {isUp ? (
        <CheckCircle2 className="h-4 w-4" />
      ) : isStopped ? (
        <XCircle className="h-4 w-4" />
      ) : (
        <AlertTriangle className="h-4 w-4" />
      )}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

/** Green / Yellow / Red checkbox-style indicator for GitHub component status */
function GitHubStatusIndicator({ status }: { status: GitHubComponentStatus }) {
  switch (status) {
    case "operational":
      return (
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3.5 w-3.5 rounded-sm bg-green-500 flex items-center justify-center">
            <CheckCircle2 className="h-2.5 w-2.5 text-white" />
          </span>
          <span className="text-sm text-green-700 dark:text-green-400">
            Operational
          </span>
        </span>
      );
    case "degraded_performance":
      return (
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3.5 w-3.5 rounded-sm bg-yellow-500 flex items-center justify-center">
            <AlertTriangle className="h-2.5 w-2.5 text-white" />
          </span>
          <span className="text-sm text-yellow-700 dark:text-yellow-400">
            Degraded
          </span>
        </span>
      );
    case "partial_outage":
      return (
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3.5 w-3.5 rounded-sm bg-yellow-500 flex items-center justify-center">
            <AlertTriangle className="h-2.5 w-2.5 text-white" />
          </span>
          <span className="text-sm text-yellow-700 dark:text-yellow-400">
            Partial Outage
          </span>
        </span>
      );
    case "major_outage":
      return (
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3.5 w-3.5 rounded-sm bg-red-500 flex items-center justify-center">
            <XCircle className="h-2.5 w-2.5 text-white" />
          </span>
          <span className="text-sm text-red-700 dark:text-red-400">
            Major Outage
          </span>
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3.5 w-3.5 rounded-sm bg-gray-400 flex items-center justify-center">
            <HelpCircle className="h-2.5 w-2.5 text-white" />
          </span>
          <span className="text-sm text-gray-500">Unknown</span>
        </span>
      );
  }
}

function formatDuration(start: string): string {
  const ms = Date.now() - new Date(start).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  const remainMins = mins % 60;
  if (hrs < 24) return `${hrs}h ${remainMins}m`;
  const days = Math.floor(hrs / 24);
  return `${days}d ${hrs % 24}h`;
}

// ─── CloudWatch metric query builders ────────────────────────────────

function lambdaMetricQueries(
  stat: string,
  metricName: string,
  period = 300
): MetricDataQuery[] {
  return Object.entries(LAMBDA_FUNCTIONS).map(([label, fullName], idx) => ({
    Id: `m${idx}`,
    Label: label,
    MetricStat: {
      Metric: {
        Namespace: "AWS/Lambda",
        MetricName: metricName,
        Dimensions: [{ Name: "FunctionName", Value: fullName }],
      },
      Period: period,
      Stat: stat,
    },
  }));
}

function neptuneMetricQuery(
  metricName: string,
  stat: string,
  label: string,
  period = 300
): MetricDataQuery[] {
  return [
    {
      Id: "n0",
      Label: label,
      MetricStat: {
        Metric: {
          Namespace: "AWS/Neptune",
          MetricName: metricName,
          Dimensions: [
            { Name: "DBClusterIdentifier", Value: NEPTUNE_CLUSTER_ID },
          ],
        },
        Period: period,
        Stat: stat,
      },
    },
  ];
}

// ─── Main component ──────────────────────────────────────────────────

function Monitoring() {
  // ── Resource status (EC2 + Neptune) ──
  const resources = useResourceStatus(
    [BASTION_INSTANCE_ID],
    [NEPTUNE_CLUSTER_ID],
    0
  );

  // ── CloudWatch Alarms ──
  const alarmsHook = useCloudWatchAlarms(0);

  // ── Lambda Metrics ──
  const lambdaInvocationQueries = useMemo(
    () => lambdaMetricQueries("Sum", "Invocations"),
    []
  );
  const lambdaInvocations = useCloudWatchMetrics({
    queries: lambdaInvocationQueries,
    hours: 6,
    refreshInterval: 0,
  });

  const lambdaErrorQueries = useMemo(
    () => lambdaMetricQueries("Sum", "Errors"),
    []
  );
  const lambdaErrors = useCloudWatchMetrics({
    queries: lambdaErrorQueries,
    hours: 6,
    refreshInterval: 0,
  });

  const lambdaDurationQueries = useMemo(
    () => lambdaMetricQueries("Average", "Duration"),
    []
  );
  const lambdaDuration = useCloudWatchMetrics({
    queries: lambdaDurationQueries,
    hours: 6,
    refreshInterval: 0,
  });

  // ── Neptune Metrics ──
  const neptuneCpuQueries = useMemo(
    () => neptuneMetricQuery("CPUUtilization", "Average", "CPU %"),
    []
  );
  const neptuneCpu = useCloudWatchMetrics({
    queries: neptuneCpuQueries,
    hours: 6,
    refreshInterval: 0,
  });

  const neptuneCapQueries = useMemo(
    () =>
      neptuneMetricQuery(
        "ServerlessDatabaseCapacity",
        "Average",
        "NCU"
      ),
    []
  );
  const neptuneCapacity = useCloudWatchMetrics({
    queries: neptuneCapQueries,
    hours: 6,
    refreshInterval: 0,
  });

  // ── AWS Health Status ──
  const awsHealth = useAwsHealth(0);

  // ── GitHub Status ──
  const [ghComponents, setGhComponents] = useState<
    Record<string, GitHubComponentStatus>
  >({});
  const [ghIncidents, setGhIncidents] = useState<GitHubIncident[]>([]);
  const [ghLoading, setGhLoading] = useState(false);
  const ghFetched = useRef(false);

  const fetchGitHubStatus = useCallback(async () => {
    const isInitial = !ghFetched.current;
    if (isInitial) setGhLoading(true);
    try {
      const [compRes, incRes] = await Promise.all([
        fetch("https://www.githubstatus.com/api/v2/components.json"),
        fetch("https://www.githubstatus.com/api/v2/incidents/unresolved.json"),
      ]);
      if (!compRes.ok || !incRes.ok) throw new Error("GitHub Status API error");
      const compData = await compRes.json();
      const incData = await incRes.json();
      const statusMap: Record<string, GitHubComponentStatus> = {};
      for (const comp of compData.components as GitHubComponent[]) {
        if (TRACKED_COMPONENT_IDS[comp.id]) {
          statusMap[comp.id] = comp.status;
        }
      }
      setGhComponents(statusMap);
      setGhIncidents(incData.incidents as GitHubIncident[]);
      ghFetched.current = true;
    } catch (error: any) {
      // Only log — don't show disruptive toasts on background refresh failures
      console.warn("GitHub Status fetch error:", error);
    } finally {
      setGhLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGitHubStatus();
  }, [fetchGitHubStatus]);

  // ── Aggregate refresh ──
  const refreshAll = useCallback(() => {
    resources.refresh();
    alarmsHook.refresh();
    lambdaInvocations.refresh();
    lambdaErrors.refresh();
    lambdaDuration.refresh();
    neptuneCpu.refresh();
    neptuneCapacity.refresh();
    awsHealth.refresh();
    fetchGitHubStatus();
  }, [
    resources,
    alarmsHook,
    lambdaInvocations,
    lambdaErrors,
    lambdaDuration,
    neptuneCpu,
    neptuneCapacity,
    awsHealth,
    fetchGitHubStatus,
  ]);

  const anyLoading = resources.loading || alarmsHook.loading || awsHealth.loading || ghLoading;

  // Resolve resources
  const bastion = resources.ec2Instances.find(
    (i) => i.instanceId === BASTION_INSTANCE_ID
  );
  const neptune = resources.neptuneClusters[0];

  return (
    <main className="grid flex-1 items-start gap-3 p-4 sm:px-6 sm:py-0">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">
            Monitoring
          </h1>
          <p className="text-xs text-muted-foreground">
            Infrastructure status, metrics &amp; alarms
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={refreshAll}
          disabled={anyLoading}
        >
          {anyLoading ? (
            <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Refresh
        </Button>
      </div>

      {/* ── Row 1: Resource Status + Alarms ── */}
      <Card>
        <CardContent className="p-4">
          {resources.error && (
            <p className="mb-3 rounded bg-red-50 p-2 text-xs text-red-700 dark:bg-red-900/20 dark:text-red-400">
              {resources.error}
            </p>
          )}
          <div className="grid gap-4 lg:grid-cols-[1fr_auto_1fr]">
            {/* Resource status */}
            <div className="grid gap-3 sm:grid-cols-2">
              {/* Bastion */}
              <div className="flex items-center gap-3 rounded-md border p-3">
                <Server className="h-5 w-5 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium">SSM Bastion Host</p>
                  {resources.loading && !bastion ? (
                    <Skeleton className="mt-1 h-5 w-20 rounded-full" />
                  ) : bastion ? (
                    <div className="mt-1 flex items-center gap-2">
                      <EC2StateBadge state={bastion.state} />
                      <span className="text-[10px] text-muted-foreground">{bastion.instanceType}</span>
                    </div>
                  ) : (
                    <span className="text-[10px] text-muted-foreground">Not found</span>
                  )}
                </div>
              </div>

              {/* Neptune */}
              <div className="flex items-center gap-3 rounded-md border p-3">
                <Database className="h-5 w-5 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium">Neptune Cluster</p>
                  {resources.loading && !neptune ? (
                    <Skeleton className="mt-1 h-5 w-20 rounded-full" />
                  ) : neptune ? (
                    <div className="mt-1 flex items-center gap-2">
                      <NeptuneStateBadge status={neptune.status} />
                      <span className="text-[10px] text-muted-foreground">
                        {neptune.engine} {neptune.engineVersion}
                        {neptune.serverlessV2ScalingMin != null &&
                          ` · ${neptune.serverlessV2ScalingMin}–${neptune.serverlessV2ScalingMax} NCU`}
                      </span>
                    </div>
                  ) : (
                    <span className="text-[10px] text-muted-foreground">Not found</span>
                  )}
                </div>
              </div>
            </div>

            {/* Divider */}
            <Separator orientation="vertical" className="hidden lg:block" />
            <Separator className="lg:hidden" />

            {/* Alarms */}
            <AlarmStatusGrid
              alarms={alarmsHook.alarms}
              loading={alarmsHook.loading}
            />
          </div>
        </CardContent>
      </Card>

      {/* ── Row 2: All Metrics (Lambda + Neptune) ── */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Activity className="h-4 w-4" />
            CloudWatch Metrics
            <span className="text-xs font-normal text-muted-foreground">— last 6 hours</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 p-4 pt-2">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <MetricChart
              title="Lambda Invocations"
              results={lambdaInvocations.data}
              loading={lambdaInvocations.loading}
              height={160}
              bare
            />
            <MetricChart
              title="Lambda Errors"
              results={lambdaErrors.data}
              loading={lambdaErrors.loading}
              height={160}
              bare
            />
            <MetricChart
              title="Lambda Duration (avg)"
              results={lambdaDuration.data}
              loading={lambdaDuration.loading}
              unit="ms"
              yAxisWidth={55}
              height={160}
              bare
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <MetricChart
              title="Neptune CPU"
              results={neptuneCpu.data}
              loading={neptuneCpu.loading}
              unit="%"
              height={160}
              bare
            />
            <MetricChart
              title="Neptune NCU"
              description="Serverless Capacity"
              results={neptuneCapacity.data}
              loading={neptuneCapacity.loading}
              unit=" NCU"
              height={160}
              bare
            />
          </div>
        </CardContent>
      </Card>

      {/* ── Row 3: Cloud Dependencies (AWS Health + GitHub side-by-side) ── */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-4 flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Cloud className="h-4 w-4" />
            Cloud Dependencies
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => { awsHealth.refresh(); fetchGitHubStatus(); }}
            disabled={awsHealth.loading || ghLoading}
          >
            {(awsHealth.loading || ghLoading) ? (
              <Icons.spinner className="mr-1 h-3 w-3 animate-spin" />
            ) : (
              <RefreshCw className="mr-1 h-3 w-3" />
            )}
            Refresh
          </Button>
        </CardHeader>
        <CardContent className="grid gap-4 p-4 pt-2 lg:grid-cols-[3fr_1fr]">
          {/* AWS Health */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="flex items-center gap-1.5 text-xs font-semibold">
                <Activity className="h-3.5 w-3.5" />
                AWS Service Health
                <span className="text-[10px] font-normal text-muted-foreground">(us-east-1)</span>
              </h3>
              <a
                href="https://health.aws.amazon.com/health/status"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] text-muted-foreground underline"
              >
                health.aws.amazon.com
              </a>
            </div>
            <AwsHealthStatus
              statuses={awsHealth.statuses}
              loading={awsHealth.loading}
              error={awsHealth.error}
            />
          </div>

          {/* GitHub Status */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="flex items-center gap-1.5 text-xs font-semibold">
                <Cloud className="h-3.5 w-3.5" />
                GitHub
              </h3>
              <a
                href="https://www.githubstatus.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] text-muted-foreground underline"
              >
                githubstatus.com
              </a>
            </div>

            {ghLoading ? (
              <div className="grid gap-1.5">
                {Object.keys(TRACKED_COMPONENT_IDS).map((_, idx) => (
                  <Skeleton key={idx} className="h-7 rounded" />
                ))}
              </div>
            ) : (
              <div className="grid gap-1.5">
                {Object.entries(TRACKED_COMPONENT_IDS).map(([id, label]) => (
                  <div
                    key={id}
                    className="flex items-center justify-between rounded border px-2 py-1"
                  >
                    <span className="text-xs">{label}</span>
                    <GitHubStatusIndicator
                      status={ghComponents[id] ?? "operational"}
                    />
                  </div>
                ))}
              </div>
            )}

            {ghIncidents.length > 0 && (
              <div className="mt-3">
                <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-yellow-700 dark:text-yellow-400">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Active Incidents
                </h4>
                <div className="grid gap-2">
                  {ghIncidents.map((incident) => {
                    const latestUpdate = incident.incident_updates?.[0];
                    return (
                      <div
                        key={incident.id}
                        className="rounded border border-yellow-300 p-2 dark:border-yellow-700"
                      >
                        <div className="flex items-start justify-between gap-1">
                          <a
                            href={incident.shortlink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-medium underline"
                          >
                            {incident.name}
                          </a>
                          <span className="shrink-0 text-[10px] text-muted-foreground">
                            {formatDuration(incident.created_at)}
                          </span>
                        </div>
                        {latestUpdate && (
                          <p className="mt-1 text-[10px] text-muted-foreground line-clamp-2">
                            {latestUpdate.body}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
