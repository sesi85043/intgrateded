#!/bin/bash
adduser --disabled-password --gecos "" adminhub
usermod -aG sudo adminhub
mkdir -p /home/adminhub/.ssh
chmod 700 /home/adminhub/.ssh
cp /root/.ssh/authorized_keys /home/adminhub/.ssh/
chown -R adminhub:adminhub /home/adminhub/.ssh
chmod 600 /home/adminhub/.ssh/authorized_keys
echo "SUCCESS: adminhub user created with SSH access"
