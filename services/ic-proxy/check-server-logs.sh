#!/bin/bash
# Script to check detailed server logs for consumer-submit endpoint
sshpass -p "ffGpA2saNS47qr" ssh -o StrictHostKeyChecking=no root@ic-proxy.rhinospider.com "grep -A 50 'consumer-submit' /root/.pm2/logs/ic-proxy-out.log | tail -n 200"
