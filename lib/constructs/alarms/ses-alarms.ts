import * as cdk from 'aws-cdk-lib';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as actions from 'aws-cdk-lib/aws-cloudwatch-actions';
import { Construct } from 'constructs';
import { ALARM_THRESHOLDS } from '../../config/alarm-thresholds';

export interface SesAlarmsProps {
  environment: string;
  alarmTopic: sns.ITopic;
}

/**
 * Creates CloudWatch alarms for Amazon SES
 * Monitors bounce and complaint rates to protect sender reputation
 */
export class SesAlarms extends Construct {
  constructor(scope: Construct, id: string, props: SesAlarmsProps) {
    super(scope, id);

    const { environment, alarmTopic } = props;
    const thresholds = ALARM_THRESHOLDS.ses;

    // Bounce Rate Alarm
    const bounceRateAlarm = new cloudwatch.Alarm(this, 'BounceRateAlarm', {
      alarmName: `${environment}-ses-bounce-rate`,
      alarmDescription: `SES bounce rate exceeds ${thresholds.bounceRate}%`,
      metric: new cloudwatch.Metric({
        namespace: 'AWS/SES',
        metricName: 'Reputation.BounceRate',
        statistic: 'Average',
        period: cdk.Duration.minutes(15),
      }),
      threshold: thresholds.bounceRate / 100, // Convert percentage to decimal
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
    bounceRateAlarm.addAlarmAction(new actions.SnsAction(alarmTopic));

    // Complaint Rate Alarm
    const complaintRateAlarm = new cloudwatch.Alarm(this, 'ComplaintRateAlarm', {
      alarmName: `${environment}-ses-complaint-rate`,
      alarmDescription: `SES complaint rate exceeds ${thresholds.complaintRate}%`,
      metric: new cloudwatch.Metric({
        namespace: 'AWS/SES',
        metricName: 'Reputation.ComplaintRate',
        statistic: 'Average',
        period: cdk.Duration.minutes(15),
      }),
      threshold: thresholds.complaintRate / 100, // Convert percentage to decimal
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
    complaintRateAlarm.addAlarmAction(new actions.SnsAction(alarmTopic));
  }
}
