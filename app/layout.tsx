import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist-sans", display: "swap" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono", display: "swap" });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://hackerx.nishachay.tech";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "HackerX — ideas worth keeping", template: "%s · HackerX" },
  description: "Timeless ideas recommended by Hacker News readers, with the comments that recommend them.",
  applicationName: "HackerX",
  openGraph: {
    type: "website",
    siteName: "HackerX",
    title: "HackerX — ideas worth keeping",
    description: "Timeless ideas recommended by Hacker News readers.",
    url: siteUrl,
  },
  alternates: { types: { "application/rss+xml": "/rss.xml" } },
  icons: { icon: "/h-mark.svg" },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  colorScheme: "dark light",
};

const themeScript = `(function(){try{if(localStorage.getItem('hackerx-theme')==='light'){document.documentElement.dataset.theme='light'}}catch(e){}})();`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geist.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        {children}
      </body>
    </html>
  );
}
