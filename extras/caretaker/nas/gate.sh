#!/bin/sh
# caretaker gate: the only thing the MacBook's key may run on the NAS.
#
# It is installed as a forced command in authorized_keys (see ../README.md), so whatever the
# Mac asks for arrives in SSH_ORIGINAL_COMMAND and is answered from the short list of verbs
# below. There is no verb that removes a container, a volume, an image in use or a file, and
# none that runs a command of the caller's choosing.
#
# Settings, all optional, in gate.conf next to this file:
#   DOCKER="sudo -n docker"       how to call docker (found automatically when unset)
#   COMPOSE="docker-compose"      how to call compose (found automatically when unset)
#   PORTAINER_DATA=/volume1/...   the NAS folder Portainer mounts as /data, for its stacks
#   DISKS="/volume1 /volume2"     the volumes whose fullness "host" reports

set -f                                   # no filename expansion, anywhere
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:$PATH
HERE=$(cd "$(dirname "$0")" && pwd)
STATE=$HERE/state
TAB=$(printf '\t')

die() { echo "gate: $*" >&2; exit 2; }

[ -f "$HERE/gate.conf" ] && . "$HERE/gate.conf"

cmd=${SSH_ORIGINAL_COMMAND:-$*}
case $cmd in
  *[!A-Za-z0-9_./:@=\ -]*) die "only letters, digits and _ . / : @ = - are accepted" ;;
esac
# shellcheck disable=SC2086
set -- $cmd
verb=${1:-help}
[ $# -gt 0 ] && shift

# ---------- helpers ----------

name_ok() {                              # a container or stack name, never an option
  case $1 in
    ''|-*|.*|*[!A-Za-z0-9_.-]*) die "not a valid name: '$1'" ;;
  esac
}

find_docker() {
  [ -n "$DOCKER" ] && return
  if docker info >/dev/null 2>&1; then DOCKER=docker
  elif sudo -n docker info >/dev/null 2>&1; then DOCKER="sudo -n docker"
  else die "cannot talk to docker as $(id -un): add this user to the docker group, or allow it 'sudo -n docker', or set DOCKER in gate.conf"
  fi
}

find_compose() {
  [ -n "$COMPOSE" ] && return
  if $DOCKER compose version >/dev/null 2>&1; then COMPOSE="$DOCKER compose"
  elif command -v docker-compose >/dev/null 2>&1; then
    case $DOCKER in sudo*) COMPOSE="sudo -n docker-compose" ;; *) COMPOSE=docker-compose ;; esac
  else die "no docker compose on this NAS"
  fi
}

label() {                                # label <container> <label name>
  $DOCKER inspect -f "{{with index .Config.Labels \"$2\"}}{{.}}{{end}}" "$1" 2>/dev/null
}

image_version() {                        # the version an image says it is, or nothing
  $DOCKER image inspect -f '{{with .Config.Labels}}{{with index . "org.opencontainers.image.version"}}{{.}}{{end}}{{end}}' "$1" 2>/dev/null
}

major_of() { echo "$1" | sed 's/^[^0-9]*//; s/[^0-9].*$//'; }

containers_of() {                        # names of a stack's containers
  $DOCKER ps -a --filter "label=com.docker.compose.project=$1" --format '{{.Names}}'
}

# What a new image would mean for a container. Prints: status jump current-version new-version
#   status: same | new | held | pinned | nopull
#   jump:   minor | major | unknown | -
assess() {
  c=$1
  ref=$($DOCKER inspect -f '{{.Config.Image}}' "$c")
  cur=$($DOCKER inspect -f '{{.Image}}' "$c")
  case $ref in
    sha256:*|*@sha256:*) echo "pinned - - -"; return ;;
  esac
  new=$($DOCKER image inspect -f '{{.Id}}' "$ref" 2>/dev/null)
  [ -z "$new" ] && { echo "nopull - - -"; return; }
  cv=$(image_version "$cur"); nv=$(image_version "$new")
  if [ "$new" = "$cur" ]; then echo "same - ${cv:--} ${nv:--}"; return; fi
  if [ -f "$STATE/hold.$c" ] && [ "$(cat "$STATE/hold.$c")" = "$new" ]; then
    echo "held - ${cv:--} ${nv:--}"; return
  fi
  cm=$(major_of "$cv"); nm=$(major_of "$nv")
  if [ -n "$cm" ] && [ -n "$nm" ]; then
    if [ "$cm" = "$nm" ]; then jump=minor; else jump=major; fi
  else
    # No version on the image. A tag that starts with a number (ghost:6, postgres:16-alpine)
    # cannot leave its major version; "latest" and the like can.
    tag=${ref##*/}
    case $tag in *:*) tag=${tag##*:} ;; *) tag=latest ;; esac
    case $tag in [0-9]*|v[0-9]*) jump=minor ;; *) jump=unknown ;; esac
  fi
  echo "new $jump ${cv:--} ${nv:--}"
}

