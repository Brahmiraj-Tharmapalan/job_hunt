import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://openjobhunt.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "OpenJobHunt: a free, private, BYO-keys job hunt",
    template: "%s | OpenJobHunt",
  },
  description:
    "A privacy-first job-hunt dashboard. Bring your own AI keys, upload your CV, and get an AI-scored, deduplicated job list you can triage. No spam, no auto-apply, no per-user cost.",
  keywords: [
    "job search",
    "AI job matching",
    "privacy-first",
    "bring your own keys",
    "CV parsing",
    "job board aggregator",
  ],
  authors: [{ name: "OpenJobHunt" }],
  applicationName: "OpenJobHunt",
  icons: {
    icon: [
      { url: "/logo/favicon_32.png", sizes: "32x32", type: "image/png" },
      { url: "/logo/favicon_192.png", sizes: "192x192", type: "image/png" },
      { url: "/logo/favicon_512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: [{ url: "/logo/apple_touch_icon.png", sizes: "180x180" }],
  },
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: "OpenJobHunt",
    title: "OpenJobHunt: a free, private, BYO-keys job hunt",
    description:
      "Upload a CV, tune your filters, hit Sync, and triage an AI-scored job list. Your keys, your data, encrypted at rest.",
    images: [
      {
        url: "/logo/facebook_linkedin_preview_logo.png",
        width: 1200,
        height: 630,
        alt: "OpenJobHunt",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "OpenJobHunt: a free, private, BYO-keys job hunt",
    description:
      "Upload a CV, tune your filters, hit Sync, and triage an AI-scored job list. Your keys, your data, encrypted at rest.",
    images: ["/logo/twitter_x_preview_logo.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafaf9" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0f13" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
