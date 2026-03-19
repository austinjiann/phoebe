import { describe, it, expect } from "vitest";
import { AGENT_SLOTS } from "./types";

describe("types", () => {
  it("defines 4 agent slots", () => {
    expect(AGENT_SLOTS).toHaveLength(4);
  });

  it("each slot has required fields", () => {
    for (const slot of AGENT_SLOTS) {
      expect(slot.id).toBeTruthy();
      expect(slot.label).toBeTruthy();
      expect(slot.name).toBeTruthy();
      expect(slot.description).toBeTruthy();
    }
  });

  it("slot ids are unique", () => {
    const ids = AGENT_SLOTS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
