import type { Metadata } from 'next';
import './globals.css';
import { QueryProvider } from '@/components/providers/QueryProvider';
import { ToastProvider } from '@/components/shared/Toast';
import { ConditionalHeader } from '@/components/layout/ConditionalHeader';
import { ConditionalBottomNav } from '@/components/layout/ConditionalBottomNav';
import { ConnectionStatus } from '@/components/shared/ConnectionStatus';
import { ConditionalFooter } from '@/components/layout/ConditionalFooter';
import { CookieConsent } from '@/components/privacy/CookieConsent';
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";
import { SITE_URL } from '@/lib/site';

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: { default: 'Milevo — Compare before you buy', template: '%s — Milevo' },
  description: "Find products, compare prices across Ghana's top stores, and see where to shop.",
  openGraph: {
    title: 'Milevo — Compare before you buy',
    description: "Find products, compare prices across Ghana's top stores, and see where to shop.",
    type: 'website',
    siteName: 'Milevo',
  },
  metadataBase: SITE_URL,
  icons: {
    icon: '/milevo-logo.png',
    shortcut: '/milevo-logo.png',
    apple: '/milevo-logo.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable)} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(()=>{try{const k='milevo-theme',s=localStorage.getItem(k),d=s==='dark'||(!s&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);document.documentElement.style.colorScheme=d?'dark':'light'}catch{}})()`,
          }}
        />
      </head>
      <body>
        <a href="#main-content" className="skip-link">Skip to content</a>
        <QueryProvider>
          <ToastProvider>
            <ConditionalHeader />
            <ConnectionStatus />
            <main id="main-content">{children}</main>
            <ConditionalBottomNav />
            <ConditionalFooter />
            <CookieConsent />
          </ToastProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
