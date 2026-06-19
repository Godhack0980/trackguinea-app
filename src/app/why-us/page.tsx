"use client";
import React, { useEffect } from 'react';
import SharedHeader from '@/components/shared-header';
import SharedFooter from '@/components/shared-footer';
import { AreaChart, ShieldCheck, MapPin, Clock, Zap, HeartHandshake, Truck, PackagePlus, Star, UserPlus, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import Image from 'next/image';

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

function AnimatedCounter({ target, suffix = '' }: { target: number; suffix?: string }) {
    const [count, setCount] = React.useState(0);
    const ref = React.useRef<HTMLSpanElement>(null);
    const started = React.useRef(false);
  
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

export default function WhyUsPage() {
  useScrollReveal();

  const features = [
    { icon: <ShieldCheck className="h-10 w-10 text-primary" />, title: "Transporteurs Vérifiés", desc: "Un processus de sélection rigoureux garantissant la fiabilité de chaque partenaire." },
    { icon: <MapPin className="h-10 w-10 text-primary" />, title: "Suivi en Temps Réel", desc: "Gardez un œil sur votre marchandise grâce à notre technologie de tracking GPS." },
    { icon: <AreaChart className="h-10 w-10 text-primary" />, title: "Prix Compétitifs", desc: "Une mise en concurrence transparente pour vous offrir le meilleur rapport qualité/prix." },
    { icon: <Clock className="h-10 w-10 text-primary" />, title: "Support 24/7", desc: "Une équipe dédiée disponible à tout moment pour répondre à vos questions." },
    { icon: <HeartHandshake className="h-10 w-10 text-primary" />, title: "Paiement Sécurisé", desc: "Des transactions protégées pour la sérénité des clients et des transporteurs." },
    { icon: <Zap className="h-10 w-10 text-primary" />, title: "Rapide & Fiable", desc: "Trouvez un transporteur adapté en quelques clics et expédiez sans attendre." }
  ];

  const stats = [
    { value: 1200, suffix: '+', label: "Transporteurs actifs", icon: <Truck className="h-6 w-6" /> },
    { value: 8500, suffix: '+', label: "Courses effectuées", icon: <PackagePlus className="h-6 w-6" /> },
    { value: 33,   suffix: '',  label: "Préfectures couvertes", icon: <MapPin className="h-6 w-6" /> },
    { value: 98,   suffix: '%', label: "Clients satisfaits", icon: <Star className="h-6 w-6" /> },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background overflow-x-hidden">
      <SharedHeader />
      <main className="flex-1">
        {/* Hero banner */}
        <section className="relative py-24 md:py-32 overflow-hidden" style={{ background: 'linear-gradient(135deg, hsl(250 84% 12%), hsl(265 80% 18%), hsl(250 84% 8%))' }}>
          <div className="container relative z-10 text-center">
            <h1 className="font-headline text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 animate-fade-in-up">Pourquoi choisir TrackGuinea ?</h1>
            <p className="text-white/80 text-lg md:text-xl max-w-2xl mx-auto animate-fade-in-up delay-200">
              L'excellence logistique à portée de main. Découvrez ce qui fait de nous le partenaire idéal.
            </p>
          </div>
        </section>

        {/* Features Grid */}
        <section className="py-24 container">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {features.map((feat, i) => (
                    <div key={i} className="reveal-scale bg-white rounded-3xl p-8 border border-border/50 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-2 group">
                        <div className="bg-primary/5 w-20 h-20 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-primary/10 transition-colors">
                            {feat.icon}
                        </div>
                        <h3 className="font-headline text-xl font-bold mb-4">{feat.title}</h3>
                        <p className="text-muted-foreground leading-relaxed">{feat.desc}</p>
                    </div>
                ))}
            </div>
        </section>

        {/* Stats */}
        <section className="py-20 bg-primary/5">
            <div className="container">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                    {stats.map((stat, i) => (
                        <div key={i} className="reveal-scale text-center p-6 bg-white rounded-2xl shadow-sm border border-border/50">
                            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary mb-4">
                                {stat.icon}
                            </div>
                            <div className="text-4xl font-headline font-bold text-primary mb-2">
                                <AnimatedCounter target={stat.value} suffix={stat.suffix} />
                            </div>
                            <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>

        {/* Trust Image */}
        <section className="py-24 overflow-hidden">
            <div className="container">
                <div className="grid lg:grid-cols-2 gap-16 items-center">
                    <div className="reveal-left">
                        <h2 className="font-headline text-3xl font-bold text-primary mb-6 heading-underline">Notre engagement : Votre sécurité</h2>
                        <p className="text-muted-foreground text-lg leading-relaxed mb-8">
                            Nous ne faisons aucun compromis sur la sécurité de vos biens. Chaque transporteur partenaire est soumis à un processus de vérification strict, incluant l'examen des documents légaux et une évaluation continue basée sur les retours de la communauté.
                        </p>
                        <ul className="space-y-4">
                            {[
                                "Vérification d'identité et de casier judiciaire",
                                "Contrôle des documents du véhicule et de l'assurance",
                                "Système d'évaluation par les pairs",
                                "Sanctions strictes en cas de non-respect de notre charte"
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-3">
                                    <div className="bg-green-100 p-1.5 rounded-full"><ShieldCheck className="h-4 w-4 text-green-600" /></div>
                                    <span className="font-medium">{item}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div className="reveal-right relative">
                        <div className="rounded-3xl overflow-hidden shadow-2xl border-4 border-white relative z-10">
                            <Image
                                src="/partner-trust.jpg"
                                alt="Partenaire de confiance TrackGuinea"
                                width={600}
                                height={600}
                                className="w-full object-cover"
                            />
                        </div>
                        <div className="absolute -bottom-8 -left-8 bg-white p-6 rounded-2xl shadow-xl z-20 border border-border animate-bounce-soft">
                            <div className="flex items-center gap-4">
                                <div className="bg-primary/10 p-3 rounded-xl"><HeartHandshake className="h-8 w-8 text-primary" /></div>
                                <div>
                                    <p className="font-bold text-foreground">Confiance absolue</p>
                                    <p className="text-sm text-muted-foreground">100% de trajets sécurisés</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        {/* CTA */}
        <section className="py-24 bg-muted/30">
            <div className="container text-center reveal">
                <h2 className="font-headline text-3xl font-bold mb-6">Faites le bon choix</h2>
                <Link href="/signup/client">
                    <Button size="lg" className="btn-glow text-white font-bold h-12 px-8" style={{ background: 'linear-gradient(135deg, hsl(322 85% 50%), hsl(340 90% 58%))' }}>
                        Rejoindre TrackGuinea <ChevronRight className="ml-2 h-5 w-5" />
                    </Button>
                </Link>
            </div>
        </section>
      </main>
      <SharedFooter />
    </div>
  );
}
