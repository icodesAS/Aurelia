import type { Metadata } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import NavBar from "@/components/NavBar";
import CursorGlow from "@/components/CursorGlow";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-cormorant",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "AURELIA — Find your people. Find your place.",
  description:
    "Find your people. Find your place. A cinematic AI-powered rental and shared living platform.",
  openGraph: {
    title: "AURELIA — Find your people. Find your place.",
    description:
      "Find your people. Find your place. A cinematic AI-powered rental and shared living platform.",
    type: "website",
  },
  icons: {
    icon: '/icon.svg',
    shortcut: '/icon.svg',
    apple: '/icon.svg',
  },
  twitter: {
    card: "summary_large_image",
    title: "AURELIA — Find your people. Find your place.",
    description:
      "Find your people. Find your place. A cinematic AI-powered rental and shared living platform.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${cormorant.variable} ${inter.variable}`}>
      <body suppressHydrationWarning className="min-h-screen flex flex-col">
        <AuthProvider>
          <CursorGlow />
          <NavBar />
          <main className="relative z-10 flex-1 pb-20 md:pb-0">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
