import * as cdk from 'aws-cdk-lib';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as actions from 'aws-cdk-lib/aws-cloudwatch-actions';
import { Construct } from 'constructs';
import { ALARM_THRESHOLDS } from '../../config/alarm-thresholds';

export interface FsxAlarmsProps {
  environment: string;
  fileSystemId: string;
  fileSystemType: 'Windows' | 'Lustre' | 'NetApp' | 'OpenZFS';
  alarmTopic: sns.ITopic;
}

/**
 * Creates CloudWatch alarms for FSx file systems
 * Monitors storage capacity utilization
 */
export class FsxAlarms extends Construct {
  constructor(scope: Construct, id: string, props: FsxAlarmsProps) {
    super(scope, id);

    const { environment, fileSystemId, fileSystemType, alarmTopic } = props;
    const thresholds = ALARM_THRESHOLDS.fsx;

    // Storage Capacity Utilization Alarm
    const storageUtilizationAlarm = new cloudwatch.Alarm(this, 'StorageCapacityUtilizationAlarm', {
      alarmName: `${environment}-fsx-${fileSystemId}-storage-utilization`,
      alarmDescription: `FSx ${fileSystemId} storage capacity utilization exceeds ${thresholds.storageCapacityUtilization}%`,
      metric: new cloudwatch.Metric({
        namespace: 'AWS/FSx',
        metricName: 'StorageCapacityUtilization',
        dimensionsMap: {
          FileSystemId: fileSystemId,
        },
        statistic: 'Average',
        period: cdk.Duration.minutes(5),
      }),
      threshold: thresholds.storageCapacityUtilization,
      evaluationPeriods: 2,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
    storageUtilizationAlarm.addAlarmAction(new actions.SnsAction(alarmTopic));

    // Free Storage Capacity Alarm
    const freeStorageAlarm = new cloudwatch.Alarm(this, 'FreeStorageCapacityAlarm', {
      alarmName: `${environment}-fsx-${fileSystemId}-free-storage`,
      alarmDescription: `FSx ${fileSystemId} free storage capacity is below ${thresholds.freeStorageCapacityGB}GB`,
      metric: new cloudwatch.Metric({
        namespace: 'AWS/FSx',
        metricName: 'FreeStorageCapacity',
        dimensionsMap: {
          FileSystemId: fileSystemId,
        },
        statistic: 'Average',
        period: cdk.Duration.minutes(5),
      }),
      threshold: thresholds.freeStorageCapacityGB * 1024 * 1024 * 1024, // Convert GB to bytes
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.LESS_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
    freeStorageAlarm.addAlarmAction(new actions.SnsAction(alarmTopic));
  }
}
