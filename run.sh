#!/usr/bin/env bash
#
# Sekura Design System — task runner.
#
#   ./run.sh build          Compile, emit CSS, build the sample, build the image
#   ./run.sh start          Start the MCP server and the sample site
#   ./run.sh start-build    Build, then start  (alias: startandbuild)
#   ./run.sh stop           Stop everything
#   ./run.sh restart        Stop, then start
#   ./run.sh logs [target]  Follow logs
#   ./run.sh status         What is running, and whether it is healthy
#   ./run.sh verify         Run every build gate
#   ./run.sh clean          Remove build output, container and image
#
# Runs the MCP server in Docker when Docker is available and falls back to a
# local Node process when it is not, so the script works the same either way.

set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")"

# ------------------------------------------------------------------ #
# Configuration — override any of these from the environment.
# ------------------------------------------------------------------ #
IMAGE="${SEKURA_IMAGE:-sekura-design-mcp:1.0.0}"
CONTAINER="${SEKURA_CONTAINER:-sekura-design-mcp}"
MCP_PORT="${SEKURA_PORT:-8080}"
SAMPLE_PORT="${SAMPLE_PORT:-4173}"

RUN_DIR=".run"
SAMPLE_PID="$RUN_DIR/sample.pid"
SAMPLE_LOG="$RUN_DIR/sample.log"
LOCAL_PID="$RUN_DIR/mcp.pid"
LOCAL_LOG="$RUN_DIR/mcp.log"

# ------------------------------------------------------------------ #
# Output
# ------------------------------------------------------------------ #
if [[ -t 1 && -z "${NO_COLOR:-}" ]]; then
  BOLD=$'\033[1m'; DIM=$'\033[2m'; RED=$'\033[31m'; GREEN=$'\033[32m'
  YELLOW=$'\033[33m'; BLUE=$'\033[34m'; RESET=$'\033[0m'
else
  BOLD=""; DIM=""; RED=""; GREEN=""; YELLOW=""; BLUE=""; RESET=""
fi

step() { printf '%s\n' "${BLUE}${BOLD}==>${RESET} ${BOLD}$*${RESET}"; }
info() { printf '    %s\n' "$*"; }
ok()   { printf '    %s%s%s\n' "$GREEN" "$*" "$RESET"; }
warn() { printf '    %s%s%s\n' "$YELLOW" "$*" "$RESET"; }
die()  { printf '%s\n' "${RED}${BOLD}error:${RESET} $*" >&2; exit 1; }

# ------------------------------------------------------------------ #
# Environment probing
# ------------------------------------------------------------------ #
have_docker() { command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; }

need_node() {
  command -v node >/dev/null 2>&1 || die "node is not installed."
  local major
  major="$(node -p 'process.versions.node.split(".")[0]')"
  (( major >= 20 )) || die "Node 20 or newer is required (found $(node -v))."
}

need_deps() {
  if [[ ! -d node_modules ]]; then
    step "Installing dependencies"
    npm install
  fi
}

# True when the named container exists in any state.
container_exists() {
  [[ -n "$(docker ps -aq -f "name=^${CONTAINER}$" 2>/dev/null)" ]]
}
container_running() {
  [[ -n "$(docker ps -q -f "name=^${CONTAINER}$" 2>/dev/null)" ]]
}
image_exists() {
  [[ -n "$(docker images -q "$IMAGE" 2>/dev/null)" ]]
}

