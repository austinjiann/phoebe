"use client";

import Link from "next/link";

import { useAgentAssignments } from "./AgentAssignmentsProvider";
import {
  AgentCard,
  EmptyState,
  ErrorState,
  HeroPanel,
  LoadingState,
  PageHeader,
  RunsList,
  SectionHeading,
  TicketCard,
} from "./dashboard-ui";
import { useTicketsQuery } from "./useFrontendData";
import { launchRun } from "../lib/api";
import { AGENT_SLOTS, type DashboardStats, type RunListItem } from "../lib/types";

export function DashboardPageClient() {
  const { assignments, assignTicket } = useAgentAssignments();
  const { data: tickets, isLoading, error, setData } = useTicketsQuery();
  const stats = getDashboardStats(tickets, assignments);
  const visibleTickets = tickets.slice(0, 4);
  const visibleRuns = getRunItems(tickets).slice(0, 4);

  async function handleLaunch(ticketId: string) {
    const run = await launchRun(ticketId);

    setData((current) =>
      current.map((ticket) =>
        ticket.id === ticketId ? { ...ticket, activeRunId: run.runId } : ticket,
      ),
    );
  }

  return (
    <>
      <PageHeader
        kicker="Welcome back"
        title="Coordinate your agent fleet"
        subtitle="Operate Linear intake, assignment, and active run review from one shared dashboard."
        stats={stats}
      />
      <div className="surface-grid columns-2">
        <HeroPanel />
        <section className="panel">
          <SectionHeading
            title="Agent lane snapshot"
            subtitle="A quick read on who is busy before you launch another run."
            action={
              <Link href="/agents" className="button secondary">
                View all agents
              </Link>
            }
          />
          <div className="list-stack">
            {AGENT_SLOTS.slice(0, 3).map((agent) => (
              <AgentCard
                key={agent.id}
                agent={agent}
                tickets={tickets.filter((ticket) => assignments[ticket.id] === agent.id)}
              />
            ))}
          </div>
        </section>
      </div>
      <div className="surface-grid columns-2">
        <section className="panel">
          <SectionHeading
            title="Priority ticket queue"
            subtitle="The first Linear tickets visible to the frontend."
            action={
              <Link href="/tickets" className="button secondary">
                Open ticket board
              </Link>
            }
          />
          {isLoading ? <LoadingState label="Loading tickets" /> : null}
          {error ? <ErrorState title="Ticket load failed" copy={error} /> : null}
          {!isLoading && !error && visibleTickets.length === 0 ? (
            <EmptyState
              title="No tickets returned"
              copy="Linear did not return any issues for the current API key."
            />
          ) : null}
          {!isLoading && !error && visibleTickets.length > 0 ? (
            <div className="list-stack">
              {visibleTickets.map((ticket) => (
                <TicketCard
                  key={ticket.id}
                  ticket={ticket}
                  assignedAgent={assignments[ticket.id]}
                  onAssign={assignTicket}
                  onLaunch={(ticketId) => {
                    void handleLaunch(ticketId);
                  }}
                />
              ))}
            </div>
          ) : null}
        </section>
        <section className="panel">
          <SectionHeading
            title="Run visibility"
            subtitle="Recent active runs exposed to the dashboard."
            action={
              <Link href="/runs" className="button secondary">
                Open runs
              </Link>
            }
          />
          <RunsList runs={visibleRuns} />
        </section>
      </div>
    </>
  );
}

function getDashboardStats(
  tickets: { activeRunId?: string | null; state: string }[],
  assignments: Partial<Record<string, string>>,
): DashboardStats {
  return {
    openTickets: tickets.filter((ticket) => ticket.state.toLowerCase() !== "done").length,
    assignedTickets: Object.keys(assignments).length,
    activeRuns: tickets.filter((ticket) => Boolean(ticket.activeRunId)).length,
    draftPrs: 0,
  };
}

function getRunItems(
  tickets: Array<{ id: string; identifier: string; title: string; activeRunId?: string | null }>,
): RunListItem[] {
  return tickets
    .filter((ticket) => ticket.activeRunId)
    .map((ticket) => ({
      runId: ticket.activeRunId as string,
      ticketId: ticket.id,
      ticketIdentifier: ticket.identifier,
      ticketTitle: ticket.title,
      status: "running",
      stage: "active",
      updatedAt: null,
    }));
}
