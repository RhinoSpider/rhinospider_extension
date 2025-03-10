#!/bin/bash

# Define server details
SERVER_IP="143.244.133.154"
SERVER_USER="root"

# Display information
echo "Monitoring RhinoSpider search proxy service logs..."

# Execute remote commands to monitor the service
ssh $SERVER_USER@$SERVER_IP "
    # Show service status
    echo \"Service status:\"
    systemctl status rhinospider-search-proxy | head -n 10
    
    # Show recent logs
    echo \"Recent logs:\"
    journalctl -u rhinospider-search-proxy -n 50 --no-pager
    
    # Follow logs in real-time
    echo \"Following logs in real-time (press Ctrl+C to exit):\"
    journalctl -u rhinospider-search-proxy -f
"