# True when a pid file points at a live process.
pid_alive() {
  local file="$1"
  [[ -f "$file" ]] || return 1
  local pid
  pid="$(cat "$file" 2>/dev/null || true)"
  [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null
}

stop_pidfile() {
  local file="$1" label="$2"
  if pid_alive "$file"; then
    local pid; pid="$(cat "$file")"
    kill "$pid" 2>/dev/null || true
    # Give it a moment to shut down cleanly before insisting.
    for _ in $(seq 1 20); do
      kill -0 "$pid" 2>/dev/null || break
      sleep 0.1
    done
    kill -9 "$pid" 2>/dev/null || true
    ok "Stopped $label (pid $pid)"
  else
    info "$label was not running"
  fi
  rm -f "$file"
}

wait_for_http() {
  local url="$1" label="$2" tries="${3:-40}"
  for _ in $(seq 1 "$tries"); do
    if curl -fsS -o /dev/null "$url" 2>/dev/null; then return 0; fi
    sleep 0.25
  done
  return 1
}

port_in_use() {
  local port="$1"
  curl -fsS -o /dev/null --max-time 1 "http://127.0.0.1:${port}/" 2>/dev/null
}

# Launch a fully detached background process and record its pid.
#
# All three streams are redirected and the process is put in its own session.
# Without that it inherits the caller's stdout, which keeps the pipe open —
# so a CI job or tool invoking `run.sh start` hangs or gets a stray exit code
# even though the server came up fine.
spawn_detached() {
  local pidfile="$1" logfile="$2"; shift 2
  if command -v setsid >/dev/null 2>&1; then
    setsid "$@" >"$logfile" 2>&1 </dev/null &
  else
    nohup "$@" >"$logfile" 2>&1 </dev/null &
  fi
  echo $! >"$pidfile"
  disown 2>/dev/null || true
}

# ------------------------------------------------------------------ #
# Commands
# ------------------------------------------------------------------ #

cmd_build() {
  need_node
  need_deps
  mkdir -p "$RUN_DIR"

  step "Compiling TypeScript"
  npm run --silent build
  ok "dist/ written"

  step "Running build gates"
  # Gates, not reports: a palette that breaks a declared WCAG pairing, or a
  # stylesheet with a structural error, must not produce an artefact. Both
  # scripts exit non-zero on failure, and `set -e` stops the build.
  node dist/scripts/audit-contrast.js \
    | grep -E '^(PASS|FAIL)|^All |pairings failed' | sed 's/^/    /'
  node dist/scripts/lint-css.js \
    | grep -E '^All |issue\(s\)|^  \[' | sed 's/^/    /'

  step "Building the behaviour package"
  # Framework-agnostic keyboard and ARIA implementations. Zero dependencies.
  npx tsc -p tsconfig.behaviours.json
  node dist/scripts/build-behaviours.js | grep -E 'iife.min|Zero dep' | sed 's/^ */    /'

  step "Testing behaviour contracts"
  # Real key presses against a real DOM. This is what stops the specification
  # and the implementation drifting apart.
  node dist/scripts/test-behaviours.js | grep -E 'passed|✗' | sed 's/^/    /'

  step "Emitting stylesheets"
  npm run --silent emit:css | grep -E 'sekura\.css|Wrote' | sed 's/^ */    /'

  step "Building the documentation site"
  # Generated from the design system's own data, so the docs cannot drift from
  # the system they document. Consumes the stylesheet just emitted, not a stale
  # copy.
  node dist/scripts/build-site.js | grep -E '^Built ' | sed 's/^/    /'
  node dist/scripts/verify-sample.js | grep -E '^All |error\(s\)|^  ✗' | sed 's/^/    /'

  if have_docker; then
    step "Building the Docker image"
    info "The image build re-runs every gate plus the full smoke test."
    # docker writes its progress to stderr, so capture both streams and only
    # surface them if the build actually fails.
    if docker build -t "$IMAGE" . >"$RUN_DIR/docker-build.log" 2>&1; then
      ok "Built $IMAGE ($(docker images "$IMAGE" --format '{{.Size}}'))"
    else
      printf '\n%s\n' "${RED}Docker build failed:${RESET}"
      tail -n 40 "$RUN_DIR/docker-build.log" | sed 's/^/    /'
      die "See $RUN_DIR/docker-build.log for the full output."
    fi
  else
    warn "Docker is unavailable — skipped the image build."
    warn "'start' will fall back to running the server with Node."
  fi

  printf '\n%sBuild complete.%s Run %s./run.sh start%s\n' "$GREEN$BOLD" "$RESET" "$BOLD" "$RESET"
}

start_mcp_docker() {
  if container_running; then
    info "MCP server already running"
    return 0
  fi
  # A stopped container with the old config would silently ignore new settings.
  container_exists && docker rm -f "$CONTAINER" >/dev/null 2>&1 || true

  image_exists || die "Image $IMAGE not found. Run: ./run.sh build"

  docker run -d \
    --name "$CONTAINER" \
    --restart unless-stopped \
    -p "${MCP_PORT}:8080" \
    "$IMAGE" >/dev/null

  if wait_for_http "http://127.0.0.1:${MCP_PORT}/health" "MCP server"; then
    ok "MCP server  http://localhost:${MCP_PORT}/mcp   (Docker)"
  else
    printf '\n%s\n' "${RED}MCP server did not become healthy. Recent logs:${RESET}"
    docker logs --tail 30 "$CONTAINER" 2>&1 | sed 's/^/    /'
    die "Startup failed."
  fi
}

start_mcp_local() {
  if pid_alive "$LOCAL_PID"; then
    info "MCP server already running"
    return 0
  fi
  need_node
  [[ -f dist/index.js ]] || die "dist/ is missing. Run: ./run.sh build"

  mkdir -p "$RUN_DIR"
  SEKURA_MCP_TRANSPORT=http PORT="$MCP_PORT" \
    spawn_detached "$LOCAL_PID" "$LOCAL_LOG" node dist/index.js

  if wait_for_http "http://127.0.0.1:${MCP_PORT}/health" "MCP server"; then
    ok "MCP server  http://localhost:${MCP_PORT}/mcp   (Node, pid $(cat "$LOCAL_PID"))"
  else
    printf '\n%s\n' "${RED}MCP server did not become healthy. Recent logs:${RESET}"
    tail -n 30 "$LOCAL_LOG" 2>/dev/null | sed 's/^/    /'
    stop_pidfile "$LOCAL_PID" "MCP server"
    die "Startup failed."
  fi
}

start_sample() {
  if pid_alive "$SAMPLE_PID"; then
    info "Sample site already running"
    return 0
  fi
  if [[ ! -f sample/index.html ]]; then
    warn "Sample not built — skipping. Run: ./run.sh build"
    return 0
  fi
  if port_in_use "$SAMPLE_PORT"; then
    warn "Port ${SAMPLE_PORT} is already in use — skipping the sample site."
    return 0
  fi

  need_node
  mkdir -p "$RUN_DIR"
  SAMPLE_PORT="$SAMPLE_PORT" \
    spawn_detached "$SAMPLE_PID" "$SAMPLE_LOG" node dist/scripts/serve-sample.js

  if wait_for_http "http://127.0.0.1:${SAMPLE_PORT}/" "Sample site"; then
    ok "Sample site http://localhost:${SAMPLE_PORT}/       (pid $(cat "$SAMPLE_PID"))"
  else
    tail -n 20 "$SAMPLE_LOG" 2>/dev/null | sed 's/^/    /'
    stop_pidfile "$SAMPLE_PID" "Sample site"
    warn "Sample site failed to start."
  fi
}

cmd_start() {
  mkdir -p "$RUN_DIR"
  step "Starting"

  if have_docker; then
    start_mcp_docker
  else
    warn "Docker unavailable — starting the MCP server with Node instead."
    start_mcp_local
  fi

  start_sample

  cat <<EOF

${BOLD}Ready.${RESET}

  MCP endpoint   ${BOLD}http://localhost:${MCP_PORT}/mcp${RESET}
  Health         http://localhost:${MCP_PORT}/health
  Tokens (CSS)   http://localhost:${MCP_PORT}/tokens.css
  Sample site    ${BOLD}http://localhost:${SAMPLE_PORT}/${RESET}

  Connect a client:
    ${DIM}claude mcp add --transport http sekura-design http://localhost:${MCP_PORT}/mcp${RESET}

  ${DIM}./run.sh logs${RESET}    follow logs
  ${DIM}./run.sh status${RESET}  check health
  ${DIM}./run.sh stop${RESET}    stop everything
EOF
}

cmd_stop() {
  step "Stopping"

  if have_docker && container_exists; then
    docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
    ok "Stopped and removed container $CONTAINER"
  else
    stop_pidfile "$LOCAL_PID" "MCP server"
  fi

  stop_pidfile "$SAMPLE_PID" "Sample site"
  ok "All stopped"
}

cmd_restart() {
  cmd_stop
  printf '\n'
  cmd_start
}

cmd_logs() {
  local target="${1:-all}"
  local follow="-f"
  [[ "${2:-}" == "--no-follow" || "${1:-}" == "--no-follow" ]] && follow=""
  [[ "${1:-}" == "--no-follow" ]] && target="all"

  case "$target" in
    sample)
      [[ -f "$SAMPLE_LOG" ]] || die "No sample log yet. Start it first."
      exec tail ${follow} -n 100 "$SAMPLE_LOG"
      ;;
    server|mcp|all)
      local hint=""
      [[ -n "$follow" ]] && hint=" (Ctrl+C to stop)"
      if have_docker && container_exists; then
        step "Container logs${hint}"
        exec docker logs ${follow} --tail 100 "$CONTAINER"
      elif [[ -f "$LOCAL_LOG" ]]; then
        step "MCP server logs${hint}"
        exec tail ${follow} -n 100 "$LOCAL_LOG"
      else
        die "Nothing is running. Start it with: ./run.sh start"
      fi
      ;;
    *)
      die "Unknown log target '$target'. Use: server | sample"
      ;;
  esac
}

