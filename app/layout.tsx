import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HackerX — Tweets worth keeping",
  description: "Tweets Hacker News readers have recommended again and again, filtered for timeless ideas.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
