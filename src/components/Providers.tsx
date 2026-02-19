"use client";

import { SessionProvider } from "next-auth/react";
import { ReactNode } from "react";
import { GoogleEventsProvider } from "@/contexts/GoogleEventsContext";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <GoogleEventsProvider>{children}</GoogleEventsProvider>
    </SessionProvider>
  );
}
