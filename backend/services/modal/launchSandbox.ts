import { writeFile } from "node:fs/promises";

import { appendEvent } from "../runs/appendEvent";
import { getRun } from "../runs/getRun";
import { updateRun } from "../runs/updateRun";
import {
  getSummaryPath,
  getTestOutputPath,
  getTestResultsPath,
} from "../../utils/paths";

type LaunchSandboxInput = {
  ticketId: string;
  runId: string;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function isCanceled(runId: string) {
  const run = await getRun(runId);
  return run.status.status === "canceled";
}

// Simulate the sandbox lifecycle so the rest of the backend can be tested locally.
async function runFakeExecutor({ ticketId, runId }: LaunchSandboxInput): Promise<void> {
  await appendEvent(runId, {
    ts: new Date().toISOString(),
    type: "sandbox.starting",
    message: "Sandbox is starting",
  });
  await sleep(1000);
  if (await isCanceled(runId)) {
    await appendEvent(runId, {
      ts: new Date().toISOString(),
      type: "run.stopped",
      message: "Run stopped before sandbox became ready",
    });
    return;
  }

  await updateRun(runId, {
    status: "running",
    sandboxId: `fake-${runId}`,
  });
  await appendEvent(runId, {
    ts: new Date().toISOString(),
    type: "sandbox.ready",
    message: "Sandbox is ready",
  });
  await sleep(1000);
  if (await isCanceled(runId)) {
    await appendEvent(runId, {
      ts: new Date().toISOString(),
      type: "run.stopped",
      message: "Run stopped before agent execution",
    });
    return;
  }

  await appendEvent(runId, {
    ts: new Date().toISOString(),
    type: "agent.running",
    message: "OpenCode agent is running",
  });
  await sleep(2000);
  if (await isCanceled(runId)) {
    await appendEvent(runId, {
      ts: new Date().toISOString(),
      type: "run.stopped",
      message: "Run stopped before test output was written",
    });
    return;
  }

  await Promise.all([
    writeFile(
      getSummaryPath(ticketId, runId),
      [
        `# Run Summary`,
        ``,
        `Fake executor completed successfully for ${ticketId}.`,
        `This is the placeholder summary for future OpenCode output.`,
      ].join("\n"),
      "utf8",
    ),
    writeFile(
      getTestResultsPath(ticketId, runId),
      JSON.stringify(
        {
          summary: {
            passed: 1,
            failed: 0,
          },
          commands: [
            {
              command: "pnpm test",
              status: "passed",
            },
          ],
        },
        null,
        2,
      ),
      "utf8",
    ),
    writeFile(
      getTestOutputPath(ticketId, runId),
      ["Running fake test suite...", "All tests passed."].join("\n"),
      "utf8",
    ),
  ]);

  await appendEvent(runId, {
    ts: new Date().toISOString(),
    type: "tests.passed",
    message: "Fake test suite passed",
  });
  await updateRun(runId, {
    status: "completed",
    completedAt: new Date().toISOString(),
  });
}

// Keep the public signature aligned with the future Modal integration.
export async function launchSandbox(input: LaunchSandboxInput): Promise<void> {
  void runFakeExecutor(input).catch(async (error) => {
    const message = error instanceof Error ? error.message : "Fake executor failed";

    await appendEvent(input.runId, {
      ts: new Date().toISOString(),
      type: "run.failed",
      message,
    }).catch(() => undefined);
    await updateRun(input.runId, {
      status: "failed",
      error: message,
    }).catch(() => undefined);
  });
}
