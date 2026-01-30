import * as cdk from 'aws-cdk-lib';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as actions from 'aws-cdk-lib/aws-cloudwatch-actions';
import { Construct } from 'constructs';
import { ALARM_THRESHOLDS } from '../../config/alarm-thresholds';

export interface EfsAlarmsProps {
  environment: string;
  fileSystemId: string;
  alarmTopic: sns.ITopic;
}

/**
 * Creates CloudWatch alarms for EFS file systems
 * Monitors burst credit balance and IO limits
 */
export class EfsAlarms extends Construct {
  constructor(scope: Construct, id: string, props: EfsAlarmsProps) {
    super(scope, id);

    const { environment, fileSystemId, alarmTopic } = props;
    const thresholds = ALARM_THRESHOLDS.efs;

    // Burst Credit Balance Alarm
    const burstCreditAlarm = new cloudwatch.Alarm(this, 'BurstCreditBalanceAlarm', {
      alarmName: `${environment}-efs-${fileSystemId}-burst-credit-balance`,
      alarmDescription: `EFS ${fileSystemId} burst credit balance is low`,
      metric: new cloudwatch.Metric({
        namespace: 'AWS/EFS',
        metricName: 'BurstCreditBalance',
        dimensionsMap: {
          FileSystemId: fileSystemId,
        },
        statistic: 'Average',
        period: cdk.Duration.minutes(5),
      }),
      threshold: thresholds.burstCreditBalance,
      evaluationPeriods: 2,
      comparisonOperator: cloudwatch.ComparisonOperator.LESS_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
    burstCreditAlarm.addAlarmAction(new actions.SnsAction(alarmTopic));

    // Percent IO Limit Alarm
    const ioLimitAlarm = new cloudwatch.Alarm(this, 'PercentIOLimitAlarm', {
      alarmName: `${environment}-efs-${fileSystemId}-percent-io-limit`,
      alarmDescription: `EFS ${fileSystemId} is approaching IO limit`,
      metric: new cloudwatch.Metric({
        namespace: 'AWS/EFS',
        metricName: 'PercentIOLimit',
        dimensionsMap: {
          FileSystemId: fileSystemId,
        },
        statistic: 'Average',
        period: cdk.Duration.minutes(5),
      }),
      threshold: thresholds.percentIOLimit,
      evaluationPeriods: 2,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
    });
    ioLimitAlarm.addAlarmAction(new actions.SnsAction(alarmTopic));
  }
}
