"use client";
import React, { useEffect } from 'react';
import SharedHeader from '@/components/shared-header';
import SharedFooter from '@/components/shared-footer';
import { Send, Users, MapPin, ShieldCheck, ChevronRight, UserPlus } from 'lucide-react';
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

export default function HowItWorksPage() {
  useScrollReveal();
  
  const steps = [
    {
      number: "1",
      title: "Publiez votre demande",
      description: "Créez un compte client en quelques instants, puis décrivez votre besoin : nature de la marchandise, poids estimé, trajet à effectuer et date souhaitée. Votre demande est immédiatement visible par notre réseau de transporteurs qualifiés.",
      image: "/service-step-1.jpg",
      icon: <Send className="h-6 w-6" />
    },
    {
      number: "2",
      title: "Choisissez votre transporteur",
      description: "Recevez rapidement des propositions tarifaires de nos transporteurs vérifiés. Comparez leurs profils, consultez les évaluations des autres utilisateurs et choisissez l'offre qui correspond le mieux à votre budget et à vos exigences de qualité.",
      image: "/service-step-2.jpg",
      icon: <Users className="h-6 w-6" />
    },
    {
      number: "3",
      title: "Suivez et validez",
      description: "Une fois le transporteur en route, suivez sa progression en temps réel sur notre carte interactive. À l'arrivée, confirmez la bonne réception de la livraison et évaluez votre expérience pour aider la communauté.",
      image: "/service-step-3.jpg",
      icon: <MapPin className="h-6 w-6" />
    }
  ];

  const faqs = [
    { q: "Comment les transporteurs sont-ils vérifiés ?", a: "Chaque transporteur doit fournir des documents d'identité, les papiers du véhicule et une assurance valide. Notre équipe vérifie manuellement chaque profil avant validation." },
    { q: "Que faire en cas de problème pendant le transport ?", a: "Notre service client est disponible 24/7. En cas de souci, vous pouvez nous contacter directement via la plateforme ou par téléphone pour une assistance immédiate." },
    { q: "Comment s'effectue le paiement ?", a: "Le paiement est sécurisé via notre plateforme. Le montant est bloqué au moment de la réservation et n'est reversé au transporteur qu'une fois la livraison confirmée par vos soins." },
    { q: "Puis-je annuler une demande de transport ?", a: "Oui, l'annulation est possible sans frais tant qu'aucun transporteur n'a été accepté. Des conditions s'appliquent pour les annulations tardives." }
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background overflow-x-hidden">
      <SharedHeader />
      <main className="flex-1">
        {/* Hero banner */}
        <section className="relative py-24 md:py-32 overflow-hidden" style={{ background: 'linear-gradient(135deg, hsl(250 84% 12%), hsl(265 80% 18%), hsl(250 84% 8%))' }}>
          <div className="container relative z-10 text-center">
            <h1 className="font-headline text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 animate-fade-in-up">Comment ça marche ?</h1>
            <p className="text-white/80 text-lg md:text-xl max-w-2xl mx-auto animate-fade-in-up delay-200">
              Expédier vos marchandises n'a jamais été aussi simple. Découvrez notre processus en 3 étapes.
            </p>
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

        {/* FAQ */}
        <section className="py-24 bg-muted/30">
            <div className="container max-w-4xl">
                <div className="text-center reveal mb-16">
                    <h2 className="font-headline text-3xl font-bold text-primary heading-underline">Questions Fréquentes</h2>
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
                <h2 className="font-headline text-3xl font-bold mb-6">Convaincu ?</h2>
                <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">Créez votre première demande de transport dès maintenant.</p>
                <Link href="/signup/client">
                    <Button size="lg" className="btn-glow text-white font-bold h-12 px-8" style={{ background: 'linear-gradient(135deg, hsl(322 85% 50%), hsl(340 90% 58%))' }}>
                        Commencer l'expérience <ChevronRight className="ml-2 h-5 w-5" />
                    </Button>
                </Link>
            </div>
        </section>
      </main>
      <SharedFooter />
    </div>
  );
}
