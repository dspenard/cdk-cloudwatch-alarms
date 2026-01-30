import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import { Construct } from 'constructs';

export interface SlackForwarderProps {
  environment: string;
  alarmTopic: sns.ITopic;
  slackWebhookUrl: string;
}

/**
 * Forwards CloudWatch alarm notifications to Slack
 * Creates a Lambda function that formats and sends alarm messages to a Slack webhook
 */
export class SlackForwarder extends Construct {
  public readonly forwarderFunction: lambda.Function;

  constructor(scope: Construct, id: string, props: SlackForwarderProps) {
    super(scope, id);

    this.forwarderFunction = new lambda.Function(this, 'SlackForwarderFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
        const https = require('https');
        
        exports.handler = async (event) => {
          console.log('Received SNS event:', JSON.stringify(event, null, 2));
          
          const snsMessage = JSON.parse(event.Records[0].Sns.Message);
          
          // Determine color based on alarm state
          const color = snsMessage.NewStateValue === 'ALARM' ? 'danger' : 
                       snsMessage.NewStateValue === 'OK' ? 'good' : 'warning';
          
          // Determine emoji
          const emoji = snsMessage.NewStateValue === 'ALARM' ? ':rotating_light:' : 
                       snsMessage.NewStateValue === 'OK' ? ':white_check_mark:' : ':warning:';
          
          // Build Slack message with rich formatting
          const slackMessage = {
            username: 'AWS CloudWatch',
            icon_emoji: ':aws:',
            attachments: [{
              color: color,
              title: \`\${emoji} \${snsMessage.AlarmName}\`,
              text: snsMessage.AlarmDescription || 'CloudWatch Alarm',
              fields: [
                {
                  title: 'Status',
                  value: snsMessage.NewStateValue,
                  short: true
                },
                {
                  title: 'Environment',
                  value: '${props.environment}',
                  short: true
                },
                {
                  title: 'Region',
                  value: snsMessage.Region || 'us-east-1',
                  short: true
                },
                {
                  title: 'Time',
                  value: new Date(snsMessage.StateChangeTime).toLocaleString(),
                  short: true
                },
                {
                  title: 'Reason',
                  value: snsMessage.NewStateReason,
                  short: false
                }
              ],
              footer: 'AWS CloudWatch Alarms',
              ts: Math.floor(Date.now() / 1000)
            }]
          };
          
          // Add console link if alarm ARN is available
          if (snsMessage.AlarmArn) {
            const region = snsMessage.Region || 'us-east-1';
            const consoleUrl = \`https://console.aws.amazon.com/cloudwatch/home?region=\${region}#alarmsV2:alarm/\${encodeURIComponent(snsMessage.AlarmName)}\`;
            slackMessage.attachments[0].actions = [{
              type: 'button',
              text: 'View in Console',
              url: consoleUrl
            }];
          }
          
          return new Promise((resolve, reject) => {
            const url = new URL('${props.slackWebhookUrl}');
            const options = {
              hostname: url.hostname,
              path: url.pathname,
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              }
            };
            
            const req = https.request(options, (res) => {
              let data = '';
              res.on('data', chunk => data += chunk);
              res.on('end', () => {
                console.log('Slack response:', res.statusCode, data);
                if (res.statusCode === 200) {
                  resolve({ statusCode: 200, body: 'Message sent to Slack' });
                } else {
                  reject(new Error(\`Slack API error: \${res.statusCode} - \${data}\`));
                }
              });
            });
            
            req.on('error', (error) => {
              console.error('Request error:', error);
              reject(error);
            });
            
            req.write(JSON.stringify(slackMessage));
            req.end();
          });
        };
      `),
      timeout: cdk.Duration.seconds(10),
      description: `Forwards CloudWatch alarms to Slack for ${props.environment}`,
    });

    // Subscribe Lambda to SNS topic
    props.alarmTopic.addSubscription(
      new subscriptions.LambdaSubscription(this.forwarderFunction)
    );

    // Output Lambda function name for reference
    new cdk.CfnOutput(this, 'SlackForwarderFunctionName', {
      value: this.forwarderFunction.functionName,
      description: 'Lambda function that forwards alarms to Slack',
    });
  }
}
