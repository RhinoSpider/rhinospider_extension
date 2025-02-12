# Digital Ocean Scraper Service Setup

## Overview
This document outlines the setup and deployment process for the RhinoSpider scraping service on Digital Ocean. This service acts as an intermediate layer between the Chrome extension and websites, solving consensus issues with IC canister HTTP outcalls.

## Prerequisites
- Digital Ocean account
- Domain name (optional)
- SSH client

## Initial Setup

### 1. Create Droplet
1. Log into Digital Ocean console
2. Create new Ubuntu droplet:
   - Distribution: Ubuntu 22.04 LTS
   - Plan: Basic
   - CPU: Regular
   - Size: 1GB RAM / 1 vCPU
   - Storage: 25GB SSD
   - Region: Choose closest to majority of users

### 2. Access Droplet
```bash
# SSH into droplet
ssh root@<droplet-ip>

# Update system
apt update && apt upgrade -y
```

### 3. Install Dependencies
```bash
# Install Docker
apt install -y apt-transport-https ca-certificates curl software-properties-common
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
```

### 4. Setup Application
```bash
# Create application directory
mkdir -p /opt/rhinospider-scraper
cd /opt/rhinospider-scraper

# Copy service files
# (Files are in the repository under services/scraper/)
```

## Service Configuration

### 1. Environment Variables
```bash
# Create .env file
cat > .env << EOL
NODE_ENV=production
PORT=3000
ALLOWED_ORIGINS=chrome-extension://<extension-id>
IC_HOST=https://ic0.app
EOL
```

### 2. Docker Configuration
```yaml
# docker-compose.yml configuration
version: '3'
services:
  scraper:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    depends_on:
      - redis
    restart: unless-stopped

  redis:
    image: redis:alpine
    volumes:
      - redis_data:/data
    restart: unless-stopped

volumes:
  redis_data:
```

## Deployment

### 1. Build and Start Services
```bash
# Start services
docker compose up -d

# Check logs
docker compose logs -f

# Test service
curl http://localhost:3000/health
```

### 2. Monitor Resources
```bash
# Check container status
docker compose ps

# Monitor resource usage
docker stats

# Check logs
docker compose logs -f scraper
```

## Security

### 1. Firewall Setup
```bash
# Allow only necessary ports
ufw allow OpenSSH
ufw allow 3000/tcp
ufw enable
```

### 2. SSL Setup (Optional)
If using a domain:
```bash
# Install Certbot
apt install -y certbot python3-certbot-nginx

# Get certificate
certbot --nginx -d scraper.yourdomain.com
```

## Maintenance

### 1. Updates
```bash
# Update system
apt update && apt upgrade -y

# Update Docker images
docker compose pull
docker compose up -d

# Check logs after update
docker compose logs -f
```

### 2. Backup
```bash
# Backup Redis data
docker compose exec redis redis-cli save

# Copy backup file
cp /opt/rhinospider-scraper/redis_data/dump.rdb /backup/
```

### 3. Monitoring
- Set up monitoring for:
  - CPU usage
  - Memory usage
  - Disk space
  - Request latency
  - Error rates

## Troubleshooting

### 1. Common Issues
- Service not starting
- High memory usage
- Slow response times
- Connection errors

### 2. Debug Commands
```bash
# Check service logs
docker compose logs scraper

# Check Redis logs
docker compose logs redis

# Monitor real-time metrics
docker stats

# Check system resources
htop
```

## Scaling

### 1. Vertical Scaling
- Upgrade droplet size
- Increase RAM/CPU

### 2. Horizontal Scaling
- Add more droplets
- Set up load balancer
- Configure Redis cluster

## Contact
For issues or questions:
- GitHub Issues
- Development Team
- System Administrators
