import type { Metadata } from "next";
import { Barlow_Condensed, Inter } from "next/font/google";
import { SiteFooter } from "../components/site-footer";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

const barlowCondensed = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800", "900"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "No Cap Barbershop",
  description:
    "No Cap Barber Shop: shop prodotti barber professionali, contatti, checkout in shop e area admin protetta.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it">
      <body className={`${inter.variable} ${barlowCondensed.variable}`}>
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
