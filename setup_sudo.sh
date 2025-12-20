#!/bin/bash
echo "adminhub ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers.d/adminhub
chmod 440 /etc/sudoers.d/adminhub
echo "SUCCESS: Passwordless sudo configured for adminhub"
