import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

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
  description: "Create your identity. Meet real people. Roleplay your story. A real-person roleplay platform where users create person as and chat in character.",
  keywords: ["Chrona", "Roleplay", "Chat", "Personas", "Characters", "Creative Writing", "Social"],
  authors: [{ name: "Chrona Team" }],
  icons: {
    icon: "/logo.png",
  },
  openGraph: {
    title: "Chrona - Roleplay Universe",
    description: "Create your identity. Meet real people. Roleplay your story.",
    url: "https://chrona.app",
    siteName: "Chrona",
    type: "website",
    images: ["/logo.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Chrona - Roleplay Universe",
    description: "Create your identity. Meet real people. Roleplay your story.",
    images: ["/logo.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
        suppressHydrationWarning
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
