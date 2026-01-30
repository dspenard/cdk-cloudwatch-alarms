# Scripts

Automation scripts for setting up and managing the CDK monitoring infrastructure.

## Available Scripts

### `setup-oidc.sh`

Automated setup script for GitHub Actions OIDC authentication.

**Purpose:** Configures secure authentication for GitHub Actions to deploy CDK stacks without storing long-lived credentials.

**What it does:**
- Creates OIDC provider in AWS (using GitHub's root CA certificate thumbprint)
- Creates IAM role `GitHubActionsCDKDeploy`
- Configures trust policy for your GitHub repository
- Attaches necessary permissions
- Verifies CDK bootstrap
- Outputs the Role ARN for GitHub Secrets

**Usage:**
```bash
./scripts/setup-oidc.sh
```

**Prerequisites:**
- AWS CLI configured with a profile
- Admin access to AWS account (or IAM permissions)
- Permissions to create OIDC providers and IAM roles

**Output:**
- Role ARN (save this for GitHub Secrets)
- Saved to `.github-role-arn.txt` for reference

**Documentation:**
- Quick start: `QUICK_START_OIDC.md`
- Detailed guide: `OIDC_SETUP_GUIDE.md`
- Checklist: `.github-actions-checklist.md`

**Example:**
```bash
$ ./scripts/setup-oidc.sh
========================================
GitHub Actions OIDC Setup for AWS
========================================

Step 1: Getting AWS Account ID...
Enter your AWS profile name (e.g., dev, default): dev
✓ Account ID: 123456789012
✓ GitHub Repo: dspenard/cdk-cloudwatch-alarms

Step 2: Creating OIDC Provider...
✓ OIDC Provider created

Step 3: Creating IAM Role Trust Policy...
✓ Trust policy created

Step 4: Creating IAM Role...
✓ IAM Role created

Step 5: Attaching permissions policy...
✓ Permissions attached

Step 6: Verifying CDK Bootstrap...
✓ CDK already bootstrapped

========================================
Setup Complete!
========================================

Next Steps:
1. Update your GitHub Actions workflow file with:
   role-to-assume: arn:aws:iam::123456789012:role/GitHubActionsCDKDeploy

2. No GitHub Secrets needed! OIDC handles authentication automatically.

3. Push your changes and test the workflow

Role ARN for workflow:
arn:aws:iam::123456789012:role/GitHubActionsCDKDeploy

✓ Role ARN saved to .github-role-arn.txt
```

## Future Scripts

Additional scripts may be added here for:
- Deployment automation
- Environment setup
- Resource cleanup
- Testing and validation
- Monitoring setup

## Contributing

When adding new scripts:
1. Make them executable: `chmod +x scripts/your-script.sh`
2. Add documentation to this README
3. Include usage examples
4. Add error handling and validation
5. Follow the existing script patterns
