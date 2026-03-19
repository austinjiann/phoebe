# Phoebe MVP Background Coding Agent Plan

## 1. Executive summary

Strip this down to a single-server MVP.

- Next.js provides both the dashboard and the API routes.
- Linear is intake only.
- A ticket is not a run.
- A run is one active attempt on one ticket.
- Launching a run starts one Modal sandbox.
- Inside the sandbox, OpenCode uses Anthropic API keys to run Claude.
- The sandbox works on one test repo, writes artifacts to a run folder, pushes a branch, and can create a draft PR.
- The dashboard only needs to show the active run, its logs, its artifacts, and the PR link.

Do not build any platform infrastructure around this.

- no Cloudflare
- no Durable Objects
- no database
- no long-term history
- no multi-agent orchestration
- no multi-tenant support

The durable output for the MVP is GitHub:

- branch
- draft PR
- PR summary and evidence

Everything else is temporary file-backed runtime state.

## 2. Simplified architecture

```text
+------------------+        +---------------------------+        +---------------------------+
| Linear           | -----> | Next.js app              | -----> | Modal sandbox             |
| source of work   |        | dashboard + API routes   |        | OpenCode + Claude         |
+------------------+        +-------------+-------------+        +-------------+-------------+
                                           |                                  |
                                           |                                  |
                                           v                                  v
                                +----------------------+          +---------------------------+
                                | local run folders    |          | GitHub                    |
                                | status + logs +      |          | branch + draft PR         |
                                | artifacts            |          | durable output            |
                                +----------------------+          +---------------------------+
```

```text
Linear ticket
    ->
Launch button
    ->
Next.js API route
    ->
create run folder
    ->
start Modal sandbox
    ->
OpenCode inspects repo, edits code, runs tests, takes screenshots
    ->
write artifacts into run folder
    ->
push branch / create draft PR
```

Core rules:

- fetch tickets directly from Linear when needed
- keep only one active run per ticket
- keep runtime state in files, not a database
- use simple JSON and markdown outputs
- treat screenshots and test results as first-class outputs

## 3. What to keep

Keep these ideas from the earlier plan:

- Linear is only the intake layer
- ticket != run
- OpenCode is the coding runtime
- Anthropic powers Claude through OpenCode
- Modal provides one sandbox per run
- one test repo only
- one active run per ticket is enough
- screenshots, test results, changed files, and final summary are first-class outputs
- draft PR creation is in scope
- human stays in the loop before merge

Keep the runtime simple:

- OpenCode runs inside the sandbox
- Playwright is available in the sandbox for screenshots when relevant
- GitHub stores the durable result

## 4. What to remove

Remove all of this from the plan:

- Cloudflare Workers
- Durable Objects
- D1
- R2
- Postgres
- Redis
- any database-backed state
- session as a core concept
- persistent event stores
- artifact metadata tables
- run history tables
- analytics
- multiplayer or multi-client collaboration
- platform architecture language
- OpenRouter
- generic multi-repo design

Replace with:

- Next.js API routes
- local file-backed run folders
- in-memory tracking for active runs only

## 5. Minimal runtime state

Use one run folder per active or recent run:

```text
runs/{ticketId}/{runId}/
```

Required files:

- `runs/{ticketId}/{runId}/status.json`
- `runs/{ticketId}/{runId}/events.jsonl`
- `runs/{ticketId}/{runId}/summary.md`
- `runs/{ticketId}/{runId}/changed-files.json`
- `runs/{ticketId}/{runId}/test-results.json`
- `runs/{ticketId}/{runId}/test-output.txt`
- `runs/{ticketId}/{runId}/screenshots/`

Optional helper files:

- `runs/{ticketId}/active-run.json`
- `runs/{ticketId}/{runId}/pr.json`
- `runs/{ticketId}/{runId}/sandbox.json`

Recommended `status.json` shape:

