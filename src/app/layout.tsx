import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from '@/components/ui/toaster';
import { BRAND, siteUrl } from '@/lib/brand';
import './globals.css';

// One typeface, nothing else (PRD 7.2).
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: `${BRAND.name} — ${BRAND.tagline}`,
    template: `%s — ${BRAND.name}`,
  },
  description:
    'Cotton, linen and wool clothing made in small runs in Pakistan. Everyday basics, occasion pieces and northern-valley outerwear.',
  openGraph: {
    type: 'website',
    siteName: BRAND.name,
    images: [{ url: '/og.png', width: 1200, height: 630, alt: BRAND.name }],
  },
  twitter: { card: 'summary_large_image', images: ['/og.png'] },
  alternates: { canonical: '/' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#1C1917',
};

/**
 * The shared shell: document, font and toasts, and nothing else.
 *
 * Storefront chrome (header, footer, cart) lives in the (shop) group's layout so
 * that /admin does not inherit a shopping header it has no use for.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="flex min-h-dvh flex-col">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
