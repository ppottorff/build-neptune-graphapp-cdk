/**
 * AWS SDK client factory — uses Cognito Identity Pool credentials from
 * the current Amplify session so the browser can call CloudWatch, EC2,
 * and Neptune APIs directly (read-only).
 */
import { fetchAuthSession } from "aws-amplify/auth";
import {
  CloudWatchClient,
  GetMetricDataCommand,
  DescribeAlarmsCommand,
  type GetMetricDataCommandInput,
  type MetricDataQuery,
  type MetricDataResult,
  type CompositeAlarm,
  type MetricAlarm,
} from "@aws-sdk/client-cloudwatch";
import {
  EC2Client,
  DescribeInstancesCommand,
  DescribeInstanceStatusCommand,
} from "@aws-sdk/client-ec2";
import {
  NeptuneClient,
  DescribeDBClustersCommand,
} from "@aws-sdk/client-neptune";

export type {
  MetricDataQuery,
  MetricDataResult,
  CompositeAlarm,
  MetricAlarm,
};

const REGION = import.meta.env.VITE_COGNITO_REGION || "us-east-1";

/** Fetch fresh AWS credentials from Amplify / Cognito Identity Pool */
async function getCredentials() {
  const session = await fetchAuthSession();
  if (!session.credentials) {
    throw new Error("No AWS credentials available — user may not be signed in.");
  }
  return session.credentials;
}

/** Re-usable client constructor that injects fresh credentials */
async function makeClient<T>(
  ClientClass: new (config: { region: string; credentials: any }) => T
): Promise<T> {
  const credentials = await getCredentials();
  return new ClientClass({ region: REGION, credentials });
}

// ─── CloudWatch helpers ────────────────────────────────────────────────

export async function getMetricData(
  queries: MetricDataQuery[],
  startTime: Date,
  endTime: Date
): Promise<MetricDataResult[]> {
  const cw = await makeClient(CloudWatchClient);
  const input: GetMetricDataCommandInput = {
    MetricDataQueries: queries,
    StartTime: startTime,
    EndTime: endTime,
    ScanBy: "TimestampAscending",
  };
  const resp = await cw.send(new GetMetricDataCommand(input));
  return resp.MetricDataResults ?? [];
}

export async function describeAlarms(): Promise<MetricAlarm[]> {
  const cw = await makeClient(CloudWatchClient);
  const resp = await cw.send(new DescribeAlarmsCommand({}));
  return resp.MetricAlarms ?? [];
}

// ─── EC2 helpers ───────────────────────────────────────────────────────

export interface EC2InstanceInfo {
  instanceId: string;
  name: string;
  state: string;
  instanceType: string;
  launchTime?: Date;
}

export async function describeInstances(
  instanceIds?: string[]
): Promise<EC2InstanceInfo[]> {
  const ec2 = await makeClient(EC2Client);
  const cmd = new DescribeInstancesCommand(
    instanceIds ? { InstanceIds: instanceIds } : {}
  );
  const resp = await ec2.send(cmd);
  const instances: EC2InstanceInfo[] = [];
  for (const reservation of resp.Reservations ?? []) {
    for (const inst of reservation.Instances ?? []) {
      instances.push({
        instanceId: inst.InstanceId ?? "unknown",
        name:
          inst.Tags?.find((t) => t.Key === "Name")?.Value ?? inst.InstanceId ?? "",
        state: inst.State?.Name ?? "unknown",
        instanceType: inst.InstanceType ?? "unknown",
        launchTime: inst.LaunchTime,
      });
    }
  }
  return instances;
}

export async function describeInstanceStatus(instanceIds: string[]) {
  const ec2 = await makeClient(EC2Client);
  const resp = await ec2.send(
    new DescribeInstanceStatusCommand({
      InstanceIds: instanceIds,
      IncludeAllInstances: true,
    })
  );
  return resp.InstanceStatuses ?? [];
}

// ─── Neptune (via RDS) helpers ─────────────────────────────────────────

export interface NeptuneClusterInfo {
  clusterId: string;
  status: string;
  engine: string;
  engineVersion: string;
  endpoint: string;
  readerEndpoint: string;
  serverlessV2ScalingMin?: number;
  serverlessV2ScalingMax?: number;
}

export async function describeNeptuneClusters(
  clusterIds?: string[]
): Promise<NeptuneClusterInfo[]> {
  const neptune = await makeClient(NeptuneClient);
  const cmd = new DescribeDBClustersCommand(
    clusterIds?.length ? { DBClusterIdentifier: clusterIds[0] } : {}
  );
  const resp = await neptune.send(cmd);
  return (resp.DBClusters ?? []).map((c) => ({
    clusterId: c.DBClusterIdentifier ?? "unknown",
    status: c.Status ?? "unknown",
    engine: c.Engine ?? "",
    engineVersion: c.EngineVersion ?? "",
    endpoint: c.Endpoint ?? "",
    readerEndpoint: c.ReaderEndpoint ?? "",
    serverlessV2ScalingMin:
      c.ServerlessV2ScalingConfiguration?.MinCapacity,
    serverlessV2ScalingMax:
      c.ServerlessV2ScalingConfiguration?.MaxCapacity,
  }));
}
