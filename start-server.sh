#!/bin/bash
PORT=5274
DIST="/Users/kohei/develop/tools/mri-protocol-sim/dist"
LOG="/Users/kohei/develop/tools/mri-protocol-sim/logs/server.log"

if lsof -ti:$PORT >/dev/null 2>&1; then
    exit 0
fi

mkdir -p "$(dirname "$LOG")"
cd "$DIST" || exit 1
nohup python3 -m http.server $PORT --bind 127.0.0.1 >> "$LOG" 2>&1 &
disown
sleep 2
