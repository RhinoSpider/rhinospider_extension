#!/bin/bash

echo "Checking if the search proxy service is running on the server..."
ssh root@143.244.133.154 "systemctl is-active rhinospider-search-proxy"

echo "Checking service status details..."
ssh root@143.244.133.154 "systemctl status rhinospider-search-proxy"

echo "Checking recent logs..."
ssh root@143.244.133.154 "journalctl -u rhinospider-search-proxy -n 20"
