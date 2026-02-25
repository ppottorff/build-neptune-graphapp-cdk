/**
 * React hooks for the monitoring dashboard.
 *
 * - useCloudWatchMetrics  — fetch time-series data from CloudWatch
 * - useCloudWatchAlarms   — list current alarm states
 * - useResourceStatus     — EC2 + Neptune live status
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  getMetricData,
  describeAlarms,
  describeInstances,
  describeNeptuneClusters,
  type MetricDataQuery,
  type MetricDataResult,
  type MetricAlarm,
  type EC2InstanceInfo,
  type NeptuneClusterInfo,
} from "@/lib/aws-clients";

// ─── useCloudWatchMetrics ──────────────────────────────────────────────

export interface UseMetricsOptions {
  queries: MetricDataQuery[];
  /** Time window in hours (default: 3) */
  hours?: number;
  /** Auto-refresh interval in ms. 0 = off. (default: 60 000) */
  refreshInterval?: number;
  /** Skip the query entirely when true */
  skip?: boolean;
}

export interface UseMetricsResult {
  data: MetricDataResult[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useCloudWatchMetrics(opts: UseMetricsOptions): UseMetricsResult {
  const { queries, hours = 3, refreshInterval = 60_000, skip = false } = opts;
  const [data, setData] = useState<MetricDataResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);

  const fetchData = useCallback(async () => {
    if (skip || queries.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const end = new Date();
      const start = new Date(end.getTime() - hours * 3600 * 1000);
      const results = await getMetricData(queries, start, end);
      if (isMounted.current) setData(results);
    } catch (e: any) {
      if (isMounted.current) setError(e.message ?? String(e));
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, [queries, hours, skip]);

  useEffect(() => {
    isMounted.current = true;
    fetchData();
    if (refreshInterval > 0 && !skip) {
      const id = setInterval(fetchData, refreshInterval);
      return () => {
        isMounted.current = false;
        clearInterval(id);
      };
    }
    return () => {
      isMounted.current = false;
    };
  }, [fetchData, refreshInterval, skip]);

  return { data, loading, error, refresh: fetchData };
}

// ─── useCloudWatchAlarms ───────────────────────────────────────────────

export interface UseAlarmsResult {
  alarms: MetricAlarm[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useCloudWatchAlarms(
  refreshInterval = 60_000
): UseAlarmsResult {
  const [alarms, setAlarms] = useState<MetricAlarm[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);

  const fetchAlarms = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await describeAlarms();
      if (isMounted.current) setAlarms(result);
    } catch (e: any) {
      if (isMounted.current) setError(e.message ?? String(e));
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    isMounted.current = true;
    fetchAlarms();
    if (refreshInterval > 0) {
      const id = setInterval(fetchAlarms, refreshInterval);
      return () => {
        isMounted.current = false;
        clearInterval(id);
      };
    }
    return () => {
      isMounted.current = false;
    };
  }, [fetchAlarms, refreshInterval]);

  return { alarms, loading, error, refresh: fetchAlarms };
}

// ─── useResourceStatus ─────────────────────────────────────────────────

export interface ResourceStatus {
  ec2Instances: EC2InstanceInfo[];
  neptuneClusters: NeptuneClusterInfo[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useResourceStatus(
  ec2InstanceIds: string[],
  neptuneClusterIds: string[],
  refreshInterval = 60_000
): ResourceStatus {
  const [ec2Instances, setEc2] = useState<EC2InstanceInfo[]>([]);
  const [neptuneClusters, setNeptune] = useState<NeptuneClusterInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [ec2, neptune] = await Promise.all([
        ec2InstanceIds.length > 0
          ? describeInstances(ec2InstanceIds)
          : Promise.resolve([]),
        neptuneClusterIds.length > 0
          ? describeNeptuneClusters(neptuneClusterIds)
          : Promise.resolve([]),
      ]);
      if (isMounted.current) {
        setEc2(ec2);
        setNeptune(neptune);
      }
    } catch (e: any) {
      if (isMounted.current) setError(e.message ?? String(e));
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, [ec2InstanceIds, neptuneClusterIds]);

  useEffect(() => {
    isMounted.current = true;
    fetchStatus();
    if (refreshInterval > 0) {
      const id = setInterval(fetchStatus, refreshInterval);
      return () => {
        isMounted.current = false;
        clearInterval(id);
      };
    }
    return () => {
      isMounted.current = false;
    };
  }, [fetchStatus, refreshInterval]);

  return { ec2Instances, neptuneClusters, loading, error, refresh: fetchStatus };
}
