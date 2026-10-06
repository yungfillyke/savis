import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./savis-nav.css";
import "./savis-categories.css";
import "./savis-provider-list.css";
import "./savis-actions.css";
import "./savis-foryou.css";
import AppShell from "@/components/AppShell";

export const metadata: Metadata = {
  title: "SAVIS – Connect Needs to the Nearest Helpers",
  description:
    "Find trusted local help, goods and professionals near you in Kenya",
  applicationName: "SAVIS",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "SAVIS",
  },
  formatDetection: {
    telephone: false,
  },
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icon-192.png", sizes: "192x192", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#C7080C",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased"><AppShell>{children}</AppShell></body>
    </html>
  );
}
