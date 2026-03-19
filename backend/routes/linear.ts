import type { Hono } from "hono";

import { fetchLinearIssues } from "../services/linear/client";

export function registerLinearRoutes(app: Hono) {
  app.get("/linear/issues", async (c) => {
    try {
      const issues = await fetchLinearIssues();
      return c.json(issues);
    } catch (error) {
      return c.json(
        {
          error: error instanceof Error ? error.message : "Failed to fetch Linear issues",
        },
        500,
      );
    }
  });
}
