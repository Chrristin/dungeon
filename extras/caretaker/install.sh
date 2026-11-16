#!/bin/bash
# Installs the caretaker on this Mac: copies the kit to ~/.caretaker, writes your settings
# file and an SSH key the first time, and sets up the three timers. Safe to run again after
# changing anything; your settings, key and history are kept.
#
#   ./install.sh               install or update
#   ./install.sh --uninstall   stop the timers (keeps ~/.caretaker)

set -eu
SRC=$(cd "$(dirname "$0")" && pwd)
CH=${CARETAKER_HOME:-$HOME/.caretaker}
AGENTS=${CARETAKER_LAUNCHD_DIR:-$HOME/Library/LaunchAgents}
JOBS="watch update builds"
mac() { [ "$(uname)" = Darwin ]; }

unload() {
  for j in $JOBS; do
    mac && launchctl bootout "gui/$(id -u)/com.caretaker.$j" 2>/dev/null || true
  done
}

if [ "${1:-}" = --uninstall ]; then
  unload
  for j in $JOBS; do rm -f "$AGENTS/com.caretaker.$j.plist"; done
  echo "Timers removed. Your settings and logs are still in $CH; the key on the NAS is still allowed until you delete its line from authorized_keys."
  exit 0
fi

mac || echo "Not a Mac: copying files only, no timers."
command -v claude >/dev/null 2>&1 || { echo "Claude Code is not installed (the 'claude' command). Install it and sign in first: https://code.claude.com/docs/en/setup"; exit 1; }

mkdir -p "$CH/logs" "$AGENTS"
rm -rf "$CH/kit"; mkdir -p "$CH/kit"
cp -R "$SRC/bin" "$SRC/prompts" "$SRC/nas" "$CH/kit/"
rm -rf "$CH/kit/nas/state"
chmod +x "$CH/kit/bin/caretaker" "$CH/kit/nas/gate.sh"

if [ ! -f "$CH/config.env" ]; then
  rand() { LC_ALL=C tr -dc 'a-z0-9' < /dev/urandom | head -c 20; }
  sed "s/__TOPIC__/caretaker-$(rand)/; s/__REPLY__/caretaker-$(rand)/" "$SRC/config.example.env" > "$CH/config.env"
  chmod 600 "$CH/config.env"
  NEW_CONFIG=1
fi
# shellcheck disable=SC1091
. "$CH/config.env"

if [ ! -f "$NAS_KEY" ]; then
  mkdir -p "$(dirname "$NAS_KEY")"
  ssh-keygen -q -t ed25519 -N "" -C caretaker -f "$NAS_KEY"
fi

# the caretaker command, wherever your PATH already looks
for d in /opt/homebrew/bin /usr/local/bin "$HOME/.local/bin" "$HOME/bin"; do
  if [ -d "$d" ] && [ -w "$d" ]; then ln -sf "$CH/kit/bin/caretaker" "$d/caretaker"; LINKED=$d; break; fi
done

if [ -n "${LINKED:-}" ]; then WHERE="The 'caretaker' command is in $LINKED."
else WHERE="Run it as $CH/kit/bin/caretaker (no writable folder on your PATH was found)."
fi

# launchd starts jobs with a bare PATH, so give it the folders claude, gh and ssh are in
P="$(dirname "$(command -v claude)")"
command -v gh >/dev/null 2>&1 && P="$P:$(dirname "$(command -v gh)")"
P="$P:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"

plist() {                                # plist <job> <schedule xml>
  cat > "$AGENTS/com.caretaker.$1.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>com.caretaker.$1</string>
  <key>ProgramArguments</key>
  <array><string>/bin/bash</string><string>$CH/kit/bin/caretaker</string><string>$1</string></array>
  <key>EnvironmentVariables</key>
  <dict><key>PATH</key><string>$P</string><key>CARETAKER_HOME</key><string>$CH</string></dict>
  $2
  <key>ProcessType</key><string>Background</string>
  <key>StandardOutPath</key><string>$CH/logs/launchd.log</string>
  <key>StandardErrorPath</key><string>$CH/logs/launchd.log</string>
</dict>
</plist>
PLIST
}
unload
plist watch  '<key>StartInterval</key><integer>300</integer><key>RunAtLoad</key><true/>'
plist update '<key>StartCalendarInterval</key><dict><key>Hour</key><integer>4</integer><key>Minute</key><integer>10</integer></dict>'
plist builds '<key>StartInterval</key><integer>1800</integer>'
if mac && [ -n "$NAS_HOST" ]; then
  for j in $JOBS; do launchctl bootstrap "gui/$(id -u)" "$AGENTS/com.caretaker.$j.plist"; done
  echo "Timers are running: watch every 5 minutes, update at 04:10, builds every 30 minutes."
else
  echo "Timers are written but not started yet: NAS_HOST is not set."
fi

cat <<NEXT

Installed in $CH. $WHERE

${NEW_CONFIG:+Next:
  1. Fill in NAS_HOST and NAS_USER in $CH/config.env
  2. Put the gate on the NAS and allow this key (README, step 2):
}  The line for the NAS's authorized_keys, with the folder you copy gate.sh to:

command="/volume1/docker/caretaker/gate.sh",no-port-forwarding,no-agent-forwarding,no-X11-forwarding,no-pty $(cat "$NAS_KEY.pub")

${NEW_CONFIG:+  3. Subscribe to this topic in the ntfy app: $NTFY_TOPIC
  4. Run ./install.sh again to start the timers, then: caretaker test
}
NEXT
