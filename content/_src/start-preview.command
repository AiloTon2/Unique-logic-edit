#!/bin/bash
# One-click local preview on port 8080.
# Double-click this file (or run it) to serve the site.
# It always uses its own folder as the web root, so it keeps working
# even if you move or rename the project folder.

PORT=8080
LANDING="seo-geo-free-trial.html"

# Move into the folder this script lives in (the web root).
cd "$(dirname "$0")" || { echo "Cannot enter script folder"; exit 1; }

echo "Web root: $(pwd)"

# Free the port if an old server is still holding it.
OLD_PIDS="$(lsof -ti tcp:$PORT 2>/dev/null)"
if [ -n "$OLD_PIDS" ]; then
  echo "Freeing port $PORT (killing: $OLD_PIDS)"
  echo "$OLD_PIDS" | xargs kill -9 2>/dev/null
  sleep 1
fi

# Open the landing page in the default browser once the server is up.
( sleep 1; open "http://localhost:$PORT/$LANDING" ) &

echo "Serving at http://localhost:$PORT/"
echo "Landing page: http://localhost:$PORT/$LANDING"
echo "Press Control + C to stop."
python3 -m http.server "$PORT"