```json
{
  "ticketId": "ENG-123",
  "runId": "run_20260319_103000",
  "status": "running",
  "stage": "testing",
  "startedAt": "2026-03-19T10:30:00Z",
  "updatedAt": "2026-03-19T10:42:00Z",
  "sandboxId": "sb-123",
  "branchName": "eng-123/mvp-fix",
  "prUrl": null,
  "error": null
}
```

Recommended `events.jsonl` shape:

```json
{"ts":"2026-03-19T10:30:01Z","type":"run.started","message":"Run launched"}
{"ts":"2026-03-19T10:30:20Z","type":"sandbox.ready","message":"Sandbox is ready"}
{"ts":"2026-03-19T10:35:10Z","type":"tests.completed","message":"3 test commands completed"}
{"ts":"2026-03-19T10:40:45Z","type":"pr.created","message":"Draft PR created"}
```

Use in-memory state only for live control:

- map `ticketId -> active run handle`
- store Modal sandbox id and cancel handle in memory
- assume cancel only works while the Next.js server process is alive

That is acceptable for tonight’s MVP.

## 6. End-to-end flow

1. The dashboard calls Linear and renders the ticket list.
2. The user clicks `Launch` on a ticket.
3. Next.js creates a new run id and a local run folder.
4. Next.js writes initial `status.json` and appends `run.started` to `events.jsonl`.
5. Next.js starts a Modal sandbox for the single test repo.
6. The sandbox boots OpenCode with Anthropic API keys and the repo mounted or cloned.
7. OpenCode inspects the repo, edits files, runs tests, and decides whether screenshots are needed.
8. The sandbox writes artifacts into the run folder or streams them back so Next.js writes them into the run folder.
9. Next.js updates `status.json` and appends simple event lines as the run progresses.
10. If the run succeeds, GitHub gets a branch and optionally a draft PR.
11. The dashboard reads the run folder and shows logs, screenshots, test output, changed files, summary, and PR link.
12. If the user clicks `Retry`, create a new run folder and start a fresh sandbox.
13. If the user clicks `Cancel`, terminate the Modal sandbox and mark the run canceled.

MVP rule:

- no attempt to preserve or query historical runs beyond whatever folders still exist locally

## 7. Artifacts layout

Keep the artifacts flat and obvious.

```text
runs/
  {ticketId}/
    active-run.json
    {runId}/
      status.json
      events.jsonl
      summary.md
      changed-files.json
      test-results.json
      test-output.txt
      pr.json
      screenshots/
        01-homepage.png
        02-settings.png
```

Artifact expectations:

- `summary.md`
  - short human summary of what changed
  - intended for dashboard display and PR body reuse

- `changed-files.json`
  - changed file paths
  - diff stats
  - optional short notes per file

- `test-results.json`
  - list of commands run
  - pass or fail per command
  - short summary

- `test-output.txt`
  - raw combined test output

- `screenshots/`
  - PNG files only for MVP
  - present only when relevant

- `pr.json`
  - branch name
  - PR URL
  - PR number if created

Recommended `changed-files.json` shape:

```json
{
  "baseBranch": "main",
  "headBranch": "eng-123/mvp-fix",
  "files": [
    {"path":"src/app/page.tsx","additions":12,"deletions":4},
    {"path":"src/lib/utils.ts","additions":5,"deletions":1}
  ]
}
```

Recommended `test-results.json` shape:

```json
{
  "summary": {"passed": 2, "failed": 0},
  "commands": [
    {"command":"pnpm test","status":"passed"},
    {"command":"pnpm lint","status":"passed"}
  ]
}
```

## 8. Minimal dashboard

Only build four screens or panels.

### Linear ticket list

- fetch tickets directly from Linear
- show identifier, title, state, assignee
- show `Launch` button
- if a ticket has an active run folder, show `View run`

### Active run detail page

- current status
- current stage
- live log output from `events.jsonl`
- branch name
- PR link when available

### Artifact viewer

- summary markdown
- changed files
- test results
- raw test output
- screenshots gallery

