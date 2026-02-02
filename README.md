# CloudWatch Monitoring and Alerting with AWS CDK

An AWS CDK template for deploying CloudWatch alarms and alerting infrastructure across multiple environments. This project demonstrates best practices for infrastructure-as-code monitoring using TypeScript and AWS CDK, with support for multiple AWS services and notification channels.

## Table of Contents

- [Quick Start](#quick-start)
- [Architecture](#architecture)
- [Documentation](#documentation)
- [Contributing](#contributing)
- [License](#license)
- [Support](#support)

## Quick Start

> **⚠️ Before you begin:** This repository is meant as a reference implementation and starting point for your own project.  If you want to use the optional GitHub Actions implementation, then please clone or fork to your own GitHub account before making changes to kick off the CI/CD process.  Running this implementation locally without GitHub Actions is perfectly fine without having to push your project to GitHub.

**Prerequisites:** Node.js 18+, AWS CLI configured, AWS CDK CLI

The project is pre-configured for only S3 monitoring as a simple, focused demonstration. **Only resources you uncomment in `lib/stacks/monitoring-stack.ts` will be deployed.**

**Deploy in 20 minutes** → See [Deployment Guide](docs/DEPLOYMENT_GUIDE.md) for step-by-step instructions.

## Architecture

### What You Get

- CloudWatch alarms for AWS resources (S3 at the moment, but code has been stubbed out for ECS, RDS, ELB, EFS, FSx, SES, Step Functions, WAF)
- SNS notifications (SMS, Email, Slack, Teams)
- Multi-environment support (dev, staging, prod)
- Local deployment (default) - Deploy from your machine using AWS CLI
- GitHub Actions (optional) - Automated deployment with OIDC authentication

See full details and diagrams in [Architecture](docs/ARCHITECTURE.md).

### Key Principle

This project can be easily extended for monitoring additional AWS resources beyond the initial S3 example.

- **Currently active**: S3 monitoring
- **Ready to enable**: ECS, RDS, ELB, EFS, FSx, SES, Step Functions, WAF (but full testing not done)
- Other services to be added in repo updates

**Only resources uncommented in `lib/stacks/monitoring-stack.ts` will be deployed.**  
To enable a service: Uncomment the import and code section, update resource names, and deploy.

See [Enabling Services](docs/ENABLING_SERVICES.md) for details.

### Project Structure

```
.
├── .github/
│   └── workflows/
│       ├── deploy.yml           ← GitHub Actions deployment workflow
│       └── destroy.yml          ← GitHub Actions destroy workflow
├── bin/
│   └── app.ts                   ← CDK app entry point
├── diagrams/
│   ├── cdk-deployment-flow.png  ← Deployment flow diagram
│   └── cdk-monitoring-architecture.png  ← System architecture diagram
├── docs/
│   ├── ARCHITECTURE.md          ← System architecture and design
│   ├── DEPLOYMENT_GUIDE.md      ← Complete deployment instructions
│   ├── ENABLING_SERVICES.md     ← How to enable additional AWS services
│   ├── GITHUB_ACTIONS_SETUP.md  ← GitHub Actions OIDC setup guide
│   ├── NOTIFICATION_SETUP.md    ← SMS, Email, Slack, Teams setup
│   ├── SLACK_INTEGRATION.md     ← Detailed Slack integration
│   └── TEAMS_INTEGRATION.md     ← Detailed Teams integration
├── lib/
│   ├── config/
│   │   ├── environment-config.ts    ← Add your AWS account IDs and settings
│   │   └── alarm-thresholds.ts      ← Adjust alarm thresholds (optional)
│   ├── stacks/
│   │   └── monitoring-stack.ts      ← Configure which resources to monitor
│   └── constructs/
│       ├── alarms/                  ← Alarm logic for each service
│       └── notifications/           ← SNS, Slack, Teams integration
├── scripts/
│   └── setup-oidc.sh                ← Automated GitHub Actions OIDC setup
├── .gitignore                       ← Git ignore rules
├── cdk.json                         ← CDK configuration
├── LICENSE                          ← MIT License
├── package.json                     ← Node.js dependencies
├── README.md                        ← This file
└── tsconfig.json                    ← TypeScript configuration
```

## Documentation

**Getting Started:**
- **[Deployment Guide](docs/DEPLOYMENT_GUIDE.md)** - Complete deployment guide
- **[Enabling Services](docs/ENABLING_SERVICES.md)** - How to enable ECS, RDS, ELB, and other services

**Automation & CI/CD (Optional):**
- **[GitHub Actions Setup](docs/GITHUB_ACTIONS_SETUP.md)** - Automated deployment with OIDC (includes quick start and alternative methods)

**Notifications:**
- **[Notification Setup](docs/NOTIFICATION_SETUP.md)** - SMS, Email, Slack, Teams setup
- **[Slack Integration](docs/SLACK_INTEGRATION.md)** - Detailed Slack integration guide
- **[Teams Integration](docs/TEAMS_INTEGRATION.md)** - Detailed Teams integration guide

**Architecture:**
- **[Architecture](docs/ARCHITECTURE.md)** - System architecture and design decisions

## Contributing

Contributions are welcome! Here's how you can help:

1. **Fork the repository** and create your branch from `main`
2. **Make your changes** and test thoroughly
3. **Update documentation** if you're adding features or changing behavior
4. **Submit a pull request** with a clear description of your changes

### Guidelines

- Follow the existing code style and structure
- Add comments for complex logic
- Update relevant documentation
- Test your changes in a dev environment before submitting
- Keep pull requests focused on a single feature or fix

### Reporting Issues

If you find a bug or have a feature request:
- Check if the issue already exists
- Provide detailed information about the problem
- Include steps to reproduce for bugs
- Suggest solutions if you have ideas

## License

This project is licensed under the MIT License - see the [License](LICENSE) file for details.

## Support

For issues or questions:
- Check [Deployment Guide troubleshooting section](docs/DEPLOYMENT_GUIDE.md#troubleshooting)
- Review CloudFormation events in AWS Console
- Check Lambda CloudWatch Logs for Slack/Teams notification issues (if configured)