# Sets COMPOSE_ARGS for a stack from what its containers remember about how they were started.
compose_args() {
  stack=$1
  first=$(containers_of "$stack" | head -n 1)
  [ -z "$first" ] && die "no stack named '$stack' (see: stacks)"
  files=$(label "$first" com.docker.compose.project.config_files)
  wd=$(label "$first" com.docker.compose.project.working_dir)
  envf=$(label "$first" com.docker.compose.project.environment_file)
  [ -z "$files" ] && die "stack '$stack' does not say where its compose file is"
  COMPOSE_ARGS="-p $stack"
  [ -n "$wd" ] && COMPOSE_ARGS="$COMPOSE_ARGS --project-directory $wd"
  oldifs=$IFS; IFS=,
  for f in $files; do
    IFS=$oldifs
    f=$(on_nas "$f") || die "the compose file of '$stack' is not on the NAS at $f. If Portainer made this stack, set PORTAINER_DATA in gate.conf to the folder Portainer mounts as /data"
    case $f in *' '*) die "compose path has a space in it: $f" ;; esac
    COMPOSE_ARGS="$COMPOSE_ARGS -f $f"
  done
  IFS=$oldifs
  if [ -n "$envf" ]; then
    oldifs=$IFS; IFS=,
    for f in $envf; do
      IFS=$oldifs
      f=$(on_nas "$f") && COMPOSE_ARGS="$COMPOSE_ARGS --env-file $f"
    done
    IFS=$oldifs
  else
    # Portainer keeps a stack's variables in stack.env beside its compose file
    d=$(on_nas "${files%%,*}") && d=$(dirname "$d") && [ -f "$d/stack.env" ] && COMPOSE_ARGS="$COMPOSE_ARGS --env-file $d/stack.env"
  fi
}

