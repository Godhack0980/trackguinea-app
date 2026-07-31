"use client";

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Logo from '@/components/logo';
import { Button } from '@/components/ui/button';
import { LogIn, UserPlus, Menu, X, ChevronDown } from 'lucide-react';
import { useTranslation } from '@/lib/translations';
import type { Language } from '@/lib/translations';

/* ─── Language config ─────────────────────────────────────── */
const LANGUAGES: { code: Language; flag: string; label: string; name: string }[] = [
  { code: 'fr', flag: '🇫🇷', label: 'FR', name: 'Français' },
  { code: 'en', flag: '🇬🇧', label: 'EN', name: 'English' },
  { code: 'es', flag: '🇪🇸', label: 'ES', name: 'Español' },
  { code: 'pt', flag: '🇧🇷', label: 'PT', name: 'Português' },
  { code: 'ar', flag: '🇸🇦', label: 'AR', name: 'العربية' },
  { code: 'de', flag: '🇩🇪', label: 'DE', name: 'Deutsch' },
  { code: 'zh', flag: '🇨🇳', label: 'ZH', name: '中文' },
];

/* ─── Nav links config (keys map to home.json nav_* keys) ─── */
const NAV_KEYS: { href: string; key: string }[] = [
  { href: '/',             key: 'nav_home' },
  { href: '/services',     key: 'nav_services' },
  { href: '/offers',       key: 'nav_offers' },
  { href: '/fleet',        key: 'nav_vehicles' },
  { href: '/how-it-works', key: 'nav_how' },
  { href: '/docs',         key: 'nav_docs' },
  { href: '/why-us',       key: 'nav_why' },
  { href: '/testimonials', key: 'nav_testimonials' },
  { href: '/contact',      key: 'nav_contact' },
];