### Controls

- `Launch`
- `Retry`
- `Cancel`
- `Create Draft PR`

Nothing else is required for MVP.

## 9. Build order for a few-hours MVP

### Step 1: basic Next.js shell

- ticket list page
- run detail page
- API routes skeleton

### Step 2: Linear intake

- fetch tickets from Linear GraphQL
- render ticket list
- no caching beyond in-memory request handling

### Step 3: run folder lifecycle

- generate `runId`
- create `runs/{ticketId}/{runId}`
- write `status.json`
- append `events.jsonl`
- read files back for the run detail page

### Step 4: Modal launch

- create one sandbox per run
- pass Anthropic key and GitHub credentials into the sandbox
- start OpenCode against the test repo

### Step 5: artifact writing

- write `summary.md`
- write `changed-files.json`
- write `test-results.json`
- write `test-output.txt`
- save screenshots into `screenshots/`

### Step 6: GitHub output

- create branch
- push changes
- create draft PR
- write `pr.json`

### Step 7: controls

- retry creates a new run
- cancel terminates the sandbox and updates `status.json`

If time is tight, cut in this order:

1. screenshots
2. cancel
3. create draft PR button separate from launch

Do not cut:

- Launch
- test output
- changed files
- summary

## 10. Folder structure

```text
/
├── plan.md
├── package.json
├── runs/
│   └── {ticketId}/
│       └── {runId}/
├── src/
│   ├── app/
│   │   ├── page.tsx
│   │   ├── tickets/
│   │   │   └── page.tsx
│   │   ├── runs/
│   │   │   └── [ticketId]/
│   │   │       └── [runId]/
│   │   │           └── page.tsx
│   │   └── api/
│   │       ├── linear/
│   │       │   └── tickets/route.ts
│   │       ├── runs/
│   │       │   ├── launch/route.ts
│   │       │   ├── cancel/route.ts
│   │       │   ├── retry/route.ts
│   │       │   ├── create-pr/route.ts
│   │       │   └── [ticketId]/
│   │       │       └── [runId]/
│   │       │           ├── route.ts
│   │       │           └── artifacts/route.ts
│   ├── components/
│   │   ├── TicketList.tsx
│   │   ├── RunHeader.tsx
│   │   ├── RunLogs.tsx
│   │   ├── ArtifactViewer.tsx
│   │   └── RunControls.tsx
│   └── lib/
│       ├── linear.ts
│       ├── github.ts
│       ├── modal.ts
│       ├── runs.ts
│       ├── artifacts.ts
│       └── opencode.ts
├── modal/
│   ├── app.py
│   ├── sandbox_runner.py
│   └── artifact_helpers.py
└── scripts/
    ├── sandbox-entry.sh
    └── collect-artifacts.sh
```

Boundary rules:

- `src/app/api/*` orchestrates runs
- `src/lib/runs.ts` owns local file-backed run state
- `modal/*` owns sandbox startup and execution
- `scripts/*` contains shell steps run inside the sandbox

## 11. Risks

- local file-backed state means this should run on one machine or one long-lived server process, not a scaled serverless deployment
- cancel is fragile if the Next.js process restarts and loses in-memory handles
- no database means no robust run recovery after a crash
- no persistent history means old runs may disappear unless their folders remain on disk
- screenshot capture can be flaky if the test repo environment is unstable
- Modal startup time may dominate the demo if the sandbox image is cold
- direct Linear fetches are simple, but repeated page loads will hit Linear every time

These are acceptable tradeoffs for a few-hours MVP.

## 12. Nice-to-haves later

- lightweight persistence for old runs if the prototype proves useful
- a tiny cache for Linear tickets
- better cancel and resume handling
- PR body templating from `summary.md`, `test-results.json`, and screenshots
- a cleaner streaming log transport than polling `events.jsonl`
- support for more than one repo
- simple auth if someone besides you will use it
- optional webhook-based ticket refresh

Do not build these first.
