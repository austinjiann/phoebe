"use client";

import { useAgentAssignments } from "./AgentAssignmentsProvider";
import { EmptyState, ErrorState, LoadingState, PageHeader, RunsList, SectionHeading } from "./dashboard-ui";
import { useTicketsQuery } from "./useFrontendData";
import type { DashboardStats, RunListItem } from "../lib/types";

export function RunsPageClient() {
  const { assignments } = useAgentAssignments();
  const { data: tickets, isLoading, error } = useTicketsQuery();
  const runs = tickets
    .filter((ticket) => ticket.activeRunId)
    .map(
      (ticket): RunListItem => ({
        runId: ticket.activeRunId as string,
        ticketId: ticket.id,
        ticketIdentifier: ticket.identifier,
        ticketTitle: ticket.title,
        status: "running",
        stage: "active",
        updatedAt: null,
      }),
    );
  const stats = getStats(tickets, assignments);

  return (
    <>
      <PageHeader
        title="Current runs"
        subtitle="A lightweight run board for active work only, aligned with the MVP runtime model."
        stats={stats}
      />
      <section className="panel">
        <SectionHeading
          title="Active and recent runs"
          subtitle="This page surfaces runs when the frontend can derive them from API data."
        />
        {isLoading ? <LoadingState label="Loading run visibility" /> : null}
        {error ? <ErrorState title="Run list unavailable" copy={error} /> : null}
        {!isLoading && !error && runs.length === 0 ? (
          <EmptyState
            title="No visible runs"
            copy="Launch a run from the ticket board or expose active run ids through the API."
          />
        ) : null}
        {!isLoading && !error && runs.length > 0 ? <RunsList runs={runs} /> : null}
      </section>
    </>
  );
}

function getStats(
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
