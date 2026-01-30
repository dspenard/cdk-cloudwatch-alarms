import * as cdk from 'aws-cdk-lib';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as actions from 'aws-cdk-lib/aws-cloudwatch-actions';
import { Construct } from 'constructs';
import { ALARM_THRESHOLDS } from '../../config/alarm-thresholds';

export interface ElbAlarmsProps {
  environment: string;
  loadBalancerFullName: string;
  targetGroupFullName?: string;
  alarmTopic: sns.ITopic;
}

/**
 * Creates CloudWatch alarms for Application/Network Load Balancers
 * Monitors response time, unhealthy hosts, and 5xx errors
 */
export class ElbAlarms extends Construct {
  constructor(scope: Construct, id: string, props: ElbAlarmsProps) {
    super(scope, id);

    const { environment, loadBalancerFullName, targetGroupFullName, alarmTopic } = props;
    const thresholds = ALARM_THRESHOLDS.elb;

    // Target Response Time Alarm (ALB only)
    if (targetGroupFullName) {
      const responseTimeAlarm = new cloudwatch.Alarm(this, 'TargetResponseTimeAlarm', {
        alarmName: `${environment}-elb-${loadBalancerFullName}-target-response-time`,
        alarmDescription: `Load balancer ${loadBalancerFullName} target response time is above ${thresholds.targetResponseTime}s`,
        metric: new cloudwatch.Metric({
          namespace: 'AWS/ApplicationELB',
          metricName: 'TargetResponseTime',
          dimensionsMap: {
            LoadBalancer: loadBalancerFullName,
          },
          statistic: 'Average',
          period: cdk.Duration.minutes(5),
        }),
        threshold: thresholds.targetResponseTime,
        evaluationPeriods: 2,
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      });
      responseTimeAlarm.addAlarmAction(new actions.SnsAction(alarmTopic));
    }

    // Unhealthy Host Count Alarm
    if (targetGroupFullName) {
      const unhealthyHostAlarm = new cloudwatch.Alarm(this, 'UnhealthyHostCountAlarm', {
        alarmName: `${environment}-elb-${loadBalancerFullName}-unhealthy-host-count`,
        alarmDescription: `Load balancer ${loadBalancerFullName} has unhealthy hosts`,
        metric: new cloudwatch.Metric({
          namespace: 'AWS/ApplicationELB',
          metricName: 'UnHealthyHostCount',
          dimensionsMap: {
            TargetGroup: targetGroupFullName,
            LoadBalancer: loadBalancerFullName,
          },
          statistic: 'Average',
          period: cdk.Duration.minutes(1),
        }),
        threshold: thresholds.unhealthyHostCount,
        evaluationPeriods: 2,
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      });
      unhealthyHostAlarm.addAlarmAction(new actions.SnsAction(alarmTopic));
    }

    // HTTP 5xx Errors from Targets
    const target5xxAlarm = new cloudwatch.Alarm(this, 'HttpCodeTarget5xxAlarm', {
      alarmName: `${environment}-elb-${loadBalancerFullName}-http-5xx-target`,
      alarmDescription: `Load balancer ${loadBalancerFullName} is receiving 5xx errors from targets`,
      metric: new cloudwatch.Metric({
        namespace: 'AWS/ApplicationELB',
        metricName: 'HTTPCode_Target_5XX_Count',
        dimensionsMap: {
          LoadBalancer: loadBalancerFullName,
        },
        statistic: 'Sum',
        period: cdk.Duration.minutes(5),
      }),
      threshold: thresholds.httpCodeTarget5xxCount,
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
    target5xxAlarm.addAlarmAction(new actions.SnsAction(alarmTopic));

    // HTTP 5xx Errors from ELB
    const elb5xxAlarm = new cloudwatch.Alarm(this, 'HttpCodeElb5xxAlarm', {
      alarmName: `${environment}-elb-${loadBalancerFullName}-http-5xx-elb`,
      alarmDescription: `Load balancer ${loadBalancerFullName} is generating 5xx errors`,
      metric: new cloudwatch.Metric({
        namespace: 'AWS/ApplicationELB',
        metricName: 'HTTPCode_ELB_5XX_Count',
        dimensionsMap: {
          LoadBalancer: loadBalancerFullName,
        },
        statistic: 'Sum',
        period: cdk.Duration.minutes(5),
      }),
      threshold: thresholds.httpCodeElb5xxCount,
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
    elb5xxAlarm.addAlarmAction(new actions.SnsAction(alarmTopic));
  }
}
