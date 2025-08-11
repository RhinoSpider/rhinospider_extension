#!/bin/bash

echo "Deploying IC Proxy fix to production server..."

# Server details
SERVER_IP="165.232.124.161"
SERVER_USER="root"
PASSWORD="ffGpA2saNS47qr"
IC_PROXY_PATH="/root/rhinospider/services/ic-proxy"

# Create the fixed server.js content
cat > /tmp/ic-proxy-fix.js << 'EOF'
// Fix for timestamp types - change BigInt to Number for storage canister compatibility
// Find and replace in server.js:
// OLD: timestamp: BigInt(timestamp || Math.floor(Date.now() / 1000))
// NEW: timestamp: Number(timestamp || Math.floor(Date.now() / 1000))
// OLD: scraping_time: BigInt(scraping_time || 500)
// NEW: scraping_time: Number(scraping_time || 500)
EOF

# Try using expect for automated SSH login
if command -v expect &> /dev/null; then
    expect << EOF
    spawn ssh $SERVER_USER@$SERVER_IP
    expect "password:"
    send "$PASSWORD\r"
    expect "# "
    send "cd $IC_PROXY_PATH\r"
    expect "# "
    send "cp server.js server.js.backup-$(date +%Y%m%d-%H%M%S)\r"
    expect "# "
    send "sed -i 's/timestamp: BigInt(/timestamp: Number(/g' server.js\r"
    expect "# "
    send "sed -i 's/scraping_time: BigInt(/scraping_time: Number(/g' server.js\r"
    expect "# "
    send "pm2 restart ic-proxy\r"
    expect "# "
    send "exit\r"
    expect eof
EOF
    echo "Deployment via SSH completed"
else
    echo "Expect not installed. Trying sshpass..."
    
    # Try sshpass as alternative
    if command -v sshpass &> /dev/null; then
        # Create a script to run on the server
        cat > /tmp/fix-ic-proxy.sh << 'SCRIPT'
cd /root/rhinospider/services/ic-proxy
cp server.js server.js.backup-$(date +%Y%m%d-%H%M%S)
sed -i 's/timestamp: BigInt(/timestamp: Number(/g' server.js
sed -i 's/scraping_time: BigInt(/scraping_time: Number(/g' server.js
pm2 restart ic-proxy
pm2 status ic-proxy
SCRIPT
        
        sshpass -p "$PASSWORD" ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP 'bash -s' < /tmp/fix-ic-proxy.sh
        
        if [ $? -eq 0 ]; then
            echo "Deployment via sshpass completed successfully"
        else
            echo "SSH connection failed. Port might be blocked."
            echo ""
            echo "MANUAL DEPLOYMENT REQUIRED:"
            echo "=========================="
            echo "1. Access your Digital Ocean droplet via the web console"
            echo "2. Run these commands:"
            echo ""
            echo "cd /root/rhinospider/services/ic-proxy"
            echo "cp server.js server.js.backup-\$(date +%Y%m%d-%H%M%S)"
            echo "sed -i 's/timestamp: BigInt(/timestamp: Number(/g' server.js"
            echo "sed -i 's/scraping_time: BigInt(/scraping_time: Number(/g' server.js"
            echo "pm2 restart ic-proxy"
            echo "pm2 status ic-proxy"
        fi
    else
        echo "Neither expect nor sshpass are installed."
        echo ""
        echo "MANUAL DEPLOYMENT REQUIRED:"
        echo "=========================="
        echo "1. Access your Digital Ocean droplet via the web console"
        echo "2. Run these commands:"
        echo ""
        echo "cd /root/rhinospider/services/ic-proxy"
        echo "cp server.js server.js.backup-\$(date +%Y%m%d-%H%M%S)"
        echo "sed -i 's/timestamp: BigInt(/timestamp: Number(/g' server.js"
        echo "sed -i 's/scraping_time: BigInt(/scraping_time: Number(/g' server.js"
        echo "pm2 restart ic-proxy"
        echo "pm2 status ic-proxy"
    fi
fi

# Test if the fix is deployed
echo ""
echo "Testing IC proxy after deployment..."
curl -s https://ic-proxy.rhinospider.com/api/health | grep -q "ok" && echo "IC Proxy is running" || echo "IC Proxy might be down"