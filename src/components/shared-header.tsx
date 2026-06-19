"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Logo from '@/components/logo';
import { Button } from '@/components/ui/button';
import { LogIn, UserPlus, Menu, X } from 'lucide-react';

const navLinks = [
  { href: '/', label: 'Accueil' },
  { href: '/services', label: 'Services' },
  { href: '/how-it-works', label: 'Comment ça marche ?' },
  { href: '/why-us', label: 'Pourquoi nous ?' },
  { href: '/testimonials', label: 'Témoignages' },
  { href: '/contact', label: 'Contact' },
];

export default function SharedHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const isHome = pathname === '/';

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /* Home page: transparent → indigo on scroll. All other pages: always indigo */
  const showDark = !isHome || scrolled;

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all duration-500 border-b ${
        showDark
          ? 'border-indigo-800/40 bg-gradient-to-r from-indigo-950/98 via-violet-950/96 to-indigo-950/98 backdrop-blur-xl shadow-2xl shadow-indigo-900/30'
          : 'border-white/10 bg-gradient-to-b from-black/50 via-black/20 to-transparent backdrop-blur-sm'
      }`}
    >
      <div className="container flex h-16 max-w-screen-2xl items-center justify-between px-4">
        {/* Logo – always white */}
        <div className="filter brightness-0 invert flex-shrink-0">
          <Logo />
        </div>

        {/* Desktop: Nav + Buttons on right */}
        <div className="flex items-center gap-2 md:gap-4">
          <nav className="hidden md:flex items-center gap-0.5 lg:gap-1">
            {navLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className={`nav-link text-xs lg:text-sm font-medium transition-colors px-2 py-1 rounded ${
                  pathname === link.href
                    ? 'text-white bg-white/10'
                    : 'text-white/70 hover:text-white hover:bg-white/5'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="hidden sm:flex items-center gap-2 ml-2">
            <Link href="/login">
              <Button variant="ghost" className="text-white/80 hover:text-white hover:bg-white/10 text-sm h-9 px-3">
                Se connecter <LogIn className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/signup/client">
              <Button
                className="btn-glow font-semibold text-white text-sm border-0 shadow-lg h-9"
                style={{ background: 'linear-gradient(135deg, hsl(322 85% 50%), hsl(340 90% 58%))' }}
              >
                S&apos;inscrire <UserPlus className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <div
        className={`md:hidden overflow-hidden transition-all duration-300 ${
          mobileOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="bg-indigo-950/99 backdrop-blur-xl border-t border-indigo-800/40 px-4 py-3 space-y-1">
          {navLinks.map(link => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className={`block text-sm font-medium py-2.5 border-b border-white/10 last:border-0 transition-colors ${
                pathname === link.href ? 'text-white' : 'text-white/70 hover:text-white'
              }`}
            >
              {link.label}
            </Link>
          ))}
          <div className="flex gap-2 pt-3">
            <Link href="/login" className="flex-1" onClick={() => setMobileOpen(false)}>
              <Button variant="ghost" className="w-full text-white/80 hover:text-white hover:bg-white/10 text-sm">
                Se connecter
              </Button>
            </Link>
            <Link href="/signup/client" className="flex-1" onClick={() => setMobileOpen(false)}>
              <Button
                className="w-full font-semibold text-white text-sm border-0"
                style={{ background: 'linear-gradient(135deg, hsl(322 85% 50%), hsl(340 90% 58%))' }}
              >
                S&apos;inscrire
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
