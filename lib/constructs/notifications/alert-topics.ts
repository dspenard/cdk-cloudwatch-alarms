import * as cdk from 'aws-cdk-lib';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import { Construct } from 'constructs';

export interface AlertTopicsProps {
  environment: string;
  smsPhoneNumbers?: string[];
  emailAddresses?: string[];
}

/**
 * Creates SNS topics for alert notifications
 * Supports SMS and email subscriptions
 * For Teams integration, you'll need to add a Lambda function or use AWS Chatbot
 */
export class AlertTopics extends Construct {
  public readonly criticalAlarmTopic: sns.Topic;
  public readonly warningAlarmTopic: sns.Topic;

  constructor(scope: Construct, id: string, props: AlertTopicsProps) {
    super(scope, id);

    // Critical alarms topic (for production issues)
    this.criticalAlarmTopic = new sns.Topic(this, 'CriticalAlarmTopic', {
      displayName: `${props.environment} Critical Monitoring Alerts`,
      topicName: `${props.environment}-monitoring-critical-alerts`,
    });

    // Warning alarms topic (for non-critical issues)
    this.warningAlarmTopic = new sns.Topic(this, 'WarningAlarmTopic', {
      displayName: `${props.environment} Warning Monitoring Alerts`,
      topicName: `${props.environment}-monitoring-warning-alerts`,
    });

    // Add SMS subscriptions if provided
    if (props.smsPhoneNumbers && props.smsPhoneNumbers.length > 0) {
      props.smsPhoneNumbers
        .filter(phoneNumber => phoneNumber && phoneNumber.trim() !== '')
        .forEach((phoneNumber, index) => {
          this.criticalAlarmTopic.addSubscription(
            new subscriptions.SmsSubscription(phoneNumber)
          );
        });
    }

    // Add email subscriptions if provided
    if (props.emailAddresses && props.emailAddresses.length > 0) {
      props.emailAddresses
        .filter(email => email && email.trim() !== '')
        .forEach((email, index) => {
          this.criticalAlarmTopic.addSubscription(
            new subscriptions.EmailSubscription(email)
          );
          this.warningAlarmTopic.addSubscription(
            new subscriptions.EmailSubscription(email)
          );
        });
    }

    // Output the topic ARNs for reference
    new cdk.CfnOutput(this, 'CriticalTopicArn', {
      value: this.criticalAlarmTopic.topicArn,
      description: 'ARN of the critical alarm SNS topic',
      exportName: `${props.environment}-critical-alarm-topic-arn`,
    });

    new cdk.CfnOutput(this, 'WarningTopicArn', {
      value: this.warningAlarmTopic.topicArn,
      description: 'ARN of the warning alarm SNS topic',
      exportName: `${props.environment}-warning-alarm-topic-arn`,
    });
  }
}
