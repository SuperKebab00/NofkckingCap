import type { Metadata } from "next";
import { SiteFooter } from "../components/site-footer";
import "./globals.css";

export const metadata: Metadata = {
  title: "No Cap Barbershop",
  description:
    "No Cap Barbershop: home, shop read-only, contatti e pagine informative della shell pubblica Next.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it">
      <body>
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
