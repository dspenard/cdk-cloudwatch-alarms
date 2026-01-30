import * as cdk from 'aws-cdk-lib';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as actions from 'aws-cdk-lib/aws-cloudwatch-actions';
import { Construct } from 'constructs';
import { ALARM_THRESHOLDS } from '../../config/alarm-thresholds';

export interface WafAlarmsProps {
  environment: string;
  webAclName: string;
  webAclId: string;
  region: string;
  alarmTopic: sns.ITopic;
}

/**
 * Creates CloudWatch alarms for AWS WAF
 * Monitors blocked and allowed requests for anomaly detection
 */
export class WafAlarms extends Construct {
  constructor(scope: Construct, id: string, props: WafAlarmsProps) {
    super(scope, id);

    const { environment, webAclName, webAclId, region, alarmTopic } = props;
    const thresholds = ALARM_THRESHOLDS.waf;

    // Blocked Requests Alarm (high number of blocks may indicate attack)
    const blockedRequestsAlarm = new cloudwatch.Alarm(this, 'BlockedRequestsAlarm', {
      alarmName: `${environment}-waf-${webAclName}-blocked-requests`,
      alarmDescription: `WAF ${webAclName} is blocking high number of requests`,
      metric: new cloudwatch.Metric({
        namespace: 'AWS/WAFV2',
        metricName: 'BlockedRequests',
        dimensionsMap: {
          WebACL: webAclName,
          Region: region,
          Rule: 'ALL',
        },
        statistic: 'Sum',
        period: cdk.Duration.minutes(5),
      }),
      threshold: thresholds.blockedRequests,
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
    blockedRequestsAlarm.addAlarmAction(new actions.SnsAction(alarmTopic));
  }
}
