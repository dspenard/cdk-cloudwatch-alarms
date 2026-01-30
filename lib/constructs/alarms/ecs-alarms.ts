import * as cdk from 'aws-cdk-lib';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as actions from 'aws-cdk-lib/aws-cloudwatch-actions';
import { Construct } from 'constructs';
import { ALARM_THRESHOLDS } from '../../config/alarm-thresholds';

export interface EcsAlarmsProps {
  environment: string;
  clusterName: string;
  serviceName: string;
  alarmTopic: sns.ITopic;
}

/**
 * Creates CloudWatch alarms for ECS services
 * Monitors CPU, memory utilization, and running task count
 */
export class EcsAlarms extends Construct {
  constructor(scope: Construct, id: string, props: EcsAlarmsProps) {
    super(scope, id);

    const { environment, clusterName, serviceName, alarmTopic } = props;
    const thresholds = ALARM_THRESHOLDS.ecs;

    // CPU Utilization Alarm
    const cpuAlarm = new cloudwatch.Alarm(this, 'CpuUtilizationAlarm', {
      alarmName: `${environment}-ecs-${serviceName}-cpu-utilization`,
      alarmDescription: `ECS service ${serviceName} CPU utilization is above ${thresholds.cpuUtilization}%`,
      metric: new cloudwatch.Metric({
        namespace: 'AWS/ECS',
        metricName: 'CPUUtilization',
        dimensionsMap: {
          ClusterName: clusterName,
          ServiceName: serviceName,
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

    // Memory Utilization Alarm
    const memoryAlarm = new cloudwatch.Alarm(this, 'MemoryUtilizationAlarm', {
      alarmName: `${environment}-ecs-${serviceName}-memory-utilization`,
      alarmDescription: `ECS service ${serviceName} memory utilization is above ${thresholds.memoryUtilization}%`,
      metric: new cloudwatch.Metric({
        namespace: 'AWS/ECS',
        metricName: 'MemoryUtilization',
        dimensionsMap: {
          ClusterName: clusterName,
          ServiceName: serviceName,
        },
        statistic: 'Average',
        period: cdk.Duration.minutes(5),
      }),
      threshold: thresholds.memoryUtilization,
      evaluationPeriods: 2,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
    memoryAlarm.addAlarmAction(new actions.SnsAction(alarmTopic));

    // Running Task Count Alarm (alerts if no tasks are running)
    const taskCountAlarm = new cloudwatch.Alarm(this, 'RunningTaskCountAlarm', {
      alarmName: `${environment}-ecs-${serviceName}-running-task-count`,
      alarmDescription: `ECS service ${serviceName} has fewer than ${thresholds.taskCount} running tasks`,
      metric: new cloudwatch.Metric({
        namespace: 'AWS/ECS',
        metricName: 'RunningTaskCount',
        dimensionsMap: {
          ClusterName: clusterName,
          ServiceName: serviceName,
        },
        statistic: 'Average',
        period: cdk.Duration.minutes(1),
      }),
      threshold: thresholds.taskCount,
      evaluationPeriods: 2,
      comparisonOperator: cloudwatch.ComparisonOperator.LESS_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.BREACHING,
    });
    taskCountAlarm.addAlarmAction(new actions.SnsAction(alarmTopic));
  }
}
