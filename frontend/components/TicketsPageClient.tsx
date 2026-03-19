"use client";

import { useState, useTransition } from "react";

import { useAgentAssignments } from "./AgentAssignmentsProvider";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  SectionHeading,
  TicketsTable,
} from "./dashboard-ui";
import { useTicketsQuery } from "./useFrontendData";
import { launchRun } from "../lib/api";
import type { DashboardStats } from "../lib/types";

export function TicketsPageClient() {
  const { assignments, assignTicket } = useAgentAssignments();
  const { data: tickets, isLoading, error, setData } = useTicketsQuery();
  const [launchingTicketId, setLaunchingTicketId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const stats = getStats(tickets, assignments);

  function handleLaunch(ticketId: string) {
    setLaunchingTicketId(ticketId);

    startTransition(async () => {
      try {
        const run = await launchRun(ticketId);

        setData((current) =>
          current.map((ticket) =>
            ticket.id === ticketId ? { ...ticket, activeRunId: run.runId } : ticket,
          ),
        );
      } finally {
        setLaunchingTicketId(null);
      }
    });
  }

  return (
    <>
      <PageHeader
        title="Ticket control board"
        subtitle="Assign work to agent slots first, then launch parallel runs from the same queue."
        stats={stats}
      />
      <section className="panel">
        <SectionHeading
          title="Queue"
          subtitle="Frontend-managed assignment with API-backed ticket data."
        />
        {isLoading ? <LoadingState label="Loading Linear tickets" /> : null}
        {error ? <ErrorState title="Ticket load failed" copy={error} /> : null}
        {!isLoading && !error && tickets.length === 0 ? (
          <EmptyState
            title="No tickets returned"
            copy="Check the Linear API key or issue visibility, then refresh."
          />
        ) : null}
        {!isLoading && !error && tickets.length > 0 ? (
          <TicketsTable
            tickets={tickets}
            assignments={assignments}
            onAssign={assignTicket}
            onLaunch={handleLaunch}
            launchingTicketId={isPending ? launchingTicketId : null}
          />
        ) : null}
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
