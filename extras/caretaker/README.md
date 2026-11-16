# caretaker

Agents on your MacBook that look after the containers on your NAS: they check that everything is up, apply image updates and undo the ones that break, and fix failed GitHub builds in a pull request. They tell you what happened on your phone, and ask before anything risky.

It is a set of three timers. Most runs are a plain script that costs nothing; a Claude Code agent is started only when there is something to think about.

| Job | When | What it does |
|---|---|---|
| **watch** | every 5 minutes | Asks the NAS for every container's state and fetches your sites. Starts a crashed container once. If it goes down again, keeps restarting, or fails its health check, the **doctor** agent reads the logs, finds the cause, restarts what it may, and reports. |
| **update** | 04:10 | Pulls every image in use. If any changed, the **update** agent recreates those containers one stack at a time, checks each stack is healthy, and rolls back the containers that are not. |
| **builds** | every 30 minutes | Looks at the latest GitHub Actions run of each workflow on your main branches. For a failed one, the **builds** agent reads the log, reruns it if the failure was not the code's fault, or fixes the code on a branch and opens a pull request. |

## What the agents can and cannot do

The Mac's key can run exactly one program on the NAS, [`nas/gate.sh`](nas/gate.sh), which answers a short list of requests: list containers, show one, read its log, start, restart, pull and apply updates, roll back, remove unused images. Nothing in that list deletes a container, a volume or a file, or runs a command of the agent's choosing, so this holds whatever an agent decides to try.

| On their own | Only after you tap Approve | Never |
|---|---|---|
| Start or restart a container | A major version upgrade (Ghost 6 to 7) | Delete containers, volumes or data |
| Apply minor and patch updates | An update whose image does not say its version (see `UNKNOWN_VERSION`) | Edit compose files or settings |
| Roll back an update that broke | Starting a container that looks stopped by hand | Push to a main branch or merge |
| Rerun a failed build; open a pull request | | Read a container's environment variables |

Approvals are checked by the script on the Mac and the gate on the NAS, not by the agent: an agent has no way to give itself one.

## Before you rely on it

- **It only runs while the Mac is awake.** A sleeping or closed MacBook checks nothing. The nightly update runs when the Mac next wakes; the five-minute check simply resumes. For the hours the Mac is asleep, what keeps things up is Docker's own restart policy: give every container `restart: unless-stopped`.
- **Containers started outside compose** (`docker run`, or Portainer's "add container") are watched and restarted, but cannot be updated from here. The report names them.
- **Stacks made in Portainer** keep their compose file inside Portainer's own folder. Set `PORTAINER_DATA` in `gate.conf` (step 2) so the gate can find it. `caretaker nas stacks` shows which stacks it can find.
- **Logs can hold secrets,** and the agents read logs to diagnose. They are told never to repeat one, but the log text does go to the model.

## Setting it up

You need Claude Code installed and signed in on the Mac, and SSH switched on at the NAS. For builds you also need the GitHub CLI, signed in (`gh auth login`).

### 1. On the Mac

```
cd extras/caretaker
./install.sh
```

This copies the kit to `~/.caretaker`, creates `~/.caretaker/config.env` and an SSH key used for nothing else, and prints the line for step 2. Open `~/.caretaker/config.env` and fill in `NAS_HOST` and `NAS_USER`.

### 2. On the NAS

1. Switch on SSH in the NAS's settings, and sign in from the Mac as you normally would: `ssh you@nas`.
2. Make a folder for the gate, next to your other container folders, and copy `nas/gate.sh` into it:
   ```
   mkdir -p /volume1/docker/caretaker        # on the NAS
   scp nas/gate.sh you@nas:/volume1/docker/caretaker/      # from the Mac
   chmod 755 /volume1/docker/caretaker/gate.sh             # on the NAS
   ```
3. Add the line `install.sh` printed to `~/.ssh/authorized_keys` on the NAS, as one line, with the path to where you put `gate.sh`. It starts with `command="…/gate.sh"`, which is what limits this key to the gate. (`chmod 700 ~/.ssh; chmod 600 ~/.ssh/authorized_keys` if the file is new.)
4. The gate has to be able to use Docker as that NAS user. It tries `docker` and then `sudo -n docker`. If neither works, `caretaker test` says so; either add the user to the `docker` group, or allow it password-free `sudo` for the docker command only.
5. If you use Portainer stacks, create `gate.conf` beside `gate.sh` with the NAS folder Portainer mounts as `/data`:
   ```
   PORTAINER_DATA=/volume1/docker/portainer
   ```

### 3. Your phone

Install the **ntfy** app and subscribe to the topic named in `NTFY_TOPIC` in your settings file. The topic name is the only password on the public ntfy.sh server, which is why the installer makes it long and random; anyone who learned `NTFY_REPLY_TOPIC` could tap Approve for you, so keep both to yourself, or point `NTFY_SERVER` at a ntfy server of your own.

### 4. Start it

```
./install.sh          # again: now that NAS_HOST is set, this starts the timers
caretaker test        # the NAS answers, and a test message reaches your phone
caretaker nas ps      # what the watch job sees
caretaker nas updates # what tonight's update would find (this pulls images, changes nothing)
```

Then set, in `~/.caretaker/config.env`:

- `URLS`: the public addresses that must answer, such as your site.
- `IGNORE`: containers to leave alone, for example ones you run only now and then.
- `REPOS`: the GitHub repositories whose builds to watch, such as `chrristin/dungeon`.

Changes to the settings file apply from the next run. After changing files in this folder, run `./install.sh` again.

## Day to day

| | |
|---|---|
| `caretaker status` | What it has done lately, and what is waiting for your answer. |
| `caretaker pause` / `resume` | Stop everything while you work on the NAS yourself. |
| `caretaker ignore <container>` | Leave a container alone from now on. |
| `caretaker approve <id>` | Approve from the Mac instead of the phone. |
| `caretaker update` | Run the nightly update now. |
| `caretaker nas rollback <stack>` | Undo the last update of a stack yourself. |

Everything is logged in `~/.caretaker/logs/`: one line per action in the month's log, and each agent's own account of its run in `logs/runs/`.

## How an update goes

1. `updates` on the NAS keeps a copy of the image each container runs now, pulls, and compares. A new image is a **minor** jump when the version it states keeps its first number, or when its tag pins one (`ghost:6`); **major** when the first number changes; **unknown** when it states no version and the tag is something like `latest`.
2. `apply` recreates only the containers with a new image, through the stack's own compose file. Major and unknown jumps are held until approved.
3. The agent waits, checks state and health, and reads the new log lines. A container that is not well is put back on its old image, and that new image is not offered again; the next one published is.

## Removing it

`./install.sh --uninstall` stops the timers. Delete the key's line from `authorized_keys` on the NAS, and `~/.caretaker` on the Mac, to remove the rest.
