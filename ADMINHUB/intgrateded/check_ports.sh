#!/bin/bash
echo "Checking which ports are in use..."
docker ps -a --format "table {{.Names}}\t{{.Ports}}"
echo ""
echo "All containers and their port mappings shown above"
