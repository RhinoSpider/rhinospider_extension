#!/bin/bash

# Create a temporary sshpass script
cat > temp_sshpass.sh << 'EOF'
#!/bin/bash
# A simple sshpass replacement
SSHPASS="ffGpA2saNS47qr"
SSH_COMMAND="$@"
expect << EOD
spawn $SSH_COMMAND
expect "password:"
send "$SSHPASS\r"
expect eof
EOD
EOF

chmod +x temp_sshpass.sh

# Upload our scripts
echo "Uploading scripts to Digital Ocean server..."
./temp_sshpass.sh scp -o StrictHostKeyChecking=no /Users/ayanuali/development/rhinospider/server-fix.sh root@143.244.133.154:/root/
./temp_sshpass.sh scp -o StrictHostKeyChecking=no /Users/ayanuali/development/rhinospider/verify-services.sh root@143.244.133.154:/root/
./temp_sshpass.sh scp -o StrictHostKeyChecking=no /Users/ayanuali/development/rhinospider/test-connections.sh root@143.244.133.154:/root/

# Execute the scripts
echo "Executing server-fix.sh on Digital Ocean server..."
./temp_sshpass.sh ssh -o StrictHostKeyChecking=no root@143.244.133.154 "chmod +x /root/server-fix.sh /root/verify-services.sh /root/test-connections.sh && /root/server-fix.sh"

# Clean up
rm temp_sshpass.sh

echo "Remote execution completed!"
