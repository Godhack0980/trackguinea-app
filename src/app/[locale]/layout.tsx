import type { Metadata } from 'next';
import '../globals.css';
import { Toaster } from '@/components/ui/toaster';
import GlobalTranslationProvider from '@/components/global-translation-provider';
import { NextIntlClientProvider } from 'next-intl';
import fs from 'fs';
import path from 'path';

export const metadata: Metadata = {
  title: 'TransConnekt',
  description: 'TransConnekt — plateforme de mise en relation entre transporteurs et clients en Guinée.',
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
            messages[key] = JSON.parse(content);
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
          <GlobalTranslationProvider>
            {children}
          </GlobalTranslationProvider>
        </NextIntlClientProvider>
        <Toaster />
      </body>
    </html>
  );
}

