# Slack Integration Guide

This guide explains how to integrate CloudWatch alarms with Slack channels.

## Table of Contents

- [Option 1: AWS Chatbot (Recommended)](#option-1-aws-chatbot-recommended)
- [Option 2: Webhook with Lambda (Included in Code)](#option-2-webhook-with-lambda-included-in-code)
- [Testing Your Integration](#testing-your-integration)
- [Message Format](#message-format)
- [Troubleshooting](#troubleshooting)
- [Advanced Configuration](#advanced-configuration)

## Option 1: AWS Chatbot (Recommended)

AWS Chatbot provides native Slack integration for CloudWatch alarms.

### Setup Steps

1. **Configure AWS Chatbot**
   - Go to AWS Chatbot console: https://console.aws.amazon.com/chatbot/
   - Click "Configure new client"
   - Select "Slack"
   - Click "Configure client" and authorize with Slack

2. **Create Channel Configuration**
   - After authorization, click "Configure new channel"
   - Select your Slack workspace
   - Choose the Slack channel (e.g., #aws-alerts-dev)
   - Set a configuration name (e.g., "monitoring-dev")
   - Under "Permissions", create or select an IAM role
   - Under "Notifications", select your SNS topics created by this CDK stack
   - Click "Configure"

3. **Repeat for Each Environment**
   - Create separate channel configurations for dev, staging, prod
   - Use different Slack channels for each environment

4. **Test the Integration**
   - Trigger a test alarm
   - Verify message appears in Slack

### Pros
- No code required
- Managed by AWS
- Rich formatting with buttons
- Can run AWS CLI commands from Slack
- Supports multiple channels

### Cons
- Requires AWS Chatbot setup per account
- Need Slack workspace admin permissions

## Option 2: Lambda Function with Slack Webhook

For more control over message formatting, use a Lambda function.

### Architecture

```
CloudWatch Alarm → SNS Topic → Lambda Function → Slack Webhook
```

### Implementation

1. **Create Slack Incoming Webhook**
   - Go to https://api.slack.com/apps
   - Create a new app or select existing
   - Go to "Incoming Webhooks"
   - Activate Incoming Webhooks
   - Click "Add New Webhook to Workspace"
   - Select channel and authorize
   - Copy the webhook URL

2. **Create Lambda Forwarder Construct**

```typescript
// lib/constructs/notifications/slack-forwarder.ts
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

export class SlackForwarder extends Construct {
  constructor(scope: Construct, id: string, props: SlackForwarderProps) {
    super(scope, id);

    const forwarderFunction = new lambda.Function(this, 'SlackForwarderFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
        const https = require('https');
        
        exports.handler = async (event) => {
          const snsMessage = JSON.parse(event.Records[0].Sns.Message);
          
          // Determine color based on alarm state
          const color = snsMessage.NewStateValue === 'ALARM' ? 'danger' : 
                       snsMessage.NewStateValue === 'OK' ? 'good' : 'warning';
          
          // Determine emoji
          const emoji = snsMessage.NewStateValue === 'ALARM' ? ':rotating_light:' : 
                       snsMessage.NewStateValue === 'OK' ? ':white_check_mark:' : ':warning:';
          
          // Build Slack message
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
          
          // Add console link if available
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
                if (res.statusCode === 200) {
                  resolve({ statusCode: 200, body: 'Message sent to Slack' });
                } else {
                  reject(new Error(\`Slack API error: \${res.statusCode} - \${data}\`));
                }
              });
            });
            
            req.on('error', reject);
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
      new subscriptions.LambdaSubscription(forwarderFunction)
    );
  }
}
```

3. **Update Environment Config**

```typescript
// In lib/config/environment-config.ts
export interface EnvironmentConfig {
  accountId: string;
  region: string;
  snsTopicArn?: string;
  teamsWebhookUrl?: string;
  slackWebhookUrl?: string; // Add this
  smsPhoneNumbers?: string[];
}

export const ENVIRONMENT_CONFIGS: Record<string, EnvironmentConfig> = {
  dev: {
    accountId: '',
    region: 'us-east-1',
    slackWebhookUrl: 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL',
  },
  staging: {
    accountId: '',
    region: 'us-east-1',
    slackWebhookUrl: 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL',
  },
  prod: {
    accountId: '',
    region: 'us-east-1',
    slackWebhookUrl: 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL',
  },
};
```

4. **Add to Monitoring Stack**

```typescript
// In lib/stacks/monitoring-stack.ts
import { SlackForwarder } from '../constructs/notifications/slack-forwarder';

// After creating alertTopics
if (envConfig.slackWebhookUrl) {
  new SlackForwarder(this, 'SlackForwarder', {
    environment,
    alarmTopic: alertTopics.criticalAlarmTopic,
    slackWebhookUrl: envConfig.slackWebhookUrl,
  });
}
```

### Pros
- Full control over message format
- Can add custom logic and filtering
- Works across all accounts
- No AWS Chatbot setup needed

### Cons
- Requires Lambda maintenance
- Need to manage webhook URLs
- No interactive AWS CLI commands

## Option 3: Slack App with AWS Secrets Manager

For better security, store webhook URLs in Secrets Manager.

### Implementation

1. **Store Webhook in Secrets Manager**

```bash
aws secretsmanager create-secret \
  --name /monitoring/slack-webhook-url \
  --secret-string "https://hooks.slack.com/services/YOUR/WEBHOOK/URL" \
  --profile dev
```

2. **Update Lambda to Read from Secrets Manager**

```typescript
// lib/constructs/notifications/slack-forwarder-secure.ts
import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';

export interface SlackForwarderSecureProps {
  environment: string;
  alarmTopic: sns.ITopic;
  slackWebhookSecretName: string;
}

export class SlackForwarderSecure extends Construct {
  constructor(scope: Construct, id: string, props: SlackForwarderSecureProps) {
    super(scope, id);

    // Reference existing secret
    const webhookSecret = secretsmanager.Secret.fromSecretNameV2(
      this,
      'SlackWebhookSecret',
      props.slackWebhookSecretName
    );

    const forwarderFunction = new lambda.Function(this, 'SlackForwarderFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/slack-forwarder'), // External file
      timeout: cdk.Duration.seconds(10),
      environment: {
        SLACK_WEBHOOK_SECRET_NAME: props.slackWebhookSecretName,
        ENVIRONMENT: props.environment,
      },
    });

    // Grant Lambda permission to read secret
    webhookSecret.grantRead(forwarderFunction);

    props.alarmTopic.addSubscription(
      new subscriptions.LambdaSubscription(forwarderFunction)
    );
  }
}
```

## Message Format Examples

### AWS Chatbot Format
```
🔴 ALARM: prod-rds-users-db-cpu-utilization
Status: ALARM
Region: us-east-1
Time: 2024-01-29T10:30:00.000Z
Reason: Threshold Crossed: 1 datapoint [85.5] was greater than the threshold (75.0)

[View in Console] [Show Details]
```

### Custom Lambda Format
The Lambda example above creates rich Slack messages with:
- Color-coded attachments (red for ALARM, green for OK)
- Emoji indicators
- Structured fields
- Direct link to AWS Console
- Timestamp

## Slack Channel Recommendations

### Separate Channels by Environment
```
#aws-alerts-dev       → Dev environment alarms
#aws-alerts-staging   → Staging environment alarms
#aws-alerts-prod      → Production alarms (critical only)
```

### Separate Channels by Severity
```
#aws-critical-alerts  → Critical alarms (prod)
#aws-warning-alerts   → Warning alarms (all envs)
#aws-info-alerts      → Informational (OK state changes)
```

### Separate Channels by Service
```
#aws-database-alerts  → RDS, DynamoDB alarms
#aws-compute-alerts   → ECS, Lambda alarms
#aws-network-alerts   → ELB, WAF alarms
```

## Testing

Test your integration:

```bash
# Publish a test message to SNS
aws sns publish \
  --topic-arn arn:aws:sns:us-east-1:ACCOUNT:monitoring-critical-alerts-dev \
  --message '{"AlarmName":"Test Alarm","NewStateValue":"ALARM","NewStateReason":"Testing Slack integration","Region":"us-east-1","StateChangeTime":"2024-01-29T10:30:00.000Z"}' \
  --profile dev
```

## Advanced Features

### Message Threading
Group related alarms in Slack threads:

```javascript
// Store thread_ts in DynamoDB and reply to same thread
const slackMessage = {
  thread_ts: previousThreadTs, // Reply to existing thread
  // ... rest of message
};
```

### Mention Users on Critical Alarms
```javascript
const slackMessage = {
  text: '<!channel> Critical production alarm!',
  // ... rest of message
};
```

### Custom Emojis
```javascript
const emojiMap = {
  'ecs': ':docker:',
  'rds': ':database:',
  'elb': ':balance_scale:',
  's3': ':bucket:',
};
```

## Best Practices

1. **Rate Limiting**
   - Implement rate limiting to avoid Slack API limits
   - Slack allows ~1 message per second per webhook

2. **Message Filtering**
   - Filter out noisy alarms in Lambda
   - Only send critical alarms to main channels
   - Send warnings to separate channels

3. **Security**
   - Store webhook URLs in Secrets Manager
   - Rotate webhook URLs periodically
   - Use IAM roles, not access keys
   - Never commit webhook URLs to git

4. **Monitoring**
   - Monitor Lambda execution errors
   - Set up dead letter queue for failed messages
   - Alert if Lambda fails repeatedly

5. **Message Quality**
   - Keep messages concise
   - Include actionable information
   - Add links to runbooks
   - Include direct console links

## Troubleshooting

### Messages not appearing in Slack
- Verify webhook URL is correct and active
- Check Lambda CloudWatch Logs
- Verify SNS subscription is confirmed
- Test webhook with curl:
  ```bash
  curl -X POST -H 'Content-type: application/json' \
    --data '{"text":"Test message"}' \
    YOUR_WEBHOOK_URL
  ```

### Lambda timeout errors
- Increase Lambda timeout
- Check network connectivity
- Verify Slack API is accessible

### Too many notifications
- Adjust alarm thresholds
- Increase evaluation periods
- Use SNS message filtering
- Implement deduplication in Lambda

### Webhook URL expired
- Regenerate webhook in Slack
- Update Secrets Manager or environment config
- Redeploy stack

## Combining Slack and Teams

You can send notifications to both Slack and Teams:

```typescript
// In monitoring-stack.ts
if (envConfig.slackWebhookUrl) {
  new SlackForwarder(this, 'SlackForwarder', {
    environment,
    alarmTopic: alertTopics.criticalAlarmTopic,
    slackWebhookUrl: envConfig.slackWebhookUrl,
  });
}

if (envConfig.teamsWebhookUrl) {
  new TeamsForwarder(this, 'TeamsForwarder', {
    environment,
    alarmTopic: alertTopics.criticalAlarmTopic,
    teamsWebhookUrl: envConfig.teamsWebhookUrl,
  });
}
```

Both will receive the same alarms from SNS.
