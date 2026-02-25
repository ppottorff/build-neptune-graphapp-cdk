import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback, useMemo } from "react";
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
  Zap,
  Cpu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/use-toast";
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
    60_000
  );

  // ── CloudWatch Alarms ──
  const alarmsHook = useCloudWatchAlarms(60_000);

  // ── Lambda Metrics ──
  const lambdaInvocationQueries = useMemo(
    () => lambdaMetricQueries("Sum", "Invocations"),
    []
  );
  const lambdaInvocations = useCloudWatchMetrics({
    queries: lambdaInvocationQueries,
    hours: 6,
    refreshInterval: 120_000,
  });

  const lambdaErrorQueries = useMemo(
    () => lambdaMetricQueries("Sum", "Errors"),
    []
  );
  const lambdaErrors = useCloudWatchMetrics({
    queries: lambdaErrorQueries,
    hours: 6,
    refreshInterval: 120_000,
  });

  const lambdaDurationQueries = useMemo(
    () => lambdaMetricQueries("Average", "Duration"),
    []
  );
  const lambdaDuration = useCloudWatchMetrics({
    queries: lambdaDurationQueries,
    hours: 6,
    refreshInterval: 120_000,
  });

  // ── Neptune Metrics ──
  const neptuneCpuQueries = useMemo(
    () => neptuneMetricQuery("CPUUtilization", "Average", "CPU %"),
    []
  );
  const neptuneCpu = useCloudWatchMetrics({
    queries: neptuneCpuQueries,
    hours: 6,
    refreshInterval: 120_000,
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
    refreshInterval: 120_000,
  });

  // ── AWS Health Status ──
  const awsHealth = useAwsHealth(300_000);

  // ── GitHub Status ──
  const [ghComponents, setGhComponents] = useState<
    Record<string, GitHubComponentStatus>
  >({});
  const [ghIncidents, setGhIncidents] = useState<GitHubIncident[]>([]);
  const [ghLoading, setGhLoading] = useState(false);
  const [ghLastChecked, setGhLastChecked] = useState<string | null>(null);

  const fetchGitHubStatus = useCallback(async () => {
    setGhLoading(true);
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
      setGhLastChecked(new Date().toLocaleTimeString());
    } catch (error: any) {
      console.error("GitHub Status fetch error:", error);
      toast({
        variant: "destructive",
        title: "GitHub Status Error",
        description: "Could not reach www.githubstatus.com.",
      });
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
    <main className="grid flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Monitoring Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">
            Infrastructure status, CloudWatch metrics &amp; alarms
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
          Refresh All
        </Button>
      </div>

      {/* ── Section 1: Application Components (live AWS status) ── */}
      <Card>
        <CardHeader className="bg-muted/50">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="h-5 w-5" />
            Application Components
          </CardTitle>
          <CardDescription>
            Live status from AWS EC2 &amp; Neptune APIs
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          {resources.error && (
            <p className="mb-4 rounded bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
              {resources.error}
            </p>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Bastion Host */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Server className="h-5 w-5 text-muted-foreground" />
                  SSM Bastion Host
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3">
                {resources.loading && !bastion ? (
                  <>
                    <Skeleton className="h-5 w-3/4 rounded" />
                    <Skeleton className="h-8 w-24 rounded-full" />
                  </>
                ) : bastion ? (
                  <>
                    <div className="grid gap-1">
                      <span className="text-xs font-medium text-muted-foreground">
                        Instance ID
                      </span>
                      <code className="break-all rounded bg-muted px-2 py-1 text-xs">
                        {bastion.instanceId}
                      </code>
                    </div>
                    <div className="grid gap-1">
                      <span className="text-xs font-medium text-muted-foreground">
                        Type
                      </span>
                      <span className="text-sm">{bastion.instanceType}</span>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Status</span>
                      <EC2StateBadge state={bastion.state} />
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Instance not found or access denied
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Neptune Cluster */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Database className="h-5 w-5 text-muted-foreground" />
                  Neptune Cluster
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3">
                {resources.loading && !neptune ? (
                  <>
                    <Skeleton className="h-5 w-3/4 rounded" />
                    <Skeleton className="h-8 w-24 rounded-full" />
                  </>
                ) : neptune ? (
                  <>
                    <div className="grid gap-1">
                      <span className="text-xs font-medium text-muted-foreground">
                        Cluster ID
                      </span>
                      <code className="break-all rounded bg-muted px-2 py-1 text-xs">
                        {neptune.clusterId}
                      </code>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="grid gap-1">
                        <span className="text-xs font-medium text-muted-foreground">
                          Engine
                        </span>
                        <span className="text-sm">
                          {neptune.engine} {neptune.engineVersion}
                        </span>
                      </div>
                      {neptune.serverlessV2ScalingMin != null && (
                        <div className="grid gap-1">
                          <span className="text-xs font-medium text-muted-foreground">
                            NCU Range
                          </span>
                          <span className="text-sm">
                            {neptune.serverlessV2ScalingMin} –{" "}
                            {neptune.serverlessV2ScalingMax}
                          </span>
                        </div>
                      )}
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Status</span>
                      <NeptuneStateBadge status={neptune.status} />
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Cluster not found or access denied
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* ── Section 2: CloudWatch Alarms ── */}
      <AlarmStatusGrid
        alarms={alarmsHook.alarms}
        loading={alarmsHook.loading}
      />

      {/* ── Section 3: Lambda Metrics ── */}
      <Card>
        <CardHeader className="bg-muted/50">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Zap className="h-5 w-5" />
            Lambda Metrics
          </CardTitle>
          <CardDescription>
            Invocations, errors, and duration over the last 6 hours
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 p-6 md:grid-cols-3">
          <MetricChart
            title="Invocations"
            results={lambdaInvocations.data}
            loading={lambdaInvocations.loading}
          />
          <MetricChart
            title="Errors"
            results={lambdaErrors.data}
            loading={lambdaErrors.loading}
          />
          <MetricChart
            title="Duration (avg)"
            results={lambdaDuration.data}
            loading={lambdaDuration.loading}
            unit="ms"
          />
        </CardContent>
      </Card>

      {/* ── Section 4: Neptune Metrics ── */}
      <Card>
        <CardHeader className="bg-muted/50">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Cpu className="h-5 w-5" />
            Neptune Metrics
          </CardTitle>
          <CardDescription>
            CPU utilization and serverless capacity (NCU) over the last 6 hours
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 p-6 md:grid-cols-2">
          <MetricChart
            title="CPU Utilization"
            results={neptuneCpu.data}
            loading={neptuneCpu.loading}
            unit="%"
          />
          <MetricChart
            title="Serverless Capacity"
            description="Neptune Capacity Units (NCU)"
            results={neptuneCapacity.data}
            loading={neptuneCapacity.loading}
            unit=" NCU"
          />
        </CardContent>
      </Card>

      {/* ── Section 5: Cloud Dependencies ── */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between bg-muted/50">
          <div className="grid gap-0.5">
            <CardTitle className="group flex items-center gap-2 text-lg">
              <Cloud className="h-5 w-5" />
              Cloud Dependencies
            </CardTitle>
            <CardDescription>
              AWS service health (us-east-1) &amp; GitHub status
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { awsHealth.refresh(); fetchGitHubStatus(); }}
            disabled={awsHealth.loading || ghLoading}
          >
            {(awsHealth.loading || ghLoading) ? (
              <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Refresh
          </Button>
        </CardHeader>
        <CardContent className="p-6">
          {/* ── AWS Health Status ── */}
          <div className="mb-2">
            <div className="flex items-center justify-between mb-3">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <Activity className="h-4 w-4" />
                AWS Service Health
                <span className="text-[10px] font-normal text-muted-foreground">(us-east-1)</span>
              </h3>
              <a
                href="https://health.aws.amazon.com/health/status"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-muted-foreground underline"
              >
                health.aws.amazon.com
              </a>
            </div>
            {awsHealth.lastChecked && (
              <p className="mb-3 text-xs text-muted-foreground">
                Last checked: {awsHealth.lastChecked}
              </p>
            )}
            <AwsHealthStatus
              statuses={awsHealth.statuses}
              loading={awsHealth.loading}
              error={awsHealth.error}
            />
          </div>

          <Separator className="my-5" />

          {/* ── GitHub Status ── */}
          <div className="flex items-center justify-between mb-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Cloud className="h-4 w-4" />
              GitHub Status
            </h3>
            <a
              href="https://www.githubstatus.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground underline"
            >
              githubstatus.com
            </a>
          </div>
          {ghLastChecked && (
            <p className="mb-4 text-xs text-muted-foreground">
              Last checked: {ghLastChecked}
            </p>
          )}

          {ghLoading ? (
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
              {Object.keys(TRACKED_COMPONENT_IDS).map((_, idx) => (
                <Skeleton key={idx} className="h-10 rounded" />
              ))}
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
              {Object.entries(TRACKED_COMPONENT_IDS).map(([id, label]) => (
                <div
                  key={id}
                  className="flex items-center justify-between rounded-md border px-3 py-2"
                >
                  <span className="text-sm font-medium">{label}</span>
                  <GitHubStatusIndicator
                    status={ghComponents[id] ?? "operational"}
                  />
                </div>
              ))}
            </div>
          )}

          {ghIncidents.length > 0 && (
            <>
              <Separator className="my-4" />
              <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-yellow-700 dark:text-yellow-400">
                <AlertTriangle className="h-4 w-4" />
                Active Incidents
              </h4>
              <div className="grid gap-3">
                {ghIncidents.map((incident) => {
                  const latestUpdate = incident.incident_updates?.[0];
                  return (
                    <Card
                      key={incident.id}
                      className="border-yellow-300 dark:border-yellow-700"
                    >
                      <CardContent className="p-4 grid gap-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <a
                              href={incident.shortlink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm font-semibold underline"
                            >
                              {incident.name}
                            </a>
                            <span className="ml-2 inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                              {incident.impact}
                            </span>
                          </div>
                          <span className="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {formatDuration(incident.created_at)}
                          </span>
                        </div>
                        {latestUpdate && (
                          <p className="text-xs text-muted-foreground">
                            {latestUpdate.body}
                          </p>
                        )}
                        {incident.components.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-1">
                            {incident.components.map((c) => (
                              <span
                                key={c.id}
                                className="rounded bg-muted px-1.5 py-0.5 text-xs"
                              >
                                {c.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