cmd_status() {
  step "Status"

  # --- MCP server ---
  local running="no" where="-"
  if have_docker && container_running; then
    running="yes"; where="Docker ($CONTAINER)"
  elif pid_alive "$LOCAL_PID"; then
    running="yes"; where="Node (pid $(cat "$LOCAL_PID"))"
  fi

  if [[ "$running" == "yes" ]]; then
    ok "MCP server   running — $where"
    local health
    health="$(curl -fsS --max-time 3 "http://127.0.0.1:${MCP_PORT}/health" 2>/dev/null || true)"
    if [[ -n "$health" ]]; then
      # /health re-runs the contrast audit, so this is a real check rather than
      # just "the process is up".
      if command -v node >/dev/null 2>&1; then
        node -e '
          let d; try { d = JSON.parse(process.argv[1]); } catch { process.exit(0); }
          const c = d.contentCounts || {};
          console.log("    status        " + d.status);
          console.log("    content       " + c.components + " components, " + c.foundations +
                      " foundations, " + c.patterns + " patterns, " + c.layouts + " layouts");
          console.log("    tokens        " + c.semanticTokens + " across " + c.themes + " themes");
          console.log("    contrast      " + (d.contrastAudit.passing
                        ? "all declared pairings satisfied"
                        : d.contrastAudit.failures + " FAILING"));
        ' "$health"
      fi
    else
      warn "  health endpoint did not respond"
    fi
  else
    info "MCP server   not running"
  fi

  # --- Sample ---
  if pid_alive "$SAMPLE_PID"; then
    ok "Sample site  running — http://localhost:${SAMPLE_PORT}/ (pid $(cat "$SAMPLE_PID"))"
  else
    info "Sample site  not running"
  fi

  # --- Artefacts ---
  printf '\n'
  [[ -d dist ]]          && ok "dist/         built"          || info "dist/         missing"
  [[ -d dist-css ]]      && ok "dist-css/     built"          || info "dist-css/     missing"
  [[ -d dist-js ]]       && ok "dist-js/      built"          || info "dist-js/      missing"
  [[ -f sample/index.html ]] && ok "sample/       built"      || info "sample/       missing"
  if have_docker; then
    if image_exists; then
      ok "image         $IMAGE ($(docker images "$IMAGE" --format '{{.Size}}'))"
    else
      info "image         not built"
    fi
  fi
}

