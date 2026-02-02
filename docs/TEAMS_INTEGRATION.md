# Microsoft Teams Integration Guide

> **⚠️ Note:** This integration has not been tested yet. The code is provided as a reference implementation. Please test thoroughly in your dev environment before using in production.

This guide explains how to integrate CloudWatch alarms with Microsoft Teams channels.

## Table of Contents

- [Option 1: AWS Chatbot (Recommended)](#option-1-aws-chatbot-recommended)
- [Option 2: Lambda Function (Reference Implementation)](#option-2-lambda-function-reference-implementation)
- [Message Format Examples](#message-format-examples)
- [Testing](#testing)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Option 1: AWS Chatbot (Recommended)

AWS Chatbot is the easiest way to send CloudWatch alarms to Teams.

### Setup Steps

1. **Create Teams Webhook**
   - Go to your Teams channel
   - Click "..." → Connectors → Incoming Webhook
   - Name it "AWS Monitoring Alerts"
   - Copy the webhook URL

2. **Configure AWS Chatbot**
   - Go to AWS Chatbot console
   - Click "Configure new client"
   - Select "Microsoft Teams"
   - Follow the authorization flow
   - Create a new channel configuration
   - Select your SNS topics created by this CDK stack

3. **Test the Integration**
   - Trigger a test alarm
   - Verify message appears in Teams

### Pros
- No code required
- Managed by AWS
- Rich formatting
- Interactive buttons

### Cons
- Requires AWS Chatbot setup per account
- Limited customization

## Option 2: Lambda Function (Reference Implementation)

For more control, use a Lambda function to forward SNS messages to Teams.

### Architecture

```
CloudWatch Alarm → SNS Topic → Lambda Function → Teams Webhook
```

### Implementation

1. **Create Lambda Function**

```typescript
// lib/constructs/notifications/teams-forwarder.ts
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

export class TeamsForwarder extends Construct {
  constructor(scope: Construct, id: string, props: TeamsForwarderProps) {
    super(scope, id);

    const forwarderFunction = new lambda.Function(this, 'TeamsForwarderFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
        const https = require('https');
        
        exports.handler = async (event) => {
          const message = JSON.parse(event.Records[0].Sns.Message);
          
          // Add console link if alarm ARN is available
          let consoleUrl = '';
          if (message.AlarmArn) {
            const region = message.Region || 'us-east-1';
            consoleUrl = \`https://console.aws.amazon.com/cloudwatch/home?region=\${region}#alarmsV2:alarm/\${encodeURIComponent(message.AlarmName)}\`;
          }
          
          const card = {
            "@type": "MessageCard",
            "@context": "https://schema.org/extensions",
            "summary": message.AlarmName,
            "themeColor": message.NewStateValue === "ALARM" ? "FF0000" : "00FF00",
            "title": message.AlarmName,
            "sections": [{
              "activityTitle": "CloudWatch Alarm",
              "facts": [
                {
                  "name": "Status",
                  "value": message.NewStateValue
                },
                {
                  "name": "Reason",
                  "value": message.NewStateReason
                },
                {
                  "name": "Region",
                  "value": message.Region || 'us-east-1'
                },
                {
                  "name": "Time",
                  "value": message.StateChangeTime
                }
              ]
            }],
            "potentialAction": consoleUrl ? [{
              "@type": "OpenUri",
              "name": "View in Console",
              "targets": [{
                "os": "default",
                "uri": consoleUrl
              }]
            }] : []
          };
          
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
                if (res.statusCode === 200) {
                  resolve({ statusCode: 200, body: 'Message sent to Teams' });
                } else {
                  reject(new Error(\`Teams API error: \${res.statusCode} - \${data}\`));
                }
              });
            });
            
            req.on('error', reject);
            req.write(JSON.stringify(card));
            req.end();
          });
        };
      `),
      timeout: cdk.Duration.seconds(10),
      description: \`Forwards CloudWatch alarms to Teams for \${props.environment}\`,
    });

    props.alarmTopic.addSubscription(
      new subscriptions.LambdaSubscription(forwarderFunction)
    );
  }
}
```

2. **Add to Monitoring Stack**

```typescript
// In lib/stacks/monitoring-stack.ts
import { TeamsForwarder } from '../constructs/notifications/teams-forwarder';

// After creating alertTopics
if (envConfig.teamsWebhookUrl) {
  new TeamsForwarder(this, 'TeamsForwarder', {
    environment,
    alarmTopic: alertTopics.criticalAlarmTopic,
    teamsWebhookUrl: envConfig.teamsWebhookUrl,
  });
}
```

3. **Update Environment Config**

```typescript
// In lib/config/environment-config.ts
dev: {
  accountId: '123456789012',
  region: 'us-east-1',
  teamsWebhookUrl: 'https://outlook.office.com/webhook/...',
},
```

### Pros
- Full control over message format
- Can add custom logic
- Works across all accounts

### Cons
- Requires Lambda maintenance
- Need to manage webhook URLs

## Message Format Examples

### AWS Chatbot Format
```
🔴 ALARM: prod-rds-users-db-cpu-utilization
Region: us-east-1
Time: 2024-01-29T10:30:00.000Z
Reason: Threshold Crossed: 1 datapoint [85.5] was greater than the threshold (75.0)
```

### Custom Lambda Format
You can customize the Lambda to include:
- Color coding (red for ALARM, green for OK)
- Direct links to AWS Console
- Runbook links
- On-call rotation info
- Custom emojis and formatting

## Testing

Test your integration:

```bash
# First, get your SNS topic ARN
aws sns list-topics --profile YOUR_PROFILE --query 'Topics[?contains(TopicArn, `dev-monitoring-critical`)].TopicArn' --output text

# Then publish a test message
aws sns publish \
  --topic-arn arn:aws:sns:us-east-1:ACCOUNT_ID:monitoring-critical-alerts-dev \
  --message '{"AlarmName":"Test Alarm","NewStateValue":"ALARM","NewStateReason":"Testing Teams integration","Region":"us-east-1","StateChangeTime":"2024-01-29T10:30:00.000Z"}' \
  --profile YOUR_PROFILE
```

Replace `ACCOUNT_ID` and `YOUR_PROFILE` with your actual values.

## Best Practices

1. **Separate Channels**
   - Use different Teams channels for dev/staging/prod
   - Use different channels for critical vs warning alarms

2. **Message Filtering**
   - Filter out noisy alarms
   - Only send critical alarms to Teams
   - Send warnings to email or separate channel

3. **Rate Limiting**
   - Implement rate limiting in Lambda to avoid spam
   - Use SNS message filtering

4. **Security**
   - Store webhook URLs in AWS Secrets Manager
   - Rotate webhook URLs periodically
   - Use IAM roles, not access keys

## Troubleshooting

### Messages not appearing in Teams
- Verify webhook URL is correct
- Check Lambda logs in CloudWatch
- Verify SNS subscription is confirmed

### Lambda errors
- Check CloudWatch Logs for the Lambda function
- Verify webhook URL format
- Test webhook URL with curl

### Too many notifications
- Adjust alarm thresholds
- Increase evaluation periods
- Use composite alarms to reduce noise
