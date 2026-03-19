import { mkdir, writeFile } from "node:fs/promises";

import { createRunId } from "../../utils/ids";
import {
  getEventsPath,
  getRunPath,
  getScreenshotsPath,
  getStatusPath,
  getSummaryPath,
  getTestOutputPath,
  getTestResultsPath,
} from "../../utils/paths";

export type RunStatus = {
  runId: string;
  ticketId: string;
  status: "created" | "running" | "completed" | "failed" | "canceled";
  createdAt: string;
  updatedAt: string;
  sandboxId: string | null;
  canceledAt: string | null;
  completedAt: string | null;
  error: string | null;
};

function nowIso() {
  return new Date().toISOString();
}

// Create the folder structure and placeholder files for a new run.
export async function createRun(ticketId: string): Promise<RunStatus> {
  const runId = createRunId();
  const createdAt = nowIso();
  const runPath = getRunPath(ticketId, runId);

  await mkdir(runPath, { recursive: true });
  await mkdir(getScreenshotsPath(ticketId, runId), { recursive: true });

  const status: RunStatus = {
    runId,
    ticketId,
    status: "created",
    createdAt,
    updatedAt: createdAt,
    sandboxId: null,
    canceledAt: null,
    completedAt: null,
    error: null,
  };

  await Promise.all([
    writeFile(getStatusPath(ticketId, runId), JSON.stringify(status, null, 2)),
    writeFile(getEventsPath(ticketId, runId), ""),
    writeFile(getSummaryPath(ticketId, runId), ""),
    writeFile(getTestResultsPath(ticketId, runId), JSON.stringify({ commands: [] }, null, 2)),
    writeFile(getTestOutputPath(ticketId, runId), ""),
  ]);

  return status;
}
