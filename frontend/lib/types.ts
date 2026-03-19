export type TicketSummary = {
  id: string;
  identifier: string;
  title: string;
  state: string;
  assignee: string | null;
  activeRunId?: string | null;
};

export type RunStatus = {
  ticketId: string;
  runId: string;
  status: "queued" | "running" | "completed" | "failed" | "canceled";
  stage: string;
  startedAt: string;
  updatedAt: string;
  sandboxId: string | null;
  branchName: string | null;
  prUrl: string | null;
  error: string | null;
};

export type RunEvent = {
  ts: string;
  type: string;
  message: string;
};

export type AgentId = "agent-1" | "agent-2" | "agent-3" | "agent-4";

export type AgentAssignmentState = Partial<Record<string, AgentId>>;

export type AgentSlot = {
  id: AgentId;
  name: string;
  label: string;
  description: string;
};

export type DashboardStats = {
  openTickets: number;
  assignedTickets: number;
  activeRuns: number;
  draftPrs: number;
};

export type RunListItem = {
  runId: string;
  ticketId: string;
  ticketIdentifier: string;
  ticketTitle: string;
  status: string;
  stage: string;
  updatedAt: string | null;
};

export const AGENT_SLOTS: AgentSlot[] = [
  {
    id: "agent-1",
    name: "Agent 1",
    label: "Triage",
    description: "Fast cleanup, reproduction, and ticket framing.",
  },
  {
    id: "agent-2",
    name: "Agent 2",
    label: "Execution",
    description: "Primary coding lane for current Linear work.",
  },
  {
    id: "agent-3",
    name: "Agent 3",
    label: "Validation",
    description: "Follow-up checks, QA, and artifact review.",
  },
  {
    id: "agent-4",
    name: "Agent 4",
    label: "Overflow",
    description: "Extra parallel capacity for spikes.",
  },
];
