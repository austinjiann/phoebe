"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import * as Tabs from "@radix-ui/react-tabs";
import * as Tooltip from "@radix-ui/react-tooltip";
import {
  ArrowRightIcon,
  CheckCircledIcon,
  ClockIcon,
  CrossCircledIcon,
  ExternalLinkIcon,
  ExclamationTriangleIcon,
  LightningBoltIcon,
  PersonIcon,
  PlayIcon,
  ReloadIcon,
} from "@radix-ui/react-icons";

import { formatRelativeTimestamp } from "../lib/format";
import type {
  AgentId,
  AgentSlot,
  DashboardStats,
  RunEvent,
  RunListItem,
  RunStatus,
  TicketSummary,
} from "../lib/types";

export function PageHeader({
  title,
  subtitle,
  kicker,
  stats,
}: {
  title: string;
  subtitle: string;
  kicker: string;
  stats: DashboardStats;
}) {
  return (
    <header className="page-header">
      <div>
        <p className="display-kicker">{kicker}</p>
        <h1>{title}</h1>
        <p className="page-subtitle">{subtitle}</p>
      </div>
      <Tooltip.Provider delayDuration={120}>
        <div className="stat-strip">
          <StatPill
            icon={<LightningBoltIcon />}
            label="Open Tickets"
            value={stats.openTickets}
            tip="Tickets currently visible from Linear."
          />
          <StatPill
            icon={<ArrowRightIcon />}
            label="Assigned"
            value={stats.assignedTickets}
            tip="Tickets mapped to a local agent slot in this session."
          />
          <StatPill
            icon={<ClockIcon />}
            label="Active Runs"
            value={stats.activeRuns}
            tip="Tickets with an exposed active run id from the API."
          />
          <StatPill
            icon={<CheckCircledIcon />}
            label="Draft PRs"
            value={stats.draftPrs}
            tip="Runs already reporting a PR URL."
          />
        </div>
      </Tooltip.Provider>
    </header>
  );
}

function StatPill({
  icon,
  label,
  value,
  tip,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  tip: string;
}) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <div className="stat-pill">
          {icon}
          <span>{label}</span>
          <strong>{value}</strong>
        </div>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content sideOffset={10} className="tooltip-content">
          {tip}
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

export function SectionHeading({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle: string;
  action?: ReactNode;
}) {
  return (
    <div className="section-heading">
      <div>
        <h2>{title}</h2>
        <p className="helper-copy">{subtitle}</p>
      </div>
      {action}
    </div>
  );
}

export function EmptyState({
  title,
  copy,
  action,
}: {
  title: string;
  copy: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <strong>{title}</strong>
      <p className="empty-copy">{copy}</p>
      {action}
    </div>
  );
}

export function ErrorState({ title, copy }: { title: string; copy: string }) {
  return (
    <div className="message-panel error">
      <strong>{title}</strong>
      <p className="empty-copy">{copy}</p>
    </div>
  );
}

