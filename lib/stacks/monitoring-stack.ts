import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { AlertTopics } from '../constructs/notifications/alert-topics';
import { SlackForwarder } from '../constructs/notifications/slack-forwarder';
import { TeamsForwarder } from '../constructs/notifications/teams-forwarder';
import { S3Alarms } from '../constructs/alarms/s3-alarms';
// Uncomment imports below when ready to use other services:
// import { EcsAlarms } from '../constructs/alarms/ecs-alarms';
// import { RdsAlarms } from '../constructs/alarms/rds-alarms';
// import { ElbAlarms } from '../constructs/alarms/elb-alarms';
// import { EfsAlarms } from '../constructs/alarms/efs-alarms';
// import { FsxAlarms } from '../constructs/alarms/fsx-alarms';
// import { SesAlarms } from '../constructs/alarms/ses-alarms';
// import { StepFunctionsAlarms } from '../constructs/alarms/stepfunctions-alarms';
// import { WafAlarms } from '../constructs/alarms/waf-alarms';
import { getEnvironmentConfig } from '../config/environment-config';

export interface MonitoringStackProps extends cdk.StackProps {
  environment: string;
  smsPhoneNumbers?: string[];
  emailAddresses?: string[];
}

/**
 * Main monitoring stack that creates SNS topics and CloudWatch alarms
 * Currently configured for S3 monitoring only
 * Uncomment sections below to enable monitoring for other AWS services
 */
export class MonitoringStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: MonitoringStackProps) {
    super(scope, id, props);

    const { environment, smsPhoneNumbers, emailAddresses } = props;

    // Get environment configuration
    const envConfig = getEnvironmentConfig(environment);

    // Create SNS topics for notifications
    const alertTopics = new AlertTopics(this, 'AlertTopics', {
      environment,
      smsPhoneNumbers,
      emailAddresses,
    });

    // Set up Slack integration if webhook URL is configured
    if (envConfig.slackWebhookUrl) {
      new SlackForwarder(this, 'SlackForwarder', {
        environment,
        alarmTopic: alertTopics.criticalAlarmTopic,
        slackWebhookUrl: envConfig.slackWebhookUrl,
      });
    }

    // Set up Teams integration if webhook URL is configured
    if (envConfig.teamsWebhookUrl) {
      new TeamsForwarder(this, 'TeamsForwarder', {
        environment,
        alarmTopic: alertTopics.criticalAlarmTopic,
        teamsWebhookUrl: envConfig.teamsWebhookUrl,
      });
    }

    // ========================================
    // S3 BUCKET MONITORING (ACTIVE)
    // ========================================
    
    // S3 buckets to monitor
    const s3Buckets = [
      'your-bucket-name', // TODO: Replace with your actual S3 bucket name(s)
    ];

    // Create alarms for each S3 bucket
    // NOTE: Using low thresholds for testing - adjust for production!
    s3Buckets.forEach((bucketName) => {
      new S3Alarms(this, `${bucketName}Alarms`, {
        environment,
        bucketName,
        customSizeThreshold: 1 * 1024 * 1024, // 1 MB (for testing)
        alarmTopic: alertTopics.criticalAlarmTopic,
      });
    });

    // Example: Monitor a bucket with custom size threshold
    /*
    new S3Alarms(this, 'LargeBucketAlarms', {
      environment,
      bucketName: 'my-large-bucket',
      customSizeThreshold: 500 * 1024 * 1024 * 1024, // 500GB
      alarmTopic: alertTopics.criticalAlarmTopic,
    });
    */

    // ========================================
    // ECS SERVICE MONITORING (COMMENTED OUT)
    // ========================================
    // To enable: Uncomment the import at the top and uncomment the code below
    
    /*
    // Monitor multiple ECS services
    const ecsServices = [
      { cluster: 'api-cluster', service: 'user-service' },
      { cluster: 'api-cluster', service: 'auth-service' },
      { cluster: 'api-cluster', service: 'payment-service' },
      { cluster: 'worker-cluster', service: 'email-worker' },
    ];

    ecsServices.forEach(({ cluster, service }) => {
      new EcsAlarms(this, `${service}Alarms`, {
        environment,
        clusterName: cluster,
        serviceName: service,
        alarmTopic: alertTopics.criticalAlarmTopic,
      });
    });
    */

    // ========================================
    // RDS DATABASE MONITORING (COMMENTED OUT)
    // ========================================
    // To enable: Uncomment the import at the top and uncomment the code below
    
