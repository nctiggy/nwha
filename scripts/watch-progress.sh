#!/bin/bash
# NWHA Progress Watcher
# Shows real-time progress of Ralph development loop
# Usage: ./scripts/watch-progress.sh

clear
echo "========================================"
echo "NWHA Progress Watcher"
echo "========================================"
echo ""
echo "Watching: prd.json, progress.txt, docker logs"
echo "Press Ctrl+C to exit"
echo ""
echo "========================================"

# Function to show PRD status
show_prd_status() {
    if [ -f "prd.json" ]; then
        TOTAL=$(jq '.userStories | length' prd.json)
        PASSED=$(jq '[.userStories[] | select(.passes == true)] | length' prd.json)
        CURRENT=$(jq -r '.userStories[] | select(.passes == false) | .id + ": " + .title' prd.json | head -1)

        echo ""
        echo "📊 PRD Status: $PASSED/$TOTAL stories complete"
        echo "🎯 Current: $CURRENT"
        echo ""
    fi
}

# Function to show recent progress
show_recent_progress() {
    if [ -f "progress.txt" ]; then
        echo "📝 Recent Progress (last 10 lines):"
        echo "----------------------------------------"
        tail -10 progress.txt
        echo "----------------------------------------"
    fi
}

# Function to show container status
show_container_status() {
    if docker ps --format '{{.Names}}' 2>/dev/null | grep -q nwha; then
        echo "🐳 Container: Running"
        HEALTH=$(curl -sf http://localhost:3000/health 2>/dev/null)
        if [ -n "$HEALTH" ]; then
            echo "💚 Health: OK"
        else
            echo "💔 Health: Failing"
        fi
    else
        echo "🐳 Container: Not running"
    fi
}

# Main loop
while true; do
    clear
    echo "========================================"
    echo "NWHA Progress Watcher - $(date '+%H:%M:%S')"
    echo "========================================"

    show_container_status
    show_prd_status
    show_recent_progress

    echo ""
    echo "Auto-refresh in 5s... (Ctrl+C to exit)"

    sleep 5
done
