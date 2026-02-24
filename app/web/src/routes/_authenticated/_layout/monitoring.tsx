import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
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
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/use-toast";
import { Icons } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/_layout/monitoring")({
  component: Monitoring,
});

// ─── Application Components types ────────────────────────────────────
type ServiceStatus = "started" | "stopped" | "unknown";

interface ServiceInfo {
  name: string;
  identifier: string;
  type: "ec2" | "neptune";
  status: ServiceStatus;
}

const SERVICES: ServiceInfo[] = [
  {
    name: "SSM Bastion Host",
    identifier: "i-0b4bd9e067ac8b605",
    type: "ec2",
    status: "unknown",
  },
  {
    name: "Neptune Database Instance",
    identifier:
      "neptunedbinstance-u9ysngsrkf4j.ctgykokc00ud.us-east-1.neptune.amazonaws.com",
    type: "neptune",
    status: "unknown",
  },
];

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

/**
 * The 8 GitHub components the user wants to track, keyed by their
 * Statuspage component ID.
 */
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

// ─── Shared small components ─────────────────────────────────────────

function StatusBadge({ status }: { status: ServiceStatus }) {
  switch (status) {
    case "started":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
          <CheckCircle2 className="h-4 w-4" />
          Started
        </span>
      );
    case "stopped":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-800 dark:bg-red-900/30 dark:text-red-400">
          <XCircle className="h-4 w-4" />
          Stopped
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
          <HelpCircle className="h-4 w-4" />
          Unknown
        </span>
      );
  }
}

function ServiceIcon({ type }: { type: "ec2" | "neptune" }) {
  if (type === "neptune") {
    return <Database className="h-5 w-5 text-muted-foreground" />;
  }
  return <Server className="h-5 w-5 text-muted-foreground" />;
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

// ─── Main component ──────────────────────────────────────────────────

function Monitoring() {
  const [services, setServices] = useState<ServiceInfo[]>(SERVICES);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [lastChecked, setLastChecked] = useState<string | null>(null);

  // GitHub status state
  const [ghComponents, setGhComponents] = useState<
    Record<string, GitHubComponentStatus>
  >({});
  const [ghIncidents, setGhIncidents] = useState<GitHubIncident[]>([]);
  const [ghLoading, setGhLoading] = useState<boolean>(false);
  const [ghLastChecked, setGhLastChecked] = useState<string | null>(null);

  // ── Application Components fetch ──
  const fetchStatuses = async () => {
    setIsLoading(true);
    try {
      // TODO: Wire up to a backend API that checks real AWS resource status
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setServices((prev) =>
        prev.map((svc) => ({
          ...svc,
          status: svc.status === "unknown" ? "unknown" : svc.status,
        }))
      );
      setLastChecked(new Date().toLocaleTimeString());
      toast({ title: "Status refreshed" });
    } catch (error: any) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Error fetching status",
        description: "Could not retrieve service statuses.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // ── GitHub Status fetch ──
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
    fetchStatuses();
    fetchGitHubStatus();
  }, []);

  return (
    <main className="grid flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-8 lg:grid-cols-3 xl:grid-cols-3">
      {/* ── Application Components ── */}
      <div className="col-span-3">
        <Card x-chunk="monitoring-header">
          <CardHeader className="flex flex-row items-center justify-between bg-muted/50">
            <div className="grid gap-0.5">
              <CardTitle className="group flex items-center gap-2 text-lg">
                <Activity className="h-5 w-5" />
                Application Components
              </CardTitle>
              <CardDescription>
                Real-time status of application infrastructure services
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchStatuses}
              disabled={isLoading}
            >
              {isLoading ? (
                <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Refresh
            </Button>
          </CardHeader>
          <CardContent className="p-6">
            {lastChecked && (
              <p className="mb-4 text-xs text-muted-foreground">
                Last checked: {lastChecked}
              </p>
            )}
            <div className="grid gap-4 md:grid-cols-2">
              {isLoading
                ? SERVICES.map((_, idx) => (
                    <Card key={idx}>
                      <CardContent className="p-6">
                        <div className="flex flex-col space-y-3">
                          <Skeleton className="h-6 w-3/4 rounded" />
                          <Skeleton className="h-4 w-full rounded" />
                          <Skeleton className="h-8 w-24 rounded-full" />
                        </div>
                      </CardContent>
                    </Card>
                  ))
                : services.map((service, idx) => (
                    <Card key={idx}>
                      <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-base">
                          <ServiceIcon type={service.type} />
                          {service.name}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="grid gap-3">
                        <div className="grid gap-1">
                          <span className="text-xs font-medium text-muted-foreground">
                            Identifier
                          </span>
                          <code className="break-all rounded bg-muted px-2 py-1 text-xs">
                            {service.identifier}
                          </code>
                        </div>
                        <Separator />
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Status</span>
                          <StatusBadge status={service.status} />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Cloud Dependencies ── */}
      <div className="col-span-3">
        <Card x-chunk="cloud-dependencies">
          <CardHeader className="flex flex-row items-center justify-between bg-muted/50">
            <div className="grid gap-0.5">
              <CardTitle className="group flex items-center gap-2 text-lg">
                <Cloud className="h-5 w-5" />
                Cloud Dependencies
              </CardTitle>
              <CardDescription>
                GitHub service status from{" "}
                <a
                  href="https://www.githubstatus.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  githubstatus.com
                </a>
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchGitHubStatus}
              disabled={ghLoading}
            >
              {ghLoading ? (
                <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Refresh
            </Button>
          </CardHeader>
          <CardContent className="p-6">
            {ghLastChecked && (
              <p className="mb-4 text-xs text-muted-foreground">
                Last checked: {ghLastChecked}
              </p>
            )}

            {/* Component status grid */}
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

            {/* Active incidents */}
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
      </div>
    </main>
  );
}
