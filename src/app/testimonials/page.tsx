"use client";
import React, { useEffect, useState } from 'react';
import SharedHeader from '@/components/shared-header';
import SharedFooter from '@/components/shared-footer';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Star, MessageSquare, ChevronRight } from 'lucide-react';

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

function Rating({ stars }: { stars: number }) {
    return (
        <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} className={`h-4 w-4 ${s <= stars ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`} />
            ))}
        </div>
    );
}

export default function TestimonialsPage() {
  useScrollReveal();

  const testimonials = [
    { name: "Fatoumata K.", role: "Gérante de boutique, Conakry", rating: 5, text: "TrackGuinea a transformé ma logistique ! Je peux enfin suivre mes livraisons en temps réel et mes clients sont ravis de la ponctualité.", initials: "FK" },
    { name: "Mamadou S.", role: "Transporteur indépendant", rating: 5, text: "Grâce à la plateforme, je ne rentre plus jamais à vide. J'ai doublé mon chiffre d'affaires et les paiements sont toujours sécurisés et à temps.", initials: "MS" },
    { name: "Global Corp SARL", role: "Entreprise d'import-export", rating: 5, text: "La gestion de notre flotte externalisée est devenue un jeu d'enfant. Le tableau de bord nous donne une visibilité parfaite sur nos coûts.", initials: "GC" },
    { name: "Aïssatou B.", role: "Particulière, Labé", rating: 4, text: "J'ai utilisé le service pour envoyer un colis fragile à ma famille. Le transporteur était très professionnel et le prix imbattable.", initials: "AB" },
    { name: "Thierno D.", role: "Agriculteur, Faranah", rating: 5, text: "Trouver un camion pour transporter ma récolte vers les marchés de Conakry n'est plus un stress. Une application vraiment utile pour notre pays.", initials: "TD" },
    { name: "Ibrahim C.", role: "Commerçant, Kankan", rating: 5, text: "Service exceptionnel, mes marchandises arrivent toujours à temps et en parfait état. Le support client est aussi très réactif.", initials: "IC" }
  ];

  const [formState, setFormState] = useState({ name: '', message: '' });

  const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      console.log('Testimonial submitted:', formState);
      alert('Merci pour votre témoignage !');
      setFormState({ name: '', message: '' });
  };

  return (
    <div className="flex min-h-screen flex-col bg-background overflow-x-hidden">
      <SharedHeader />
      <main className="flex-1">
        {/* Hero banner */}
        <section className="relative py-24 md:py-32 overflow-hidden" style={{ background: 'linear-gradient(135deg, hsl(250 84% 12%), hsl(265 80% 18%), hsl(250 84% 8%))' }}>
          <div className="container relative z-10 text-center">
            <h1 className="font-headline text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 animate-fade-in-up">Témoignages</h1>
            <p className="text-white/80 text-lg md:text-xl max-w-2xl mx-auto animate-fade-in-up delay-200">
              Découvrez ce que nos utilisateurs pensent de notre plateforme et comment TrackGuinea facilite leur quotidien.
            </p>
          </div>
        </section>

        {/* Testimonials Grid */}
        <section className="py-24 container bg-muted/20">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {testimonials.map((testi, i) => (
                    <div key={i} className="reveal-scale" style={{ transitionDelay: `${i * 100}ms` }}>
                        <Card className="h-full hover:shadow-lg transition-shadow duration-300 border-border/50">
                            <CardHeader className="pb-4">
                                <div className="flex items-center gap-4">
                                    <Avatar className="h-12 w-12 border border-primary/20">
                                        <AvatarFallback className="bg-primary/10 text-primary font-bold">{testi.initials}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="font-bold text-foreground">{testi.name}</p>
                                        <p className="text-xs text-muted-foreground">{testi.role}</p>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="mb-4"><Rating stars={testi.rating} /></div>
                                <p className="text-muted-foreground italic leading-relaxed relative">
                                    <span className="text-4xl text-primary/20 absolute -top-4 -left-2 font-serif">"</span>
                                    {testi.text}
                                    <span className="text-4xl text-primary/20 absolute -bottom-6 -right-2 font-serif">"</span>
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                ))}
            </div>
        </section>

        {/* Submission Form */}
        <section className="py-24 relative overflow-hidden">
            <div className="absolute inset-0 bg-primary/5 z-0"></div>
            <div className="container relative z-10 max-w-2xl">
                <div className="text-center reveal mb-10">
                    <h2 className="font-headline text-3xl font-bold text-primary mb-4">Partagez votre expérience</h2>
                    <p className="text-muted-foreground">Votre avis compte pour nous aider à améliorer nos services en continu.</p>
                </div>
                <Card className="reveal-scale shadow-xl border-0">
                    <CardContent className="p-8">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <label htmlFor="name" className="text-sm font-medium">Votre nom / entreprise</label>
                                <Input 
                                    id="name" 
                                    placeholder="Ex: Amadou Diallo" 
                                    required 
                                    value={formState.name}
                                    onChange={e => setFormState({...formState, name: e.target.value})}
                                />
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="message" className="text-sm font-medium">Votre témoignage</label>
                                <Textarea 
                                    id="message" 
                                    placeholder="Comment TrackGuinea vous a aidé ?" 
                                    rows={5} 
                                    required
                                    value={formState.message}
                                    onChange={e => setFormState({...formState, message: e.target.value})}
                                />
                            </div>
                            <Button type="submit" className="w-full btn-glow font-bold" style={{ background: 'linear-gradient(135deg, hsl(322 85% 50%), hsl(340 90% 58%))' }}>
                                Envoyer mon avis <MessageSquare className="ml-2 h-4 w-4" />
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </section>

      </main>
      <SharedFooter />
    </div>
  );
}
