# GitHub Actions Deployment to Digital Ocean

This repository includes automated deployment to Digital Ocean using GitHub Actions.

## Setup Instructions

### 1. Configure GitHub Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions → New repository secret

Add the following secrets:

| Secret Name | Value | Description |
|-------------|--------|-------------|
| `DROPLET_HOST` | `143.244.133.154` | Digital Ocean droplet IP address |
| `DROPLET_USER` | `root` | SSH username for droplet |
| `DROPLET_PASSWORD` | `ffGpA2saNS47qr` | SSH password for droplet |
| `ADMIN_CANISTER_ID` | `wvset-niaaa-aaaao-a4osa-cai` | Admin backend canister ID |
| `CONSUMER_CANISTER_ID` | `t3pjp-kqaaa-aaaao-a4ooq-cai` | Consumer canister ID |
| `STORAGE_CANISTER_ID` | `hhaip-uiaaa-aaaao-a4khq-cai` | Storage canister ID |

### 2. Workflow Triggers

The deployment workflow triggers automatically on:
- **Push to `main` branch** when files change in:
  - `services/ic-proxy/**`
  - `services/search-proxy/**` 
  - `.github/workflows/**`
- **Manual dispatch** via GitHub Actions UI

### 3. Deployment Process

When triggered, the workflow will:

1. **Build & Package**
   - Install Node.js dependencies
   - Create deployment packages for IC Proxy and Search Proxy
   - Include all necessary files (server code, configs, node_modules)

2. **Deploy to Digital Ocean**
   - Upload packages to droplet via SCP
   - Extract files to appropriate directories
   - Set environment variables for canister IDs
   - Restart PM2 processes with updated env
   - Save PM2 configuration

3. **Health Checks**
   - Test local endpoints on droplet
   - Verify public HTTPS endpoints
   - Ensure services are running correctly

4. **Logging**
   - Commit deployment info to git repo on droplet
   - Provide deployment status notifications

### 4. Services Deployed

- **IC Proxy**: `https://ic-proxy.rhinospider.com`
- **Search Proxy**: `https://search-proxy.rhinospider.com`

### 5. Manual Deployment

To trigger manual deployment:
1. Go to GitHub → Actions tab
2. Select "Deploy to Digital Ocean" workflow
3. Click "Run workflow"
4. Choose branch (typically `main`)
5. Click "Run workflow"

### 6. Monitoring

After deployment, check:
- GitHub Actions logs for any errors
- PM2 status on droplet: `pm2 status`
- Service logs: `pm2 logs ic-proxy` or `pm2 logs search-proxy`
- Health endpoints:
  - https://ic-proxy.rhinospider.com/api/health
  - https://search-proxy.rhinospider.com/api/health

### 7. Rollback Process

If deployment fails or issues occur:
1. SSH to droplet: `ssh root@143.244.133.154`
2. Check PM2 status: `pm2 status`
3. Restore from previous git commit: `cd /root/ic-proxy && git log --oneline`
4. Checkout previous version: `git checkout <previous-commit-hash>`
5. Restart services: `pm2 restart all`

### 8. Security Considerations

- Secrets are encrypted in GitHub and only accessible during workflow execution
- SSH password authentication is used (consider switching to SSH keys for enhanced security)
- All communications use HTTPS/SSH encrypted channels
- PM2 processes run under root user on droplet

## File Structure

```
.github/
└── workflows/
    └── deploy-to-digital-ocean.yml    # Main deployment workflow

services/
├── ic-proxy/                          # IC Proxy service files
│   ├── server-fixed.js               # Main server file
│   ├── package.json                  # Dependencies
│   └── ecosystem.config.js           # PM2 configuration
└── search-proxy/                     # Search Proxy service files
    ├── server.js                     # Main server file
    ├── package.json                  # Dependencies  
    └── ecosystem.config.js           # PM2 configuration
```

## Troubleshooting

### Common Issues

1. **SSH Connection Fails**
   - Verify DROPLET_HOST, DROPLET_USER, DROPLET_PASSWORD secrets
   - Check droplet is running and accessible

2. **PM2 Restart Fails** 
   - SSH to droplet and check PM2 status
   - Ensure processes exist: `pm2 list`
   - Manually restart if needed: `pm2 restart ic-proxy search-proxy`

3. **Health Checks Fail**
   - Check PM2 logs: `pm2 logs`
   - Verify ports 3001/3002 are accessible
   - Check Nginx configuration for HTTPS proxying

4. **Package Upload Fails**
   - Verify file sizes aren't too large
   - Check available disk space on droplet: `df -h`
   - Ensure /root/ directory has write permissions

### Support

For deployment issues, check:
1. GitHub Actions workflow logs
2. PM2 process logs on droplet  
3. Nginx error logs: `/var/log/nginx/error.log`
4. System logs: `journalctl -f`