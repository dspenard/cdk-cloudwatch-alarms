/**
 * Centralized alarm thresholds configuration
 * These thresholds are the same across all environments (dev, staging, prod)
 */

export interface EcsAlarmThresholds {
  cpuUtilization: number;
  memoryUtilization: number;
  taskCount: number;
}

export interface RdsAlarmThresholds {
  cpuUtilization: number;
  freeStorageSpaceGB: number;
  databaseConnections: number;
  readLatencyMs: number;
  writeLatencyMs: number;
}

export interface ElbAlarmThresholds {
  targetResponseTime: number;
  unhealthyHostCount: number;
  httpCodeTarget5xxCount: number;
  httpCodeElb5xxCount: number;
}

export interface EfsAlarmThresholds {
  burstCreditBalance: number;
  percentIOLimit: number;
}

export interface FsxAlarmThresholds {
  storageCapacityUtilization: number;
  freeStorageCapacityGB: number;
}

export interface S3AlarmThresholds {
  bucketSizeBytes: number;
  numberOfObjects: number;
}

export interface SesAlarmThresholds {
  bounceRate: number;
  complaintRate: number;
}

export interface StepFunctionsAlarmThresholds {
  executionsFailed: number;
  executionsTimedOut: number;
}

export interface WafAlarmThresholds {
  blockedRequests: number;
  allowedRequests: number;
}

export const ALARM_THRESHOLDS = {
  ecs: {
    cpuUtilization: 80, // percent
    memoryUtilization: 80, // percent
    taskCount: 1, // minimum running tasks
  } as EcsAlarmThresholds,

  rds: {
    cpuUtilization: 75, // percent
    freeStorageSpaceGB: 10, // GB
    databaseConnections: 80, // percent of max connections
    readLatencyMs: 100, // milliseconds
    writeLatencyMs: 100, // milliseconds
  } as RdsAlarmThresholds,

  elb: {
    targetResponseTime: 1, // seconds
    unhealthyHostCount: 1, // count
    httpCodeTarget5xxCount: 10, // count per period
    httpCodeElb5xxCount: 10, // count per period
  } as ElbAlarmThresholds,

  efs: {
    burstCreditBalance: 1000000000000, // 1TB in bytes
    percentIOLimit: 95, // percent
  } as EfsAlarmThresholds,

  fsx: {
    storageCapacityUtilization: 80, // percent
    freeStorageCapacityGB: 100, // GB
  } as FsxAlarmThresholds,

  s3: {
    bucketSizeBytes: 1 * 1024 * 1024, // 1 MB (LOW THRESHOLD FOR TESTING - adjust for production!)
    numberOfObjects: 1, // 1 object (LOW THRESHOLD FOR TESTING - adjust for production!)
  } as S3AlarmThresholds,

  ses: {
    bounceRate: 5, // percent
    complaintRate: 0.1, // percent
  } as SesAlarmThresholds,

  stepFunctions: {
    executionsFailed: 5, // count per period
    executionsTimedOut: 3, // count per period
  } as StepFunctionsAlarmThresholds,

  waf: {
    blockedRequests: 1000, // count per period
    allowedRequests: 100000, // count per period (for anomaly detection)
  } as WafAlarmThresholds,
};
