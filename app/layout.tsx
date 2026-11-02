import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ScrollManager } from "./components/scroll-manager";
import { ThemeColor } from "./components/theme-color";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist-sans", display: "swap" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono", display: "swap" });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://hackerx.nishachay.tech";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "HackerX — ideas worth keeping", template: "%s · HackerX" },
  description: "Timeless ideas recommended by Hacker News readers, with the comments that recommend them.",
  applicationName: "HackerX",
  authors: [{ name: "Nishachay", url: "https://nishachay.tech" }],
  creator: "Nishachay",
  publisher: "Nishachay",
  openGraph: {
    type: "website",
    siteName: "HackerX",
    title: "HackerX — ideas worth keeping",
    description: "Timeless ideas recommended by Hacker News readers.",
    url: siteUrl,
  },
  twitter: {
    card: "summary_large_image",
    title: "HackerX — ideas worth keeping",
    description: "Timeless ideas recommended by Hacker News readers.",
  },
  alternates: { types: { "application/rss+xml": "/rss.xml" } },
  icons: { icon: "/h-mark.svg", apple: "/apple-icon" },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  colorScheme: "dark light",
};

const themeScript = `(function(){try{var light=localStorage.getItem('hackerx-theme')==='light';if(light){document.documentElement.dataset.theme='light'}var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute('content',light?'#ffffff':'#000000')}catch(e){}})();`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geist.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <ScrollManager />
        <ThemeColor />
        {children}
      </body>
    </html>
  );
}
