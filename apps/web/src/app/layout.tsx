import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { ExcerptBasketTrigger } from "@/components/excerpt";
import { Providers } from "@/components/providers";
import { SearchProvider, SearchTrigger } from "@/components/search";
import { Button } from "@/components/ui/button";
import {
  BackToTop,
  BottomNav,
  HeaderNav,
  NetworkStatusBadge,
  ReadingProgress,
  ThemeToggle,
} from "@/components/ui/nav";
import { Toaster } from "@/components/ui/toast";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "BrennerBot",
    template: "%s | BrennerBot",
  },
  description:
    "Research lab for operationalizing Sydney Brenner's scientific methodology via multi-agent collaboration.",
  keywords: [
    "Sydney Brenner",
    "research methodology",
    "AI",
    "multi-agent",
    "science",
    "Nobel Prize",
    "molecular biology",
    "bacteriophage",
  ],
  authors: [{ name: "BrennerBot" }],
  creator: "BrennerBot",
  publisher: "BrennerBot",
  metadataBase: new URL("https://brennerbot.org"),
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://brennerbot.org",
    siteName: "BrennerBot",
    title: "BrennerBot",
    description:
      "Operationalizing Sydney Brenner's scientific methodology via multi-agent collaboration. 236 interview segments, 3 model distillations, 40k+ words of wisdom.",
  },
  twitter: {
    card: "summary_large_image",
    site: "@brennerbot",
    creator: "@brennerbot",
    title: "BrennerBot",
    description:
      "Operationalizing Sydney Brenner's scientific methodology via multi-agent collaboration.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#141414" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const labModeValue = (process.env.BRENNER_LAB_MODE ?? "").trim().toLowerCase();
  const labModeEnabled = labModeValue === "1" || labModeValue === "true";

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const stored = localStorage.getItem('theme');
                  const prefersDark =
                    typeof window.matchMedia === 'function' &&
                    window.matchMedia('(prefers-color-scheme: dark)').matches;
                  const theme = stored === 'dark' || stored === 'light'
                    ? stored
                    : (prefersDark ? 'dark' : 'light');
                  document.documentElement.classList.toggle('dark', theme === 'dark');
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Providers>
          <SearchProvider>
            <div className="min-h-dvh flex flex-col bg-background text-foreground">
              {/* Reading Progress */}
              <ReadingProgress />

              {/* Header */}
              <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
                <div className="container-default">
                  <div className="flex h-16 items-center justify-between">
                    {/* Logo */}
                    <Link
                      href="/"
                      className="group flex items-center gap-2 font-semibold tracking-tight text-foreground transition-colors hover:text-primary"
                    >
                      <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-bold transition-transform group-hover:scale-105">
                        B
                      </span>
                      <span className="hidden sm:inline">BrennerBot</span>
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="flex items-center gap-2">
                      <HeaderNav />

                      {/* Global Search */}
                      <SearchTrigger className="flex" />
                      <ExcerptBasketTrigger className="flex" />

                      {labModeEnabled && (
                        <Button asChild size="sm" className="hidden lg:inline-flex ml-2">
                          <Link href="/sessions/new">New Session</Link>
                        </Button>
                      )}

                      <NetworkStatusBadge className="flex" />
                      <ThemeToggle />
                    </div>
                  </div>
                </div>
              </header>

              {/* Main Content */}
              <main className="flex-1 pb-mobile-nav">
                <div className="container-default py-8 lg:py-12">{children}</div>
              </main>

              {/* Footer - Desktop only, hidden when bottom nav is visible */}
              <footer className="hidden lg:block border-t border-border/50 bg-muted/20">
                <div className="container-default py-8">
                  <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="flex size-6 items-center justify-center rounded bg-primary text-primary-foreground text-xs font-bold">
                          B
                        </span>
                        <span className="font-semibold">BrennerBot</span>
                      </div>
                      <p className="text-sm text-muted-foreground max-w-md">
                        Research lab for operationalizing Sydney Brenner&apos;s scientific
                        methodology via multi-agent collaboration.
                      </p>
                    </div>

                    <div className="flex flex-col gap-4 sm:items-end">
                      <div className="flex items-center gap-6 text-sm">
                        <a
                          href="https://github.com/Dicklesworthstone/brenner_bot"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-foreground transition-colors link-underline"
                        >
                          GitHub
                        </a>
                        <a
                          href="https://github.com/Dicklesworthstone/mcp_agent_mail"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-foreground transition-colors link-underline"
                        >
                          Agent Mail
                        </a>
                      </div>
                      <p className="text-xs text-muted-foreground/60">
                        Built with Next.js + Bun. Coordinated via Agent Mail.
                      </p>
                    </div>
                  </div>
                </div>
              </footer>

              {/* Mobile Bottom Navigation */}
              <BottomNav />

              {/* Back to Top Button */}
              <BackToTop />

              {/* Toast Notifications */}
              <Toaster />
            </div>
          </SearchProvider>
        </Providers>
      </body>
    </html>
  );
}
