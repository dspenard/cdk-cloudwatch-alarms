import * as cdk from 'aws-cdk-lib';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as actions from 'aws-cdk-lib/aws-cloudwatch-actions';
import { Construct } from 'constructs';
import { ALARM_THRESHOLDS } from '../../config/alarm-thresholds';

export interface StepFunctionsAlarmsProps {
  environment: string;
  stateMachineArn: string;
  stateMachineName: string;
  alarmTopic: sns.ITopic;
}

/**
 * Creates CloudWatch alarms for Step Functions state machines
 * Monitors failed and timed out executions
 */
export class StepFunctionsAlarms extends Construct {
  constructor(scope: Construct, id: string, props: StepFunctionsAlarmsProps) {
    super(scope, id);

    const { environment, stateMachineArn, stateMachineName, alarmTopic } = props;
    const thresholds = ALARM_THRESHOLDS.stepFunctions;

    // Executions Failed Alarm
    const failedAlarm = new cloudwatch.Alarm(this, 'ExecutionsFailedAlarm', {
      alarmName: `${environment}-sfn-${stateMachineName}-executions-failed`,
      alarmDescription: `Step Functions ${stateMachineName} has failed executions`,
      metric: new cloudwatch.Metric({
        namespace: 'AWS/States',
        metricName: 'ExecutionsFailed',
        dimensionsMap: {
          StateMachineArn: stateMachineArn,
        },
        statistic: 'Sum',
        period: cdk.Duration.minutes(5),
      }),
      threshold: thresholds.executionsFailed,
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
    failedAlarm.addAlarmAction(new actions.SnsAction(alarmTopic));

    // Executions Timed Out Alarm
    const timedOutAlarm = new cloudwatch.Alarm(this, 'ExecutionsTimedOutAlarm', {
      alarmName: `${environment}-sfn-${stateMachineName}-executions-timed-out`,
      alarmDescription: `Step Functions ${stateMachineName} has timed out executions`,
      metric: new cloudwatch.Metric({
        namespace: 'AWS/States',
        metricName: 'ExecutionsTimedOut',
        dimensionsMap: {
          StateMachineArn: stateMachineArn,
        },
        statistic: 'Sum',
        period: cdk.Duration.minutes(5),
      }),
      threshold: thresholds.executionsTimedOut,
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
    timedOutAlarm.addAlarmAction(new actions.SnsAction(alarmTopic));
  }
}
