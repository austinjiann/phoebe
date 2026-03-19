import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import {
  findRunPathByRunId,
  getEventsPath,
  getScreenshotsPath,
  getStatusPath,
} from "../../utils/paths";
import type { RunStatus } from "./createRun";
import type { RunEvent } from "./appendEvent";

export type RunDetails = {
  status: RunStatus;
  events: RunEvent[];
  artifacts: string[];
};

// Read the current status, event log, and visible artifacts for a run.
export async function getRun(runId: string): Promise<RunDetails> {
  const location = await findRunPathByRunId(runId);

  if (!location) {
    throw new Error(`Run ${runId} not found`);
  }

  const [statusRaw, eventsRaw, screenshotNames] = await Promise.all([
    readFile(getStatusPath(location.ticketId, runId), "utf8"),
    readFile(getEventsPath(location.ticketId, runId), "utf8").catch(() => ""),
    readdir(getScreenshotsPath(location.ticketId, runId)).catch(() => []),
  ]);

  const status = JSON.parse(statusRaw) as RunStatus;
  const events = eventsRaw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as RunEvent);

  const artifacts = [
    "summary.md",
    "test-results.json",
    "test-output.txt",
    ...screenshotNames.map((name) => path.join("screenshots", name)),
  ];

  return {
    status,
    events,
    artifacts,
  };
}
