import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { AuthFetchProvider } from "@/components/auth-fetch-provider";

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
    icon: "/logo.png",
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
    <html lang="en" className="dark theme-dark" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var stored = localStorage.getItem('chrona-theme');
                  var theme = stored || 'dark';
                  var root = document.documentElement;
                  root.classList.remove('theme-dark', 'theme-midnight', 'theme-forest', 'theme-light', 'dark');
                  root.classList.add('theme-' + theme);
                  if (theme !== 'light') root.classList.add('dark');
                } catch(e) {}
                try {
                  var uiStored = localStorage.getItem('chrona-ui-variant');
                  var uiVariant = uiStored || 'chrona';
                  var validVariants = ['chrona', 'chrona-v2', 'chrona-v3', 'horizon', 'pulse', 'nexus'];
                  // Migrate old variants
                  if (validVariants.indexOf(uiVariant) === -1) {
                    uiVariant = 'chrona';
                    localStorage.setItem('chrona-ui-variant', 'chrona');
                  }
                  root.classList.remove('ui-chrona', 'ui-chrona-v2', 'ui-chrona-v3', 'ui-horizon', 'ui-pulse', 'ui-nexus', 'ui-minimal', 'ui-bold', 'ui-elegant', 'ui-neon-cyber', 'ui-aurora', 'ui-retro-terminal');
                  root.classList.add('ui-' + uiVariant);
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
        suppressHydrationWarning
      >
        <AuthFetchProvider>
          {children}
        </AuthFetchProvider>
        <Toaster />
        {/* Disable context menu and dev tools shortcuts */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Disable right-click context menu
              document.addEventListener('contextmenu', function(e) {
                e.preventDefault();
                return false;
              });
              // Disable common dev tools shortcuts (F12, Ctrl+Shift+I/J, Ctrl+U)
              document.addEventListener('keydown', function(e) {
                // F12
                if (e.keyCode === 123) {
                  e.preventDefault();
                  return false;
                }
                // Ctrl+Shift+I (Inspector)
                if (e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.keyCode === 105)) {
                  e.preventDefault();
                  return false;
                }
                // Ctrl+Shift+J (Console)
                if (e.ctrlKey && e.shiftKey && (e.keyCode === 74 || e.keyCode === 106)) {
                  e.preventDefault();
                  return false;
                }
                // Ctrl+Shift+C (Element picker)
                if (e.ctrlKey && e.shiftKey && (e.keyCode === 67 || e.keyCode === 99)) {
                  e.preventDefault();
                  return false;
                }
                // Ctrl+U (View source)
                if (e.ctrlKey && (e.keyCode === 85 || e.keyCode === 117)) {
                  e.preventDefault();
                  return false;
                }
              });
            `,
          }}
        />
      </body>
    </html>
  );
}
