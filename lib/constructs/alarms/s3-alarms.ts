import * as cdk from 'aws-cdk-lib';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as actions from 'aws-cdk-lib/aws-cloudwatch-actions';
import { Construct } from 'constructs';
import { ALARM_THRESHOLDS } from '../../config/alarm-thresholds';

export interface S3AlarmsProps {
  environment: string;
  bucketName: string;
  alarmTopic: sns.ITopic;
  customSizeThreshold?: number;
}

/**
 * Creates CloudWatch alarms for S3 buckets
 * Monitors bucket size and object count
 * Note: S3 metrics are updated daily, so use longer evaluation periods
 */
export class S3Alarms extends Construct {
  constructor(scope: Construct, id: string, props: S3AlarmsProps) {
    super(scope, id);

    const { environment, bucketName, alarmTopic, customSizeThreshold } = props;
    const thresholds = ALARM_THRESHOLDS.s3;

    // Bucket Size Alarm
    const bucketSizeAlarm = new cloudwatch.Alarm(this, 'BucketSizeAlarm', {
      alarmName: `${environment}-s3-${bucketName}-bucket-size`,
      alarmDescription: `S3 bucket ${bucketName} size exceeds threshold`,
      metric: new cloudwatch.Metric({
        namespace: 'AWS/S3',
        metricName: 'BucketSizeBytes',
        dimensionsMap: {
          BucketName: bucketName,
          StorageType: 'StandardStorage',
        },
        statistic: 'Average',
        period: cdk.Duration.days(1),
      }),
      threshold: customSizeThreshold || thresholds.bucketSizeBytes,
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
    bucketSizeAlarm.addAlarmAction(new actions.SnsAction(alarmTopic));

    // Number of Objects Alarm
    const objectCountAlarm = new cloudwatch.Alarm(this, 'NumberOfObjectsAlarm', {
      alarmName: `${environment}-s3-${bucketName}-object-count`,
      alarmDescription: `S3 bucket ${bucketName} object count exceeds threshold`,
      metric: new cloudwatch.Metric({
        namespace: 'AWS/S3',
        metricName: 'NumberOfObjects',
        dimensionsMap: {
          BucketName: bucketName,
          StorageType: 'AllStorageTypes',
        },
        statistic: 'Average',
        period: cdk.Duration.days(1),
      }),
      threshold: thresholds.numberOfObjects,
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
    objectCountAlarm.addAlarmAction(new actions.SnsAction(alarmTopic));
  }
}