export function LoadingState({ label }: { label: string }) {
  return (
    <div className="message-panel">
      <strong>{label}</strong>
      <p className="empty-copy">The dashboard is waiting on the API response.</p>
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  const icon =
    normalized === "completed" ? (
      <CheckCircledIcon />
    ) : normalized === "failed" || normalized === "canceled" ? (
      <CrossCircledIcon />
    ) : normalized === "running" ? (
      <PlayIcon />
    ) : normalized === "queued" ? (
      <ClockIcon />
    ) : (
      <ExclamationTriangleIcon />
    );

  return (
    <span className="status-badge">
      {icon}
      {status}
    </span>
  );
}

export function HeroPanel() {
  return (
    <section className="hero-panel">
      <p className="eyebrow" style={{ color: "rgba(248, 242, 235, 0.74)" }}>
        Agent Operations
      </p>
      <h2>Make each run accountable to a dedicated agent lane.</h2>
      <p>
        Phoebe-Agent is the control room for turning Linear intake into active runs, artifact
        review, and fast handoffs across multiple coding agents.
      </p>
      <div className="button-row">
        <Link href="/tickets" className="button">
          <ArrowRightIcon />
          Review ticket queue
        </Link>
        <Link href="/agents" className="button secondary">
          <PersonIcon />
          Inspect agent lanes
        </Link>
      </div>
    </section>
  );
}

export function TicketCard({
  ticket,
  assignedAgent,
  onAssign,
  onLaunch,
  launching,
}: {
  ticket: TicketSummary;
  assignedAgent?: AgentId | null;
  onAssign: (ticketId: string, agentId: AgentId | null) => void;
  onLaunch?: (ticketId: string) => void;
  launching?: boolean;
}) {
  return (
    <article className="ticket-card">
      <div className="ticket-layout">
        <div className="ticket-body">
          <div>
            <div className="ticket-meta">
              <span className="ticket-identifier eyebrow">{ticket.identifier}</span>
              <StatusBadge status={ticket.state} />
            </div>
            <h3 className="ticket-card-title">{ticket.title}</h3>
            <div className="card-meta">
              <span className="metadata-copy">Linear assignee: {ticket.assignee ?? "Unassigned"}</span>
              <span className="metadata-copy">
                Ticket ID: <span className="mono">{ticket.id}</span>
              </span>
            </div>
          </div>
          <div className="field-row">
            <div style={{ minWidth: 220 }}>
              <label className="field-label" htmlFor={`assign-${ticket.id}`}>
                Assign agent
              </label>
              <select
                id={`assign-${ticket.id}`}
                className="assign-select"
                value={assignedAgent ?? ""}
                onChange={(event) =>
                  onAssign(ticket.id, (event.currentTarget.value || null) as AgentId | null)
                }
              >
                <option value="">Unassigned</option>
                <option value="agent-1">Agent 1</option>
                <option value="agent-2">Agent 2</option>
                <option value="agent-3">Agent 3</option>
                <option value="agent-4">Agent 4</option>
              </select>
            </div>
          </div>
        </div>
        <div className="inline-actions">
          {ticket.activeRunId ? (
            <Link href={`/runs/${ticket.activeRunId}`} className="button secondary">
              <ExternalLinkIcon />
              View run
            </Link>
          ) : (
            <LaunchRunDialog
              identifier={ticket.identifier}
              title={ticket.title}
              launching={launching}
              onConfirm={() => onLaunch?.(ticket.id)}
            />
          )}
        </div>
      </div>
    </article>
  );
}

function LaunchRunDialog({
  identifier,
  title,
  launching,
  onConfirm,
}: {
  identifier: string;
  title: string;
  launching?: boolean;
  onConfirm?: () => void;
}) {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <button type="button" className="button">
          <PlayIcon />
          Launch
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog-content">
          <Dialog.Title asChild>
            <h3>Launch run for {identifier}</h3>
          </Dialog.Title>
          <Dialog.Description asChild>
            <p>{title}</p>
          </Dialog.Description>
          <div className="button-row">
            <Dialog.Close asChild>
              <button type="button" className="button secondary">
                Close
              </button>
            </Dialog.Close>
            <Dialog.Close asChild>
              <button type="button" className="button" disabled={launching} onClick={onConfirm}>
                <PlayIcon />
                {launching ? "Launching..." : "Confirm launch"}
              </button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function AgentCard({
  agent,
  tickets,
}: {
  agent: AgentSlot;
  tickets: TicketSummary[];
}) {
  const isIdle = tickets.length === 0;

  return (
    <article className="agent-card">
      <div className="agent-card-header">
        <div className="agent-body">
          <div className={`agent-dot${isIdle ? " is-idle" : ""}`} />
          <div>
            <p className="eyebrow" style={{ marginBottom: 6 }}>
              {agent.label}
            </p>
            <h3 className="agent-card-title">{agent.name}</h3>
            <p className="helper-copy">{agent.description}</p>
          </div>
        </div>
        <StatusBadge status={isIdle ? "idle" : `${tickets.length} assigned`} />
      </div>
      {isIdle ? (
        <EmptyState
          title="No active ticket"
          copy="This lane is open for another Linear ticket."
        />
      ) : (
        <div className="list-stack">
          {tickets.map((ticket) => (
            <div key={ticket.id} className="activity-row">
              <strong>{ticket.identifier}</strong>
              <p className="helper-copy">{ticket.title}</p>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}

export function RunsList({ runs }: { runs: RunListItem[] }) {
  if (runs.length === 0) {
    return (
      <EmptyState
        title="No exposed active runs"
        copy="This view populates when the API returns active run ids or when you open a specific run detail page directly."
      />
    );
  }

  return (
    <div className="list-stack">
      {runs.map((run) => (
        <article key={run.runId} className="run-card">
          <div className="run-layout">
            <div className="run-body">
              <div className="run-meta">
                <span className="eyebrow">{run.ticketIdentifier}</span>
                <StatusBadge status={run.status} />
              </div>
              <h3 className="run-card-title">{run.ticketTitle}</h3>
              <div className="card-meta">
                <span className="metadata-copy">Stage: {run.stage}</span>
                <span className="metadata-copy">Updated: {formatRelativeTimestamp(run.updatedAt)}</span>
              </div>
            </div>
            <Link href={`/runs/${run.runId}`} className="button secondary">
              <ExternalLinkIcon />
              Open run
            </Link>
          </div>
        </article>
      ))}
    </div>
  );
}

export function TicketsTable({
  tickets,
  assignments,
  onAssign,
  onLaunch,
  launchingTicketId,
}: {
  tickets: TicketSummary[];
  assignments: Partial<Record<string, AgentId>>;
  onAssign: (ticketId: string, agentId: AgentId | null) => void;
  onLaunch: (ticketId: string) => void;
  launchingTicketId: string | null;
}) {
  return (
    <section className="table-panel">
      <div className="table-row is-header">
        <span>Ticket</span>
        <span>State</span>
        <span>Agent</span>
        <span>Action</span>
      </div>
      {tickets.map((ticket) => (
        <div key={ticket.id} className="table-row">
          <div>
            <div className="ticket-identifier eyebrow">{ticket.identifier}</div>
            <strong>{ticket.title}</strong>
          </div>
          <StatusBadge status={ticket.state} />
          <select
            className="assign-select"
            value={assignments[ticket.id] ?? ""}
            onChange={(event) =>
              onAssign(ticket.id, (event.currentTarget.value || null) as AgentId | null)
            }
          >
            <option value="">Unassigned</option>
            <option value="agent-1">Agent 1</option>
            <option value="agent-2">Agent 2</option>
            <option value="agent-3">Agent 3</option>
            <option value="agent-4">Agent 4</option>
          </select>
          <div className="inline-actions">
            {ticket.activeRunId ? (
              <Link href={`/runs/${ticket.activeRunId}`} className="button secondary">
                View run
              </Link>
            ) : (
              <button
                type="button"
                className="button"
                onClick={() => onLaunch(ticket.id)}
                disabled={launchingTicketId === ticket.id}
              >
                {launchingTicketId === ticket.id ? "Launching..." : "Launch"}
              </button>
            )}
          </div>
        </div>
      ))}
    </section>
  );
}

export function RunDetailTabs({
  run,
  events,
}: {
  run: RunStatus;
  events: RunEvent[];
}) {
  const artifacts = [
    "summary.md",
    "changed-files.json",
    "test-results.json",
    "test-output.txt",
    "screenshots/",
  ];

  return (
    <Tabs.Root className="tabs-root" defaultValue="timeline">
      <Tabs.List className="tabs-list" aria-label="Run detail sections">
        <Tabs.Trigger className="tabs-trigger" value="timeline">
          Timeline
        </Tabs.Trigger>
        <Tabs.Trigger className="tabs-trigger" value="summary">
          Summary
        </Tabs.Trigger>
        <Tabs.Trigger className="tabs-trigger" value="artifacts">
          Artifacts
        </Tabs.Trigger>
      </Tabs.List>
      <Tabs.Content value="timeline">
        <section className="timeline-panel">
          <SectionHeading
            title="Run timeline"
            subtitle="Events streamed from the active run folder."
          />
          {events.length === 0 ? (
            <EmptyState
              title="No events yet"
              copy="The run detail route is ready, but this run has not exposed event data yet."
            />
          ) : (
            <div className="list-stack">
              {events.map((event) => (
                <article key={`${event.ts}-${event.type}`} className="timeline-row">
                  <div className="ticket-meta">
                    <span className="mono">{formatRelativeTimestamp(event.ts)}</span>
                    <StatusBadge status={event.type} />
                  </div>
                  <strong>{event.message}</strong>
                </article>
              ))}
            </div>
          )}
        </section>
      </Tabs.Content>
      <Tabs.Content value="summary">
        <section className="panel">
          <SectionHeading title="Run summary" subtitle="Current status and GitHub handoff details." />
          <div className="list-stack">
            <div className="activity-row">
              <strong>Current stage</strong>
              <p className="helper-copy">{run.stage}</p>
            </div>
            <div className="activity-row">
              <strong>Sandbox</strong>
              <p className="helper-copy">{run.sandboxId ?? "Not attached yet"}</p>
            </div>
            <div className="activity-row">
              <strong>Branch</strong>
              <p className="helper-copy">{run.branchName ?? "No branch recorded yet"}</p>
            </div>
            <div className="activity-row">
              <strong>Draft PR</strong>
              <p className="helper-copy">{run.prUrl ?? "No PR URL recorded yet"}</p>
            </div>
          </div>
        </section>
      </Tabs.Content>
      <Tabs.Content value="artifacts">
        <section className="panel">
          <SectionHeading title="Artifacts" subtitle="Flat outputs expected in the local run folder." />
          <ul className="artifact-list">
            {artifacts.map((artifact) => (
              <li key={artifact}>
                <span>{artifact}</span>
                <span className="artifact-copy">Awaiting API endpoint</span>
              </li>
            ))}
          </ul>
        </section>
      </Tabs.Content>
    </Tabs.Root>
  );
}

export function RunControls({
  busy,
  onRetry,
  onCancel,
  onCreatePr,
}: {
  busy: boolean;
  onRetry: () => void;
  onCancel: () => void;
  onCreatePr: () => void;
}) {
  return (
    <div className="button-row">
      <button type="button" className="button secondary" onClick={onRetry} disabled={busy}>
        <ReloadIcon />
        Retry
      </button>
      <button type="button" className="button danger" onClick={onCancel} disabled={busy}>
        <CrossCircledIcon />
        Cancel
      </button>
      <button type="button" className="button" onClick={onCreatePr} disabled={busy}>
        <ExternalLinkIcon />
        Create Draft PR
      </button>
    </div>
  );
}
