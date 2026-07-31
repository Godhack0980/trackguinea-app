"use client";
import React, { useEffect, useState } from 'react';
import SharedHeader from '@/components/shared-header';
import SharedFooter from '@/components/shared-footer';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Star, MessageSquare } from 'lucide-react';
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
  const { t } = useTranslation();

  const testimonials = [
    { category: "enterprise", name: "Fatoumata K.", role: t('testimonials.testi_fk_role'), rating: 5, text: t('testimonials.testi_fk_text'), initials: "FK" },
    { category: "carrier", name: "Mamadou S.", role: t('testimonials.testi_ms_role'), rating: 5, text: t('testimonials.testi_ms_text'), initials: "MS" },
    { category: "enterprise", name: "Global Corp SARL", role: t('testimonials.testi_gc_role'), rating: 5, text: t('testimonials.testi_gc_text'), initials: "GC" },
    { category: "client", name: "Aïssatou B.", role: t('testimonials.testi_ab_role'), rating: 4, text: t('testimonials.testi_ab_text'), initials: "AB" },
    { category: "enterprise", name: "Thierno D.", role: t('testimonials.testi_td_role'), rating: 5, text: t('testimonials.testi_td_text'), initials: "TD" },
    { category: "enterprise", name: "Ibrahim C.", role: t('testimonials.testi_ic_role'), rating: 5, text: t('testimonials.testi_ic_text'), initials: "IC" },
    { category: "carrier", name: "Ousmane C.", role: t('testimonials.testi_oc_role'), rating: 5, text: t('testimonials.testi_oc_text'), initials: "OC" },
    { category: "client", name: "Mariama D.", role: t('testimonials.testi_md_role'), rating: 5, text: t('testimonials.testi_md_text'), initials: "MD" },
    { category: "enterprise", name: "Mines Simandou Logistique", role: t('testimonials.testi_msl_role'), rating: 5, text: t('testimonials.testi_msl_text'), initials: "MSL" },
    { category: "carrier", name: "Alpha B.", role: t('testimonials.testi_ab2_role'), rating: 4, text: t('testimonials.testi_ab2_text'), initials: "AB" }
  ];

  const [formState, setFormState] = useState({ name: '', message: '' });
  const [activeCategory, setActiveCategory] = useState('all');

  const categories = ['all', 'client', 'enterprise', 'carrier'];

  const filteredTestimonials = activeCategory === 'all' 
    ? testimonials 
    : testimonials.filter(t => t.category === activeCategory);

  const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      console.log('Testimonial submitted:', formState);
      alert(t('testimonials.toast_success'));
      setFormState({ name: '', message: '' });
  };

  return (
    <div className="flex min-h-screen flex-col bg-background overflow-x-hidden">
      <SharedHeader />
      <main className="flex-1">
        {/* Hero banner with background image */}
        <section className="relative py-32 md:py-40 overflow-hidden flex items-center bg-slate-950">
          {/* Background Image */}
          <div className="absolute inset-0 z-0">
            <Image 
              src="/testimonials-hero.jpg" 
              alt="Témoignages arrière-plan" 
              fill
              className="object-cover opacity-35"
              priority
            />
          </div>
          {/* Overlay to ensure text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-slate-950/70 z-10" />
          
          <div className="container relative z-20 text-center">
            <h1 className="font-headline text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 animate-fade-in-up">{t('testimonials.hero_title')}</h1>
            <p className="text-white/90 text-lg md:text-xl max-w-2xl mx-auto animate-fade-in-up delay-200 font-medium leading-relaxed">
              {t('testimonials.hero_desc')}
            </p>
          </div>
        </section>

        {/* Testimonials Grid */}
        <section className="py-24 container bg-muted/20">
            <div className="flex justify-center flex-wrap gap-2 mb-12">
                {categories.map(cat => (
                    <Button 
                        key={cat} 
                        variant={activeCategory === cat ? 'default' : 'outline'}
                        onClick={() => setActiveCategory(cat)}
                        className={`rounded-full px-6 ${activeCategory === cat ? 'bg-primary text-white hover:bg-primary/90' : 'hover:border-primary/50'}`}
                    >
                        {t(`testimonials.cat_${cat}`)}
                    </Button>
                ))}
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredTestimonials.map((testi, i) => (
                    <div key={i} className="reveal-scale animate-fade-in-up" style={{ animationDelay: `${(i % 3) * 100}ms` }}>
                        <div className="bg-white border border-slate-200/80 shadow-lg shadow-slate-100/50 hover:shadow-xl hover:border-primary/40 hover:-translate-y-1 transition-all duration-300 rounded-3xl p-6 flex flex-col justify-between h-[250px] relative overflow-hidden group">
                            {/* Elegant vertical color accent bar on the left */}
                            <div className="absolute left-0 top-6 bottom-6 w-1 bg-gradient-to-b from-primary to-indigo-500 rounded-r-full opacity-70 group-hover:opacity-100 transition-opacity" />
                            
                            {/* Large elegant double quotes */}
                            <span className="absolute top-4 right-16 text-slate-100 font-serif text-7xl select-none pointer-events-none group-hover:text-primary/5 transition-colors duration-500">“</span>
                            
                            <div className="absolute top-6 right-6 bg-indigo-500/10 text-indigo-400 text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-lg border border-indigo-500/20">
                                {t(`testimonials.cat_${testi.category}`)}
                            </div>

                            <div className="relative z-10">
                                <div className="flex items-center gap-3.5 mb-4">
                                    <Avatar className="h-10 w-10 ring-4 ring-primary/5 shrink-0">
                                        <AvatarFallback className="bg-gradient-to-br from-primary to-indigo-600 text-white font-bold text-sm">
                                            {testi.initials}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="truncate">
                                        <p className="font-bold text-slate-800 text-[13px] truncate">{testi.name}</p>
                                        <p className="text-xs text-slate-500 font-medium truncate">{testi.role}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex-grow flex flex-col justify-between relative z-10">
                                <p className="text-slate-600 text-[12px] leading-relaxed font-medium italic line-clamp-4">
                                    "{testi.text}"
                                </p>
                                <div className="pt-3 border-t border-slate-100/85 mt-3">
                                    <Rating stars={testi.rating} />
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </section>

        {/* Submission Form */}
        <section className="py-24 relative overflow-hidden">
            <div className="absolute inset-0 bg-primary/5 z-0"></div>
            <div className="container relative z-10 max-w-2xl">
                <div className="text-center reveal mb-10">
                    <h2 className="font-headline text-3xl font-bold text-primary mb-4">{t('testimonials.form_title')}</h2>
                    <p className="text-muted-foreground">{t('testimonials.form_desc')}</p>
                </div>
                <Card className="reveal-scale shadow-xl border-0">
                    <CardContent className="p-8">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <label htmlFor="name" className="text-sm font-medium">{t('testimonials.form_label_name')}</label>
                                <Input 
                                    id="name" 
                                    placeholder={t('testimonials.form_placeholder_name')}
                                    required 
                                    value={formState.name}
                                    onChange={e => setFormState({...formState, name: e.target.value})}
                                />
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="message" className="text-sm font-medium">{t('testimonials.form_label_message')}</label>
                                <Textarea 
                                    id="message" 
                                    placeholder={t('testimonials.form_placeholder_message')}
                                    rows={5} 
                                    required
                                    value={formState.message}
                                    onChange={e => setFormState({...formState, message: e.target.value})}
                                />
                            </div>
                            <Button type="submit" className="w-full btn-glow font-bold" style={{ background: 'linear-gradient(135deg, hsl(322 85% 50%), hsl(340 90% 58%))' }}>
                                {t('testimonials.form_submit')} <MessageSquare className="ml-2 h-4 w-4" />
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