cmd_verify() {
  need_node
  need_deps
  step "Running every gate"
  npm run --silent verify
}

cmd_clean() {
  local assume_yes="no" deep="no"
  for arg in "$@"; do
    case "$arg" in
      -y|--yes) assume_yes="yes" ;;
      --all|--deep) deep="yes" ;;
      *) die "Unknown option for clean: $arg" ;;
    esac
  done

  printf '%s\n' "${BOLD}This will remove:${RESET}"
  info "running container and the $IMAGE image"
  info "dist/  dist-css/  dist-js/  .run/"
  info "generated documentation pages (sample/*.html and sample/assets/sekura.css)"
  [[ "$deep" == "yes" ]] && warn "node_modules/ and package-lock.json  (--all)"
  printf '\n'
  info "Source is untouched: src/, sample/pages/, sample/assets/{app,docs,icons}"
  printf '\n'

  if [[ "$assume_yes" != "yes" ]]; then
    read -r -p "Continue? [y/N] " reply
    [[ "$reply" =~ ^[Yy]$ ]] || { info "Cancelled."; exit 0; }
  fi

  step "Cleaning"

  if have_docker; then
    container_exists && docker rm -f "$CONTAINER" >/dev/null 2>&1 && ok "Removed container" || true
    image_exists && docker rmi -f "$IMAGE" >/dev/null 2>&1 && ok "Removed image" || true
  fi

  stop_pidfile "$SAMPLE_PID" "Sample site" >/dev/null 2>&1 || true
  stop_pidfile "$LOCAL_PID" "MCP server" >/dev/null 2>&1 || true

  rm -rf dist dist-css dist-js "$RUN_DIR"
  ok "Removed dist/ dist-css/ dist-js/ .run/"

  # Only the generated pages — the fragments they are built from stay.
  rm -f sample/*.html sample/assets/sekura.css
  ok "Removed generated documentation output"

  if [[ "$deep" == "yes" ]]; then
    rm -rf node_modules package-lock.json
    ok "Removed node_modules/ and package-lock.json"
  fi

  printf '\n%sClean.%s Rebuild with %s./run.sh build%s\n' "$GREEN$BOLD" "$RESET" "$BOLD" "$RESET"
}

cmd_help() {
  cat <<EOF
${BOLD}Sekura Design System${RESET} — task runner

${BOLD}USAGE${RESET}
  ./run.sh <command> [options]

${BOLD}COMMANDS${RESET}
  ${BOLD}build${RESET}              Compile, run gates, emit CSS, build the sample and the image
  ${BOLD}start${RESET}              Start the MCP server and the sample site
  ${BOLD}start-build${RESET}        Build, then start          ${DIM}(alias: startandbuild, bs)${RESET}
  ${BOLD}restart${RESET}            Stop, then start
  ${BOLD}stop${RESET}               Stop the server and the sample site
  ${BOLD}logs${RESET} [target]      Follow logs                ${DIM}target: server | sample${RESET}
  ${BOLD}status${RESET}             What is running, plus a live contrast-audit check
  ${BOLD}verify${RESET}             Run every gate without starting anything
  ${BOLD}clean${RESET} [-y] [--all] Remove build output, container and image
  ${BOLD}help${RESET}               This message

${BOLD}OPTIONS${RESET}
  clean -y, --yes      Skip the confirmation prompt
  clean --all          Also remove node_modules/ and package-lock.json
  logs --no-follow     Print recent logs and exit

${BOLD}ENVIRONMENT${RESET}
  SEKURA_PORT          MCP server port          ${DIM}(default 8080)${RESET}
  SAMPLE_PORT          Sample site port         ${DIM}(default 4173)${RESET}
  SEKURA_IMAGE         Docker image tag         ${DIM}(default sekura-design-mcp:1.0.0)${RESET}
  SEKURA_CONTAINER     Container name           ${DIM}(default sekura-design-mcp)${RESET}
  NO_COLOR             Disable coloured output

${BOLD}EXAMPLES${RESET}
  ./run.sh start-build           ${DIM}# first run: build everything and start${RESET}
  ./run.sh logs sample           ${DIM}# follow the sample site log${RESET}
  SEKURA_PORT=9000 ./run.sh start
  ./run.sh clean --all -y

The MCP server runs in Docker when Docker is available, and falls back to a
local Node process when it is not.
EOF
}

# ------------------------------------------------------------------ #
# Dispatch
# ------------------------------------------------------------------ #
main() {
  local cmd="${1:-help}"
  shift || true

  case "$cmd" in
    build)                          cmd_build "$@" ;;
    start)                          cmd_start "$@" ;;
    start-build|startandbuild|start_and_build|buildstart|bs)
                                    cmd_build "$@"; printf '\n'; cmd_start ;;
    restart)                        cmd_restart "$@" ;;
    stop)                           cmd_stop "$@" ;;
    logs|log)                       cmd_logs "$@" ;;
    status|ps)                      cmd_status "$@" ;;
    verify|check|test)              cmd_verify "$@" ;;
    clean)                          cmd_clean "$@" ;;
    help|-h|--help)                 cmd_help ;;
    *)
      printf '%s\n\n' "${RED}Unknown command: $cmd${RESET}" >&2
      cmd_help >&2
      exit 1
      ;;
  esac
}

main "$@"
