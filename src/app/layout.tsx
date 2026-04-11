import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { DisableContextMenu } from "@/components/disable-context-menu";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Chrona - Roleplay Universe",
  description: "Immersive roleplay universe with personas, storylines, and real-time chat.",
  keywords: ["Chrona", "roleplay", "storylines", "personas", "chat", "creative writing"],
  authors: [{ name: "Chrona Team" }],
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    title: "Chrona - Roleplay Universe",
    description: "Immersive roleplay universe with personas, storylines, and real-time chat",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Chrona - Roleplay Universe",
    description: "Immersive roleplay universe with personas, storylines, and real-time chat",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
        suppressHydrationWarning
      >
        <DisableContextMenu />
        {children}
        <Toaster />
      </body>
    </html>
  );
}