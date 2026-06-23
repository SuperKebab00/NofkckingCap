import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "No Cap Next Migration Shell",
  description: "Parallel Next.js shell for the No Cap migration.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it">
      <body>{children}</body>
    </html>
  );
}
