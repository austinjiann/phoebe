"use client";

import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useState } from "react";

import type { AgentAssignmentState, AgentId } from "../lib/types";

const STORAGE_KEY = "phoebe-agent-assignments";

type AgentAssignmentsContextValue = {
  assignments: AgentAssignmentState;
  assignTicket: (ticketId: string, agentId: AgentId | null) => void;
};

const AgentAssignmentsContext = createContext<AgentAssignmentsContextValue | null>(null);

export function AgentAssignmentsProvider({ children }: { children: ReactNode }) {
  const [assignments, setAssignments] = useState<AgentAssignmentState>({});

  useEffect(() => {
    const stored = window.sessionStorage.getItem(STORAGE_KEY);

    if (!stored) {
      return;
    }

    try {
      setAssignments(JSON.parse(stored) as AgentAssignmentState);
    } catch {
      window.sessionStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(assignments));
  }, [assignments]);

  function assignTicket(ticketId: string, agentId: AgentId | null) {
    setAssignments((current) => {
      const next = { ...current };

      if (!agentId) {
        delete next[ticketId];
        return next;
      }

      next[ticketId] = agentId;
      return next;
    });
  }

  return (
    <AgentAssignmentsContext.Provider value={{ assignments, assignTicket }}>
      {children}
    </AgentAssignmentsContext.Provider>
  );
}

export function useAgentAssignments() {
  const context = useContext(AgentAssignmentsContext);

  if (!context) {
    throw new Error("useAgentAssignments must be used within AgentAssignmentsProvider");
  }

  return context;
}
