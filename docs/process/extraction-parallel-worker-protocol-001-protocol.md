# Extraction Parallel Worker Protocol V1

Card: `EXTRACTION-PARALLEL-WORKER-PROTOCOL-001`

Closeout key: `extraction-parallel-worker-protocol-v1`

## Operating Rule

Parallel extraction workers are visible by default and source-packet-bound. A worker can only run later when it has a visible chat, known worktree, dedicated branch, exact source packet, permission class, artifact path, quality gate, wrap report, and stop conditions.

This protocol does not launch extraction workers.

## Assignment Format

```text
Worker:
Visible chat:
Repo/worktree:
Branch:
Source packet ID:
Queue item ID:
Source ID:
Source URL/ref:
Permission class:
Privacy tier:
Artifact root:
Artifact manifest:
File ownership:
Shared-file locks:
Allowed operations:
Forbidden operations:
Quality gate:
Wrap report due:
Stop conditions:
```

## Worker Prompt

```text
Work only in the assigned visible chat, worktree, branch, source packet, and artifact path.

Do not fetch transcripts, crawl sources, download files, capture screenshots/keyframes, call models, use private auth, or write downstream systems unless the assignment carries explicit runtime approval.

Stop and report if the source packet, permission class, artifact envelope, quality gate, wrap report, or dirty state is unclear.
```

## Required Gates

- source packet present
- permission class checked
- artifact envelope schema
- extraction-to-KB/atom pipeline
- no direct downstream write
- wrap report required

## Stop Conditions

- source packet is missing, stale, or owned by another worker
- artifact path overlaps another worker
- permission class is private, paid, course, Skool, MyICOR, Loom, or authorized-browser without explicit source approval
- worker would start transcript fetch, source crawl, download, screenshot/keyframe capture, model call, or external write without approval
- artifact envelope fails validation
- worker needs a shared-file write without a lock
- downstream persistence would occur before review
- dirty state cannot be wrapped cleanly

## Wrap Report Format

```text
Worker:
Source packet ID:
Branch/worktree:
Artifact manifest:
Permission class:
Files produced:
Quality gate:
Downstream writes:
Dirty state:
Proof:
Blockers:
Next action:
```

## Import Flow

1. Worker posts wrap report and artifact manifest path.
2. Orchestrator verifies source packet, permission class, artifact envelope, and no-write flags.
3. Artifact envelope routes through `EXTRACTION-TO-KB-ATOM-PIPELINE-001`.
4. KB drafts, atoms, synthesis facts, review items, and action routes remain proposal-only until separately approved.
5. Private, paid, course, Skool, MyICOR, Loom, or authorized-browser packets stop at preflight until source-specific approval exists.

## Who Owns What

| Worker | Chat | Worktree | Branch | Source Packet | Artifact Root | Permission | Status |
|---|---|---|---|---|---|---|---|
| Extraction Worker A | visible | `/Users/bensoncrew/worktrees/extract-worker-public-youtube-a` | `foundation/extract-worker-public-youtube-a` | `source-packet:SRC-YOUTUBE-INTEL-001:mark-kashef-public-youtube` | `artifacts/extraction/extract-worker-public-youtube-a` | public no-auth metadata | protocol only |
| Extraction Worker B | visible | `/Users/bensoncrew/worktrees/extract-worker-public-youtube-b` | `foundation/extract-worker-public-youtube-b` | `source-packet:SRC-YOUTUBE-INTEL-001:matt-pocock-public-youtube` | `artifacts/extraction/extract-worker-public-youtube-b` | public no-auth metadata | protocol only |

## Not Approved

- no extraction worker launch
- no live extraction
- no transcript fetch
- no source crawl
- no screenshot/keyframe capture
- no download
- no model call
- no private auth
- no Research Inbox, KB, atom, synthesis fact, action-route, vector, backlog, or external write
- no hidden subagent or invisible worker
