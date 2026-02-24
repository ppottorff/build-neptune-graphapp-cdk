import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Activity,
  Database,
  Server,
  RefreshCw,
  CheckCircle2,
  XCircle,
  HelpCircle,
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

function Monitoring() {
  const [services, setServices] = useState<ServiceInfo[]>(SERVICES);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [lastChecked, setLastChecked] = useState<string | null>(null);

  const fetchStatuses = async () => {
    setIsLoading(true);
    try {
      // TODO: Wire up to a backend API that checks real AWS resource status
      // For now, simulate a status check with a short delay
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

  useEffect(() => {
    fetchStatuses();
  }, []);

  return (
    <main className="grid flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-8 lg:grid-cols-3 xl:grid-cols-3">
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
    </main>
  );
}
