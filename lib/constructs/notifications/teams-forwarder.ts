import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import { Construct } from 'constructs';

export interface TeamsForwarderProps {
  environment: string;
  alarmTopic: sns.ITopic;
  teamsWebhookUrl: string;
}

/**
 * Forwards CloudWatch alarm notifications to Microsoft Teams
 * Creates a Lambda function that formats and sends alarm messages to a Teams webhook
 */
export class TeamsForwarder extends Construct {
  public readonly forwarderFunction: lambda.Function;

  constructor(scope: Construct, id: string, props: TeamsForwarderProps) {
    super(scope, id);

    this.forwarderFunction = new lambda.Function(this, 'TeamsForwarderFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
        const https = require('https');
        
        exports.handler = async (event) => {
          console.log('Received SNS event:', JSON.stringify(event, null, 2));
          
          const snsMessage = JSON.parse(event.Records[0].Sns.Message);
          
          // Determine color based on alarm state
          const themeColor = snsMessage.NewStateValue === 'ALARM' ? 'FF0000' : 
                            snsMessage.NewStateValue === 'OK' ? '00FF00' : 'FFA500';
          
          // Build console link
          let consoleUrl = '';
          if (snsMessage.AlarmArn) {
            const region = snsMessage.Region || 'us-east-1';
            consoleUrl = \`https://console.aws.amazon.com/cloudwatch/home?region=\${region}#alarmsV2:alarm/\${encodeURIComponent(snsMessage.AlarmName)}\`;
          }
          
          // Build Teams message card
          const card = {
            "@type": "MessageCard",
            "@context": "https://schema.org/extensions",
            "summary": snsMessage.AlarmName,
            "themeColor": themeColor,
            "title": snsMessage.AlarmName,
            "sections": [{
              "activityTitle": "CloudWatch Alarm Notification",
              "activitySubtitle": snsMessage.AlarmDescription || '',
              "facts": [
                {
                  "name": "Status",
                  "value": snsMessage.NewStateValue
                },
                {
                  "name": "Environment",
                  "value": "${props.environment}"
                },
                {
                  "name": "Region",
                  "value": snsMessage.Region || 'us-east-1'
                },
                {
                  "name": "Time",
                  "value": new Date(snsMessage.StateChangeTime).toLocaleString()
                },
                {
                  "name": "Reason",
                  "value": snsMessage.NewStateReason
                }
              ]
            }]
          };
          
          // Add action button if console URL is available
          if (consoleUrl) {
            card.potentialAction = [{
              "@type": "OpenUri",
              "name": "View in AWS Console",
              "targets": [{
                "os": "default",
                "uri": consoleUrl
              }]
            }];
          }
          
          return new Promise((resolve, reject) => {
            const url = new URL('${props.teamsWebhookUrl}');
            const options = {
              hostname: url.hostname,
              path: url.pathname + url.search,
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              }
            };
            
            const req = https.request(options, (res) => {
              let data = '';
              res.on('data', chunk => data += chunk);
              res.on('end', () => {
                console.log('Teams response:', res.statusCode, data);
                if (res.statusCode === 200) {
                  resolve({ statusCode: 200, body: 'Message sent to Teams' });
                } else {
                  reject(new Error(\`Teams API error: \${res.statusCode} - \${data}\`));
                }
              });
            });
            
            req.on('error', (error) => {
              console.error('Request error:', error);
              reject(error);
            });
            
            req.write(JSON.stringify(card));
            req.end();
          });
        };
      `),
      timeout: cdk.Duration.seconds(10),
      description: `Forwards CloudWatch alarms to Microsoft Teams for ${props.environment}`,
    });

    // Subscribe Lambda to SNS topic
    props.alarmTopic.addSubscription(
      new subscriptions.LambdaSubscription(this.forwarderFunction)
    );

    // Output Lambda function name for reference
    new cdk.CfnOutput(this, 'TeamsForwarderFunctionName', {
      value: this.forwarderFunction.functionName,
      description: 'Lambda function that forwards alarms to Teams',
    });
  }
}
