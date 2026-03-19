# Phoebe

Single-tenant MVP scaffold for a background coding agent.

Current shape:

- `frontend/`: Next.js UI scaffold
- `backend/`: lightweight Node route and service scaffold
- `modal/`: sandbox execution placeholders for OpenCode and artifact collection
- `runs/`: local file-backed runtime state
- `config/`: single test repo config

This scaffold intentionally avoids:

- databases
- Cloudflare
- Durable Objects
- multi-tenant architecture
- long-term run history

The intended flow is:

1. Fetch tickets from Linear.
2. Launch a run for one ticket.
3. Start one Modal sandbox.
4. Run OpenCode with Anthropic-backed Claude in the sandbox.
5. Write artifacts to `runs/{ticketId}/{runId}/`.
6. Push a branch and optionally create a draft PR.
