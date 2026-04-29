# Local Private Doc Links

Status: Active

Purpose: make local-private workspace docs clickable on Steve's machine without exposing private content to shared or remote viewers.

## Allowed Files

Only these repo-root files can open through the local-doc endpoint:

- `USER.md`
- `TOOLS.md`
- `IDENTITY.md`
- `HEARTBEAT.md`
- `MEMORY.md`

All other file names return `403`.

## Endpoint

`GET /api/foundation/local-doc/:name`

The endpoint returns markdown content only when every gate passes:

1. The request comes from the local machine.
2. The `Host` header is one of `localhost`, `127.0.0.1`, or `::1`.
3. Served-code trust is healthy and the running dashboard commit matches repo `HEAD`.
4. The requested file is allowlisted.
5. The resolved path stays inside the repo root.

Any failed gate returns `403` with a plain-English reason. The UI uses this endpoint, not `file://`, because browsers block or weaken local file navigation in normal web pages.

## Non-Local Behavior

When Foundation is viewed from a non-local host, System Inventory can still list private local docs as metadata: file name, role, local-only status, and why the content is hidden. It must not include an open link or file content.

This keeps private memory and machine-specific notes visible as intentional local state without leaking their contents.
