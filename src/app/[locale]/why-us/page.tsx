"use client";
import React, { useEffect } from 'react';
import SharedHeader from '@/components/shared-header';
import SharedFooter from '@/components/shared-footer';
import { AreaChart, ShieldCheck, MapPin, Clock, Zap, HeartHandshake, Truck, PackagePlus, Star, UserPlus, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import Image from 'next/image';
import { useTranslation } from '@/lib/translations';

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
  const { t } = useTranslation();

  const features = [
    { icon: <ShieldCheck className="h-10 w-10 text-primary" />, title: t('why_us.feat_carriers_title'), desc: t('why_us.feat_carriers_desc') },
    { icon: <MapPin className="h-10 w-10 text-primary" />, title: t('why_us.feat_gps_title'), desc: t('why_us.feat_gps_desc') },
    { icon: <AreaChart className="h-10 w-10 text-primary" />, title: t('why_us.feat_pricing_title'), desc: t('why_us.feat_pricing_desc') },
    { icon: <Clock className="h-10 w-10 text-primary" />, title: t('why_us.feat_support_title'), desc: t('why_us.feat_support_desc') },
    { icon: <HeartHandshake className="h-10 w-10 text-primary" />, title: t('why_us.feat_payment_title'), desc: t('why_us.feat_payment_desc') },
    { icon: <Zap className="h-10 w-10 text-primary" />, title: t('why_us.feat_speed_title'), desc: t('why_us.feat_speed_desc') }
  ];

  const stats = [
    { value: 1200, suffix: '+', label: t('why_us.stat_active_carriers'), icon: <Truck className="h-6 w-6" /> },
    { value: 8500, suffix: '+', label: t('why_us.stat_completed_trips'), icon: <PackagePlus className="h-6 w-6" /> },
    { value: 33,   suffix: '',  label: t('why_us.stat_prefectures'), icon: <MapPin className="h-6 w-6" /> },
    { value: 98,   suffix: '%', label: t('why_us.stat_satisfied_clients'), icon: <Star className="h-6 w-6" /> },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background overflow-x-hidden">
      <SharedHeader />
      <main className="flex-1">
        {/* Hero banner */}
        <section className="relative py-24 md:py-32 overflow-hidden" style={{ background: 'linear-gradient(135deg, hsl(250 84% 12%), hsl(265 80% 18%), hsl(250 84% 8%))' }}>
          <div className="container relative z-10 text-center">
            <h1 className="font-headline text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 animate-fade-in-up">{t('why_us.hero_title')}</h1>
            <p className="text-white/80 text-lg md:text-xl max-w-2xl mx-auto animate-fade-in-up delay-200">
              {t('why_us.hero_desc')}
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

        {/* Comparison Section */}
        <section className="py-24 container">
            <div className="text-center reveal mb-16">
                <h2 className="font-headline text-3xl font-bold text-primary heading-underline">{t('why_us.comparison_title')}</h2>
                <p className="text-muted-foreground mt-4 max-w-2xl mx-auto">{t('why_us.comparison_desc')}</p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-8 lg:gap-16 max-w-5xl mx-auto">
                <div className="reveal-left bg-red-50/50 p-8 rounded-3xl border border-red-100">
                    <h3 className="font-headline text-xl font-bold mb-6 text-red-600 flex items-center gap-2">
                        <span className="bg-red-100 p-2 rounded-lg text-red-600">{t('why_us.before_title').split(' ')[0]}</span> {t('why_us.before_title').split(' ')[1]} TransConnekt
                    </h3>
                    <ul className="space-y-4">
                        <li className="flex items-start gap-3"><span className="text-red-500 font-bold">✕</span> <span className="text-muted-foreground">{t('why_us.before_bullet1')}</span></li>
                        <li className="flex items-start gap-3"><span className="text-red-500 font-bold">✕</span> <span className="text-muted-foreground">{t('why_us.before_bullet2')}</span></li>
                        <li className="flex items-start gap-3"><span className="text-red-500 font-bold">✕</span> <span className="text-muted-foreground">{t('why_us.before_bullet3')}</span></li>
                        <li className="flex items-start gap-3"><span className="text-red-500 font-bold">✕</span> <span className="text-muted-foreground">{t('why_us.before_bullet4')}</span></li>
                        <li className="flex items-start gap-3"><span className="text-red-500 font-bold">✕</span> <span className="text-muted-foreground">{t('why_us.before_bullet5')}</span></li>
                    </ul>
                </div>
                
                <div className="reveal-right bg-green-50/50 p-8 rounded-3xl border border-green-100 relative shadow-lg">
                    <div className="absolute -top-4 -right-4 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">{t('why_us.after_badge')}</div>
                    <h3 className="font-headline text-xl font-bold mb-6 text-green-600 flex items-center gap-2">
                        <span className="bg-green-100 p-2 rounded-lg text-green-600">{t('why_us.after_title').split(' ')[0]}</span> {t('why_us.after_title').split(' ')[1]} TransConnekt
                    </h3>
                    <ul className="space-y-4">
                        <li className="flex items-start gap-3"><span className="text-green-500 font-bold">✓</span> <span className="text-foreground font-medium">{t('why_us.after_bullet1')}</span></li>
                        <li className="flex items-start gap-3"><span className="text-green-500 font-bold">✓</span> <span className="text-foreground font-medium">{t('why_us.after_bullet2')}</span></li>
                        <li className="flex items-start gap-3"><span className="text-green-500 font-bold">✓</span> <span className="text-foreground font-medium">{t('why_us.after_bullet3')}</span></li>
                        <li className="flex items-start gap-3"><span className="text-green-500 font-bold">✓</span> <span className="text-foreground font-medium">{t('why_us.after_bullet4')}</span></li>
                        <li className="flex items-start gap-3"><span className="text-green-500 font-bold">✓</span> <span className="text-foreground font-medium">{t('why_us.after_bullet5')}</span></li>
                    </ul>
                </div>
            </div>
        </section>

        {/* Trust Image */}
        <section className="py-24 overflow-hidden">
            <div className="container">
                <div className="grid lg:grid-cols-2 gap-16 items-center">
                    <div className="reveal-left">
                        <h2 className="font-headline text-3xl font-bold text-primary mb-6 heading-underline">{t('why_us.security_title')}</h2>
                        <p className="text-muted-foreground text-lg leading-relaxed mb-8">
                            {t('why_us.security_desc')}
                        </p>
                        <ul className="space-y-4">
                            {[
                                t('why_us.security_bullet1'),
                                t('why_us.security_bullet2'),
                                t('why_us.security_bullet3'),
                                t('why_us.security_bullet4')
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
                                alt="Partenaire de confiance TransConnekt"
                                width={600}
                                height={600}
                                className="w-full object-cover"
                            />
                        </div>
                        <div className="absolute -bottom-8 -left-8 bg-white p-6 rounded-2xl shadow-xl z-20 border border-border animate-bounce-soft">
                            <div className="flex items-center gap-4">
                                <div className="bg-primary/10 p-3 rounded-xl"><HeartHandshake className="h-8 w-8 text-primary" /></div>
                                <div>
                                    <p className="font-bold text-foreground">{t('why_us.trust_badge_title')}</p>
                                    <p className="text-sm text-muted-foreground">{t('why_us.trust_badge_desc')}</p>
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
                <h2 className="font-headline text-3xl font-bold mb-6">{t('why_us.cta_title')}</h2>
                <Link href="/signup/client">
                    <Button size="lg" className="btn-glow text-white font-bold h-12 px-8" style={{ background: 'linear-gradient(135deg, hsl(322 85% 50%), hsl(340 90% 58%))' }}>
                        {t('why_us.cta_button')} <ChevronRight className="ml-2 h-5 w-5" />
                    </Button>
                </Link>
            </div>
        </section>
      </main>
      <SharedFooter />
    </div>
  );
}
