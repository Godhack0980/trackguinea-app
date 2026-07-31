
"use client";

import React, { useEffect, useRef, useState, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Autoplay from "embla-carousel-autoplay";
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from "@/lib/firebase";
import AvailableOffersComponent from "@/components/available-offers";

import Logo from '@/components/logo';
import SharedHeader from '@/components/shared-header';
import SharedFooter from '@/components/shared-footer';
import HomePriceSimulator from '@/components/home-price-simulator';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  LogIn, UserPlus, Truck, Mail, Phone, MapPin, Building,
  PackagePlus, Users, ShieldCheck, AreaChart, Send, MessageSquare,
  Facebook, Linkedin, Twitter, ArrowUp, ChevronRight, Star,
  Clock, Zap, HeartHandshake, Loader2
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useTranslation } from '@/lib/translations';

/* ─── Scroll-reveal hook ─────────────────────────────────── */
function useScrollReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale');
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            e.target.classList.add('visible');
            observer.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -60px 0px' }
    );
    els.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);
}

/* ─── Animated Counter ───────────────────────────────────── */
function AnimatedCounter({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const duration = 2000;
          const steps = 60;
          const increment = target / steps;
          let current = 0;
          const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
              setCount(target);
              clearInterval(timer);
            } else {
              setCount(Math.floor(current));
            }
          }, duration / steps);
        }
      },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target]);

  return <span ref={ref}>{count.toLocaleString('fr-FR')}{suffix}</span>;
}

/* ─── Floating Particles ─────────────────────────────────── */
function FloatingParticles() {
  const particles = [
    { size: 6,  top: '15%', left: '8%',  delay: '0s',   dur: '8s',  opacity: 0.5 },
    { size: 10, top: '25%', left: '92%', delay: '1s',   dur: '10s', opacity: 0.35 },
    { size: 4,  top: '60%', left: '5%',  delay: '2s',   dur: '7s',  opacity: 0.6 },
    { size: 8,  top: '70%', left: '88%', delay: '0.5s', dur: '9s',  opacity: 0.4 },
    { size: 5,  top: '40%', left: '50%', delay: '3s',   dur: '11s', opacity: 0.3 },
    { size: 12, top: '80%', left: '30%', delay: '1.5s', dur: '8s',  opacity: 0.25 },
    { size: 3,  top: '10%', left: '65%', delay: '4s',   dur: '6s',  opacity: 0.55 },
    { size: 7,  top: '50%', left: '78%', delay: '2.5s', dur: '12s', opacity: 0.3 },
  ];
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
      {particles.map((p, i) => (
        <div
          key={i}
          className="particle-dot"
          style={{
            width: p.size,
            height: p.size,
            top: p.top,
            left: p.left,
            opacity: p.opacity,
            background: 'rgba(255,255,255,0.8)',
            animationDuration: p.dur,
            animationDelay: p.delay,
          }}
        />
      ))}
    </div>
  );
}

/* ─── Scroll-to-top button ───────────────────────────────── */
function ScrollTopButton() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Retour en haut"
      className={`scroll-top-btn fixed bottom-8 right-8 z-50 w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center shadow-xl transition-all duration-300 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6 pointer-events-none'}`}
    >
      <ArrowUp className="h-5 w-5" />
    </button>
  );
}

/* ─── Static testimonial data (not translated – proper names/quotes) ── */
const testimonials = [
  { name: "Fatoumata K.", role: "Gérante de boutique, Conakry", avatar: "FK", rating: 5, comment: "TransConnekt a transformé ma logistique ! Je peux enfin suivre mes livraisons de Conakry à l'intérieur du pays sans stress. C'est simple, rapide et fiable." },
  { name: "Mamadou S.", role: "Transporteur indépendant", avatar: "MS", rating: 5, comment: "Grâce à la plateforme, je ne rentre plus jamais à vide. Je trouve toujours des courses pour optimiser mes trajets. Mes revenus ont considérablement augmenté." },
  { name: "Global Corp SARL", role: "Entreprise d'import-export", avatar: "GC", rating: 5, comment: "La gestion de notre flotte de chauffeurs et l'assignation des courses n'ont jamais été aussi simples. Un outil indispensable pour les entreprises en Guinée." },
  { name: "Aïssatou B.", role: "Particulière, Labé", avatar: "AB", rating: 4, comment: "J'ai utilisé le service pour envoyer un colis fragile à ma famille à Nzérékoré. Tout est arrivé en parfait état et dans les temps. Je recommande vivement !" },
  { name: "Thierno D.", role: "Agriculteur, Faranah", avatar: "TD", rating: 5, comment: "Trouver un camion pour transporter ma récolte vers les marchés de la capitale était un vrai casse-tête. Avec TransConnekt, j'ai trouvé un transporteur en quelques heures." }
];

/* ─── Hero images ────────────────────────────────────────── */
const heroImages = [
  '/hero-slide-2.jpg',
  '/hero-slide-2-custom.jpg',
  '/hero-slide-3-tanker.jpg',
  '/hero-slide-4-trailer.jpg',
];

/* ─── Nav Link ───────────────────────────────────────────── */
function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="nav-link text-sm font-medium text-white/90 hover:text-white transition-colors">
      {children}
    </Link>
  );
}

