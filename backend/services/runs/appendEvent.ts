import { appendFile } from "node:fs/promises";

import { findRunPathByRunId, getEventsPath } from "../../utils/paths";

export type RunEvent = {
  ts: string;
  type: string;
  message: string;
  data?: Record<string, unknown>;
};

// Append one JSON line to the run's event log.
export async function appendEvent(runId: string, event: RunEvent): Promise<void> {
  const location = await findRunPathByRunId(runId);

  if (!location) {
    throw new Error(`Run ${runId} not found`);
  }

  await appendFile(getEventsPath(location.ticketId, runId), `${JSON.stringify(event)}\n`, "utf8");
}
