
"use client";

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Autoplay from "embla-carousel-autoplay";

import Logo from '@/components/logo';
import HomePriceSimulator from '@/components/home-price-simulator';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  LogIn, UserPlus, Truck, Mail, Phone, MapPin, Building,
  PackagePlus, Users, ShieldCheck, AreaChart, Send, MessageSquare,
  Facebook, Linkedin, Twitter, ArrowUp, ChevronRight, Star,
  Clock, Zap, HeartHandshake
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

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

/* ─── Data ───────────────────────────────────────────────── */
const reviewFormSchema = z.object({
  name: z.string().min(1, { message: "Votre nom est requis." }),
  message: z.string().min(10, { message: "Votre avis doit contenir au moins 10 caractères." }),
});

const services = [
  {
    icon: <Truck className="h-10 w-10 text-primary service-icon" />,
    title: "Transport de Marchandises",
    description: "Solution fiable pour les entreprises de toutes tailles, du petit colis au chargement complet.",
    badge: "Populaire"
  },
  {
    icon: <PackagePlus className="h-10 w-10 text-primary service-icon" />,
    title: "Envoi de Colis & Paquets",
    description: "Expédiez vos documents importants, cadeaux et autres paquets en toute sécurité et rapidité.",
    badge: ""
  },
  {
    icon: <Building className="h-10 w-10 text-primary service-icon" />,
    title: "Déménagement Simplifié",
    description: "Nos transporteurs sont équipés pour gérer votre déménagement, vous offrant la tranquillité d'esprit.",
    badge: ""
  }
];

const features = [
  {
    icon: <ShieldCheck className="h-8 w-8 text-primary" />,
    title: "Transporteurs Vérifiés",
    description: "Chaque transporteur sur notre plateforme est rigoureusement vérifié pour garantir votre sécurité.",
    color: "from-indigo-50 to-violet-50 dark:from-indigo-950/30 dark:to-violet-950/20"
  },
  {
    icon: <MapPin className="h-8 w-8 text-primary" />,
    title: "Suivi en Temps Réel",
    description: "Sachez exactement où se trouve votre marchandise à chaque étape du trajet grâce à notre suivi GPS.",
    color: "from-purple-50 to-rose-50 dark:from-purple-950/30 dark:to-rose-950/20"
  },
  {
    icon: <AreaChart className="h-8 w-8 text-primary" />,
    title: "Prix Compétitifs",
    description: "Notre système de mise en concurrence vous assure d'obtenir le meilleur prix pour chaque course.",
    color: "from-violet-50 to-pink-50 dark:from-violet-950/30 dark:to-pink-950/20"
  }
];

const testimonials = [
  { name: "Fatoumata K.", role: "Gérante de boutique, Conakry", avatar: "FK", rating: 5, comment: "TransConnekt a transformé ma logistique ! Je peux enfin suivre mes livraisons de Conakry à l'intérieur du pays sans stress. C'est simple, rapide et fiable." },
  { name: "Mamadou S.", role: "Transporteur indépendant", avatar: "MS", rating: 5, comment: "Grâce à la plateforme, je ne rentre plus jamais à vide. Je trouve toujours des courses pour optimiser mes trajets. Mes revenus ont considérablement augmenté." },
  { name: "Global Corp SARL", role: "Entreprise d'import-export", avatar: "GC", rating: 5, comment: "La gestion de notre flotte de chauffeurs et l'assignation des courses n'ont jamais été aussi simples. Un outil indispensable pour les entreprises en Guinée." },
  { name: "Aïssatou B.", role: "Particulière, Labé", avatar: "AB", rating: 4, comment: "J'ai utilisé le service pour envoyer un colis fragile à ma famille à Nzérékoré. Tout est arrivé en parfait état et dans les temps. Je recommande vivement !" },
  { name: "Thierno D.", role: "Agriculteur, Faranah", avatar: "TD", rating: 5, comment: "Trouver un camion pour transporter ma récolte vers les marchés de la capitale était un vrai casse-tête. Avec TransConnekt, j'ai trouvé un transporteur en quelques heures." }
];

