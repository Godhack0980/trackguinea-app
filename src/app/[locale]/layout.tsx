import type { Metadata } from 'next';
import '../globals.css';
import { Toaster } from '@/components/ui/toaster';
import GlobalTranslationProvider from '@/components/global-translation-provider';
import { AuthProvider } from '@/context/auth-context';
import { NextIntlClientProvider } from 'next-intl';
import fs from 'fs';
import path from 'path';

export const metadata: Metadata = {
  metadataBase: new URL('https://transconnekt.com'),
  title: {
    default: 'TransConnekt — N°1 Plateforme & Société de Transport en Guinée et en Afrique',
    template: '%s | TransConnekt Guinée',
  },
  description: 'TransConnekt (Transconnect Guinée) est la première plateforme de mise en relation et société de transport routier de marchandises, fret, camions et colis en Guinée et en Afrique.',
  keywords: [
    'Transport en Guinée',
    'Transport en Guinee',
    'societe de transport en Guinee et l\'afrique',
    'société de transport en Guinée et l\'Afrique',
    'Plateforme de transport en guinee et afrique',
    'Plateforme de transport en Guinée et Afrique',
    'TransConnekt',
    'Transconnect',
    'Transconnect Guinée',
    'TransConnekt Guinée',
    'TrackGuinea',
    'transport routier Conakry',
    'fret Guinée',
    'camion transport Guinée',
    'livraison colis Guinée'
  ],
  alternates: {
    canonical: 'https://transconnekt.com',
    languages: {
      'fr-GN': 'https://transconnekt.com/fr',
      'en-US': 'https://transconnekt.com/en',
      'es-ES': 'https://transconnekt.com/es',
      'pt-PT': 'https://transconnekt.com/pt',
      'ar-SA': 'https://transconnekt.com/ar',
      'de-DE': 'https://transconnekt.com/de',
      'zh-CN': 'https://transconnekt.com/zh',
    },
  },
  openGraph: {
    title: 'TransConnekt — N°1 Plateforme & Société de Transport en Guinée et en Afrique',
    description: 'Plateforme digitale leader pour le transport de marchandises, colis et fret routier en Guinée et en Afrique.',
    url: 'https://transconnekt.com',
    siteName: 'TransConnekt',
    locale: 'fr_GN',
    type: 'website',
    images: [
      {
        url: 'https://transconnekt.com/transconnekt-logo.png',
        width: 1200,
        height: 630,
        alt: 'TransConnekt — Société de Transport en Guinée et en Afrique',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TransConnekt — N°1 Plateforme & Société de Transport en Guinée et en Afrique',
    description: 'Plateforme digitale leader pour le transport de marchandises, colis et fret routier en Guinée et en Afrique.',
    images: ['https://transconnekt.com/transconnekt-logo.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

const SUPPORTED_LOCALES = ['fr', 'en', 'es', 'pt', 'ar', 'de', 'zh'];
const DEFAULT_LOCALE = 'fr';

async function loadMessages(locale: string): Promise<Record<string, any>> {
  const safeLocale = SUPPORTED_LOCALES.includes(locale) ? locale : DEFAULT_LOCALE;
  const messagesDir = path.join(process.cwd(), 'src/messages', safeLocale);
  const messages: Record<string, any> = {};

  try {
    if (fs.existsSync(messagesDir)) {
      const files = fs.readdirSync(messagesDir);
      for (const file of files) {
        if (file.endsWith('.json')) {
          const key = path.basename(file, '.json');
          const filePath = path.join(messagesDir, file);
          try {
            const content = fs.readFileSync(filePath, 'utf-8');
            if (content && content.trim()) {
              messages[key] = JSON.parse(content);
            }
          } catch (e) {
            console.error(`Failed to load translation file: ${filePath}`, e);
          }
        }
      }
    }
  } catch (e) {
    console.error(`Failed to read messages directory for locale: ${safeLocale}`, e);
  }

  return messages;
}

export default async function RootLayout({
  children,
  params
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  console.log('RootLayout rendering with locale:', locale);
  const messages = await loadMessages(locale);
  console.log('Loaded messages keys count for', locale, ':', Object.keys(messages).length);

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&family=PT+Sans:wght@400;700&display=swap" rel="stylesheet" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "Organization",
                  "@id": "https://transconnekt.com/#organization",
                  "name": "TransConnekt",
                  "legalName": "TransConnekt SARL",
                  "alternateName": [
                    "Transconnect",
                    "Transconnect Guinée",
                    "TransConnekt Guinée",
                    "TrackGuinea",
                    "TransConnect"
                  ],
                  "url": "https://transconnekt.com",
                  "logo": "https://transconnekt.com/transconnekt-logo.png",
                  "image": "https://transconnekt.com/transconnekt-logo.png",
                  "description": "Première plateforme digitale et société de transport routier de marchandises, fret et logistique en Guinée et en Afrique.",
                  "address": {
                    "@type": "PostalAddress",
                    "addressLocality": "Conakry",
                    "addressCountry": "GN"
                  },
                  "contactPoint": {
                    "@type": "ContactPoint",
                    "telephone": "+224-612-00-01-02",
                    "contactType": "customer service",
                    "areaServed": ["GN", "AF"],
                    "availableLanguage": ["French", "English", "Arabic"]
                  },
                  "sameAs": ["https://transconnekt.com"]
                },
                {
                  "@type": "WebSite",
                  "@id": "https://transconnekt.com/#website",
                  "url": "https://transconnekt.com",
                  "name": "TransConnekt",
                  "alternateName": ["Transconnect", "TransConnekt Guinée"],
                  "publisher": {
                    "@id": "https://transconnekt.com/#organization"
                  },
                  "inLanguage": "fr-GN"
                }
              ]
            })
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if (typeof window !== 'undefined') {
                const originalError = console.error;
                console.error = function(...args) {
                  if (args[0] && typeof args[0] === 'string' && args[0].includes('INTERNAL ASSERTION FAILED')) {
                    console.warn('Firebase Dev Warning (Suppressed crash overlay):', ...args);
                    return;
                  }
                  originalError.apply(console, args);
                };
              }
            `
          }}
        />
      </head>
      <body className="font-body antialiased">
        <NextIntlClientProvider messages={messages} locale={locale}>
          <AuthProvider>
            <GlobalTranslationProvider>
              {children}
            </GlobalTranslationProvider>
          </AuthProvider>
        </NextIntlClientProvider>
        <Toaster />
      </body>
    </html>
  );
}

