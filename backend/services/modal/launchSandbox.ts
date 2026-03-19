import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { TEST_REPO_CONFIG } from "../../../config/repo";
import { appendEvent } from "../runs/appendEvent";
import { getRun } from "../runs/getRun";
import { updateRun } from "../runs/updateRun";
import {
  getRunPath,
  getSummaryPath,
  getTestOutputPath,
  getTestResultsPath,
} from "../../utils/paths";

type LaunchSandboxInput = {
  ticketId: string;
  runId: string;
};

type ModalCommandResult = {
  command: string;
  status: "passed" | "failed";
  exitCode: number;
};

type ModalSmokeResult = {
  ok: boolean;
  sandboxId: string;
  summary: string;
  testResults: {
    summary: {
      passed: number;
      failed: number;
    };
    commands: ModalCommandResult[];
  };
  testOutput: string;
  error?: string | null;
};

type ModalRunOutput = {
  result: ModalSmokeResult | null;
  cliOutput: string;
};

const activeModalProcesses = new Map<string, ChildProcessWithoutNullStreams>();
const repoRoot = path.resolve(fileURLToPath(new URL("../../../", import.meta.url)));
const modalEntrypointPath = path.join(repoRoot, "modal", "sandbox.py");
const modalSourcePath = path.join(repoRoot, "modal");

async function isCanceled(runId: string) {
  const run = await getRun(runId);
  return run.status.status === "canceled";
}

function buildPythonPath() {
  const existingPythonPath = process.env.PYTHONPATH?.trim();
  return existingPythonPath
    ? `${modalSourcePath}${path.delimiter}${existingPythonPath}`
    : modalSourcePath;
}

function getModalResultPath(ticketId: string, runId: string) {
  return path.join(getRunPath(ticketId, runId), ".modal-result.json");
}

async function writeFailureArtifacts(ticketId: string, runId: string, message: string) {
  await Promise.all([
    writeFile(
      getSummaryPath(ticketId, runId),
      ["# Run Summary", "", "Modal smoke run failed.", "", message].join("\n"),
      "utf8",
    ),
    writeFile(
      getTestResultsPath(ticketId, runId),
      JSON.stringify(
        {
          summary: {
            passed: 0,
            failed: 1,
          },
          commands: [],
        },
        null,
        2,
      ),
      "utf8",
    ),
    writeFile(getTestOutputPath(ticketId, runId), `${message}\n`, "utf8"),
  ]);
}

async function writeSuccessArtifacts(
  ticketId: string,
  runId: string,
  result: ModalSmokeResult,
) {
  await appendEvent(runId, {
    ts: new Date().toISOString(),
    type: "sandbox.completed",
    message: "Modal smoke run finished",
  });

  await Promise.all([
    writeFile(getSummaryPath(ticketId, runId), `# Run Summary\n\n${result.summary}\n`, "utf8"),
    writeFile(getTestResultsPath(ticketId, runId), JSON.stringify(result.testResults, null, 2), "utf8"),
    writeFile(getTestOutputPath(ticketId, runId), result.testOutput, "utf8"),
  ]);
}

