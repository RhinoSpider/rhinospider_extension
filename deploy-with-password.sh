#!/usr/bin/expect -f

# Deploy script with password
set password "DON'T BELIEVE EVERYTHING YOU THINK, EXPANDED EDITION"
set timeout -1

# Upload search proxy
spawn scp search-proxy-deploy.tar.gz root@143.244.133.154:~/
expect {
    "password:" {
        send "$password\r"
        expect eof
    }
    "yes/no" {
        send "yes\r"
        expect "password:"
        send "$password\r"
        expect eof
    }
}

# Upload IC proxy
spawn scp ic-proxy-deploy.tar.gz root@143.244.133.154:~/
expect {
    "password:" {
        send "$password\r"
        expect eof
    }
}

# Deploy via SSH
spawn ssh root@143.244.133.154
expect {
    "password:" {
        send "$password\r"
    }
}

expect "# "

# Deploy search proxy
send "cd /var/www\r"
send "tar -xzf ~/search-proxy-deploy.tar.gz\r"
send "rm -rf search-proxy-backup\r"
send "mv search-proxy search-proxy-backup\r"
send "mv search-proxy-deploy search-proxy\r"
send "cd search-proxy\r"
send "npm install\r"
expect "# "
send "pm2 restart search-proxy\r"
expect "# "

# Deploy IC proxy
send "cd /var/www\r"
send "tar -xzf ~/ic-proxy-deploy.tar.gz\r"
send "rm -rf ic-proxy-backup\r"
send "mv ic-proxy ic-proxy-backup\r"
send "mv ic-proxy-deploy ic-proxy\r"
send "cd ic-proxy\r"
send "npm install --legacy-peer-deps\r"
expect "# "
send "pm2 restart ic-proxy\r"
expect "# "
send "pm2 save\r"
expect "# "
send "pm2 status\r"
expect "# "
send "exit\r"

puts "\n✅ Deployment complete!"