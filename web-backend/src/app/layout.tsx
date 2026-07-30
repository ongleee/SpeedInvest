// Minimal Next.js root layout (required for App Router)
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SpeedInvest API",
  description: "Agentic AI backend for penny stock analysis",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
