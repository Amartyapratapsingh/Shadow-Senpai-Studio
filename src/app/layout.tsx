import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import FallingStars from "@/components/FallingStars";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "REKVON Studio - AI Script & Audio",
  description:
    "AI-powered toolkit for creating YouTube-ready anime & manga scripts and cinematic voiceovers. By REKVON.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#0a0a0a] text-foreground overflow-x-hidden">
        {/* Falling stars — universe parallax effect on all pages */}
        <FallingStars />
        {/* Global red glow — strong, visible on every page */}
        <div className="fixed inset-0 pointer-events-none z-[2]"
          style={{ background: "radial-gradient(ellipse 100% 60% at 50% -5%, rgba(200, 20, 20, 0.35) 0%, rgba(150, 10, 10, 0.18) 30%, rgba(80, 5, 5, 0.08) 55%, transparent 80%)" }} />
        <div className="relative z-[3] flex flex-col min-h-full">
          {children}
        </div>
      </body>
    </html>
  );
}
