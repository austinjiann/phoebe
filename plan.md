# Phoebe MVP Background Coding Agent Plan

## 1. Executive summary

Build the MVP as a small two-process app:

- `frontend/` is the Next.js UI
- `backend/` is a Bun + Hono API
- `backend/runs/` holds all file-backed run state
- Modal provides one remote sandbox per run

Keep the current rollout narrow.

- Linear is intake only
- ticket != run
- one active run per ticket is enough
- no database
- no Cloudflare
- no Durable Objects
- no long-term history

Current execution milestone:

- `POST /runs` creates local run files
- backend launches a real Modal smoke run
- the Modal job clones the single test repo and runs simple git checks
- backend writes `summary.md`, `test-results.json`, and `test-output.txt`

OpenCode + Anthropic is still the intended runtime, but it is the next step after Modal transport is proven.

## 2. Simplified architecture

```text
+------------------+        +---------------------------+        +---------------------------+
| Linear           | -----> | frontend/                 | -----> | backend/                  |
| intake only      |        | Next.js dashboard         |        | Bun + Hono REST API       |
+------------------+        +---------------------------+        +-------------+-------------+
                                                                         |
                                                                         v
                                                            +---------------------------+
                                                            | Modal smoke runner        |
                                                            | clone repo + git checks   |
                                                            +-------------+-------------+
                                                                          |
                                                                          v
                                                            +---------------------------+
                                                            | backend/runs/             |
                                                            | status + events +         |
                                                            | summary + test output     |
                                                            +---------------------------+
```

```text
Linear ticket
    ->
Launch button
    ->
POST /runs
    ->
backend/runs/{ticketId}/{runId}
    ->
Modal sandbox
    ->
clone test repo
    ->
run smoke commands
    ->
write local artifacts
    ->
replace smoke runner with OpenCode next
```

## 3. What to keep

Keep these rules:

- Linear is only the intake layer
- ticket != run
- one Modal environment per run
- one test repo only
- one active run per ticket
- human stays in the loop before merge

Keep these outputs first-class:

- `summary.md`
- `test-results.json`
- `test-output.txt`
- `screenshots/` once browser work is added
- `changed-files.json` once OpenCode edits code
- draft PR metadata once GitHub output is wired

Keep OpenCode as the target runtime choice:

- OpenCode inside Modal
- Anthropic API key passed to OpenCode
- GitHub as the durable output

But do not start with that. Prove Modal clone + shell execution first.

## 4. What to remove

Do not reintroduce any of this:

- database-backed state
- Cloudflare-specific architecture
- Durable Objects
- session as a required core concept
- event sourcing language tied to persistence
- WebSockets or SSE for MVP
- long-term run history
- analytics
- multiplayer collaboration
- multi-repo abstractions
- OpenRouter

Use only:

- REST from frontend to backend
- GraphQL from backend to Linear
- file-backed run state under `backend/runs`
- one in-memory map for active Modal processes

## 5. Minimal runtime state

Store each run under:

```text
backend/runs/{ticketId}/{runId}/
```

Current required files:

- `backend/runs/{ticketId}/{runId}/status.json`
- `backend/runs/{ticketId}/{runId}/events.jsonl`
- `backend/runs/{ticketId}/{runId}/summary.md`
- `backend/runs/{ticketId}/{runId}/test-results.json`
- `backend/runs/{ticketId}/{runId}/test-output.txt`
- `backend/runs/{ticketId}/{runId}/screenshots/`

Later files, but not required for the current smoke step:

- `backend/runs/{ticketId}/{runId}/changed-files.json`
- `backend/runs/{ticketId}/{runId}/pr.json`

Recommended `status.json` shape:

```json
{
  "runId": "run_20260319_154217_tdy63q",
  "ticketId": "TES-5",
  "status": "running",
  "createdAt": "2026-03-19T15:42:17.804Z",
  "updatedAt": "2026-03-19T15:42:18.809Z",
  "sandboxId": "modal-run:run_20260319_154217_tdy63q",
  "canceledAt": null,
  "completedAt": null,
  "error": null
}
```

Recommended `events.jsonl` shape:

```json
{"ts":"2026-03-19T15:42:17.805Z","type":"run.started","message":"Run created"}
{"ts":"2026-03-19T15:42:17.806Z","type":"sandbox.starting","message":"Launching Modal smoke run"}
{"ts":"2026-03-19T15:42:18.100Z","type":"sandbox.ready","message":"Modal run started"}
{"ts":"2026-03-19T15:42:21.500Z","type":"tests.passed","message":"Modal smoke checks passed"}
```

In-memory state is allowed only for live control:

- `runId -> child process handle` for `modal run`
- used only for best-effort cancel

If the backend restarts, that live control is gone. That is acceptable for the MVP.

## 6. End-to-end flow

Current flow:

