import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";

import "./globals.css";

export const metadata: Metadata = {
  title: "Flowboard — Kanban for focused teams",
  description:
    "Plan, move, and ship work on a fast, optimistic Kanban board with search, filters, tags, and due dates.",
  applicationName: "Flowboard",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-dvh font-sans">
        {children}
        <Toaster
          position="bottom-right"
          closeButton
          richColors
          toastOptions={{ className: "font-sans" }}
        />
      </body>
    </html>
  );
}
