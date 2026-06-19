import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { Poppins, PT_Sans } from 'next/font/google'

export const metadata: Metadata = {
  title: 'TransConnekt',
  description: 'TransConnekt — plateforme de mise en relation entre transporteurs et clients en Guinée.',
};

const poppins = Poppins({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-poppins',
  weight: ['400', '600', '700']
})

const ptSans = PT_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-pt-sans',
  weight: ['400', '700']
})


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${poppins.variable} ${ptSans.variable}`}>
      <body className="font-body antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
