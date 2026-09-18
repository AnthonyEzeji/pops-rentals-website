import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { config } from "@/lib/config";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  // Without this, the icon and Open Graph image resolve to relative paths and
  // most link previews (iMessage, Slack, WhatsApp) show nothing.
  metadataBase: new URL(config.appUrl),
  title: {
    default: `${config.businessName} — vehicle rental & chauffeur hire`,
    template: `%s · ${config.businessName}`,
  },
  description:
    "Browse the fleet, book a self-drive rental online, or request a chauffeur-driven trip.",
  openGraph: {
    type: "website",
    siteName: config.businessName,
    title: `${config.businessName} — vehicle rental & chauffeur hire`,
    description:
      "Browse the fleet, book a self-drive rental online, or request a chauffeur-driven trip.",
    url: config.appUrl,
  },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
