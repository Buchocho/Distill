import type { Metadata, Viewport } from "next";
import "./globals.css";

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
      <body className="bg-ink text-ink antialiased">
        <div className="mx-auto min-h-dvh max-w-[480px]">{children}</div>
      </body>
    </html>
  );
}
