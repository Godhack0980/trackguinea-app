"use client";
import React, { useEffect } from 'react';
import SharedHeader from '@/components/shared-header';
import SharedFooter from '@/components/shared-footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Truck, PackagePlus, Building, MapPin, ShieldCheck, Clock, Zap, HeartHandshake, ChevronRight, UserPlus, HardHat, Tractor, Briefcase } from 'lucide-react';
import Link from 'next/link';
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

export default function ServicesPage() {
  useScrollReveal();
  const { t } = useTranslation();

  return (
    <div className="flex min-h-screen flex-col bg-background overflow-x-hidden">
      <SharedHeader />
      <main className="flex-1">
        {/* Hero banner with background video */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "VideoObject",
              "name": "TransConnekt — Solution de Transport et Logistique en Guinée et Afrique",
              "description": "Vidéo de présentation de la flotte de camions et de la plateforme TransConnekt, première société de transport routier de marchandises en Guinée.",
              "thumbnailUrl": ["https://transconnekt.com/transconnekt-logo.png"],
              "uploadDate": "2025-01-01T08:00:00+00:00",
              "contentUrl": "https://firebasestorage.googleapis.com/v0/b/trackguinea.firebasestorage.app/o/truck%20trancnnekt.mp4?alt=media&token=7de6467d-ed83-412a-a1dc-3d3b3b86ae60",
              "embedUrl": "https://transconnekt.com/fr/services"
            })
          }}
        />
        <section className="relative py-24 md:py-32 overflow-hidden min-h-[40vh] flex items-center bg-slate-950">
          {/* Background Video */}
          <video
            autoPlay
            loop
            muted
            playsInline
            className="absolute inset-0 w-full h-full object-cover z-0 opacity-50"
          >
            <source src="https://firebasestorage.googleapis.com/v0/b/trackguinea.firebasestorage.app/o/truck%20trancnnekt.mp4?alt=media&token=7de6467d-ed83-412a-a1dc-3d3b3b86ae60" type="video/mp4" />
          </video>
          {/* Overlay to ensure text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/30 to-slate-950/50 z-10" />
          
          <div className="container relative z-20 text-center">
            <h1 className="font-headline text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 animate-fade-in-up">{t('services.hero_title')}</h1>
            <p className="text-white/90 text-lg md:text-xl max-w-2xl mx-auto animate-fade-in-up delay-200 font-medium">
              {t('services.hero_desc')}
            </p>
          </div>
        </section>
        
        {/* Main Services */}
        <section className="py-24 container">
            <div className="grid md:grid-cols-3 gap-8 stagger-children">
                {/* 1. Logistique Minière Simandou 2040 */}
                <div className="reveal-scale">
                    <Card className="service-card h-full relative overflow-hidden border-2 flex flex-col hover:border-primary/50 transition-colors">
                        <CardHeader className="items-center pb-4 text-center">
                            <div className="bg-primary/10 p-5 rounded-2xl mb-4 transition-all duration-300 group-hover:scale-110">
                                <HardHat className="h-12 w-12 text-primary service-icon" />
                            </div>
                            <CardTitle className="text-2xl">{t('services.mining_title')}</CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 flex flex-col">
                            <p className="text-muted-foreground leading-relaxed mb-6 flex-1">
                                {t('services.mining_desc')}
                            </p>
                            <ul className="space-y-3 mb-6">
                                <li className="flex items-start gap-2"><ChevronRight className="h-5 w-5 text-primary shrink-0" /><span className="text-sm">{t('services.mining_bullet1')}</span></li>
                                <li className="flex items-start gap-2"><ChevronRight className="h-5 w-5 text-primary shrink-0" /><span className="text-sm">{t('services.mining_bullet2')}</span></li>
                                <li className="flex items-start gap-2"><ChevronRight className="h-5 w-5 text-primary shrink-0" /><span className="text-sm">{t('services.mining_bullet3')}</span></li>
                            </ul>
                        </CardContent>
                    </Card>
                </div>

                {/* 2. Transport de Marchandises */}
                <div className="reveal-scale delay-100">
                    <Card className="service-card h-full relative overflow-hidden border-2 flex flex-col hover:border-primary/50 transition-colors">
                        <CardHeader className="items-center pb-4 text-center">
                            <div className="bg-primary/10 p-5 rounded-2xl mb-4 transition-all duration-300">
                                <Truck className="h-12 w-12 text-primary service-icon" />
                            </div>
                            <CardTitle className="text-2xl">{t('services.freight_title')}</CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 flex flex-col">
                            <p className="text-muted-foreground leading-relaxed mb-6 flex-1">
                                {t('services.freight_desc')}
                            </p>
                            <ul className="space-y-3 mb-6">
                                <li className="flex items-start gap-2"><ChevronRight className="h-5 w-5 text-primary shrink-0" /><span className="text-sm">{t('services.freight_bullet1')}</span></li>
                                <li className="flex items-start gap-2"><ChevronRight className="h-5 w-5 text-primary shrink-0" /><span className="text-sm">{t('services.freight_bullet2')}</span></li>
                                <li className="flex items-start gap-2"><ChevronRight className="h-5 w-5 text-primary shrink-0" /><span className="text-sm">{t('services.freight_bullet3')}</span></li>
                            </ul>
                        </CardContent>
                    </Card>
                </div>
                
                {/* 3. Envoi de Colis/Paquets */}
                <div className="reveal-scale delay-200">
                    <Card className="service-card h-full relative overflow-hidden border-2 flex flex-col hover:border-primary/50 transition-colors">
                        <CardHeader className="items-center pb-4 text-center">
                            <div className="bg-primary/10 p-5 rounded-2xl mb-4 transition-all duration-300">
                                <PackagePlus className="h-12 w-12 text-primary service-icon" />
                            </div>
                            <CardTitle className="text-2xl">{t('services.parcel_title')}</CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 flex flex-col">
                            <p className="text-muted-foreground leading-relaxed mb-6 flex-1">
                                {t('services.parcel_desc')}
                            </p>
                            <ul className="space-y-3 mb-6">
                                <li className="flex items-start gap-2"><ChevronRight className="h-5 w-5 text-primary shrink-0" /><span className="text-sm">{t('services.parcel_bullet1')}</span></li>
                                <li className="flex items-start gap-2"><ChevronRight className="h-5 w-5 text-primary shrink-0" /><span className="text-sm">{t('services.parcel_bullet2')}</span></li>
                                <li className="flex items-start gap-2"><ChevronRight className="h-5 w-5 text-primary shrink-0" /><span className="text-sm">{t('services.parcel_bullet3')}</span></li>
                            </ul>
                        </CardContent>
                    </Card>
                </div>

                {/* 4. Déménagement */}
                <div className="reveal-scale delay-300">
                    <Card className="service-card h-full relative overflow-hidden border-2 flex flex-col hover:border-primary/50 transition-colors">
                        <CardHeader className="items-center pb-4 text-center">
                            <div className="bg-primary/10 p-5 rounded-2xl mb-4 transition-all duration-300">
                                <Building className="h-12 w-12 text-primary service-icon" />
                            </div>
                            <CardTitle className="text-2xl">{t('services.moving_title')}</CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 flex flex-col">
                            <p className="text-muted-foreground leading-relaxed mb-6 flex-1">
                                {t('services.moving_desc')}
                            </p>
                            <ul className="space-y-3 mb-6">
                                <li className="flex items-start gap-2"><ChevronRight className="h-5 w-5 text-primary shrink-0" /><span className="text-sm">{t('services.moving_bullet1')}</span></li>
                                <li className="flex items-start gap-2"><ChevronRight className="h-5 w-5 text-primary shrink-0" /><span className="text-sm">{t('services.moving_bullet2')}</span></li>
                                <li className="flex items-start gap-2"><ChevronRight className="h-5 w-5 text-primary shrink-0" /><span className="text-sm">{t('services.moving_bullet3')}</span></li>
                            </ul>
                        </CardContent>
                    </Card>
                </div>

                {/* 5. Transport Agricole */}
                <div className="reveal-scale delay-400">
                    <Card className="service-card h-full relative overflow-hidden border-2 flex flex-col hover:border-primary/50 transition-colors">
                        <CardHeader className="items-center pb-4 text-center">
                            <div className="bg-primary/10 p-5 rounded-2xl mb-4 transition-all duration-300">
                                <Tractor className="h-12 w-12 text-primary service-icon" />
                            </div>
                            <CardTitle className="text-2xl">{t('services.agri_title')}</CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 flex flex-col">
                            <p className="text-muted-foreground leading-relaxed mb-6 flex-1">
                                {t('services.agri_desc')}
                            </p>
                            <ul className="space-y-3 mb-6">
                                <li className="flex items-start gap-2"><ChevronRight className="h-5 w-5 text-primary shrink-0" /><span className="text-sm">{t('services.agri_bullet1')}</span></li>
                                <li className="flex items-start gap-2"><ChevronRight className="h-5 w-5 text-primary shrink-0" /><span className="text-sm">{t('services.agri_bullet2')}</span></li>
                                <li className="flex items-start gap-2"><ChevronRight className="h-5 w-5 text-primary shrink-0" /><span className="text-sm">{t('services.agri_bullet3')}</span></li>
                            </ul>
                        </CardContent>
                    </Card>
                </div>

                {/* 6. Solutions Entreprises */}
                <div className="reveal-scale delay-500">
                    <Card className="service-card h-full relative overflow-hidden border-2 flex flex-col hover:border-primary/50 transition-colors">
                        <CardHeader className="items-center pb-4 text-center">
                            <div className="bg-primary/10 p-5 rounded-2xl mb-4 transition-all duration-300">
                                <Briefcase className="h-12 w-12 text-primary service-icon" />
                            </div>
                            <CardTitle className="text-2xl">{t('services.b2b_title')}</CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 flex flex-col">
                            <p className="text-muted-foreground leading-relaxed mb-6 flex-1">
                                {t('services.b2b_desc')}
                            </p>
                            <ul className="space-y-3 mb-6">
                                <li className="flex items-start gap-2"><ChevronRight className="h-5 w-5 text-primary shrink-0" /><span className="text-sm">{t('services.b2b_bullet1')}</span></li>
                                <li className="flex items-start gap-2"><ChevronRight className="h-5 w-5 text-primary shrink-0" /><span className="text-sm">{t('services.b2b_bullet2')}</span></li>
                                <li className="flex items-start gap-2"><ChevronRight className="h-5 w-5 text-primary shrink-0" /><span className="text-sm">{t('services.b2b_bullet3')}</span></li>
                            </ul>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </section>

        {/* Additional Features */}
        <section className="py-24 bg-muted/30">
            <div className="container">
                <div className="text-center reveal mb-16">
                    <h2 className="font-headline text-3xl font-bold text-primary heading-underline">{t('services.extras_heading')}</h2>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
                    {[
                        { icon: <MapPin className="h-8 w-8 text-primary" />, title: t('services.extra_gps_title'), desc: t('services.extra_gps_desc') },
                        { icon: <ShieldCheck className="h-8 w-8 text-primary" />, title: t('services.extra_insurance_title'), desc: t('services.extra_insurance_desc') },
                        { icon: <Clock className="h-8 w-8 text-primary" />, title: t('services.extra_support_title'), desc: t('services.extra_support_desc') },
                        { icon: <Zap className="h-8 w-8 text-primary" />, title: t('services.extra_speed_title'), desc: t('services.extra_speed_desc') },
                        { icon: <HeartHandshake className="h-8 w-8 text-primary" />, title: t('services.extra_trust_title'), desc: t('services.extra_trust_desc') },
                        { icon: <UserPlus className="h-8 w-8 text-primary" />, title: t('services.extra_ease_title'), desc: t('services.extra_ease_desc') }
                    ].map((feat, i) => (
                        <div key={i} className="reveal-scale flex items-start gap-4 p-6 bg-white rounded-2xl shadow-sm border border-border/50">
                            <div className="bg-primary/10 p-3 rounded-xl">{feat.icon}</div>
                            <div>
                                <h3 className="font-bold text-lg mb-2">{feat.title}</h3>
                                <p className="text-muted-foreground text-sm leading-relaxed">{feat.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>

        {/* CTA */}
        <section className="py-24">
            <div className="container text-center reveal">
                <h2 className="font-headline text-3xl font-bold mb-6">{t('services.cta_title')}</h2>
                <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">{t('services.cta_desc')}</p>
                <Link href="/signup/client">
                    <Button size="lg" className="btn-glow text-white font-bold h-12 px-8" style={{ background: 'linear-gradient(135deg, hsl(322 85% 50%), hsl(340 90% 58%))' }}>
                        {t('services.cta_button')} <UserPlus className="ml-2 h-5 w-5" />
                    </Button>
                </Link>
            </div>
        </section>

      </main>
      <SharedFooter />
    </div>
  );
}
