"use client";
import React, { useEffect, useState } from 'react';
import SharedHeader from '@/components/shared-header';
import SharedFooter from '@/components/shared-footer';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { MapPin, Phone, Mail, Clock, Send, Facebook, Twitter, Linkedin } from 'lucide-react';

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

export default function ContactPage() {
  useScrollReveal();

  const [formState, setFormState] = useState({
      name: '',
      email: '',
      phone: '',
      subject: 'general',
      message: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      console.log('Contact form submitted:', formState);
      alert('Votre message a bien été envoyé. Notre équipe vous recontactera sous peu.');
      setFormState({ name: '', email: '', phone: '', subject: 'general', message: '' });
  };

  return (
    <div className="flex min-h-screen flex-col bg-background overflow-x-hidden">
      <SharedHeader />
      <main className="flex-1">
        {/* Hero banner */}
        <section className="relative py-24 md:py-32 overflow-hidden" style={{ background: 'linear-gradient(135deg, hsl(250 84% 12%), hsl(265 80% 18%), hsl(250 84% 8%))' }}>
          <div className="container relative z-10 text-center">
            <h1 className="font-headline text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 animate-fade-in-up">Contactez-nous</h1>
            <p className="text-white/80 text-lg md:text-xl max-w-2xl mx-auto animate-fade-in-up delay-200">
              Une question, un besoin spécifique ou une assistance technique ? Notre équipe est à votre écoute.
            </p>
          </div>
        </section>

        <section className="py-24 container relative z-20 -mt-16">
            <div className="grid lg:grid-cols-5 gap-8 items-start">
                
                {/* Contact Info (Right visually, but takes 2 cols) */}
                <div className="lg:col-span-2 space-y-6 order-2 lg:order-2 reveal-right">
                    <Card className="border-0 shadow-lg bg-gradient-to-br from-primary to-indigo-900 text-white overflow-hidden relative">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3"></div>
                        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/3 -translate-x-1/4"></div>
                        
                        <CardContent className="p-8 relative z-10 space-y-8">
                            <h2 className="font-headline text-2xl font-bold">Informations</h2>
                            
                            <div className="space-y-6">
                                <div className="flex items-start gap-4">
                                    <div className="bg-white/10 p-2.5 rounded-lg"><MapPin size={20} /></div>
                                    <div>
                                        <p className="font-bold mb-1">Notre adresse</p>
                                        <p className="text-white/80 text-sm">Lambanyi, commune de Ratoma,<br/>Immeuble Amizo, Conakry</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4">
                                    <div className="bg-white/10 p-2.5 rounded-lg"><Phone size={20} /></div>
                                    <div>
                                        <p className="font-bold mb-1">Téléphone</p>
                                        <p className="text-white/80 text-sm">612 00 01 02</p>
                                        <p className="text-white/80 text-sm">669 99 83 39</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4">
                                    <div className="bg-white/10 p-2.5 rounded-lg"><Mail size={20} /></div>
                                    <div>
                                        <p className="font-bold mb-1">Email</p>
                                        <p className="text-white/80 text-sm">info@informafrik.com</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4">
                                    <div className="bg-white/10 p-2.5 rounded-lg"><Clock size={20} /></div>
                                    <div>
                                        <p className="font-bold mb-1">Horaires d'ouverture</p>
                                        <p className="text-white/80 text-sm">Lun - Ven : 8h00 - 18h00</p>
                                        <p className="text-white/80 text-sm">Samedi : 9h00 - 13h00</p>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-6 border-t border-white/10">
                                <p className="font-bold mb-4">Suivez-nous</p>
                                <div className="flex gap-3">
                                    <a href="#" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white hover:text-primary transition-colors"><Facebook size={18} /></a>
                                    <a href="#" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white hover:text-primary transition-colors"><Twitter size={18} /></a>
                                    <a href="#" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white hover:text-primary transition-colors"><Linkedin size={18} /></a>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Contact Form (Left visually, takes 3 cols) */}
                <div className="lg:col-span-3 order-1 lg:order-1 reveal-left">
                    <Card className="border-0 shadow-xl overflow-hidden">
                        <CardContent className="p-8 sm:p-10">
                            <h2 className="font-headline text-3xl font-bold text-primary mb-2">Envoyez-nous un message</h2>
                            <p className="text-muted-foreground mb-8">Remplissez le formulaire ci-dessous et nous vous répondrons dans les plus brefs délais.</p>
                            
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="grid sm:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label htmlFor="name" className="text-sm font-medium">Nom complet *</label>
                                        <Input id="name" required value={formState.name} onChange={e => setFormState({...formState, name: e.target.value})} className="bg-muted/30 border-muted" />
                                    </div>
                                    <div className="space-y-2">
                                        <label htmlFor="email" className="text-sm font-medium">Email *</label>
                                        <Input id="email" type="email" required value={formState.email} onChange={e => setFormState({...formState, email: e.target.value})} className="bg-muted/30 border-muted" />
                                    </div>
                                </div>
                                
                                <div className="grid sm:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label htmlFor="phone" className="text-sm font-medium">Téléphone</label>
                                        <Input id="phone" type="tel" value={formState.phone} onChange={e => setFormState({...formState, phone: e.target.value})} className="bg-muted/30 border-muted" />
                                    </div>
                                    <div className="space-y-2">
                                        <label htmlFor="subject" className="text-sm font-medium">Sujet *</label>
                                        <select 
                                            id="subject" 
                                            value={formState.subject} 
                                            onChange={e => setFormState({...formState, subject: e.target.value})}
                                            className="flex h-10 w-full rounded-md border border-input bg-muted/30 px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                            required
                                        >
                                            <option value="general">Information générale</option>
                                            <option value="support">Support technique</option>
                                            <option value="partnership">Devenir partenaire</option>
                                            <option value="billing">Question facturation</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label htmlFor="message" className="text-sm font-medium">Message *</label>
                                    <Textarea id="message" rows={6} required value={formState.message} onChange={e => setFormState({...formState, message: e.target.value})} className="bg-muted/30 border-muted resize-none" />
                                </div>

                                <Button type="submit" size="lg" className="w-full sm:w-auto btn-glow font-bold px-8" style={{ background: 'linear-gradient(135deg, hsl(322 85% 50%), hsl(340 90% 58%))' }}>
                                    Envoyer le message <Send className="ml-2 h-4 w-4" />
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </section>

      </main>
      <SharedFooter />
    </div>
  );
}
