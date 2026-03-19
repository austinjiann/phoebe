import type { ReactNode } from "react";

import "./globals.css";

import { AgentAssignmentsProvider } from "../components/AgentAssignmentsProvider";
import { AppShell } from "../components/AppShell";

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body>
        <AgentAssignmentsProvider>
          <AppShell>{children}</AppShell>
        </AgentAssignmentsProvider>
      </body>
    </html>
  );
}
