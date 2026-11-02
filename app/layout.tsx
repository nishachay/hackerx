import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://hackerx.workers.dev"),
  title: { default: "HackerX — ideas worth keeping", template: "%s · HackerX" },
  description: "Timeless ideas recommended by Hacker News readers.",
  applicationName: "HackerX",
  openGraph: { type: "website", siteName: "HackerX", title: "HackerX — ideas worth keeping", description: "Timeless ideas recommended by Hacker News readers." },
  alternates: { types: { "application/rss+xml": "/rss.xml" } },
  icons: { icon: "/h-mark.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
