"use client";
import React, { useEffect } from 'react';
import SharedHeader from '@/components/shared-header';
import SharedFooter from '@/components/shared-footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Truck, PackagePlus, Building, MapPin, ShieldCheck, Clock, Zap, HeartHandshake, ChevronRight, UserPlus } from 'lucide-react';
import Link from 'next/link';

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
  return (
    <div className="flex min-h-screen flex-col bg-background overflow-x-hidden">
      <SharedHeader />
      <main className="flex-1">
        {/* Hero banner */}
        <section className="relative py-24 md:py-32 overflow-hidden" style={{ background: 'linear-gradient(135deg, hsl(250 84% 12%), hsl(265 80% 18%), hsl(250 84% 8%))' }}>
          <div className="container relative z-10 text-center">
            <h1 className="font-headline text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 animate-fade-in-up">Nos Services</h1>
            <p className="text-white/80 text-lg md:text-xl max-w-2xl mx-auto animate-fade-in-up delay-200">
              Des solutions de transport adaptées à vos besoins, que vous soyez un particulier ou une entreprise.
            </p>
          </div>
        </section>
        
        {/* Main Services */}
        <section className="py-24 container">
            <div className="grid md:grid-cols-3 gap-8 stagger-children">
                <div className="reveal-scale">
                    <Card className="service-card h-full relative overflow-hidden border-2 flex flex-col">
                        <CardHeader className="items-center pb-4 text-center">
                            <div className="bg-primary/10 p-5 rounded-2xl mb-4 transition-all duration-300">
                                <Truck className="h-12 w-12 text-primary service-icon" />
                            </div>
                            <CardTitle className="text-2xl">Transport de Marchandises</CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 flex flex-col">
                            <p className="text-muted-foreground leading-relaxed mb-6 flex-1">
                                Solution fiable pour les entreprises de toutes tailles, du petit colis au chargement complet. Nous assurons la sécurité de vos marchandises sur tout le territoire.
                            </p>
                            <ul className="space-y-3 mb-6">
                                <li className="flex items-start gap-2"><ChevronRight className="h-5 w-5 text-primary shrink-0" /><span className="text-sm">Flotte diversifiée adaptée à tous volumes</span></li>
                                <li className="flex items-start gap-2"><ChevronRight className="h-5 w-5 text-primary shrink-0" /><span className="text-sm">Chauffeurs expérimentés et certifiés</span></li>
                                <li className="flex items-start gap-2"><ChevronRight className="h-5 w-5 text-primary shrink-0" /><span className="text-sm">Assurance marchandises incluse</span></li>
                            </ul>
                        </CardContent>
                    </Card>
                </div>
                
                <div className="reveal-scale delay-100">
                    <Card className="service-card h-full relative overflow-hidden border-2 flex flex-col">
                        <CardHeader className="items-center pb-4 text-center">
                            <div className="bg-primary/10 p-5 rounded-2xl mb-4 transition-all duration-300">
                                <PackagePlus className="h-12 w-12 text-primary service-icon" />
                            </div>
                            <CardTitle className="text-2xl">Envoi de Colis & Paquets</CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 flex flex-col">
                            <p className="text-muted-foreground leading-relaxed mb-6 flex-1">
                                Expédiez vos documents importants, cadeaux et autres paquets en toute sécurité et rapidité, avec un suivi à chaque étape.
                            </p>
                            <ul className="space-y-3 mb-6">
                                <li className="flex items-start gap-2"><ChevronRight className="h-5 w-5 text-primary shrink-0" /><span className="text-sm">Livraison express disponible</span></li>
                                <li className="flex items-start gap-2"><ChevronRight className="h-5 w-5 text-primary shrink-0" /><span className="text-sm">Suivi en temps réel de votre colis</span></li>
                                <li className="flex items-start gap-2"><ChevronRight className="h-5 w-5 text-primary shrink-0" /><span className="text-sm">Remise en main propre garantie</span></li>
                            </ul>
                        </CardContent>
                    </Card>
                </div>

                <div className="reveal-scale delay-200">
                    <Card className="service-card h-full relative overflow-hidden border-2 flex flex-col">
                        <CardHeader className="items-center pb-4 text-center">
                            <div className="bg-primary/10 p-5 rounded-2xl mb-4 transition-all duration-300">
                                <Building className="h-12 w-12 text-primary service-icon" />
                            </div>
                            <CardTitle className="text-2xl">Déménagement Simplifié</CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 flex flex-col">
                            <p className="text-muted-foreground leading-relaxed mb-6 flex-1">
                                Nos transporteurs sont équipés pour gérer votre déménagement, vous offrant la tranquillité d'esprit pour votre changement d'adresse.
                            </p>
                            <ul className="space-y-3 mb-6">
                                <li className="flex items-start gap-2"><ChevronRight className="h-5 w-5 text-primary shrink-0" /><span className="text-sm">Camions adaptés pour les meubles</span></li>
                                <li className="flex items-start gap-2"><ChevronRight className="h-5 w-5 text-primary shrink-0" /><span className="text-sm">Aide au chargement/déchargement (option)</span></li>
                                <li className="flex items-start gap-2"><ChevronRight className="h-5 w-5 text-primary shrink-0" /><span className="text-sm">Protection de vos biens fragiles</span></li>
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
                    <h2 className="font-headline text-3xl font-bold text-primary heading-underline">Les petits plus qui font la différence</h2>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
                    {[
                        { icon: <MapPin className="h-8 w-8 text-primary" />, title: "Suivi GPS", desc: "Localisez votre marchandise en temps réel." },
                        { icon: <ShieldCheck className="h-8 w-8 text-primary" />, title: "Assurance", desc: "Une couverture optimale pour chaque trajet." },
                        { icon: <Clock className="h-8 w-8 text-primary" />, title: "Support 24/7", desc: "Notre équipe est toujours là pour vous aider." },
                        { icon: <Zap className="h-8 w-8 text-primary" />, title: "Rapidité", desc: "Des mises en relation en quelques minutes." },
                        { icon: <HeartHandshake className="h-8 w-8 text-primary" />, title: "Confiance", desc: "Une communauté basée sur la fiabilité." },
                        { icon: <UserPlus className="h-8 w-8 text-primary" />, title: "Facilité", desc: "Une inscription simple et sans engagement." }
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
                <h2 className="font-headline text-3xl font-bold mb-6">Prêt à expédier avec nous ?</h2>
                <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">Rejoignez des milliers de clients satisfaits et profitez d'une expérience de transport sans tracas.</p>
                <Link href="/signup/client">
                    <Button size="lg" className="btn-glow text-white font-bold h-12 px-8" style={{ background: 'linear-gradient(135deg, hsl(322 85% 50%), hsl(340 90% 58%))' }}>
                        Créer un compte <UserPlus className="ml-2 h-5 w-5" />
                    </Button>
                </Link>
            </div>
        </section>

      </main>
      <SharedFooter />
    </div>
  );
}
