# Critical Rebuild Lesson: Ghost Agents on VPS

**Date captured:** 2026-04-15
**Severity:** P0 — must be designed into the new system from day one
**Source:** Live incident during rebuild audit session

---

## What Happened

1. Old BCrew-Buddy system was supposedly "being rebuilt to" the new bcrew-ai-os
2. Assumption was: nothing from the old system was still running
3. Reality: `claudeclaw` PM2 process on VPS was still actively ticking every 60s, spawning scheduled agents
4. `curl /api/health` returned `status: ok, lastSchedulerTick: <30s ago>, uptimeSeconds: ~3.5 days`
5. Had to SSH in as `crewbert` user and manually `pm2 stop claudeclaw crewbert-dashboard crewbert-tunnel` to halt the ghost scheduler

## Why This Matters for the Rebuild

- **The old system kept running silently for days** after we "moved on"
- **Scheduled agents kept firing** and presumably burning API credits
- **No visible kill switch** in any dashboard — had to SSH as non-root user
- **No process hierarchy visibility** — running processes were invisible from the web UI
- **Root SSH had a different PM2 list than crewbert user's PM2 list** — two registries, confusing

## Rules for the New System (bcrew-ai-os)

1. **The orchestrator (OpenClaw / scheduler / whatever runs agents) must expose a kill switch on the dashboard.** Not just status — an actual stop button that any admin can hit.

2. **Every running process must be visible on the dashboard.** If a process is spawning agents, the dashboard shows:
   - process name
   - uptime
   - last tick / last agent spawned
   - cost-to-date
   - active agent count
   - a STOP button

3. **Processes must live under ONE identity.** No more "root SSH sees nothing, crewbert user sees the real list." One user, one PM2 (or launchd, or systemd), one source of truth.

4. **Dead-man switch on the scheduler.** If the dashboard hasn't received a heartbeat ping from the admin in N days, auto-pause all scheduled agents. Don't let a ghost scheduler burn credits while nobody is watching.

5. **Cost dashboard must be live.** If agents are spawning, the dashboard shows real-time $ spent today, this week, this month. Anomalies alert immediately.

6. **Single "decommission" workflow.** When a system is deprecated (like BCrew-Buddy → bcrew-ai-os), there's ONE command that: stops all processes, disables all scheduled tasks, archives the database, and writes a decommission record. Not "assume it's off because we moved on."

7. **The new system must not inherit this failure mode.** OpenClaw agents, Codex automations, and any scheduled work in bcrew-ai-os must all flow through a single visible orchestrator surface.

## How This Gets Captured

- Filed as backlog item **REBUILD-GHOST-001** in the new system
- Added to `docs/system-strategy.md` under governance rules
- Added to the pre-launch checklist for every new service: "Does this have a visible kill switch?"

## Final Takeaway

**"The old system kept running"** is how the new system dies too if we don't design for it.

Every process, every scheduler, every agent — visible, killable, and cost-tracked from day one.
