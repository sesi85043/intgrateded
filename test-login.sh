#!/bin/bash
curl -X POST http://158.220.107.106:9100/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@company.com","password":"admin123"}' \
  2>/dev/null
