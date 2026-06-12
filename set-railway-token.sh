#!/bin/bash
# Usage: bash set-railway-token.sh YOUR_TOKEN_HERE
TOKEN="$1"
if [ -z "$TOKEN" ]; then
  echo "Usage: bash set-railway-token.sh YOUR_TOKEN"
  exit 1
fi
FILE="/Users/msdev/Desktop/paystub-portal/.claude/settings.local.json"
python3 -c "
import json, sys
path = '$FILE'
token = sys.argv[1]
d = json.load(open(path))
d.setdefault('env', {})['RAILWAY_TOKEN'] = token
open(path, 'w').write(json.dumps(d, indent=2))
print('Token saved successfully (' + str(len(token)) + ' chars)')
" "$TOKEN"
