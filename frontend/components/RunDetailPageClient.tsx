"use client";

import { useState, useTransition } from "react";

import {
  ErrorState,
  LoadingState,
  PageHeader,
  RunControls,
  RunDetailTabs,
  SectionHeading,
  StatusBadge,
} from "./dashboard-ui";
import { useRunEventsQuery, useRunQuery } from "./useFrontendData";
import { cancelRun, createDraftPr, retryRun } from "../lib/api";
import type { DashboardStats } from "../lib/types";

export function RunDetailPageClient({ runId }: { runId: string }) {
  const { data: run, isLoading, error, setData } = useRunQuery(runId);
  const { data: events, error: eventsError } = useRunEventsQuery(run?.ticketId ?? null, runId);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const stats: DashboardStats = {
    openTickets: run ? 1 : 0,
    assignedTickets: run ? 1 : 0,
    activeRuns: run && (run.status === "queued" || run.status === "running") ? 1 : 0,
    draftPrs: run?.prUrl ? 1 : 0,
  };

  function runAction(action: () => Promise<void>) {
    startTransition(async () => {
      try {
        await action();
      } catch (actionError) {
        setMessage(actionError instanceof Error ? actionError.message : "Action failed");
      }
    });
  }

  return (
    <>
      <PageHeader
        kicker="Run detail"
        title={`Run ${runId}`}
        subtitle="Inspect current state, event output, and expected artifacts for one active attempt."
        stats={stats}
      />
      {isLoading ? <LoadingState label="Loading run detail" /> : null}
      {error ? <ErrorState title="Run detail failed" copy={error} /> : null}
      {!isLoading && run ? (
        <>
          <section className="panel">
            <SectionHeading
              title="Run controls"
              subtitle="These controls call the frontend API helpers and optimistically refresh local state."
              action={<StatusBadge status={run.status} />}
            />
            <div className="list-stack">
              <div className="activity-row">
                <strong>Ticket</strong>
                <p className="helper-copy">{run.ticketId}</p>
              </div>
              <div className="activity-row">
                <strong>Current stage</strong>
                <p className="helper-copy">{run.stage}</p>
              </div>
            </div>
            <div style={{ marginTop: 18 }}>
              <RunControls
                busy={isPending}
                onRetry={() =>
                  runAction(async () => {
                    const nextRun = await retryRun(run.ticketId);
                    setData(nextRun);
                    setMessage(`Retry requested for ${nextRun.runId}.`);
                  })
                }
                onCancel={() =>
                  runAction(async () => {
                    await cancelRun(run.ticketId, run.runId);
                    setData({ ...run, status: "canceled", stage: "canceled" });
                    setMessage(`Run ${run.runId} canceled.`);
                  })
                }
                onCreatePr={() =>
                  runAction(async () => {
                    const result = await createDraftPr(run.ticketId, run.runId);
                    setData({ ...run, prUrl: result.prUrl, branchName: result.branchName });
                    setMessage(
                      result.prUrl
                        ? `Draft PR created: ${result.prUrl}`
                        : "Draft PR request submitted, but no URL was returned yet.",
                    );
                  })
                }
              />
            </div>
            {message ? <p className="helper-copy" style={{ marginTop: 14 }}>{message}</p> : null}
            {eventsError ? (
              <p className="helper-copy" style={{ marginTop: 14 }}>
                {eventsError}
              </p>
            ) : null}
          </section>
          <RunDetailTabs run={run} events={events} />
        </>
      ) : null}
    </>
  );
}