    /*
    // Monitor multiple RDS instances
    const rdsInstances = [
      'users-db',
      'products-db',
      'analytics-db',
      'sessions-db',
    ];

    rdsInstances.forEach((dbId) => {
      new RdsAlarms(this, `${dbId}Alarms`, {
        environment,
        dbInstanceIdentifier: dbId,
        alarmTopic: alertTopics.criticalAlarmTopic,
      });
    });
    */

    // ========================================
    // LOAD BALANCER MONITORING (COMMENTED OUT)
    // ========================================
    // To enable: Uncomment the import at the top and uncomment the code below
    
    /*
    // Monitor Application Load Balancers
    const loadBalancers = [
      {
        name: 'api-alb',
        fullName: 'app/api-alb/1234567890abcdef',
        targetGroup: 'targetgroup/api-tg/1234567890abcdef',
      },
      {
        name: 'web-alb',
        fullName: 'app/web-alb/abcdef1234567890',
        targetGroup: 'targetgroup/web-tg/abcdef1234567890',
      },
    ];

    loadBalancers.forEach(({ name, fullName, targetGroup }) => {
      new ElbAlarms(this, `${name}Alarms`, {
        environment,
        loadBalancerFullName: fullName,
        targetGroupFullName: targetGroup,
        alarmTopic: alertTopics.criticalAlarmTopic,
      });
    });
    */

    // ========================================
    // EFS FILE SYSTEM MONITORING (COMMENTED OUT)
    // ========================================
    // To enable: Uncomment the import at the top and uncomment the code below
    
    /*
    // Monitor EFS file systems
    const efsFileSystems = [
      'fs-12345678',
      'fs-87654321',
    ];

    efsFileSystems.forEach((fsId) => {
      new EfsAlarms(this, `${fsId}Alarms`, {
        environment,
        fileSystemId: fsId,
        alarmTopic: alertTopics.criticalAlarmTopic,
      });
    });
    */

    // ========================================
    // FSX FILE SYSTEM MONITORING (COMMENTED OUT)
    // ========================================
    // To enable: Uncomment the import at the top and uncomment the code below
    
    /*
    // Monitor FSx file systems
    const fsxFileSystems = [
      { id: 'fs-0123456789abcdef0', type: 'Windows' as const },
      { id: 'fs-fedcba9876543210', type: 'Lustre' as const },
    ];

    fsxFileSystems.forEach(({ id, type }) => {
      new FsxAlarms(this, `${id}Alarms`, {
        environment,
        fileSystemId: id,
        fileSystemType: type,
        alarmTopic: alertTopics.criticalAlarmTopic,
      });
    });
    */

    // ========================================
    // SES EMAIL MONITORING (COMMENTED OUT)
    // ========================================
    // To enable: Uncomment the import at the top and uncomment the code below
    
    /*
    // Monitor SES reputation (one per account)
    new SesAlarms(this, 'SesAlarms', {
      environment,
      alarmTopic: alertTopics.criticalAlarmTopic,
    });
    */

    // ========================================
    // STEP FUNCTIONS MONITORING (COMMENTED OUT)
    // ========================================
    // To enable: Uncomment the import at the top and uncomment the code below
    
    /*
    // Monitor Step Functions state machines
    const stateMachines = [
      {
        name: 'order-processing',
        arn: 'arn:aws:states:us-east-1:123456789012:stateMachine:order-processing',
      },
      {
        name: 'data-pipeline',
        arn: 'arn:aws:states:us-east-1:123456789012:stateMachine:data-pipeline',
      },
    ];

    stateMachines.forEach(({ name, arn }) => {
      new StepFunctionsAlarms(this, `${name}Alarms`, {
        environment,
        stateMachineName: name,
        stateMachineArn: arn,
        alarmTopic: alertTopics.criticalAlarmTopic,
      });
    });
    */

    // ========================================
    // WAF WEB ACL MONITORING (COMMENTED OUT)
    // ========================================
    // To enable: Uncomment the import at the top and uncomment the code below
    
    /*
    // Monitor WAF Web ACLs
    const webAcls = [
      { name: 'api-waf', id: '12345678-1234-1234-1234-123456789012' },
      { name: 'web-waf', id: '87654321-4321-4321-4321-210987654321' },
    ];

    webAcls.forEach(({ name, id }) => {
      new WafAlarms(this, `${name}Alarms`, {
        environment,
        webAclName: name,
        webAclId: id,
        region: 'us-east-1',
        alarmTopic: alertTopics.criticalAlarmTopic,
      });
    });
    */
  }
}
