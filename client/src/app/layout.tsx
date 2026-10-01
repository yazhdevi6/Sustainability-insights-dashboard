import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sustainability Insights",
  description: "AI-powered supplier sustainability insights dashboard (prototype)",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <header className="border-b border-line bg-surface">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
            <Link href="/" className="flex items-center gap-2">
              <span aria-hidden className="grid size-7 place-items-center rounded-lg bg-good text-sm font-bold text-white">
                ◆
              </span>
              <span className="font-semibold text-ink">Sustainability Insights</span>
              <span className="hidden rounded-full bg-surface-2 px-2 py-0.5 text-xs text-muted sm:inline">Prototype</span>
            </Link>
            <nav className="text-sm text-ink-2">
              <Link href="/" className="hover:text-ink">
                Dashboard
              </Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">{children}</main>
      </body>
    </html>
  );
}