const stats = [
  { value: 1200, suffix: '+', label: "Transporteurs actifs", icon: <Truck className="h-6 w-6" /> },
  { value: 8500, suffix: '+', label: "Courses effectuées", icon: <PackagePlus className="h-6 w-6" /> },
  { value: 33,   suffix: '',  label: "Préfectures couvertes", icon: <MapPin className="h-6 w-6" /> },
  { value: 98,   suffix: '%', label: "Clients satisfaits", icon: <Star className="h-6 w-6" /> },
];

const steps = [
  {
    number: "1",
    title: "Publiez votre demande",
    description: "Créez un compte client, puis décrivez votre besoin en quelques clics : nature du colis, poids, trajet et date souhaitée. Votre demande est alors instantanément visible par notre réseau de transporteurs qualifiés.",
    image: "/service-step-1.jpg",
    alt: "Personne utilisant un ordinateur pour planifier une logistique",
    hint: "logistics planning"
  },
  {
    number: "2",
    title: "Choisissez votre transporteur",
    description: "Recevez rapidement des propositions de nos transporteurs vérifiés. Comparez leurs profils, consultez les évaluations et choisissez l'offre qui correspond le mieux à votre budget et à vos exigences.",
    image: "/service-step-2.jpg",
    alt: "Plusieurs camions de transport dans un dépôt logistique",
    hint: "transport trucks"
  },
  {
    number: "3",
    title: "Suivez et validez",
    description: "Une fois le transporteur en route, suivez sa progression en temps réel sur la carte. À l'arrivée, confirmez la livraison et évaluez votre expérience pour aider les futurs utilisateurs.",
    image: "/service-step-3.jpg",
    alt: "Camion sur une route avec une surimpression d'itinéraire GPS",
    hint: "truck gps"
  },
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

const heroImages = [
  '/hero-slide-2.jpg',
  '/hero-slide-3.jpg',
  '/hero-slide-3-custom.png',
];

/* ─── Main Component ─────────────────────────────────────── */
export default function Home() {
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

  const form = useForm<z.infer<typeof reviewFormSchema>>({
    resolver: zodResolver(reviewFormSchema),
    defaultValues: { name: "", message: "" },
  });

  const onReviewSubmit = (values: z.infer<typeof reviewFormSchema>) => {
    console.log("Review submitted:", values);
    toast({ title: "Avis envoyé !", description: "Merci pour votre commentaire. Votre avis est précieux pour nous." });
    form.reset();
  };

  return (
    <div className="flex min-h-screen flex-col bg-background overflow-x-hidden">
      <ScrollTopButton />

      {/* ── HEADER ── */}
      <header
        className={`sticky top-0 z-50 w-full transition-all duration-500 border-b ${
          scrolled
            ? 'border-transparent bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 backdrop-blur-xl shadow-lg'
            : 'border-transparent bg-gradient-to-b from-slate-900/75 via-slate-900/50 to-transparent backdrop-blur-sm'
        }`}
      >
        <div className="container flex h-16 max-w-screen-2xl items-center justify-between px-4">
          {/* Logo – toujours à gauche, toujours blanc */}
          <div className="filter brightness-0 invert flex-shrink-0">
            <Logo />
          </div>

          {/* Navigation + Boutons – droite */}
          <div className="flex items-center gap-2 md:gap-4">
            <nav className="hidden md:flex items-center gap-1 lg:gap-2">
              <Link href="#hero" className="nav-link text-xs lg:text-sm font-medium text-white/80 hover:text-white transition-colors px-2 py-1">Accueil</Link>
              <Link href="#services" className="nav-link text-xs lg:text-sm font-medium text-white/80 hover:text-white transition-colors px-2 py-1">Services</Link>
              <Link href="#how-it-works" className="nav-link text-xs lg:text-sm font-medium text-white/80 hover:text-white transition-colors px-2 py-1">Comment ça marche ?</Link>
              <Link href="#why-us" className="nav-link text-xs lg:text-sm font-medium text-white/80 hover:text-white transition-colors px-2 py-1">Pourquoi nous ?</Link>
              <Link href="#testimonials" className="nav-link text-xs lg:text-sm font-medium text-white/80 hover:text-white transition-colors px-2 py-1">Témoignages</Link>
              <Link href="#contact" className="nav-link text-xs lg:text-sm font-medium text-white/80 hover:text-white transition-colors px-2 py-1">Contact</Link>
            </nav>
            <div className="flex items-center gap-2 ml-2">
              <Link href="/login">
                <Button variant="ghost" className="hidden sm:flex text-white/80 hover:text-white hover:bg-white/10 transition-colors text-sm">
                  Se connecter <LogIn className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/signup/client">
                <Button
                  className="btn-glow font-semibold text-white text-sm border-0 shadow-lg"
                  style={{ background: 'linear-gradient(135deg, hsl(322 85% 50%), hsl(340 90% 58%))' }}
                >
                  S'inscrire <UserPlus className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

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
          {/* Animated ring decorations */}
          <div className="absolute top-20 right-20 w-64 h-64 rounded-full border-2 border-white/10 animate-rotate-slow hidden lg:block" aria-hidden />
          <div className="absolute bottom-20 left-20 w-48 h-48 rounded-full border border-white/8 animate-rotate-slow hidden lg:block" style={{ animationDirection: 'reverse', animationDuration: '30s' }} aria-hidden />

          <div className="container relative z-10 text-center py-24">
            <div className="mx-auto w-full max-w-4xl">

              {/* Badge */}
              <div className="animate-fade-in-up inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-card text-white/90 text-sm font-medium mb-6 border border-white/20">
                <Zap className="h-4 w-4 text-yellow-400 animate-bounce-soft" />
                La plateforme logistique N°1 en Guinée
                <ChevronRight className="h-4 w-4 opacity-60" />
              </div>

              {/* Title */}
              <h1 className="animate-hero-text delay-200 font-headline text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl text-white leading-tight">
                Transportez vos biens{' '}
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
                  en toute confiance
                </span>{' '}
                en Guinée.
              </h1>

              {/* Subtitle */}
              <p className="animate-fade-in-up delay-400 mt-6 text-lg leading-8 text-white/85 max-w-2xl mx-auto">
                Mise en relation simple et efficace entre clients et transporteurs vérifiés.
                Trouvez le bon service, au bon moment, au meilleur prix.
              </p>

              {/* CTA Buttons */}
              <div className="animate-fade-in-up delay-600 mt-12 flex flex-col sm:flex-row items-center justify-center gap-6">
                <div className="flex flex-col gap-2 items-center">
                  <p className="text-sm text-white/70 font-medium">Pour les particuliers</p>
                  <div className="flex gap-3">
                    <Link href="/signup/client">
                      <Button size="lg" variant="secondary" className="btn-glow font-semibold shadow-lg">
                        Je suis Client <UserPlus className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                    <Link href="/signup/transporter">
                      <Button size="lg" className="btn-glow bg-transparent border-2 border-white/70 text-white hover:bg-white hover:text-primary font-semibold">
                        Transporteur <Truck className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
                <div className="hidden sm:block w-px h-12 bg-white/20" />
                <div className="flex flex-col gap-2 items-center">
                  <p className="text-sm text-white/70 font-medium">Pour les entreprises</p>
                  <div className="flex gap-3">
                    <Link href="/signup/client-company">
                      <Button size="lg" variant="secondary" className="btn-glow font-semibold shadow-lg">
                        Client Pro <Building className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                    <Link href="/signup/transporter-company">
                      <Button size="lg" className="btn-glow bg-transparent border-2 border-white/70 text-white hover:bg-white hover:text-primary font-semibold">
                        Transporteur Pro <Building className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>

              {/* Trust badges */}
              <div className="animate-fade-in delay-1000 mt-12 flex flex-wrap items-center justify-center gap-6 text-white/70 text-sm">
                <span className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-green-400" /> Transporteurs certifiés</span>
                <span className="w-1 h-1 rounded-full bg-white/30" />
                <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4 text-blue-400" /> Suivi GPS en temps réel</span>
                <span className="w-1 h-1 rounded-full bg-white/30" />
                <span className="flex items-center gap-1.5"><HeartHandshake className="h-4 w-4 text-rose-400" /> Paiement sécurisé</span>
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

        {/* ── PRICE SIMULATOR ── */}
        <section id="price-simulator" className="container pb-20">
          <div className="reveal">
            <HomePriceSimulator />
          </div>
        </section>

        {/* ── HOW IT WORKS ── */}
        <section id="how-it-works" className="bg-gradient-to-b from-muted/30 to-background py-24">
          <div className="container space-y-20">
            <div className="text-center reveal">
              <h2 className="font-headline text-3xl font-bold text-primary heading-underline">Simple comme bonjour</h2>
              <p className="mx-auto mt-6 max-w-2xl text-muted-foreground">
                Suivez ces étapes faciles pour expédier vos marchandises rapidement et en toute sécurité.
              </p>
            </div>

            {steps.map((step, i) => {
              const isEven = i % 2 === 0;
              return (
                <div key={i} className="grid md:grid-cols-2 gap-12 items-center">
                  <div className={`${isEven ? 'order-2 md:order-1 reveal-left' : 'order-2 reveal-right'}`}>
                    <div className="step-number bg-primary/10 text-primary w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-2xl mb-5 cursor-default">
                      {step.number}
                    </div>
                    <h3 className="font-headline text-2xl font-semibold mb-4">{step.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">{step.description}</p>
                    {i === steps.length - 1 && (
                      <Link href="/signup/client" className="inline-block mt-6">
                        <Button className="btn-glow">Commencer maintenant <ChevronRight className="ml-1 h-4 w-4" /></Button>
                      </Link>
                    )}
                  </div>
                  <div className={`${isEven ? 'order-1 md:order-2 reveal-right' : 'order-1 reveal-left'}`}>
                    <div className="img-hover rounded-2xl overflow-hidden shadow-2xl">
                      <Image
                        src={step.image}
                        alt={step.alt}
                        width={600}
                        height={400}
                        className="w-full object-cover"
                        data-ai-hint={step.hint}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── SERVICES ── */}
        <section id="services" className="py-24">
          <div className="container">
            <div className="text-center reveal">
              <h2 className="font-headline text-3xl font-bold text-primary heading-underline">Une solution pour chaque besoin</h2>
              <p className="mt-6 text-muted-foreground max-w-2xl mx-auto">
                Que vous soyez un particulier ou une entreprise, TransConnekt s'adapte à vos exigences.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-8 mt-16 stagger-children">
              {services.map((service, index) => (
                <div key={index} className="reveal-scale">
                  <Card className="service-card text-center h-full relative overflow-hidden border-2">
                    {service.badge && (
                      <div className="absolute top-4 right-4">
                        <span className="px-2 py-1 text-xs font-bold rounded-full bg-primary text-white">{service.badge}</span>
                      </div>
                    )}
                    <CardHeader className="items-center pb-4">
                      <div className="bg-primary/10 p-5 rounded-2xl mb-2 transition-all duration-300">
                        {service.icon}
                      </div>
                      <CardTitle className="text-xl">{service.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground leading-relaxed">{service.description}</p>
                      <Link href="/signup/client" className="mt-4 inline-flex items-center text-sm font-medium text-primary hover:underline">
                        En savoir plus <ChevronRight className="h-3 w-3 ml-1" />
                      </Link>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── WHY US ── */}
        <section id="why-us" className="py-24 bg-gradient-to-br from-primary/5 via-background to-accent/5">
          <div className="container">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div className="reveal-left">
                <h2 className="font-headline text-3xl font-bold text-primary mb-4 heading-underline">Votre partenaire de confiance</h2>
                <p className="text-muted-foreground mb-10 mt-6 leading-relaxed">
                  Découvrez pourquoi des centaines d'utilisateurs et d'entreprises nous font confiance chaque jour pour leurs besoins logistiques en Guinée.
                </p>
                <div className="space-y-6">
                  {features.map((feature, index) => (
                    <div
                      key={index}
                      className={`feature-card flex items-start gap-5 p-5 rounded-2xl bg-gradient-to-r ${feature.color} border border-border/50 cursor-default`}
                      style={{ transitionDelay: `${index * 0.1}s` }}
                    >
                      <div className="bg-white p-3 rounded-xl shadow-sm shrink-0 feature-icon-wrap">
                        {feature.icon}
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg mb-1">{feature.title}</h3>
                        <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="reveal-right">
                <div className="relative">
                  <div className="img-hover rounded-3xl overflow-hidden shadow-2xl">
                    <Image
                      src="/partner-trust.jpg"
                      alt="Transporteur sérieux vérifié par TransConnekt"
                      width={600}
                      height={650}
                      className="w-full object-cover"
                      data-ai-hint="professional driver"
                    />
                  </div>
                  {/* Floating badge */}
                  <div className="absolute -bottom-6 -left-6 bg-white rounded-2xl p-4 shadow-2xl border border-border animate-bounce-soft">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                        <ShieldCheck className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="font-bold text-sm text-foreground">Certifié & Vérifié</p>
                        <p className="text-xs text-muted-foreground">Tous nos transporteurs</p>
                      </div>
                    </div>
                  </div>
                  {/* Speed badge */}
                  <div className="absolute -top-6 -right-6 bg-primary text-white rounded-2xl p-4 shadow-2xl animate-bounce-soft delay-500">
                    <div className="flex items-center gap-3">
                      <Clock className="h-5 w-5" />
                      <div>
                        <p className="font-bold text-sm">Livraison rapide</p>
                        <p className="text-xs opacity-80">En quelques heures</p>
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
              <h2 className="font-headline text-3xl font-bold text-primary heading-underline">Ils nous font confiance</h2>
              <p className="mt-6 text-muted-foreground max-w-2xl mx-auto">
                Découvrez ce que nos utilisateurs pensent de TransConnekt.
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
                      <Card className="testimonial-card flex flex-col h-full border-2 hover:border-primary/30">
                        <CardContent className="pt-6 flex-grow">
                          <StarRating count={testimonial.rating} />
                          <p className="italic text-muted-foreground text-sm leading-relaxed">"{testimonial.comment}"</p>
                        </CardContent>
                        <CardHeader className="flex-row items-center gap-4 pt-2">
                          <Avatar className="ring-2 ring-primary/20">
                            <AvatarFallback className="bg-primary/10 text-primary font-bold">{testimonial.avatar}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-semibold text-sm">{testimonial.name}</p>
                            <p className="text-xs text-muted-foreground">{testimonial.role}</p>
                          </div>
                        </CardHeader>
                      </Card>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious className="hidden sm:flex" />
                <CarouselNext className="hidden sm:flex" />
              </Carousel>
            </div>
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
                <h2 className="font-headline text-3xl md:text-4xl font-bold mb-4">Prêt à démarrer ?</h2>
                <p className="text-white/80 max-w-xl mx-auto mb-8 text-lg">
                  Rejoignez des milliers d'utilisateurs qui font confiance à TransConnekt pour leurs besoins logistiques.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link href="/signup/client">
                    <Button size="lg" variant="secondary" className="btn-glow font-bold text-primary text-base">
                      Je suis un Client <UserPlus className="ml-2 h-5 w-5" />
                    </Button>
                  </Link>
                  <Link href="/signup/transporter">
                    <Button size="lg" className="btn-glow border-2 border-white/60 bg-transparent text-white hover:bg-white hover:text-primary font-bold text-base">
                      Je suis Transporteur <Truck className="ml-2 h-5 w-5" />
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
            <h2 className="font-headline text-3xl font-bold text-primary">Laissez votre avis</h2>
            <p className="mt-3 text-muted-foreground">Votre avis compte ! Partagez votre expérience pour nous aider à nous améliorer.</p>
          </div>
          <Card className="max-w-2xl mx-auto mt-10 shadow-xl border-2 hover:border-primary/30 transition-colors reveal">
            <CardContent className="p-8">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onReviewSubmit)} className="space-y-5">
                  <FormField control={form.control} name="name" render={({ field }: any) => (
                    <FormItem>
                      <FormLabel>Votre nom</FormLabel>
                      <FormControl><Input placeholder="Moussa Camara" {...field} className="h-11" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="message" render={({ field }: any) => (
                    <FormItem>
                      <FormLabel>Votre avis</FormLabel>
                      <FormControl><Textarea placeholder="J'ai utilisé TransConnekt et..." rows={4} {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <Button type="submit" className="w-full btn-glow h-12 text-base font-semibold" disabled={form.formState.isSubmitting}>
                    Envoyer mon avis <MessageSquare className="ml-2 h-4 w-4" />
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </section>

      </main>

      {/* ── FOOTER ── */}
      <footer id="contact" className="bg-foreground text-background border-t pt-16">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
            {/* Col 1 */}
            <div className="space-y-5">
              <div className="filter invert">
                <Logo />
              </div>
              <p className="text-sm text-background/70 leading-relaxed">
                Votre partenaire de confiance pour des solutions de transport fiables et efficaces en Guinée.
              </p>
              <div className="flex items-center space-x-3">
                <a href="#" aria-label="Facebook" className="w-9 h-9 rounded-full bg-background/10 hover:bg-primary flex items-center justify-center transition-colors">
                  <Facebook size={16} />
                </a>
                <a href="#" aria-label="Twitter" className="w-9 h-9 rounded-full bg-background/10 hover:bg-primary flex items-center justify-center transition-colors">
                  <Twitter size={16} />
                </a>
                <a href="#" aria-label="LinkedIn" className="w-9 h-9 rounded-full bg-background/10 hover:bg-primary flex items-center justify-center transition-colors">
                  <Linkedin size={16} />
                </a>
              </div>
            </div>

            {/* Col 2 */}
            <div className="space-y-4">
              <h4 className="font-semibold text-background">Nos Services</h4>
              <ul className="space-y-2 text-sm text-background/70">
                <li><Link href="#services" className="footer-link hover:text-background transition-colors">Transport de Marchandises</Link></li>
                <li><Link href="#services" className="footer-link hover:text-background transition-colors">Envoi de Colis</Link></li>
                <li><Link href="#services" className="footer-link hover:text-background transition-colors">Déménagement</Link></li>
                <li><Link href="#services" className="footer-link hover:text-background transition-colors">Transport Pro</Link></li>
              </ul>
            </div>

            {/* Col 3 */}
            <div className="space-y-4">
              <h4 className="font-semibold text-background">Liens Rapides</h4>
              <ul className="space-y-2 text-sm text-background/70">
                <li><Link href="#how-it-works" className="footer-link hover:text-background transition-colors">Comment ça marche ?</Link></li>
                <li><Link href="#price-simulator" className="footer-link hover:text-background transition-colors">Simulateur de prix</Link></li>
                <li><Link href="/login" className="footer-link hover:text-background transition-colors">Espace client</Link></li>
                <li><Link href="/signup/transporter" className="footer-link hover:text-background transition-colors">Devenir transporteur</Link></li>
              </ul>
            </div>

            {/* Col 4 */}
            <div className="space-y-4">
              <h4 className="font-semibold text-background">Contact</h4>
              <ul className="space-y-3 text-sm text-background/70">
                <li className="flex items-start gap-3">
                  <MapPin size={18} className="text-primary mt-0.5 shrink-0" />
                  <span>Lambanyi, commune de Ratoma, Immeuble Amizo</span>
                </li>
                <li className="flex items-start gap-3">
                  <Phone size={18} className="text-primary mt-0.5 shrink-0" />
                  <div className="flex flex-col gap-1">
                    <a href="tel:+224612000102" className="hover:text-background transition-colors">612 00 01 02</a>
                    <a href="tel:+224669998339" className="hover:text-background transition-colors">669 99 83 39</a>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <Mail size={18} className="text-primary mt-0.5 shrink-0" />
                  <a href="mailto:info@informafrik.com" className="hover:text-background transition-colors">info@informafrik.com</a>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-12 border-t border-background/15 py-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-background/50">
            <div className="text-center sm:text-left">
              <p>&copy; {new Date().getFullYear()} Informafrik SARLU. Tous droits réservés.</p>
              <p className="text-xs mt-1">N° RCCM: GN.KAL.2019.B.092 259 | NIF: 749265013</p>
            </div>
            <div className="flex gap-4">
              <Link href="#" className="hover:text-background/80 transition-colors">Politique de confidentialité</Link>
              <Link href="#" className="hover:text-background/80 transition-colors">Conditions d'utilisation</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
