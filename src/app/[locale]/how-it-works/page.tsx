"use client";
import React, { useEffect } from 'react';
import SharedHeader from '@/components/shared-header';
import SharedFooter from '@/components/shared-footer';
import { Send, Users, MapPin, ShieldCheck, ChevronRight, UserPlus, CheckCircle, PackageCheck, Briefcase } from 'lucide-react';
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

export default function HowItWorksPage() {
  useScrollReveal();
  const { t } = useTranslation();
  
  const steps = [
    {
      number: "1",
      title: t('how_it_works.step1_title'),
      description: t('how_it_works.step1_desc'),
      image: "/service-step-1.jpg",
      icon: <Send className="h-6 w-6" />
    },
    {
      number: "2",
      title: t('how_it_works.step2_title'),
      description: t('how_it_works.step2_desc'),
      image: "/service-step-2.jpg",
      icon: <Users className="h-6 w-6" />
    },
    {
      number: "3",
      title: t('how_it_works.step3_title'),
      description: t('how_it_works.step3_desc'),
      image: "/service-step-3.jpg",
      icon: <CheckCircle className="h-6 w-6" />
    },
    {
      number: "4",
      title: t('how_it_works.step4_title'),
      description: t('how_it_works.step4_desc'),
      image: "/partner-trust.jpg",
      icon: <MapPin className="h-6 w-6" />
    },
    {
      number: "5",
      title: t('how_it_works.step5_title'),
      description: t('how_it_works.step5_desc'),
      image: "/service-step-1.jpg",
      icon: <PackageCheck className="h-6 w-6" />
    }
  ];

  const faqs = [
    { q: t('how_it_works.faq_q1'), a: t('how_it_works.faq_a1') },
    { q: t('how_it_works.faq_q2'), a: t('how_it_works.faq_a2') },
    { q: t('how_it_works.faq_q3'), a: t('how_it_works.faq_a3') },
    { q: t('how_it_works.faq_q4'), a: t('how_it_works.faq_a4') }
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background overflow-x-hidden">
      <SharedHeader />
      <main className="flex-1">
        {/* Hero banner */}
        <section className="relative py-24 md:py-32 overflow-hidden" style={{ background: 'linear-gradient(135deg, hsl(250 84% 12%), hsl(265 80% 18%), hsl(250 84% 8%))' }}>
          <div className="container relative z-10 text-center">
            <h1 className="font-headline text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 animate-fade-in-up">{t('how_it_works.hero_title')}</h1>
            <p className="text-white/80 text-lg md:text-xl max-w-2xl mx-auto mb-10 animate-fade-in-up delay-200">
              {t('how_it_works.hero_desc')}
            </p>
            <div className="relative max-w-4xl mx-auto rounded-3xl overflow-hidden shadow-2xl border border-white/10 reveal-scale visible">
              <Image 
                src="/how-it-works-hero.png" 
                alt="Comment ça marche" 
                width={1200}
                height={500}
                className="w-full h-auto object-cover"
                priority
              />
            </div>
          </div>
        </section>

        {/* Steps */}
        <section className="py-24 container space-y-24 relative">
            <div className="absolute left-1/2 top-10 bottom-10 w-0.5 bg-gradient-to-b from-primary/20 via-primary/50 to-primary/20 hidden md:block -translate-x-1/2 z-0"></div>
            
            {steps.map((step, i) => {
                const isEven = i % 2 !== 0;
                return (
                    <div key={i} className="grid md:grid-cols-2 gap-12 items-center relative z-10">
                        <div className={`${isEven ? 'order-2 md:order-2 reveal-right md:pl-12' : 'order-2 md:order-1 reveal-left md:pr-12 md:text-right'}`}>
                            <div className={`inline-flex items-center gap-3 mb-6 ${isEven ? '' : 'md:flex-row-reverse'}`}>
                                <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold text-xl shadow-inner">
                                    {step.number}
                                </div>
                                <div className="w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center text-primary border border-border/50">
                                    {step.icon}
                                </div>
                            </div>
                            <h3 className="font-headline text-3xl font-semibold mb-4 text-foreground">{step.title}</h3>
                            <p className="text-muted-foreground leading-relaxed text-lg">{step.description}</p>
                        </div>
                        <div className={`${isEven ? 'order-1 md:order-1 reveal-left' : 'order-1 md:order-2 reveal-right'}`}>
                            <div className="img-hover rounded-3xl overflow-hidden shadow-2xl border-4 border-white">
                                <Image
                                    src={step.image}
                                    alt={step.title}
                                    width={600}
                                    height={400}
                                    className="w-full h-auto object-cover"
                                />
                            </div>
                        </div>
                    </div>
                );
            })}
        </section>

        {/* Section Transporteurs */}
        <section className="py-24 bg-primary/5">
            <div className="container">
                <div className="grid lg:grid-cols-2 gap-16 items-center">
                    <div className="reveal-left">
                        <h2 className="font-headline text-3xl font-bold text-primary mb-6 heading-underline">{t('how_it_works.carrier_title')}</h2>
                        <p className="text-muted-foreground text-lg leading-relaxed mb-6">
                            {t('how_it_works.carrier_desc')}
                        </p>
                        <div className="space-y-6 mb-8">
                            <div className="flex items-start gap-4">
                                <div className="bg-white p-3 rounded-xl shadow-sm border border-border/50 text-primary">
                                    <UserPlus className="h-6 w-6" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-foreground">{t('how_it_works.carrier_step1_title')}</h4>
                                    <p className="text-sm text-muted-foreground">{t('how_it_works.carrier_step1_desc')}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-4">
                                <div className="bg-white p-3 rounded-xl shadow-sm border border-border/50 text-primary">
                                    <ShieldCheck className="h-6 w-6" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-foreground">{t('how_it_works.carrier_step2_title')}</h4>
                                    <p className="text-sm text-muted-foreground">{t('how_it_works.carrier_step2_desc')}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-4">
                                <div className="bg-white p-3 rounded-xl shadow-sm border border-border/50 text-primary">
                                    <Briefcase className="h-6 w-6" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-foreground">{t('how_it_works.carrier_step3_title')}</h4>
                                    <p className="text-sm text-muted-foreground">{t('how_it_works.carrier_step3_desc')}</p>
                                </div>
                            </div>
                        </div>
                        <Link href="/signup/transporter">
                            <Button size="lg" variant="outline" className="border-primary text-primary hover:bg-primary hover:text-white font-bold h-12 px-8">
                                {t('how_it_works.carrier_button')} <ChevronRight className="ml-2 h-5 w-5" />
                            </Button>
                        </Link>
                    </div>
                    <div className="reveal-right">
                        <div className="rounded-3xl overflow-hidden shadow-2xl border-4 border-white relative z-10 h-full min-h-[400px]">
                            <Image
                                src="/service-step-2.jpg"
                                alt="Devenir transporteur"
                                fill
                                className="object-cover"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </section>

        {/* Section Documentation Officielle */}
        <section className="py-16 bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-950 text-white border-y border-indigo-500/20">
          <div className="container max-w-5xl text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-bold uppercase tracking-wider">
              📖 Documentation & Manuel Utilisateur
            </div>
            <h2 className="font-headline text-3xl md:text-4xl font-extrabold text-white">
              Besoin d'un guide détaillé ou d'une version imprimable ?
            </h2>
            <p className="text-slate-300 text-sm md:text-base max-w-2xl mx-auto leading-relaxed">
              Consultez notre manuel utilisateur officiel de la plateforme TransConnekt, téléchargez la documentation au format HTML ou Markdown pour une consultation hors-ligne.
            </p>
            <div className="flex flex-wrap justify-center gap-4 pt-2">
              <Link href="/docs">
                <Button size="lg" className="rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold h-12 px-6 shadow-lg shadow-indigo-600/30 gap-2">
                  <Briefcase className="h-5 w-5" /> Consulter la Documentation Officielle
                </Button>
              </Link>
              <a href="/docs/transconnekt_documentation.html" download>
                <Button size="lg" variant="outline" className="rounded-2xl border-white/20 bg-white/10 hover:bg-white/20 text-white font-bold h-12 px-6 gap-2">
                  <Send className="h-5 w-5" /> Télécharger le Guide (HTML / PDF)
                </Button>
              </a>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-24 bg-muted/30">
            <div className="container max-w-4xl">
                <div className="text-center reveal mb-16">
                    <h2 className="font-headline text-3xl font-bold text-primary heading-underline">{t('how_it_works.faq_title')}</h2>
                </div>
                <div className="space-y-6">
                    {faqs.map((faq, i) => (
                        <div key={i} className="reveal-scale bg-white rounded-2xl p-6 shadow-sm border border-border/50 hover:shadow-md transition-shadow">
                            <h3 className="font-bold text-lg mb-3 flex items-start gap-3">
                                <span className="text-accent shrink-0 mt-1"><ShieldCheck size={20} /></span>
                                {faq.q}
                            </h3>
                            <p className="text-muted-foreground pl-8">{faq.a}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>

        {/* CTA */}
        <section className="py-24">
            <div className="container text-center reveal">
                <h2 className="font-headline text-3xl font-bold mb-6">{t('how_it_works.cta_title')}</h2>
                <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">{t('how_it_works.cta_desc')}</p>
                <Link href="/signup/client">
                    <Button size="lg" className="btn-glow text-white font-bold h-12 px-8" style={{ background: 'linear-gradient(135deg, hsl(322 85% 50%), hsl(340 90% 58%))' }}>
                        {t('how_it_works.cta_button')} <ChevronRight className="ml-2 h-5 w-5" />
                    </Button>
                </Link>
            </div>
        </section>
      </main>
      <SharedFooter />
    </div>
  );
}
