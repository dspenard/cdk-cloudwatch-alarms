# Quick Start: GitHub Actions with OIDC

Get GitHub Actions working in 15 minutes with secure OIDC authentication.

## TL;DR - Three Steps

```bash
# 1. Run setup script (creates OIDC provider and IAM role in AWS)
./scripts/setup-oidc.sh

# 2. Add the Role ARN to GitHub Secrets
# Go to: https://github.com/dspenard/cdk-cloudwatch-alarms/settings/secrets/actions
# Add secret: AWS_ROLE_ARN_DEV = (the ARN from step 1)

# 3. Commit and push the updated workflow
git add .github/workflows/deploy.yml .gitignore
git commit -m "Configure OIDC authentication for GitHub Actions"
git push origin main

# 4. Test it!
# Go to: https://github.com/dspenard/cdk-cloudwatch-alarms/actions
# Click "Deploy Monitoring Infrastructure" → "Run workflow" → Select "dev" → "Run workflow"
```

## What You Need

- AWS CLI configured with a profile
- Admin access to AWS account (or IAM permissions)
- Access to GitHub repository settings

## Step-by-Step

### Step 1: Run Setup Script (5 minutes)

```bash
./scripts/setup-oidc.sh
```

**What it does:**
- Creates OIDC provider in AWS
- Creates IAM role `GitHubActionsCDKDeploy`
- Attaches necessary permissions
- Outputs the Role ARN you need

**Save the Role ARN** - it looks like:
```
arn:aws:iam::123456789012:role/GitHubActionsCDKDeploy
```

### Step 2: Add GitHub Secret (2 minutes)

1. Go to: https://github.com/dspenard/cdk-cloudwatch-alarms/settings/secrets/actions
2. Click **"New repository secret"**
3. Add:
   - **Name:** `AWS_ROLE_ARN_DEV`
   - **Value:** Your Role ARN from Step 1
4. Click **"Add secret"**

### Step 3: Commit Updated Workflow (2 minutes)

```bash
# The workflow file has already been updated for OIDC
git add .github/workflows/deploy.yml .gitignore
git commit -m "Configure OIDC authentication for GitHub Actions"
git push origin main
```

### Step 4: Test Deployment (5 minutes)

**Option A: Manual Trigger (Recommended for first test)**

1. Go to: https://github.com/dspenard/cdk-cloudwatch-alarms/actions
2. Click **"Deploy Monitoring Infrastructure"**
3. Click **"Run workflow"** dropdown
4. Select branch: `main`
5. Select environment: `dev`
6. Click **"Run workflow"** button
7. Watch it run!

**Option B: Push to Main**

```bash
# Make a small change
echo "" >> README.md
git add README.md
git commit -m "Test GitHub Actions OIDC deployment"
git push origin main
```

### Step 5: Verify Success (2 minutes)

**In GitHub:**
- ✅ Workflow shows green checkmark
- ✅ "Configure AWS credentials" step shows "Assuming role"
- ✅ "Deploy to dev" step completes successfully

**In AWS:**
```bash
# Check CloudFormation
aws cloudformation describe-stacks \
  --stack-name monitoring-dev \
  --profile YOUR_PROFILE \
  --query 'Stacks[0].StackStatus' \
  --output text
# Should show: UPDATE_COMPLETE or CREATE_COMPLETE

# Check CloudWatch alarms
aws cloudwatch describe-alarms \
  --alarm-name-prefix "dev-s3-" \
  --profile YOUR_PROFILE \
  --query 'MetricAlarms[*].AlarmName' \
  --output table
# Should list your alarms
```

## Troubleshooting

### "User is not authorized to perform: sts:AssumeRoleWithWebIdentity"

**Fix:** Check the trust policy has the correct repo name:
```bash
aws iam get-role \
  --role-name GitHubActionsCDKDeploy \
  --profile YOUR_PROFILE \
  --query 'Role.AssumeRolePolicyDocument.Statement[0].Condition'
```

Should show: `"repo:dspenard/cdk-cloudwatch-alarms:*"`

### "Role does not exist"

**Fix:** Run the setup script again:
```bash
./scripts/setup-oidc.sh
```

### "Access Denied" during deployment

**Fix:** Verify permissions are attached:
```bash
aws iam list-attached-role-policies \
  --role-name GitHubActionsCDKDeploy \
  --profile YOUR_PROFILE
```

Should show `AdministratorAccess` or your custom policy.

### Workflow doesn't start

**Fix:** Make sure you pushed the workflow file:
```bash
git add .github/workflows/deploy.yml
git commit -m "Add OIDC workflow"
git push origin main
```

## What's Different from Access Keys?

| Aspect | Access Keys (Old) | OIDC (New) |
|--------|------------------|------------|
| **Credentials** | Stored in GitHub | Never leave AWS |
| **Rotation** | Manual (every 90 days) | Automatic |
| **Security** | Good | Excellent |
| **Setup** | Simple | Slightly more complex |
| **GitHub Secrets** | 2 per environment | 1 per environment |

## Next Steps

After it's working:

1. **Add staging/prod** - Run setup script for each account
2. **Branch protection** - Require PR reviews before merge
3. **Least privilege** - Replace AdministratorAccess with custom policy
4. **Notifications** - Add Slack/Teams alerts for deployments

## Files Created

- `scripts/setup-oidc.sh` - Automated setup script
- `OIDC_SETUP_GUIDE.md` - Detailed documentation
- `.github-actions-checklist.md` - Progress tracker
- `.github/workflows/deploy.yml` - Updated for OIDC (already done)

## Need Help?

See detailed documentation:
- **Full guide:** `OIDC_SETUP_GUIDE.md`
- **Checklist:** `.github-actions-checklist.md`
- **Troubleshooting:** `OIDC_SETUP_GUIDE.md` (Troubleshooting section)

---

**Ready?** Run `./scripts/setup-oidc.sh` to get started! 🚀
