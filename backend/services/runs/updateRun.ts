import { readFile, writeFile } from "node:fs/promises";

import { findRunPathByRunId, getStatusPath } from "../../utils/paths";
import type { RunStatus } from "./createRun";

type RunUpdates = Partial<Omit<RunStatus, "runId" | "ticketId" | "createdAt">>;

// Update the status file in place with a shallow merge.
export async function updateRun(runId: string, updates: RunUpdates): Promise<RunStatus> {
  const location = await findRunPathByRunId(runId);

  if (!location) {
    throw new Error(`Run ${runId} not found`);
  }

  const statusPath = getStatusPath(location.ticketId, runId);
  const existingStatus = JSON.parse(await readFile(statusPath, "utf8")) as RunStatus;
  const nextStatus: RunStatus = {
    ...existingStatus,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  await writeFile(statusPath, JSON.stringify(nextStatus, null, 2));

  return nextStatus;
}