/* ─── Star Rating ────────────────────────────────────────── */
function StarRating({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5 mb-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className={`h-4 w-4 ${i < count ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}`} />
      ))}
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────── */
export default function Home() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const autoplayPlugin = React.useRef(Autoplay({ delay: 5000, stopOnInteraction: true }));
  useScrollReveal();

  const [currentHeroBg, setCurrentHeroBg] = useState(0);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentHeroBg((prev) => (prev + 1) % heroImages.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /* ─── Translated data arrays (inside component so t() is in scope) ─── */
  const reviewFormSchema = z.object({
    name: z.string().min(1, { message: t('home.review_name_required') }),
    message: z.string().min(10, { message: t('home.review_message_min') }),
  });

  const services = [
    {
      icon: <Truck className="h-10 w-10 text-primary service-icon" />,
      title: t('home.service1_title'),
      description: t('home.service1_desc'),
      badge: t('home.service1_badge'),
    },
    {
      icon: <PackagePlus className="h-10 w-10 text-primary service-icon" />,
      title: t('home.service2_title'),
      description: t('home.service2_desc'),
      badge: "",
    },
    {
      icon: <Building className="h-10 w-10 text-primary service-icon" />,
      title: t('home.service3_title'),
      description: t('home.service3_desc'),
      badge: "",
    }
  ];

  const features = [
    {
      icon: <ShieldCheck className="h-8 w-8 text-primary" />,
      title: t('home.feature1_title'),
      description: t('home.feature1_desc'),
      color: "from-indigo-50 to-violet-50 dark:from-indigo-950/30 dark:to-violet-950/20"
    },
    {
      icon: <MapPin className="h-8 w-8 text-primary" />,
      title: t('home.feature2_title'),
      description: t('home.feature2_desc'),
      color: "from-purple-50 to-rose-50 dark:from-purple-950/30 dark:to-rose-950/20"
    },
    {
      icon: <AreaChart className="h-8 w-8 text-primary" />,
      title: t('home.feature3_title'),
      description: t('home.feature3_desc'),
      color: "from-violet-50 to-pink-50 dark:from-violet-950/30 dark:to-pink-950/20"
    }
  ];

  const stats = [
    { value: 1200, suffix: '+', label: t('home.stats_transporters'), icon: <Truck className="h-6 w-6" /> },
    { value: 8500, suffix: '+', label: t('home.stats_trips'), icon: <PackagePlus className="h-6 w-6" /> },
    { value: 33,   suffix: '',  label: t('home.stats_prefectures'), icon: <MapPin className="h-6 w-6" /> },
    { value: 98,   suffix: '%', label: t('home.stats_satisfaction'), icon: <Star className="h-6 w-6" /> },
  ];

  const steps = [
    { num: "01", title: t('home.how_step1_title'), desc: t('home.how_step1_desc'), icon: <Send className="w-8 h-8" /> },
    { num: "02", title: t('home.how_step2_title'), desc: t('home.how_step2_desc'), icon: <Users className="w-8 h-8" /> },
    { num: "03", title: t('home.how_step3_title'), desc: t('home.how_step3_desc'), icon: <MapPin className="w-8 h-8" /> },
  ];

  const form = useForm<z.infer<typeof reviewFormSchema>>({
    resolver: zodResolver(reviewFormSchema),
    defaultValues: { name: "", message: "" },
  });

  const onReviewSubmit = (values: z.infer<typeof reviewFormSchema>) => {
    console.log("Review submitted:", values);
    toast({ title: t('home.review_toast_title'), description: t('home.review_toast_desc') });
    form.reset();
  };

  return (
    <div className="flex min-h-screen flex-col bg-background overflow-x-hidden">
      <ScrollTopButton />

      {/* ── HEADER ── */}
      <SharedHeader />

      <main className="flex-1">

        {/* ── HERO ── */}
        <section id="hero" className="w-full relative overflow-hidden min-h-[90vh] flex items-center">
          {/* Background image carousel – slides right to left */}
          <div className="absolute inset-0 z-0 overflow-hidden">
            <div
              className="flex h-full transition-transform duration-1000 ease-in-out"
              style={{
                width: `${heroImages.length * 100}%`,
                transform: `translateX(-${(currentHeroBg * 100) / heroImages.length}%)`,
              }}
            >
              {heroImages.map((src, idx) => (
                <div
                  key={src}
                  className="relative h-full"
                  style={{ width: `${100 / heroImages.length}%` }}
                >
                  <Image
                    src={src}
                    alt={`Camion de transport et paysage en Guinée ${idx + 1}`}
                    fill
                    className="object-cover"
                    priority={idx === 0}
                  />
                </div>
              ))}
            </div>
          </div>
          {/* Gradient overlay */}
          <div className="hero-gradient-overlay absolute inset-0 z-0" />
          {/* Floating particles */}
          <FloatingParticles />


          <div className="container relative z-10 text-center py-24">
            <div className="mx-auto w-full max-w-4xl">

              {/* Badge Link Button */}
              <Link href="/how-it-works" className="inline-block mb-6">
                <div className="animate-fade-in-up inline-flex items-center gap-2 px-5 py-2 rounded-full glass-card text-white text-sm font-semibold border border-white/25 hover:border-primary/60 hover:bg-white/15 hover:scale-105 transition-all duration-300 shadow-lg cursor-pointer group">
                  <Zap className="h-4 w-4 text-yellow-400 animate-bounce-soft group-hover:scale-110 transition-transform" />
                  <span>{t('home.hero_badge')}</span>
                  <ChevronRight className="h-4 w-4 text-white/80 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>

              {/* Title */}
              <h1 className="animate-hero-text delay-200 font-headline text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl text-white leading-tight">
                {t('home.hero_title')}{' '}
                <span
                  className="inline-block"
                  style={{
                    backgroundImage: 'linear-gradient(90deg, #f472b6, #e879f9, #ffffff, #e879f9, #f472b6)',
                    backgroundSize: '200% auto',
                    animation: 'shimmer 3s linear infinite',
                    WebkitBackgroundClip: 'text',
                    backgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    color: 'transparent',
                  }}
                >
                  {t('home.hero_title_highlight')}
                </span>{' '}
                {t('home.hero_title_end')}
              </h1>

              {/* Subtitle */}
              <p className="animate-fade-in-up delay-400 mt-6 text-lg leading-8 text-white/85 max-w-2xl mx-auto">
                {t('home.hero_subtitle')}
              </p>

              {/* CTA Buttons */}
              <div className="animate-fade-in-up delay-600 mt-12 flex flex-col sm:flex-row items-center justify-center gap-6">
                <div className="flex flex-col gap-2 items-center">
                  <p className="text-sm text-white/70 font-medium">{t('home.hero_for_individuals')}</p>
                  <div className="flex gap-3">
                    <Link href="/signup/client">
                      <Button size="lg" variant="secondary" className="btn-glow font-semibold shadow-lg">
                        {t('home.hero_btn_client')} <UserPlus className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                    <Link href="/signup/transporter">
                      <Button size="lg" className="btn-glow bg-transparent border-2 border-white/70 text-white hover:bg-white hover:text-primary font-semibold">
                        {t('home.hero_btn_transporter')} <Truck className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
                <div className="hidden sm:block w-px h-12 bg-white/20" />
                <div className="flex flex-col gap-2 items-center">
                  <p className="text-sm text-white/70 font-medium">{t('home.hero_for_companies')}</p>
                  <div className="flex gap-3">
                    <Link href="/signup/client-company">
                      <Button size="lg" variant="secondary" className="btn-glow font-semibold shadow-lg">
                        {t('home.hero_btn_client_pro')} <Building className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                    <Link href="/signup/transporter-company">
                      <Button size="lg" className="btn-glow bg-transparent border-2 border-white/70 text-white hover:bg-white hover:text-primary font-semibold">
                        {t('home.hero_btn_transporter_pro')} <Building className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>

              {/* Trust badges */}
              <div className="animate-fade-in delay-1000 mt-12 flex flex-wrap items-center justify-center gap-6 text-white/70 text-sm">
                <span className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-green-400" /> {t('home.hero_badge_certified')}</span>
                <span className="w-1 h-1 rounded-full bg-white/30" />
                <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4 text-blue-400" /> {t('home.hero_badge_gps')}</span>
                <span className="w-1 h-1 rounded-full bg-white/30" />
                <span className="flex items-center gap-1.5"><HeartHandshake className="h-4 w-4 text-rose-400" /> {t('home.hero_badge_payment')}</span>
              </div>
            </div>
          </div>

          {/* Carousel indicators */}
          <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-20 flex gap-2">
            {heroImages.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentHeroBg(idx)}
                aria-label={`Slide ${idx + 1}`}
                className={`h-3 rounded-full transition-all duration-300 ${idx === currentHeroBg ? 'bg-primary w-8' : 'bg-white/40 hover:bg-white/60 w-3'}`}
              />
            ))}
          </div>

          {/* Wave bottom */}
          <div className="absolute bottom-0 left-0 right-0 z-10">
            <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full" preserveAspectRatio="none">
              <path d="M0,40 C360,80 1080,0 1440,40 L1440,80 L0,80 Z" fill="hsl(var(--background))" />
            </svg>
          </div>
        </section>

        {/* ── STATS BANNER ── */}
        <section className="container py-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat, i) => (
              <div
                key={i}
                className={`stat-card reveal reveal-scale rounded-2xl p-6 text-center bg-white border border-border shadow-sm`}
                style={{ transitionDelay: `${i * 0.1}s` }}
              >
                <div className="flex justify-center mb-3 text-primary">{stat.icon}</div>
                <p className="stat-number text-3xl font-bold text-primary font-headline">
                  <AnimatedCounter target={stat.value} suffix={stat.suffix} />
                </p>
                <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── SCROLLING SEARCH TICKER ── */}
        <section className="w-full bg-[#0D1322] border-y border-slate-800/80 py-5 overflow-hidden cursor-pointer relative group">
          <Link href="/fleet" className="block">
            {/* Ambient background glow on hover */}
            <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
            
            <div className="flex items-center w-full">
              <style dangerouslySetInnerHTML={{__html: `
                @keyframes tickerMarquee {
                  0% { transform: translate3d(0, 0, 0); }
                  100% { transform: translate3d(-50%, 0, 0); }
                }
                .ticker-container {
                  display: flex;
                  width: max-content;
                  animation: tickerMarquee 40s linear infinite;
                  white-space: nowrap;
                  will-change: transform;
                }
                .ticker-container:hover {
                  animation-play-state: paused;
                }
                .ticker-item {
                  display: inline-flex;
                  align-items: center;
                  white-space: nowrap;
                  flex-shrink: 0;
                }
              `}} />
              
              <div className="ticker-container gap-12 text-slate-100 text-sm md:text-base flex items-center">
                {Array.from({ length: 3 }).map((_, loopIdx) => (
                  <React.Fragment key={loopIdx}>
                    <div className="ticker-item gap-3">
                      <span className="text-indigo-400 font-bold shrink-0">💡</span>
                      <span>{t('home.ticker_frigo')}</span>
                    </div>
                    <span className="text-slate-700 font-bold shrink-0">•</span>

                    <div className="ticker-item gap-3">
                      <span className="text-indigo-400 font-bold shrink-0">💡</span>
                      <span>{t('home.ticker_porte_char')}</span>
                    </div>
                    <span className="text-slate-700 font-bold shrink-0">•</span>

                    <div className="ticker-item gap-3">
                      <span className="text-indigo-400 font-bold shrink-0">💡</span>
                      <span>{t('home.ticker_benne')}</span>
                    </div>
                    <span className="text-slate-700 font-bold shrink-0">•</span>

                    <div className="ticker-item gap-3">
                      <span className="text-indigo-400 font-bold shrink-0">💡</span>
                      <span>{t('home.ticker_citerne')}</span>
                    </div>
                    <span className="text-slate-700 font-bold shrink-0">•</span>

                    <div className="ticker-item gap-3">
                      <span className="text-indigo-400 font-bold shrink-0">💡</span>
                      <span>{t('home.ticker_plateau')}</span>
                    </div>
                    <span className="text-slate-700 font-bold shrink-0">•</span>

                    <div className="ticker-item">
                      <span className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider text-indigo-300 hover:bg-indigo-500/20 transition-all duration-300">
                        🚜 {t('home.ticker_gallery_button')} <ChevronRight size={14} className="inline shrink-0" />
                      </span>
                    </div>
                    <span className="text-slate-700 font-bold shrink-0">•</span>
                  </React.Fragment>
                ))}
              </div>
            </div>
          </Link>
        </section>

        {/* ── SIMANDOU 2040 & MINING ── */}
        <section className="py-24 bg-zinc-950 text-white relative overflow-hidden">
          {/* Abstract mining background element */}
          <div className="absolute top-0 right-0 -mr-32 -mt-32 w-96 h-96 rounded-full bg-primary/20 blur-3xl" />
          <div className="absolute bottom-0 left-0 -ml-32 -mb-32 w-96 h-96 rounded-full bg-accent/20 blur-3xl" />
          
          <div className="container relative z-10">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div className="reveal-left">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 text-white/90 text-sm font-medium mb-6 border border-white/20">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  {t('home.mining_label')}
                </div>
                <h2 className="font-headline text-3xl md:text-4xl font-bold mb-6">{t('home.mining_title')}</h2>
                <p className="text-white/70 text-lg leading-relaxed mb-8">
                  {t('home.mining_desc')}
                </p>
                
                <ul className="space-y-4 mb-10">
                  <li className="flex items-start gap-3">
                    <div className="mt-1 bg-amber-500/20 p-1.5 rounded-md"><Truck className="w-5 h-5 text-amber-500" /></div>
                    <div>
                      <h4 className="font-semibold text-white">{t('home.mining_item1_title')}</h4>
                      <p className="text-white/60 text-sm">{t('home.mining_item1_desc')}</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="mt-1 bg-amber-500/20 p-1.5 rounded-md"><ShieldCheck className="w-5 h-5 text-amber-500" /></div>
                    <div>
                      <h4 className="font-semibold text-white">{t('home.mining_item2_title')}</h4>
                      <p className="text-white/60 text-sm">{t('home.mining_item2_desc')}</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="mt-1 bg-amber-500/20 p-1.5 rounded-md"><MapPin className="w-5 h-5 text-amber-500" /></div>
                    <div>
                      <h4 className="font-semibold text-white">{t('home.mining_item3_title')}</h4>
                      <p className="text-white/60 text-sm">{t('home.mining_item3_desc')}</p>
                    </div>
                  </li>
                </ul>
                
                <Link href="/services">
                  <Button className="btn-glow bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold border-0">
                    {t('home.mining_cta')} <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
              
              <div className="reveal-right">
                <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl h-[400px]">
                  {/* Decorative map/mining graphic placeholder */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-zinc-900 to-zinc-800" />
                  <Image
                    src="/simandou-logo.jpg"
                    alt="Simandou 2040"
                    fill
                    className="object-contain z-10"
                    priority
                  />
                  <div className="absolute bottom-4 left-4 right-4 bg-black/60 backdrop-blur-md border border-white/10 p-4 rounded-xl z-20">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-xs text-white/50 uppercase tracking-wider mb-1">Capacité de déploiement</p>
                        <p className="text-xl font-bold text-white">Conakry → Simandou</p>
                      </div>
                      <div className="w-12 h-12 rounded-full border-2 border-amber-500 flex items-center justify-center">
                        <Zap className="text-amber-500 w-5 h-5" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── PRICE SIMULATOR ── */}
        <section id="price-simulator" className="container pb-20">
          <div className="reveal">
            <HomePriceSimulator />
          </div>
        </section>

        {/* ── REAL-TIME LOGISTICS MAP & OFFERS ── */}
        <section id="available-offers" className="py-24 bg-[#070B13] border-t border-slate-900 text-white relative overflow-hidden">
          <div className="absolute top-0 left-0 w-96 h-96 bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none" />
          
          <div className="container relative z-10 space-y-12">
            <div className="text-center max-w-3xl mx-auto space-y-4">
              <span className="text-emerald-400 font-bold tracking-wider uppercase text-xs px-3 py-1 bg-emerald-500/10 rounded-full w-fit mx-auto border border-emerald-500/20">
                🚨 {t('home.offers_label')}
              </span>
              <h2 className="font-headline text-3xl md:text-5xl font-extrabold text-white leading-tight">
                {t('home.offers_title')}
              </h2>
              <p className="text-slate-400 text-sm md:text-base leading-relaxed">
                {t('home.offers_subtitle')}
              </p>
            </div>

            {/* Inner Component wrapper */}
            <AvailableOffersComponent />
          </div>
        </section>

        {/* ── HOW IT WORKS ── */}
        <section id="how-it-works" className="bg-gradient-to-b from-muted/30 to-background py-32 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl -z-10 translate-x-1/2 -translate-y-1/2" />
          <div className="container">
            <div className="text-center reveal mb-20">
              <span className="text-primary font-bold tracking-wider uppercase text-sm mb-2 block">{t('home.how_label')}</span>
              <h2 className="font-headline text-4xl md:text-5xl font-bold text-foreground">{t('home.how_title')}</h2>
              <p className="mx-auto mt-6 max-w-2xl text-muted-foreground text-lg">
                {t('home.how_subtitle')}
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 relative z-10 stagger-children">
              {/* Connector Line (Desktop) */}
              <div className="hidden md:block absolute top-1/2 left-[10%] right-[10%] h-0.5 bg-gradient-to-r from-primary/10 via-primary/50 to-primary/10 -translate-y-1/2 -z-10" />
              
              {steps.map((step, i) => (
                <div key={i} className="reveal-scale group relative bg-white p-8 rounded-3xl shadow-xl hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 border border-border/50 text-center">
                  <div className="w-20 h-20 mx-auto bg-gradient-to-br from-primary to-accent rounded-2xl flex items-center justify-center text-white shadow-lg shadow-primary/30 group-hover:scale-110 transition-transform duration-500 mb-6 relative">
                    {step.icon}
                    <div className="absolute -top-3 -right-3 w-8 h-8 bg-white text-primary font-bold rounded-full flex items-center justify-center shadow-md border border-primary/20 text-sm">
                      {step.num}
                    </div>
                  </div>
                  <h3 className="font-headline text-2xl font-bold mb-3 text-foreground">{step.title}</h3>
                  <p className="text-muted-foreground">{step.desc}</p>
                </div>
              ))}
            </div>

            <div className="mt-16 text-center reveal">
              <Link href="/how-it-works">
                <Button size="lg" className="btn-glow text-white font-bold h-14 px-8 rounded-full" style={{ background: 'linear-gradient(135deg, hsl(250 84% 50%), hsl(265 80% 58%))' }}>
                  {t('home.how_cta')} <ChevronRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* ── TRANSPORTERS DEDICATED SECTION ── */}
        <section id="transporter-space" className="py-28 bg-[#0B0F19] border-t border-slate-900 text-white relative overflow-hidden">
          {/* Glowing ambient background grids */}
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-primary/10 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-[450px] h-[450px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
          
          <div className="container relative z-10">
            <div className="grid lg:grid-cols-12 gap-16 items-center">
              {/* Left Content Column */}
              <div className="lg:col-span-6 reveal-left">
                <span className="text-indigo-400 font-bold tracking-wider uppercase text-xs mb-3 block px-3 py-1 bg-indigo-500/10 rounded-full w-fit border border-indigo-500/20">
                  {t('home.transporter_label')}
                </span>
                <h2 className="font-headline text-3xl md:text-5xl font-bold mb-6 text-white leading-tight">
                  {t('home.transporter_title')}
                </h2>
                <p className="text-slate-300 text-lg leading-relaxed mb-8">
                  {t('home.transporter_subtitle')}
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4 mb-8">
                  <Link href="/signup/transporter">
                    <Button size="lg" className="w-full sm:w-auto bg-primary hover:bg-primary/95 text-white font-bold h-14 px-8 rounded-full shadow-lg shadow-primary/20">
                      {t('home.transporter_cta')} <Truck className="ml-2 h-5 w-5" />
                    </Button>
                  </Link>
                  <Link href="/signup/transporter-company">
                    <Button size="lg" className="w-full sm:w-auto bg-transparent hover:bg-white/10 text-white border-2 border-slate-700 hover:border-slate-500 font-bold h-14 px-8 rounded-full">
                      {t('home.transporter_btn_company')} <Building className="ml-2 h-5 w-5" />
                    </Button>
                  </Link>
                </div>
              </div>
              
              {/* Right Cards/Features Grid Column */}
              <div className="lg:col-span-6 grid sm:grid-cols-2 gap-6 reveal-right">
                {/* Feature 1: No empty returns */}
                <div className="bg-[#121826] border border-slate-805/40 p-6 rounded-3xl flex flex-col justify-between group hover:border-primary/40 hover:-translate-y-1 transition-all duration-300">
                  <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-6 group-hover:scale-110 transition-transform">
                    <Zap className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-white mb-2">{t('home.transporter_feat1_title')}</h4>
                    <p className="text-slate-400 text-sm leading-relaxed">
                      {t('home.transporter_feat1_desc')}
                    </p>
                  </div>
                </div>

                {/* Feature 2: Guaranteed payments */}
                <div className="bg-[#121826] border border-slate-805/40 p-6 rounded-3xl flex flex-col justify-between group hover:border-primary/40 hover:-translate-y-1 transition-all duration-300">
                  <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-400 mb-6 group-hover:scale-110 transition-transform">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-white mb-2">{t('home.transporter_feat2_title')}</h4>
                    <p className="text-slate-400 text-sm leading-relaxed">
                      {t('home.transporter_feat2_desc')}
                    </p>
                  </div>
                </div>

                {/* Feature 3: Free fleet manager */}
                <div className="bg-[#121826] border border-slate-805/40 p-6 rounded-3xl flex flex-col justify-between group hover:border-primary/40 hover:-translate-y-1 transition-all duration-300">
                  <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-400 mb-6 group-hover:scale-110 transition-transform">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-white mb-2">{t('home.transporter_feat3_title')}</h4>
                    <p className="text-slate-400 text-sm leading-relaxed">
                      {t('home.transporter_feat3_desc')}
                    </p>
                  </div>
                </div>

                {/* Feature 4: Public Gallery Visibility */}
                <div className="bg-[#121826] border border-slate-805/40 p-6 rounded-3xl flex flex-col justify-between group hover:border-primary/40 hover:-translate-y-1 transition-all duration-300">
                  <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-6 group-hover:scale-110 transition-transform">
                    <AreaChart className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-white mb-2">{t('home.transporter_feat4_title')}</h4>
                    <p className="text-slate-400 text-sm leading-relaxed">
                      {t('home.transporter_feat4_desc')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── SERVICES ── */}
        <section id="services" className="py-32 bg-zinc-950 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('/noise.png')] opacity-5 mix-blend-overlay"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/20 rounded-full blur-[120px] pointer-events-none" />
          
          <div className="container relative z-10">
            <div className="flex flex-col md:flex-row justify-between items-end mb-16 reveal">
              <div className="max-w-2xl">
                <span className="text-amber-500 font-bold tracking-wider uppercase text-sm mb-2 block">{t('home.services_label')}</span>
                <h2 className="font-headline text-4xl md:text-5xl font-bold mb-6 text-white">{t('home.services_title')}</h2>
                <p className="text-zinc-400 text-lg">
                  {t('home.services_subtitle')}
                </p>
              </div>
              <Link href="/services" className="hidden md:inline-flex mt-6 md:mt-0">
                <Button variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-white hover:text-black rounded-full px-8 h-12 transition-all duration-300">
                  {t('home.bento_all_services_btn')} <ChevronRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
            </div>

            <div className="grid md:grid-cols-12 gap-6 auto-rows-[250px] stagger-children">
              {/* Bento Box 1 */}
              <div className="md:col-span-8 reveal-scale group relative rounded-3xl overflow-hidden bg-zinc-900 border border-zinc-800 hover:border-primary/50 transition-colors duration-500">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative p-8 h-full flex flex-col justify-end z-10">
                  <div className="mb-auto">
                    <div className="w-14 h-14 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center text-primary mb-6">
                      <Truck className="w-7 h-7" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">{t('home.service1_title')}</h3>
                  <p className="text-zinc-400 max-w-md">{t('home.bento_service1_desc')}</p>
                </div>
              </div>
              {/* Bento Box 2 */}
              <div className="md:col-span-4 reveal-scale group relative rounded-3xl overflow-hidden bg-zinc-900 border border-zinc-800 hover:border-accent/50 transition-colors duration-500">
                <div className="absolute inset-0 bg-gradient-to-t from-accent/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative p-8 h-full flex flex-col justify-end z-10">
                  <div className="mb-auto">
                    <div className="w-14 h-14 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center text-accent mb-6">
                      <PackagePlus className="w-7 h-7" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">{t('home.bento_service2_title')}</h3>
                  <p className="text-zinc-400">{t('home.bento_service2_desc')}</p>
                </div>
              </div>
              {/* Bento Box 3 */}
              <div className="md:col-span-5 reveal-scale group relative rounded-3xl overflow-hidden bg-gradient-to-br from-primary to-indigo-900 border border-primary/50">
                <div className="relative p-8 h-full flex flex-col justify-between z-10 text-white">
                  <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-white">
                    <Building className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold mb-2">{t('home.bento_service3_title')}</h3>
                    <p className="text-white/80">{t('home.bento_service3_desc')}</p>
                  </div>
                </div>
              </div>
              {/* Bento Box 4 */}
              <div className="md:col-span-7 reveal-scale group relative rounded-3xl overflow-hidden bg-zinc-900 border border-zinc-800 hover:border-amber-500/50 transition-colors duration-500">
                <div className="relative p-8 h-full flex flex-col justify-end z-10">
                  <div className="mb-auto">
                    <div className="w-14 h-14 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center text-amber-500 mb-6">
                      <Zap className="w-7 h-7" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">{t('home.bento_service4_title')}</h3>
                  <p className="text-zinc-400 max-w-md">{t('home.bento_service4_desc')}</p>
                </div>
              </div>
            </div>

            <div className="mt-10 text-center md:hidden reveal">
              <Link href="/services">
                <Button className="w-full h-14 rounded-xl font-bold bg-white text-black hover:bg-zinc-200">
                  {t('home.bento_all_services_btn')} <ChevronRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* ── WHY US ── */}
        <section id="why-us" className="py-32 bg-white relative overflow-hidden">
          <div className="container">
            <div className="grid lg:grid-cols-12 gap-16 items-center">
              <div className="lg:col-span-5 reveal-left">
                <span className="text-accent font-bold tracking-wider uppercase text-sm mb-2 block">{t('home.why_us_label')}</span>
                <h2 className="font-headline text-4xl md:text-5xl font-bold text-foreground mb-6">{t('home.why_us_title')}</h2>
                <p className="text-muted-foreground text-lg mb-10 leading-relaxed">
                  {t('home.why_us_desc')}
                </p>
                <div className="space-y-8">
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-xl font-bold text-foreground mb-2">{t('home.why_us_feat1_title')}</h4>
                      <p className="text-muted-foreground">{t('home.why_us_feat1_desc')}</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center">
                      <MapPin className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-xl font-bold text-foreground mb-2">{t('home.why_us_feat2_title')}</h4>
                      <p className="text-muted-foreground">{t('home.why_us_feat2_desc')}</p>
                    </div>
                  </div>
                </div>
                
                <Link href="/why-us" className="inline-block mt-12">
                  <Button size="lg" variant="outline" className="border-primary text-primary hover:bg-primary hover:text-white rounded-full px-8 h-14 font-bold text-md">
                    {t('home.why_us_cta')} <ChevronRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
              </div>

              <div className="lg:col-span-7 reveal-right">
                <div className="relative">
                  {/* Decorative Elements */}
                  <div className="absolute -top-10 -right-10 w-40 h-40 bg-accent/10 rounded-full blur-2xl" />
                  <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-primary/10 rounded-full blur-2xl" />
                  
                  {/* Image Grid */}
                  <div className="grid grid-cols-2 gap-4 md:gap-6 relative z-10">
                    <div className="space-y-4 md:space-y-6 mt-12">
                      <div className="rounded-3xl overflow-hidden shadow-xl shadow-black/5 aspect-[4/5] relative">
                        <Image src="/partner-trust.jpg" alt="Confiance" fill className="object-cover hover:scale-105 transition-transform duration-700" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                        <div className="absolute bottom-6 left-6 text-white font-bold text-2xl">{t('home.why_us_badge_trust')}</div>
                      </div>
                      <div className="bg-primary p-8 rounded-3xl text-white shadow-xl shadow-primary/20 flex flex-col justify-center items-center text-center aspect-square">
                        <Star className="w-10 h-10 mb-4 text-amber-300" />
                        <p className="text-4xl font-headline font-bold mb-2">4.9/5</p>
                        <p className="text-primary-foreground/80 font-medium">{t('home.why_us_badge_rating')}</p>
                      </div>
                    </div>
                    
                    <div className="space-y-4 md:space-y-6">
                      <div className="bg-white border-2 border-accent/20 p-8 rounded-3xl shadow-xl shadow-black/5 flex flex-col justify-center items-center text-center aspect-square">
                        <Clock className="w-10 h-10 mb-4 text-accent" />
                        <p className="text-4xl font-headline font-bold mb-2 text-foreground">24/7</p>
                        <p className="text-muted-foreground font-medium">{t('home.why_us_badge_support')}</p>
                      </div>
                      <div className="rounded-3xl overflow-hidden shadow-xl shadow-black/5 aspect-[4/5] relative">
                        <Image src="/frejus-truck.jpg" alt="Rapidité" fill className="object-cover hover:scale-105 transition-transform duration-700" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                        <div className="absolute bottom-6 left-6 text-white font-bold text-2xl">{t('home.why_us_badge_speed')}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── TESTIMONIALS ── */}
        <section id="testimonials" className="py-24 bg-muted/30">
          <div className="container">
            <div className="text-center reveal">
              <h2 className="font-headline text-3xl font-bold text-primary heading-underline">{t('home.testimonials_title')}</h2>
              <p className="mt-6 text-muted-foreground max-w-2xl mx-auto">
                {t('home.testimonials_subtitle')}
              </p>
            </div>
            <div className="reveal mt-14">
              <Carousel
                plugins={[autoplayPlugin.current]}
                onMouseEnter={autoplayPlugin.current.stop}
                onMouseLeave={autoplayPlugin.current.reset}
                opts={{ align: "start", loop: true }}
                className="w-full max-w-5xl mx-auto"
              >
                <CarouselContent>
                  {testimonials.map((testimonial, index) => (
                    <CarouselItem key={index} className="md:basis-1/2 lg:basis-1/3 p-2">
                      <div className="bg-white border border-slate-200/80 shadow-lg shadow-slate-100/50 hover:shadow-xl hover:border-primary/40 hover:-translate-y-1 transition-all duration-300 rounded-3xl p-6 flex flex-col justify-between h-[230px] relative overflow-hidden group">
                        {/* Elegant vertical color accent bar on the left */}
                        <div className="absolute left-0 top-6 bottom-6 w-1 bg-gradient-to-b from-primary to-indigo-500 rounded-r-full opacity-70 group-hover:opacity-100 transition-opacity" />
                        
                        {/* Large elegant double quotes */}
                        <span className="absolute top-4 right-6 text-slate-100 font-serif text-7xl select-none pointer-events-none group-hover:text-primary/5 transition-colors duration-500">"</span>
                        
                        <div className="relative z-10">
                          {/* Star rating */}
                          <div className="flex gap-0.5 mb-4">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star key={i} className={`h-4 w-4 ${i < testimonial.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`} />
                            ))}
                          </div>
                          
                          {/* Comment */}
                          <p className="text-slate-600 text-[12px] leading-relaxed font-medium italic line-clamp-4">
                            "{testimonial.comment}"
                          </p>
                        </div>

                        {/* Author info */}
                        <div className="flex items-center gap-3 pt-3 border-t border-slate-100/80 relative z-10">
                          <Avatar className="h-9 w-9 ring-4 ring-primary/5 shrink-0">
                            <AvatarFallback className="bg-gradient-to-br from-primary to-indigo-600 text-white font-bold text-xs">
                              {testimonial.avatar}
                            </AvatarFallback>
                          </Avatar>
                          <div className="truncate">
                            <p className="font-bold text-slate-800 text-[12px] truncate">{testimonial.name}</p>
                            <p className="text-xs text-slate-500 font-medium truncate">{testimonial.role}</p>
                          </div>
                        </div>
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious className="hidden sm:flex" />
                <CarouselNext className="hidden sm:flex" />
              </Carousel>
            </div>
          </div>
        </section>

        {/* ── PARTENAIRES ── */}
        <section className="py-16 bg-white border-y border-border overflow-hidden">
          <div className="container mb-8">
            <h3 className="text-center font-headline text-xl font-semibold text-muted-foreground uppercase tracking-widest reveal">{t('home.partners_title')}</h3>
          </div>
          <div className="w-full flex justify-center flex-wrap gap-8 sm:gap-16 items-center py-4 px-8 reveal">
              {[
                { name: "AXA", src: "/partner-axa.jpg" },
                { name: "Simandou 2040", src: "/partner-simandou.png" },
                { name: "Orange", src: "/partner-orange.jpg" },
                { name: "SMB", src: "/partner-smb.png" },
                { name: "SOGEB", src: "/partner-horse.png" }
              ].map((p, idx) => (
                <div key={idx} className="opacity-60 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-300">
                  <div className="h-16 w-36 relative flex items-center justify-center">
                    <Image
                      src={p.src}
                      alt={p.name}
                      width={140}
                      height={56}
                      className="object-contain max-h-12 w-auto"
                    />
                  </div>
                </div>
              ))}
          </div>
        </section>

        {/* ── CTA BANNER ── */}
        <section className="py-20">
          <div className="container">
            <div
              className="reveal rounded-3xl p-10 md:p-16 text-center text-white overflow-hidden relative"
              style={{ background: 'linear-gradient(135deg, hsl(250 84% 30%), hsl(322 85% 40%), hsl(250 84% 20%))', backgroundSize: '200% 200%' }}
            >
              <div className="animate-gradient-shift absolute inset-0 rounded-3xl" style={{ background: 'linear-gradient(135deg, hsl(250 84% 30%), hsl(322 85% 40%), hsl(270 85% 30%))' }} />
              <div className="absolute inset-0 rounded-3xl" style={{ background: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.08) 0%, transparent 60%)' }} />
              <FloatingParticles />
              <div className="relative z-10">
                <h2 className="font-headline text-3xl md:text-4xl font-bold mb-4">{t('home.cta_banner_title')}</h2>
                <p className="text-white/80 max-w-xl mx-auto mb-8 text-lg">
                  {t('home.cta_banner_desc')}
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link href="/signup/client">
                    <Button size="lg" variant="secondary" className="btn-glow font-bold text-primary text-base">
                      {t('home.cta_banner_btn_client')} <UserPlus className="ml-2 h-5 w-5" />
                    </Button>
                  </Link>
                  <Link href="/signup/transporter">
                    <Button size="lg" className="btn-glow border-2 border-white/60 bg-transparent text-white hover:bg-white hover:text-primary font-bold text-base">
                      {t('home.cta_banner_btn_transporter')} <Truck className="ml-2 h-5 w-5" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── AVIS SECTION ── */}
        <section id="review" className="container py-20">
          <div className="max-w-2xl mx-auto text-center reveal">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-6">
              <MessageSquare className="h-7 w-7 text-primary" />
            </div>
            <h2 className="font-headline text-3xl font-bold text-primary">{t('home.review_title')}</h2>
            <p className="mt-3 text-muted-foreground">{t('home.review_subtitle')}</p>
          </div>
          <Card className="max-w-2xl mx-auto mt-10 shadow-xl border-2 hover:border-primary/30 transition-colors reveal">
            <CardContent className="p-8">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onReviewSubmit)} className="space-y-5">
                  <FormField control={form.control} name="name" render={({ field }: any) => (
                    <FormItem>
                      <FormLabel>{t('home.review_name')}</FormLabel>
                      <FormControl><Input placeholder={t('home.review_placeholder_name')} {...field} className="h-11" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="message" render={({ field }: any) => (
                    <FormItem>
                      <FormLabel>{t('home.review_message')}</FormLabel>
                      <FormControl><Textarea placeholder={t('home.review_placeholder_message')} rows={4} {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <Button type="submit" className="w-full btn-glow h-12 text-base font-semibold" disabled={form.formState.isSubmitting}>
                    {t('home.review_submit')} <MessageSquare className="ml-2 h-4 w-4" />
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </section>

      </main>

      {/* ── FOOTER ── */}
      <SharedFooter />
    </div>
  );
}
