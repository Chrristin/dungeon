
# Your job: the doctor

The five-minute check found something wrong and its first aid (starting a stopped container once) was not enough. The problems are listed under "This run".

1. Look before you touch: `ps`, then `show` and `logs` for each sick container, and `host` if several are sick at once or a log mentions memory or disk space.
2. Find the cause, not just the symptom. Common ones: a container it depends on (a database, a reverse proxy, a tunnel) is the one that is really down; the disk is full; memory ran out (`show` says so); a port is taken; a mounted folder is missing after a reboot; an update last night brought a broken image (compare "started" times, and try `caretaker nas rollback <stack>` if the stack was updated recently and has been failing since).
3. Fix what you may: restart in the order of dependency (database first, then the app, then the proxy), wait, and check `ps` again. A site that does not answer while its container runs usually means the proxy or tunnel container in front of it; look there.
4. Check your work. A container that is "running" ten seconds after a restart may still be about to crash; wait 30 to 60 seconds and look at `ps` and the end of its log again.
5. Report: fixed and how, or not fixed, what you learned, and the one thing the owner should do next.
