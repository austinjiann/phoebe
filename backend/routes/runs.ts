import type { Hono } from "hono";

import { cancelSandboxRun, launchSandbox } from "../services/modal/launchSandbox";
import { appendEvent } from "../services/runs/appendEvent";
import { createRun } from "../services/runs/createRun";
import { getRun } from "../services/runs/getRun";
import { updateRun } from "../services/runs/updateRun";

type CreateRunBody = {
  ticketId?: unknown;
};

export function registerRunRoutes(app: Hono) {
  app.post("/runs", async (c) => {
    const body = (await c.req.json().catch(() => ({}))) as CreateRunBody;
    const ticketId = typeof body.ticketId === "string" ? body.ticketId.trim() : "";

    if (!ticketId) {
      return c.json({ error: "ticketId is required" }, 400);
    }

    const run = await createRun(ticketId);
    await appendEvent(run.runId, {
      ts: new Date().toISOString(),
      type: "run.started",
      message: "Run created",
    });
    void launchSandbox({
      ticketId,
      runId: run.runId,
    });

    return c.json({ runId: run.runId }, 201);
  });

  app.get("/runs/:runId", async (c) => {
    const runId = c.req.param("runId");

    try {
      const run = await getRun(runId);
      return c.json(run);
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        return c.json({ error: error.message }, 404);
      }
      throw error;
    }
  });

  app.post("/runs/:runId/retry", async (c) => {
    const runId = c.req.param("runId");

    try {
      const existingRun = await getRun(runId);
      const newRun = await createRun(existingRun.status.ticketId);

      await appendEvent(newRun.runId, {
        ts: new Date().toISOString(),
        type: "run.started",
        message: "Retry run created",
        data: { previousRunId: runId },
      });
      await appendEvent(newRun.runId, {
        ts: new Date().toISOString(),
        type: "run.retried_from",
        message: `Retried from ${runId}`,
        data: { previousRunId: runId },
      });

      void launchSandbox({
        ticketId: existingRun.status.ticketId,
        runId: newRun.runId,
      });

      return c.json({ runId: newRun.runId }, 201);
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        return c.json({ error: error.message }, 404);
      }
      throw error;
    }
  });

  app.post("/runs/:runId/cancel", async (c) => {
    const runId = c.req.param("runId");

    try {
      const existingRun = await getRun(runId);

      if (existingRun.status.status === "completed" || existingRun.status.status === "canceled") {
        return c.json(existingRun.status);
      }

      await cancelSandboxRun(runId).catch(() => false);
      const canceledRun = await updateRun(runId, {
        status: "canceled",
        canceledAt: new Date().toISOString(),
      });

      await appendEvent(runId, {
        ts: new Date().toISOString(),
        type: "run.canceled",
        message: "Run canceled",
      });

      return c.json(canceledRun);
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        return c.json({ error: error.message }, 404);
      }
      throw error;
    }
  });
}
