import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

// Cal Sans everywhere, the way the launch film sets it; Geist Mono for the odd bit of code.
const calSans = localFont({
  src: "./fonts/CalSansVF.woff2",
  variable: "--font-cal",
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// What a search result, a browser tab and a shared link say. The share card itself is
// app/opengraph-image.png; the favicon is app/icon.svg.
const title = "SuperGrid — Build, own and extend your marketing stack";
const description =
  "SuperGrid is a desktop app for creators and marketers. Install apps or build your own with Muse Code, keep every line in your own repo, and run it all on your own Cloudflare account.";

export const metadata: Metadata = {
  metadataBase: new URL("https://supergrid.com"),
  title,
  description,
  openGraph: {
    type: "website",
    url: "/",
    siteName: "SuperGrid",
    title: "SuperGrid — Introducing a new way to build",
    description,
  },
  twitter: {
    card: "summary_large_image",
    title: "SuperGrid — Introducing a new way to build",
    description,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${calSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
