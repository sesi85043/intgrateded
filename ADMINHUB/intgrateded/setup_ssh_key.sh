#!/bin/bash
echo "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIJjQufPh1aAAMX4ffAln/5jivE7ZuolZZNzHB8tW+/3k ntulodk@allelectronics.co.za" >> /root/.ssh/authorized_keys
chmod 600 /root/.ssh/authorized_keys
systemctl restart sshd
echo "SUCCESS: SSH key added and sshd restarted"
