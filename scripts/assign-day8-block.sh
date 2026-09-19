#!/usr/bin/env bash
# Print (default) or run the coach create + assign flow for the Day 8 Foundation fixture.
#
#   npm run assign:day8
#   npm run assign:day8 -- --run
#   AJAX_API_URL=https://api.example.com COACH_API_KEY=... npm run assign:day8 -- --run --email member@ajax.local
#
# Live Supabase: set COACH_API_KEY on the API (and here). Mock magic-link sessions
# are not returned when the API is in live Auth mode.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FIXTURE="${AJAX_FIXTURE:-$ROOT/fixtures/day-8-foundation-6-week.json}"
BASE_URL="${AJAX_API_URL:-http://localhost:8787}"
EMAIL="${AJAX_ASSIGN_EMAIL:-member@ajax.local}"
COACH_EMAIL="${AJAX_COACH_EMAIL:-david@ajaxgym.com}"
RUN=0

usage() {
  cat <<EOF
Usage: $(basename "$0") [--print|--run] [--base-url URL] [--email EMAIL] [--fixture PATH]

  --print       Print the curl flow (default). Does not call the API.
  --run         Execute create + assign against --base-url.
  --base-url    API origin (default: \$AJAX_API_URL or http://localhost:8787)
  --email       Roster email to assign (default: member@ajax.local)
  --fixture     JSON body for POST /coach/blocks (default: fixtures/day-8-foundation-6-week.json)

Auth: if \$COACH_API_KEY is set, requests send X-Coach-Key. Otherwise --run
signs in as \$AJAX_COACH_EMAIL via POST /auth/magic-link (mock mode only).
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --print) RUN=0; shift ;;
    --run) RUN=1; shift ;;
    --base-url)
      BASE_URL="${2:-}"
      shift 2
      ;;
    --email)
      EMAIL="${2:-}"
      shift 2
      ;;
    --fixture)
      FIXTURE="${2:-}"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

if [[ ! -f "$FIXTURE" ]]; then
  echo "Fixture not found: $FIXTURE" >&2
  exit 1
fi

BASE_URL="${BASE_URL%/}"

auth_headers_print() {
  if [[ -n "${COACH_API_KEY:-}" ]]; then
    printf "%s\n" "  -H 'X-Coach-Key: \$COACH_API_KEY' \\"
  else
    cat <<'EOS'
  -H "Authorization: Bearer $TOKEN" \
EOS
  fi
}

print_flow() {
  cat <<EOF
# Day 8 Foundation — create + assign
# Fixture: $FIXTURE
# API:     $BASE_URL
# Member:  $EMAIL

EOF

  if [[ -z "${COACH_API_KEY:-}" ]]; then
    cat <<EOF
# 1. Mock owner session (skip if COACH_API_KEY is set on the API)
TOKEN=\$(curl -sS $BASE_URL/auth/magic-link \\
  -H 'Content-Type: application/json' \\
  -d '{"email":"$COACH_EMAIL"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['session']['accessToken'])")

EOF
  else
    echo "# Auth: X-Coach-Key from \$COACH_API_KEY"
    echo
  fi

  cat <<EOF
# 2. Create the 6-week block from the fixture
PROGRAM_ID=\$(curl -sS $BASE_URL/coach/blocks \\
$(auth_headers_print)
  -H 'Content-Type: application/json' \\
  --data-binary @$FIXTURE | python3 -c "import sys,json; print(json.load(sys.stdin)['program']['id'])")

# 3. Assign to a roster member (replaces their active block)
curl -sS $BASE_URL/coach/blocks/\$PROGRAM_ID/assign \\
$(auth_headers_print)
  -H 'Content-Type: application/json' \\
  -d '{"email":"$EMAIL"}'
EOF
}

run_flow() {
  local token=""
  if [[ -z "${COACH_API_KEY:-}" ]]; then
    echo "Signing in as $COACH_EMAIL (mock magic-link)…"
    local login
    login="$(curl -sS "$BASE_URL/auth/magic-link" \
      -H "Content-Type: application/json" \
      -d "{\"email\":\"$COACH_EMAIL\"}")"
    token="$(python3 -c "import json,sys; print(json.load(sys.stdin)['session']['accessToken'])" <<<"$login")"
    TOKEN="$token"
  fi

  echo "Creating block from $FIXTURE…"
  local created
  if [[ -n "${COACH_API_KEY:-}" ]]; then
    created="$(curl -sS "$BASE_URL/coach/blocks" \
      -H "X-Coach-Key: $COACH_API_KEY" \
      -H "Content-Type: application/json" \
      --data-binary "@$FIXTURE")"
  else
    created="$(curl -sS "$BASE_URL/coach/blocks" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      --data-binary "@$FIXTURE")"
  fi

  if ! python3 -c "import json,sys; json.load(sys.stdin)['program']['id']" <<<"$created" >/dev/null 2>&1; then
    echo "Create failed:" >&2
    echo "$created" >&2
    exit 1
  fi

  local program_id title weeks
  program_id="$(python3 -c "import json,sys; print(json.load(sys.stdin)['program']['id'])" <<<"$created")"
  title="$(python3 -c "import json,sys; print(json.load(sys.stdin)['program']['title'])" <<<"$created")"
  weeks="$(python3 -c "import json,sys; print(len(json.load(sys.stdin)['workouts']))" <<<"$created")"
  echo "Created $title ($program_id) with $weeks sessions."

  echo "Assigning to $EMAIL…"
  local assigned
  if [[ -n "${COACH_API_KEY:-}" ]]; then
    assigned="$(curl -sS "$BASE_URL/coach/blocks/$program_id/assign" \
      -H "X-Coach-Key: $COACH_API_KEY" \
      -H "Content-Type: application/json" \
      -d "{\"email\":\"$EMAIL\"}")"
  else
    assigned="$(curl -sS "$BASE_URL/coach/blocks/$program_id/assign" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d "{\"email\":\"$EMAIL\"}")"
  fi
  echo "$assigned"
}

if [[ "$RUN" -eq 1 ]]; then
  run_flow
else
  print_flow
fi