async function runModalCommand({
  ticketId,
  runId,
}: LaunchSandboxInput): Promise<ModalRunOutput> {
  const repoUrl = TEST_REPO_CONFIG.repoUrl.trim();

  if (!repoUrl) {
    throw new Error("TEST_REPO_URL is not configured");
  }

  const resultPath = getModalResultPath(ticketId, runId);
  const modalBinary = process.env.MODAL_BIN ?? "modal";
  const githubToken = process.env.GITHUB_TOKEN ?? "";
  const modalArgs = [
    "run",
    "--quiet",
    "--write-result",
    resultPath,
    `${modalEntrypointPath}::run_smoke`,
    "--ticket-id",
    ticketId,
    "--run-id",
    runId,
    "--repo-url",
    repoUrl,
    "--default-branch",
    TEST_REPO_CONFIG.defaultBranch,
    "--github-token",
    githubToken,
  ];
  const child = spawn(modalBinary, modalArgs, {
    cwd: repoRoot,
    env: {
      ...process.env,
      PYTHONPATH: buildPythonPath(),
    },
  });
  activeModalProcesses.set(runId, child);

  let cliOutput = "";
  child.stdout.on("data", (chunk) => {
    cliOutput += chunk.toString();
  });
  child.stderr.on("data", (chunk) => {
    cliOutput += chunk.toString();
  });

  const exitState = await new Promise<{ code: number | null; signal: NodeJS.Signals | null }>(
    (resolve, reject) => {
      child.once("error", reject);
      child.once("close", (code, signal) => {
        resolve({ code, signal });
      });
    },
  );

  activeModalProcesses.delete(runId);

  if (await isCanceled(runId)) {
    await rm(resultPath, { force: true }).catch(() => undefined);
    return {
      result: null,
      cliOutput,
    };
  }

  const resultRaw = await readFile(resultPath, "utf8").catch(() => "");
  await rm(resultPath, { force: true }).catch(() => undefined);

  if (!resultRaw.trim()) {
    const failureMessage = [
      `Modal run exited before writing a result file.`,
      `exitCode=${String(exitState.code)}`,
      exitState.signal ? `signal=${exitState.signal}` : null,
      cliOutput.trim() ? "" : null,
      cliOutput.trim() || null,
    ]
      .filter(Boolean)
      .join("\n");
    throw new Error(failureMessage);
  }

  return {
    result: JSON.parse(resultRaw) as ModalSmokeResult,
    cliOutput,
  };
}

async function runModalExecutor({ ticketId, runId }: LaunchSandboxInput): Promise<void> {
  await appendEvent(runId, {
    ts: new Date().toISOString(),
    type: "sandbox.starting",
    message: "Launching Modal smoke run",
  });
  await updateRun(runId, {
    status: "running",
    sandboxId: `modal-run:${runId}`,
  });
  await appendEvent(runId, {
    ts: new Date().toISOString(),
    type: "sandbox.ready",
    message: "Modal run started",
  });
  await appendEvent(runId, {
    ts: new Date().toISOString(),
    type: "agent.running",
    message: "Remote smoke checks are running",
  });

  const { result, cliOutput } = await runModalCommand({ ticketId, runId });

  if (await isCanceled(runId)) {
    await appendEvent(runId, {
      ts: new Date().toISOString(),
      type: "run.stopped",
      message: "Run stopped before Modal results were written locally",
    });
    return;
  }

  if (!result) {
    await appendEvent(runId, {
      ts: new Date().toISOString(),
      type: "run.stopped",
      message: "Run stopped before Modal finished",
    });
    return;
  }

  await writeSuccessArtifacts(ticketId, runId, result);

  if (result.ok) {
    await appendEvent(runId, {
      ts: new Date().toISOString(),
      type: "tests.passed",
      message: "Modal smoke checks passed",
    });
    await updateRun(runId, {
      status: "completed",
      completedAt: new Date().toISOString(),
      sandboxId: result.sandboxId,
      error: null,
    });
    return;
  }

  const failureMessage = result.error?.trim() || cliOutput.trim() || "Modal smoke run failed";
  await appendEvent(runId, {
    ts: new Date().toISOString(),
    type: "tests.failed",
    message: "Modal smoke checks failed",
  });
  await updateRun(runId, {
    status: "failed",
    sandboxId: result.sandboxId,
    error: failureMessage,
  });
}

export async function cancelSandboxRun(runId: string): Promise<boolean> {
  const activeProcess = activeModalProcesses.get(runId);

  if (!activeProcess) {
    return false;
  }

  activeProcess.kill("SIGTERM");
  setTimeout(() => {
    if (!activeProcess.killed) {
      activeProcess.kill("SIGKILL");
    }
  }, 2000).unref();

  return true;
}

// Keep the public signature aligned with the future OpenCode integration.
export async function launchSandbox(input: LaunchSandboxInput): Promise<void> {
  void runModalExecutor(input).catch(async (error) => {
    const message = error instanceof Error ? error.message : "Modal smoke run failed";

    await writeFailureArtifacts(input.ticketId, input.runId, message).catch(() => undefined);
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
