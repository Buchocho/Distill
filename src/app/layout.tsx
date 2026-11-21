/**
 * The frame around every screen: page title, phone sizing, the Open Sans font and the dark
 * background. Also sends the device's date to the server (DeviceDate, SPEC.md rule 2c).
 * Distill is designed for phones (SPEC.md section 5). On phones and tablets content is kept to
 * 480 px wide. On a laptop or desktop (1024 px and up, since 21 Nov 2026) every screen is shown in
 * a phone-sized frame, with a panel beside it saying what Distill is and how to open it on a phone
 * (LaptopPanel). The frame scrolls on its own, so each screen's bottom tab bar stays at the bottom
 * of the frame, and pop-up panels stay inside it rather than covering the whole window.
 */

import type { Metadata, Viewport } from "next";
import "./globals.css";
import { DeviceDate } from "@/components/DeviceDate";
import { LaptopPanel } from "@/components/LaptopPanel";

export const metadata: Metadata = {
  title: "Distill",
  description: "Shared shopping, sorted. The fair way to split grocery bills.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#14110e" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600;700;800&display=swap"
        />
      </head>
      <body className="bg-ink text-ink antialiased lg:flex lg:h-dvh lg:items-center lg:justify-center lg:gap-20 lg:overflow-hidden">
        <DeviceDate />
        <LaptopPanel />
        <div className="phone-frame mx-auto min-h-dvh max-w-[480px] lg:mx-0 lg:h-[min(864px,calc(100dvh-48px))] lg:min-h-0 lg:w-[410px] lg:max-w-none lg:shrink-0 lg:overflow-hidden lg:rounded-[46px] lg:border-[10px] lg:border-[#2b2520] lg:shadow-[0_30px_80px_rgba(0,0,0,0.55)]">
          <div className="phone-screen lg:h-full lg:overflow-y-auto">{children}</div>
        </div>
      </body>
    </html>
  );
}
