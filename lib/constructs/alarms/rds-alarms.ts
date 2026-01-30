import * as cdk from 'aws-cdk-lib';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as actions from 'aws-cdk-lib/aws-cloudwatch-actions';
import { Construct } from 'constructs';
import { ALARM_THRESHOLDS } from '../../config/alarm-thresholds';

export interface RdsAlarmsProps {
  environment: string;
  dbInstanceIdentifier: string;
  alarmTopic: sns.ITopic;
}

/**
 * Creates CloudWatch alarms for RDS instances
 * Monitors CPU, storage, connections, and latency
 */
export class RdsAlarms extends Construct {
  constructor(scope: Construct, id: string, props: RdsAlarmsProps) {
    super(scope, id);

    const { environment, dbInstanceIdentifier, alarmTopic } = props;
    const thresholds = ALARM_THRESHOLDS.rds;

    // CPU Utilization Alarm
    const cpuAlarm = new cloudwatch.Alarm(this, 'CpuUtilizationAlarm', {
      alarmName: `${environment}-rds-${dbInstanceIdentifier}-cpu-utilization`,
      alarmDescription: `RDS instance ${dbInstanceIdentifier} CPU utilization is above ${thresholds.cpuUtilization}%`,
      metric: new cloudwatch.Metric({
        namespace: 'AWS/RDS',
        metricName: 'CPUUtilization',
        dimensionsMap: {
          DBInstanceIdentifier: dbInstanceIdentifier,
        },
        statistic: 'Average',
        period: cdk.Duration.minutes(5),
      }),
      threshold: thresholds.cpuUtilization,
      evaluationPeriods: 2,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
    cpuAlarm.addAlarmAction(new actions.SnsAction(alarmTopic));

    // Free Storage Space Alarm
    const storageAlarm = new cloudwatch.Alarm(this, 'FreeStorageSpaceAlarm', {
      alarmName: `${environment}-rds-${dbInstanceIdentifier}-free-storage-space`,
      alarmDescription: `RDS instance ${dbInstanceIdentifier} free storage space is below ${thresholds.freeStorageSpaceGB}GB`,
      metric: new cloudwatch.Metric({
        namespace: 'AWS/RDS',
        metricName: 'FreeStorageSpace',
        dimensionsMap: {
          DBInstanceIdentifier: dbInstanceIdentifier,
        },
        statistic: 'Average',
        period: cdk.Duration.minutes(5),
      }),
      threshold: thresholds.freeStorageSpaceGB * 1024 * 1024 * 1024, // Convert GB to bytes
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.LESS_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
    storageAlarm.addAlarmAction(new actions.SnsAction(alarmTopic));

    // Read Latency Alarm
    const readLatencyAlarm = new cloudwatch.Alarm(this, 'ReadLatencyAlarm', {
      alarmName: `${environment}-rds-${dbInstanceIdentifier}-read-latency`,
      alarmDescription: `RDS instance ${dbInstanceIdentifier} read latency is above ${thresholds.readLatencyMs}ms`,
      metric: new cloudwatch.Metric({
        namespace: 'AWS/RDS',
        metricName: 'ReadLatency',
        dimensionsMap: {
          DBInstanceIdentifier: dbInstanceIdentifier,
        },
        statistic: 'Average',
        period: cdk.Duration.minutes(5),
      }),
      threshold: thresholds.readLatencyMs / 1000, // Convert ms to seconds
      evaluationPeriods: 2,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
    readLatencyAlarm.addAlarmAction(new actions.SnsAction(alarmTopic));

    // Write Latency Alarm
    const writeLatencyAlarm = new cloudwatch.Alarm(this, 'WriteLatencyAlarm', {
      alarmName: `${environment}-rds-${dbInstanceIdentifier}-write-latency`,
      alarmDescription: `RDS instance ${dbInstanceIdentifier} write latency is above ${thresholds.writeLatencyMs}ms`,
      metric: new cloudwatch.Metric({
        namespace: 'AWS/RDS',
        metricName: 'WriteLatency',
        dimensionsMap: {
          DBInstanceIdentifier: dbInstanceIdentifier,
        },
        statistic: 'Average',
        period: cdk.Duration.minutes(5),
      }),
      threshold: thresholds.writeLatencyMs / 1000, // Convert ms to seconds
      evaluationPeriods: 2,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
    writeLatencyAlarm.addAlarmAction(new actions.SnsAction(alarmTopic));
  }
}