export default function SharedHeader() {
  const { t, lang, setLanguage } = useTranslation();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const [mobileLangDropdownOpen, setMobileLangDropdownOpen] = useState(false);
  const langDropdownRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const isHome = pathname === '/';

  useEffect(() => {
    setMounted(true);
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /* Close lang dropdown on outside click */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (langDropdownRef.current && !langDropdownRef.current.contains(e.target as Node)) {
        setLangDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const currentLang = LANGUAGES.find(l => l.code === lang) ?? LANGUAGES[0];

  const handleLangSelect = (code: Language) => {
    setLanguage(code);
    setLangDropdownOpen(false);
    setMobileLangDropdownOpen(false);
    setMobileOpen(false);
  };

  /* Home page: transparent → indigo on scroll. All other pages: always indigo */
  const showDark = !isHome || scrolled;

  return (
    <header
      className="sticky top-0 z-50 w-full transition-all duration-500 border-b border-[#4a486e]/20 bg-[#4a486e]/80 backdrop-blur-xl shadow-xl shadow-[#4a486e]/30"
    >
      <div className="container flex h-16 max-w-screen-2xl items-center justify-between px-4">
        {/* Logo – natural colored brand identity */}
        <div className="flex-shrink-0">
          <Logo width={150} height={45} />
        </div>

        {/* Desktop: Nav + Buttons on right */}
        <div className="flex items-center gap-2 md:gap-4">
          <nav className="hidden md:flex items-center gap-1.5 lg:gap-2">
            {NAV_KEYS.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className={`nav-link text-xs lg:text-sm font-medium transition-all duration-300 px-3 py-1.5 rounded-full ${
                  pathname === link.href
                    ? 'text-white bg-primary/20 border border-primary/30 shadow-inner'
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                {mounted ? t(`home.${link.key}`) : link.key.replace('nav_', '')}
              </Link>
            ))}
          </nav>

          <div className="hidden sm:flex items-center gap-2 ml-2">
            {/* ── Language Dropdown ── */}
            <div className="relative" ref={langDropdownRef}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLangDropdownOpen(prev => !prev)}
                className="rounded-full hover:bg-white/10 text-white transition-all duration-300 h-9 px-3 gap-1.5 text-sm font-semibold"
                title={mounted ? t('home.lang_label') : 'Language'}
              >
                <span className="text-base leading-none">{currentLang.flag}</span>
                <span className="hidden lg:inline">{currentLang.label}</span>
                <ChevronDown className={`h-3 w-3 opacity-70 transition-transform duration-200 ${langDropdownOpen ? 'rotate-180' : ''}`} />
              </Button>

              {/* Dropdown panel */}
              {langDropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-44 bg-[#2d2b4e] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in-0 slide-in-from-top-2 duration-150">
                  {LANGUAGES.map(l => (
                    <button
                      key={l.code}
                      onClick={() => handleLangSelect(l.code)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors duration-150 ${
                        l.code === lang
                          ? 'bg-primary/20 text-white'
                          : 'text-white/70 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <span className="text-base">{l.flag}</span>
                      <span>{l.name}</span>
                      {l.code === lang && (
                        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <Link href="/login">
              <Button variant="ghost" className="text-white/80 hover:text-white hover:bg-white/10 text-sm h-9 px-4 rounded-full transition-all duration-300">
                {mounted ? t('home.nav_login') : 'Se connecter'} <LogIn className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/signup/client">
              <Button
                className="btn-glow font-semibold text-white text-sm border-0 shadow-lg h-9 px-4 rounded-full transition-all duration-300 hover:scale-105"
                style={{ background: 'linear-gradient(135deg, hsl(322 85% 50%), hsl(340 90% 58%))' }}
              >
                {mounted ? t('home.nav_register') : "S'inscrire"} <UserPlus className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden text-white p-2 rounded-full hover:bg-white/10 transition-colors"
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
          mobileOpen ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="bg-[#4a486e]/95 backdrop-blur-xl border-t border-[#4a486e]/20 px-4 py-3 space-y-1">
          {NAV_KEYS.map(link => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className={`block text-sm font-medium py-2.5 border-b border-white/10 last:border-0 transition-colors ${
                pathname === link.href ? 'text-white' : 'text-white/70 hover:text-white'
              }`}
            >
              {mounted ? t(`home.${link.key}`) : link.key.replace('nav_', '')}
            </Link>
          ))}
          <div className="flex gap-2 pt-3">
            <Link href="/login" className="flex-1" onClick={() => setMobileOpen(false)}>
              <Button variant="ghost" className="w-full text-white/80 hover:text-white hover:bg-white/10 text-sm">
                {mounted ? t('home.nav_login') : 'Se connecter'}
              </Button>
            </Link>
            <Link href="/signup/client" className="flex-1" onClick={() => setMobileOpen(false)}>
              <Button
                className="w-full font-semibold text-white text-sm border-0"
                style={{ background: 'linear-gradient(135deg, hsl(322 85% 50%), hsl(340 90% 58%))' }}
              >
                {mounted ? t('home.nav_register') : "S'inscrire"}
              </Button>
            </Link>
          </div>

          {/* ── Mobile Language Selector ── */}
          <div className="pt-3 border-t border-white/10">
            <button
              onClick={() => setMobileLangDropdownOpen(prev => !prev)}
              className="w-full flex items-center justify-between text-white/60 text-xs font-semibold px-1 py-2"
            >
              <span className="flex items-center gap-2">
                <span className="text-base">{currentLang.flag}</span>
                <span>{mounted ? t('home.lang_label') : 'Langue'} – {currentLang.label}</span>
              </span>
              <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${mobileLangDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {mobileLangDropdownOpen && (
              <div className="mt-1 grid grid-cols-5 gap-1">
                {LANGUAGES.map(l => (
                  <button
                    key={l.code}
                    onClick={() => handleLangSelect(l.code)}
                    className={`flex flex-col items-center gap-1 p-2 rounded-xl text-xs font-semibold transition-colors duration-150 ${
                      l.code === lang
                        ? 'bg-primary/25 text-white ring-1 ring-primary/40'
                        : 'text-white/60 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <span className="text-xl leading-none">{l.flag}</span>
                    <span>{l.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