1. frontend fetches tickets through `GET /linear/issues`
2. user clicks `Launch`
3. backend creates `backend/runs/{ticketId}/{runId}`
4. backend writes `status.json` and appends `run.started`
5. backend launches `modal run modal/sandbox.py::run_smoke`
6. Modal creates a remote container
7. the remote job clones `TEST_REPO_URL`
8. the remote job runs:
   - `git rev-parse --abbrev-ref HEAD`
   - `git status --short`
9. the remote job returns a JSON result
10. backend writes local artifacts and marks the run `completed` or `failed`

Next flow after this milestone:

1. keep the same backend contract
2. replace the smoke commands with OpenCode
3. have OpenCode inspect the repo, edit files, and run repo tests
4. add `changed-files.json`
5. add screenshots when relevant
6. add branch push and draft PR creation

## 7. Artifacts layout

Current artifact layout:

```text
backend/runs/
  {ticketId}/
    {runId}/
      status.json
      events.jsonl
      summary.md
      test-results.json
      test-output.txt
      screenshots/
```

Current smoke-run expectations:

- `summary.md`
  - short human summary of what the Modal smoke run did
  - states clearly that OpenCode has not started yet

- `test-results.json`
  - summary counts
  - one entry for `git clone`
  - one entry for each smoke command

- `test-output.txt`
  - combined command output from clone and smoke commands

Later additions:

- `changed-files.json` after OpenCode edits code
- `screenshots/*.png` after Playwright/browser steps
- `pr.json` after GitHub draft PR creation

## 8. Minimal dashboard

Do not expand the UI beyond the essentials.

### Linear ticket list

- fetch tickets from backend
- show identifier, title, state
- show `Launch`
- show `View run` when a run is active or recent

### Active run detail page

- current status
- event timeline from `events.jsonl`
- artifact list
- branch or PR fields later when GitHub is added

### Artifact viewer

- summary markdown
- test results
- raw test output
- screenshots later

### Controls

- `Launch`
- `Retry`
- `Cancel`
- `Create Draft PR` later

## 9. Build order for a few-hours MVP

### Step 1: backend run files

- create runs
- append events
- read run state back

Status: done

### Step 2: Linear intake

- fetch issues directly from Linear GraphQL
- no caching

Status: done

### Step 3: real Modal smoke path

- replace fake executor
- launch a real Modal job
- clone the test repo
- run deterministic git checks
- write local artifacts from the returned result

Status: implemented in the backend

### Step 4: OpenCode in Modal

- pass Anthropic key into the sandbox
- invoke OpenCode instead of smoke commands
- keep the same backend API and run-folder layout

### Step 5: richer artifacts

- `changed-files.json`
- screenshots
- better test command capture

### Step 6: GitHub output

- create branch
- push changes
- create draft PR
- write `pr.json`

If time is tight, do not cut:

- real Modal launch
- summary
- test results
- test output

Cut later instead:

- screenshots
- PR creation
- richer artifact metadata

## 10. Folder structure

```text
phoebe/
├── frontend/
│   └── ...
├── backend/
│   ├── index.ts
│   ├── package.json
│   ├── routes/
│   │   ├── linear.ts
│   │   └── runs.ts
│   ├── services/
│   │   ├── linear/client.ts
│   │   ├── modal/launchSandbox.ts
│   │   └── runs/
│   │       ├── appendEvent.ts
│   │       ├── createRun.ts
│   │       ├── getRun.ts
│   │       └── updateRun.ts
│   ├── utils/
│   │   ├── ids.ts
│   │   └── paths.ts
│   └── runs/
│       └── {ticketId}/{runId}/
├── modal/
│   ├── sandbox.py
│   ├── requirements.txt
│   ├── agent/
│   │   ├── __init__.py
│   │   ├── run.py
│   │   ├── tools.py
│   │   └── config.py
│   └── artifacts/
│       └── collector.py
├── config/
│   └── repo.ts
└── plan.md
```

Boundary rules:

- `frontend/` is UI only
- `backend/` owns API and file-backed run state
- `modal/` owns remote execution code
- `config/repo.ts` owns the single test repo config

## 11. Risks

- `backend/runs/` is local machine state, so this is not horizontally scalable
- cancel is best-effort only while the backend process is alive
- Modal auth and cold start time can dominate the first run experience
- if the repo is private, clone depends on the GitHub token path being valid
- there is no run recovery after a backend crash
- there is no durable history outside the files that remain on disk

These are acceptable tradeoffs for the MVP.

## 12. Nice-to-haves later

- swap the smoke runner for OpenCode + Anthropic
- add repo-specific test commands
- add `changed-files.json`
- add screenshot capture and viewer support
- add GitHub branch push and draft PR creation
- add a cleaner live log stream than polling
- add lightweight persistence if the prototype proves useful

Do not build those before the Modal smoke path is stable.
