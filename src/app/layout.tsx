import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import ChatWidget from "@/components/ChatWidget";
import GmailSync from "@/components/GmailSync";
import OwnerKeyDialog from "@/components/OwnerKeyDialog";
import RadarLogo from "@/components/RadarLogo";
import { isGmailConnected } from "@/lib/gmail-auth";
import { isOwnerProtected } from "@/lib/owner";
import "./globals.css";

// The header's Gmail-connected state comes from Firestore — render all
// pages per-request so it can never go stale in a static shell.
export const dynamic = "force-dynamic";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Rupee Radar",
  description:
    "Catches every receipt, flags every subscription — an AI agent that turns scattered receipts into a weekly spending dashboard you can talk to.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const gmailConnected = await isGmailConnected();
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <header className="border-b border-gray-200 dark:border-gray-800">
          <nav className="mx-auto flex w-full max-w-3xl items-center gap-6 px-6 py-3 text-sm">
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <RadarLogo className="h-[22px] w-[22px] text-emerald-600 dark:text-emerald-400" />
              Rupee Radar
            </Link>
            <Link
              href="/upload"
              className="text-gray-500 hover:text-gray-900 dark:hover:text-gray-100"
            >
              Upload
            </Link>
            <span className="ml-auto">
              <GmailSync
                connected={gmailConnected}
                protectionEnabled={isOwnerProtected()}
              />
            </span>
          </nav>
        </header>
        {children}
        <ChatWidget />
        <OwnerKeyDialog />
      </body>
    </html>
  );
}
