import { describe, it, expect } from "vitest";

describe("api module", () => {
  it("exports expected functions", async () => {
    const api = await import("./api");
    expect(typeof api.getLinearTickets).toBe("function");
    expect(typeof api.launchRun).toBe("function");
    expect(typeof api.getRun).toBe("function");
    expect(typeof api.getRunEvents).toBe("function");
    expect(typeof api.retryRun).toBe("function");
    expect(typeof api.cancelRun).toBe("function");
  });
});