on_nas() {                               # where a path a container remembers is on the NAS
  if [ -f "$1" ]; then echo "$1"; return 0; fi
  case $1 in
    /data/*) [ -n "$PORTAINER_DATA" ] && [ -f "$PORTAINER_DATA/${1#/data/}" ] && { echo "$PORTAINER_DATA/${1#/data/}"; return 0; } ;;
  esac
  echo "$1"; return 1
}

# ---------- verbs ----------

case $verb in

  help)
    cat <<'EOF'
ping                       is the NAS there
host                       uptime, memory, how full the disks are
ps                         every container: name stack image state health restart-policy exit-code restarts started
show <container>           one container's state, last health checks, mounts and ports (no environment)
logs <container> [lines]   its last lines of output (120, at most 400)
start <container>          start a stopped container
restart <container>        restart a container
stacks                     compose stacks and whether their compose file can be found
updates                    pull every image in use, then say which containers have a new one waiting
apply <stack> [major-ok] [unknown-ok]   recreate a stack's containers on their new images
rollback <stack> [container ...]   put a stack, or only the named containers, back on the
                           images they had before the last apply
prune                      remove images nothing refers to any more
EOF
    ;;

  ping)
    echo "ok $(hostname)"
    ;;

  host)
    echo "host $(hostname)"
    echo "uptime $(uptime)"
    grep -E '^(MemTotal|MemAvailable|SwapFree):' /proc/meminfo 2>/dev/null
    find_docker
    root=$($DOCKER info -f '{{.DockerRootDir}}' 2>/dev/null)
    # one line per volume: "disk <percent used> <mount point>"
    # shellcheck disable=SC2086
    df -P $DISKS $root 2>/dev/null | awk 'NR > 1 && !seen[$6]++ { sub("%", "", $5); print "disk", $5, $6 }'
    ;;

  ps)
    find_docker
    ids=$($DOCKER ps -aq)
    [ -z "$ids" ] && exit 0
    # shellcheck disable=SC2086
    $DOCKER inspect -f "{{.Name}}$TAB{{with index .Config.Labels \"com.docker.compose.project\"}}{{.}}{{else}}-{{end}}$TAB{{.Config.Image}}$TAB{{.State.Status}}$TAB{{if .State.Health}}{{.State.Health.Status}}{{else}}-{{end}}$TAB{{with .HostConfig.RestartPolicy.Name}}{{.}}{{else}}no{{end}}$TAB{{.State.ExitCode}}$TAB{{.RestartCount}}$TAB{{.State.StartedAt}}" $ids | sed 's|^/||' | sort
    ;;

  show)
    name_ok "$1"; find_docker
    $DOCKER inspect -f 'name        {{.Name}}
image       {{.Config.Image}}
image id    {{.Image}}
state       {{.State.Status}}{{if .State.Health}} ({{.State.Health.Status}}){{end}}
exit code   {{.State.ExitCode}}{{if .State.OOMKilled}}  killed for using too much memory{{end}}
error       {{.State.Error}}
started     {{.State.StartedAt}}
finished    {{.State.FinishedAt}}
restarts    {{.RestartCount}} (policy: {{.HostConfig.RestartPolicy.Name}})
stack       {{index .Config.Labels "com.docker.compose.project"}} / {{index .Config.Labels "com.docker.compose.service"}}
mounts     {{range .Mounts}} {{.Source}}:{{.Destination}}{{end}}
ports      {{range $p, $b := .HostConfig.PortBindings}} {{$p}}->{{range $b}}{{.HostPort}}{{end}}{{end}}
networks   {{range $n, $v := .NetworkSettings.Networks}} {{$n}}{{end}}{{if .State.Health}}
health checks:{{range .State.Health.Log}}
  {{.End}} exit {{.ExitCode}}: {{.Output}}{{end}}{{end}}' "$1" || die "no container named '$1'"
    ;;

  logs)
    name_ok "$1"; find_docker
    n=${2:-120}
    case $n in ''|*[!0-9]*) die "lines must be a number" ;; esac
    [ "$n" -gt 400 ] && n=400
    $DOCKER logs --tail "$n" "$1" 2>&1
    ;;

  start|restart)
    name_ok "$1"; find_docker
    $DOCKER "$verb" "$1" >/dev/null || die "could not $verb '$1'"
    sleep 3
    echo "$1 is now $($DOCKER inspect -f '{{.State.Status}}' "$1")"
    ;;

  stacks)
    find_docker
    $DOCKER ps -a --format '{{.Label "com.docker.compose.project"}}' | sort -u | while read -r s; do
      [ -z "$s" ] && continue
      first=$(containers_of "$s" | head -n 1)
      f=$(label "$first" com.docker.compose.project.config_files)
      if on_nas "${f%%,*}" >/dev/null; then found=found; else found=MISSING; fi
      echo "$s$TAB$(containers_of "$s" | wc -l | tr -d ' ') containers$TAB$found$TAB$f"
    done
    ;;

  updates)
    find_docker
    pulled=" "
    for c in $($DOCKER ps -a --format '{{.Names}}'); do
      ref=$($DOCKER inspect -f '{{.Config.Image}}' "$c")
      case $ref in sha256:*|*@sha256:*) ;; *)
        # Hold on to the image the container runs now, so a pull that moves the tag cannot
        # leave it to be cleaned away before "rollback" might want it.
        $DOCKER tag "$($DOCKER inspect -f '{{.Image}}' "$c")" "caretaker-rollback/$c:prev" 2>/dev/null
        case $pulled in
          *" $ref "*) ;;
          *) $DOCKER pull -q "$ref" >/dev/null 2>&1; pulled="$pulled$ref " ;;
        esac ;;
      esac
      stack=$(label "$c" com.docker.compose.project)
      # shellcheck disable=SC2046
      set -- $(assess "$c")
      echo "$c$TAB${stack:--}$TAB$ref$TAB$1$TAB$2$TAB$3$TAB$4"
    done
    ;;

  apply)
    name_ok "$1"; find_docker; find_compose
    stack=$1; shift
    major_ok=; unknown_ok=
    for a in "$@"; do
      case $a in
        major-ok) major_ok=1 ;;
        unknown-ok) unknown_ok=1 ;;
        *) die "apply takes a stack name, then major-ok and unknown-ok at most" ;;
      esac
    done
    compose_args "$stack"
    mkdir -p "$STATE" || die "cannot write to $STATE"
    services=; record=
    for c in $(containers_of "$stack"); do
      # shellcheck disable=SC2046
      set -- $(assess "$c")
      [ "$1" = new ] || { [ "$1" = held ] && echo "held back   $c (its new image was rolled back before; waiting for a newer one)"; continue; }
      if [ "$2" = major ] && [ -z "$major_ok" ]; then echo "withheld    $c: $3 -> $4 is a major version; needs approval"; continue; fi
      if [ "$2" = unknown ] && [ -z "$unknown_ok" ]; then echo "withheld    $c: the image does not say its version; needs approval"; continue; fi
      svc=$(label "$c" com.docker.compose.service)
      [ -z "$svc" ] && continue
      cur=$($DOCKER inspect -f '{{.Image}}' "$c")
      ref=$($DOCKER inspect -f '{{.Config.Image}}' "$c")
      $DOCKER tag "$cur" "caretaker-rollback/$c:prev" 2>/dev/null
      [ "$($DOCKER image inspect -f '{{.Id}}' "caretaker-rollback/$c:prev" 2>/dev/null)" = "$cur" ] || die "could not keep the old image of $c, so it could not be rolled back; nothing was changed. Run 'updates' first"
      record="$record$c $svc $ref $($DOCKER image inspect -f '{{.Id}}' "$ref") $cur
"
      services="$services $svc"
      echo "updating    $c: $3 -> $4"
    done
    [ -z "$services" ] && { echo "nothing to apply for $stack"; exit 0; }
    printf '%s' "$record" > "$STATE/prev.$stack"
    # shellcheck disable=SC2086
    $COMPOSE $COMPOSE_ARGS up -d $services 2>&1 || die "compose could not bring '$stack' up; 'rollback $stack' puts it back"
    echo "applied $stack. Check 'ps' in a minute; 'rollback $stack' undoes this."
    ;;

  rollback)
    name_ok "$1"; find_docker; find_compose
    stack=$1; shift
    for a in "$@"; do name_ok "$a"; done
    only=" $* "
    [ -s "$STATE/prev.$stack" ] || die "nothing recorded to roll '$stack' back to"
    compose_args "$stack"
    services=; keep=
    while read -r c svc ref bad old; do
      [ -z "$c" ] && continue
      if [ $# -gt 0 ]; then
        case $only in *" $c "*) ;; *) keep="$keep$c $svc $ref $bad $old
"; continue ;; esac
      fi
      [ "$($DOCKER image inspect -f '{{.Id}}' "caretaker-rollback/$c:prev" 2>/dev/null)" = "$old" ] || die "the old image of $c is no longer kept (a later 'updates' replaced it)"
      $DOCKER tag "$old" "$ref" || die "the old image of $c is gone"
      echo "$bad" > "$STATE/hold.$c"       # do not offer this same image again
      services="$services $svc"
      echo "restoring   $c"
    done < "$STATE/prev.$stack"
    [ -z "$services" ] && die "none of those containers were part of the last apply of '$stack'"
    # shellcheck disable=SC2086
    $COMPOSE $COMPOSE_ARGS up -d $services 2>&1 || die "compose could not bring '$stack' back up"
    printf '%s' "$keep" > "$STATE/prev.$stack"
    echo "rolled back. The image that was undone is held until a newer one is published."
    ;;

  prune)
    find_docker
    $DOCKER image prune -f 2>&1 | tail -n 1
    ;;

  *)
    die "unknown verb '$verb' (try: help)"
    ;;
esac
