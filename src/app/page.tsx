
"use client";

import React from 'react';
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
import { LogIn, UserPlus, Truck, Mail, Phone, MapPin, Building, PackagePlus, Users, ShieldCheck, AreaChart, Send, MessageSquare, Facebook, Linkedin, Twitter } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

function NavLink({ href, children }: { href: string, children: React.ReactNode }) {
  return (
    <Link href={href}>
      <span className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
        {children}
      </span>
    </Link>
  );
}

const reviewFormSchema = z.object({
    name: z.string().min(1, { message: "Votre nom est requis." }),
    message: z.string().min(10, { message: "Votre avis doit contenir au moins 10 caractères." }),
});

const services = [
    {
        icon: <Truck className="h-10 w-10 text-primary" />,
        title: "Transport de Marchandises",
        description: "Solution fiable pour les entreprises de toutes tailles, du petit colis au chargement complet."
    },
    {
        icon: <PackagePlus className="h-10 w-10 text-primary" />,
        title: "Envoi de Colis & Paquets",
        description: "Expédiez vos documents importants, cadeaux et autres paquets en toute sécurité et rapidité."
    },
    {
        icon: <Building className="h-10 w-10 text-primary" />,
        title: "Déménagement Simplifié",
        description: "Nos transporteurs sont équipés pour gérer votre déménagement, vous offrant la tranquillité d'esprit."
    }
];

const features = [
    {
        icon: <ShieldCheck className="h-8 w-8 text-primary"/>,
        title: "Transporteurs Vérifiés",
        description: "Chaque transporteur sur notre plateforme est rigoureusement vérifié pour garantir votre sécurité."
    },
    {
        icon: <MapPin className="h-8 w-8 text-primary"/>,
        title: "Suivi en Temps Réel",
        description: "Sachez exactement où se trouve votre marchandise à chaque étape du trajet grâce à notre suivi GPS."
    },
    {
        icon: <AreaChart className="h-8 w-8 text-primary"/>,
        title: "Prix Compétitifs",
        description: "Notre système de mise en concurrence vous assure d'obtenir le meilleur prix pour chaque course."
    }
];

const testimonials = [
  {
    name: "Fatoumata K.",
    role: "Gérante de boutique, Conakry",
    avatar: "FK",
    comment: "TrackGuinea a transformé ma logistique ! Je peux enfin suivre mes livraisons de Conakry à l'intérieur du pays sans stress. C'est simple, rapide et fiable."
  },
  {
    name: "Mamadou S.",
    role: "Transporteur indépendant",
    avatar: "MS",
    comment: "Grâce à la plateforme, je ne rentre plus jamais à vide. Je trouve toujours des courses pour optimiser mes trajets. Mes revenus ont considérablement augmenté."
  },
  {
    name: "Global Corp SARL",
    role: "Entreprise d'import-export",
    avatar: "GC",
    comment: "La gestion de notre flotte de chauffeurs et l'assignation des courses n'ont jamais été aussi simples. Un outil indispensable pour les entreprises en Guinée."
  },
  {
    name: "Aïssatou B.",
    role: "Particulier, Labé",
    avatar: "AB",
    comment: "J'ai utilisé le service pour envoyer un colis fragile à ma famille à Nzérékoré. Tout est arrivé en parfait état et dans les temps. Je recommande vivement !"
  },
  {
    name: "Thierno D.",
    role: "Agriculteur, Faranah",
    avatar: "TD",
    comment: "Trouver un camion pour transporter ma récolte vers les marchés de la capitale était un vrai casse-tête. Avec TrackGuinea, j'ai trouvé un transporteur en quelques heures."
  }
];

export default function Home() {
  const { toast } = useToast();
  const autoplayPlugin = React.useRef(Autoplay({ delay: 5000, stopOnInteraction: true }));
  
  const form = useForm<z.infer<typeof reviewFormSchema>>({
    resolver: zodResolver(reviewFormSchema),
    defaultValues: { name: "", message: "" },
  });

  const onReviewSubmit = (values: z.infer<typeof reviewFormSchema>) => {
    console.log("Review submitted:", values);
    toast({
      title: "Avis envoyé !",
      description: "Merci pour votre commentaire. Votre avis est précieux pour nous.",
    });
    form.reset();
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 max-w-screen-2xl items-center justify-between">
          <div className="flex items-center gap-6">
            <Logo />
            <nav className="hidden md:flex md:gap-4">
              <NavLink href="#services">Nos services</NavLink>
              <NavLink href="#how-it-works">Comment ça marche ?</NavLink>
              <NavLink href="#why-us">Pourquoi nous choisir ?</NavLink>
              <NavLink href="#testimonials">Témoignages</NavLink>
            </nav>
          </div>
          <div className="flex items-center gap-2">
             <Link href="/login">
                <Button variant="ghost">
                  Se connecter
                  <LogIn className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            <Link href="/signup/client">
                <Button>
                  S'inscrire
                  <UserPlus className="ml-2 h-4 w-4" />
                </Button>
              </Link>
          </div>
        </div>
      </header>
      <main className="flex-1">
        <section id="hero" className="w-full relative overflow-hidden bg-primary text-primary-foreground py-20 md:py-32">
            <div className="absolute inset-0">
                <Image
                    src="https://i.ibb.co/3YvVyvM/truck-hero.jpg"
                    alt="Camion de transport sur une autoroute"
                    fill
                    className="object-cover"
                    data-ai-hint="truck highway"
                />
            </div>
            <div className="absolute inset-0 bg-black/60 z-0"></div>
            <div className="container relative z-10 text-center">
                <div className="mx-auto w-full max-w-3xl">
                    <h1 className="font-headline text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
                    Transportez vos biens en toute confiance en Guinée.
                    </h1>
                    <p className="mt-6 text-lg leading-8 text-primary-foreground/90">
                    Mise en relation simple et efficace entre clients et transporteurs. Trouvez le bon service, au bon moment.
                    </p>
                     <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-x-8 gap-y-6">
                        <div className="flex flex-col gap-2 items-center">
                            <p className="text-sm text-primary-foreground/80">Pour les particuliers</p>
                            <div className="flex gap-4">
                                <Link href="/signup/client">
                                    <Button size="lg" variant="secondary">
                                        Client
                                        <UserPlus className="ml-2 h-4 w-4" />
                                    </Button>
                                </Link>
                                <Link href="/signup/transporter">
                                    <Button size="lg" variant="outline" className="bg-transparent text-white hover:bg-white hover:text-black">
                                        Transporteur
                                        <Truck className="ml-2 h-4 w-4" />
                                    </Button>
                                </Link>
                            </div>
                        </div>
                        <div className="flex flex-col gap-2 items-center">
                            <p className="text-sm text-primary-foreground/80">Pour les entreprises</p>
                             <div className="flex gap-4">
                                <Link href="/signup/client-company">
                                    <Button size="lg" variant="secondary">
                                        Client Pro
                                        <Building className="ml-2 h-4 w-4" />
                                    </Button>
                                </Link>
                                <Link href="/signup/transporter-company">
                                    <Button size="lg" variant="outline" className="bg-transparent text-white hover:bg-white hover:text-black">
                                        Transporteur Pro
                                        <Building className="ml-2 h-4 w-4" />
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <section id="price-simulator" className="container py-20">
            <HomePriceSimulator />
        </section>
        
        <section id="how-it-works" className="container py-20 space-y-16">
            <div className="text-center">
                <h2 className="font-headline text-3xl font-bold text-primary">Simple comme bonjour</h2>
                <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
                    Suivez ces étapes faciles pour expédier vos marchandises rapidement et en toute sécurité.
                </p>
            </div>

            {/* Step 1 */}
            <div className="grid md:grid-cols-2 gap-12 items-center">
                <div className="order-2 md:order-1">
                    <div className="bg-primary/10 text-primary w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl mb-4">1</div>
                    <h3 className="font-headline text-2xl font-semibold mb-4">Publiez votre demande</h3>
                    <p className="text-muted-foreground">
                        Créez un compte client, puis décrivez votre besoin en quelques clics : nature du colis, poids, trajet et date souhaitée. Votre demande est alors instantanément visible par notre réseau de transporteurs qualifiés, prête à recevoir des offres.
                    </p>
                </div>
                <div className="order-1 md:order-2">
                    <Image src="https://picsum.photos/600/400" alt="Personne utilisant un ordinateur pour planifier une logistique" width={600} height={400} className="rounded-lg shadow-xl" data-ai-hint="logistics planning" />
                </div>
            </div>

            {/* Step 2 */}
            <div className="grid md:grid-cols-2 gap-12 items-center">
                <div>
                     <Image src="https://picsum.photos/600/401" alt="Plusieurs camions de transport dans un dépôt logistique" width={600} height={401} className="rounded-lg shadow-xl" data-ai-hint="transport trucks" />
                </div>
                <div>
                    <div className="bg-primary/10 text-primary w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl mb-4">2</div>
                    <h3 className="font-headline text-2xl font-semibold mb-4">Choisissez votre transporteur</h3>
                    <p className="text-muted-foreground">
                        Recevez rapidement des propositions de nos transporteurs vérifiés. Prenez le temps de comparer leurs profils, consultez les évaluations laissées par d'autres clients et choisissez l'offre qui correspond le mieux à votre budget et à vos exigences.
                    </p>
                </div>
            </div>

             {/* Step 3 */}
            <div className="grid md:grid-cols-2 gap-12 items-center">
                 <div className="order-2 md:order-1">
                    <div className="bg-primary/10 text-primary w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl mb-4">3</div>
                    <h3 className="font-headline text-2xl font-semibold mb-4">Suivez et validez</h3>
                    <p className="text-muted-foreground">
                        Une fois le transporteur en route, suivez sa progression en temps réel sur la carte. À l'arrivée de votre marchandise, il vous suffit de confirmer la livraison. N'oubliez pas d'évaluer votre expérience pour aider les futurs utilisateurs à faire le bon choix !
                    </p>
                </div>
                <div className="order-1 md:order-2">
                    <Image src="https://picsum.photos/600/402" alt="Camion sur une route avec une surimpression d'itinéraire GPS" width={600} height={402} className="rounded-lg shadow-xl" data-ai-hint="truck gps" />
                </div>
            </div>
        </section>

        <section id="services" className="bg-muted py-20">
          <div className="container">
            <h2 className="text-center font-headline text-3xl font-bold text-primary">Une solution pour chaque besoin</h2>
            <p className="text-center mt-2 text-muted-foreground max-w-2xl mx-auto">Que vous soyez un particulier ou une entreprise, TrackGuinea s'adapte à vos exigences.</p>
            <div className="grid md:grid-cols-3 gap-8 mt-12">
              {services.map((service, index) => (
                  <Card key={index} className="text-center hover:shadow-xl transition-shadow duration-300">
                    <CardHeader className="items-center">
                        <div className="bg-primary/10 p-4 rounded-full">{service.icon}</div>
                        <CardTitle className="pt-4">{service.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">{service.description}</p>
                    </CardContent>
                  </Card>
              ))}
            </div>
          </div>
        </section>

        <section id="why-us" className="container py-20">
            <h2 className="text-center font-headline text-3xl font-bold text-primary">Votre partenaire de confiance</h2>
            <p className="text-center mt-2 text-muted-foreground max-w-2xl mx-auto">Découvrez pourquoi des centaines d'utilisateurs et d'entreprises nous font confiance chaque jour.</p>
            <div className="grid md:grid-cols-3 gap-8 mt-12">
                 {features.map((feature, index) => (
                    <div key={index} className="flex items-start gap-4">
                        <div className="bg-primary/10 p-3 rounded-lg">{feature.icon}</div>
                        <div>
                            <h3 className="font-semibold text-lg">{feature.title}</h3>
                            <p className="text-muted-foreground text-sm">{feature.description}</p>
                        </div>
                    </div>
                ))}
            </div>
        </section>
        
        <section id="testimonials" className="py-20">
            <div className="container">
                <h2 className="text-center font-headline text-3xl font-bold text-primary">Ils nous font confiance</h2>
                <p className="text-center mt-2 text-muted-foreground max-w-2xl mx-auto">Découvrez ce que nos utilisateurs pensent de TrackGuinea.</p>
                <Carousel
                  plugins={[autoplayPlugin.current]}
                  onMouseEnter={autoplayPlugin.current.stop}
                  onMouseLeave={autoplayPlugin.current.reset}
                  opts={{
                    align: "start",
                    loop: true,
                  }}
                  className="w-full max-w-4xl mx-auto mt-12"
                >
                  <CarouselContent>
                    {testimonials.map((testimonial, index) => (
                      <CarouselItem key={index} className="md:basis-1/2 lg:basis-1/3">
                        <div className="p-1 h-full">
                           <Card className="flex flex-col h-full">
                                <CardContent className="pt-6 flex-grow">
                                    <p className="italic text-muted-foreground">"{testimonial.comment}"</p>
                                </CardContent>
                                <CardHeader className="flex-row items-center gap-4">
                                    <Avatar>
                                        <AvatarFallback>{testimonial.avatar}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="font-semibold">{testimonial.name}</p>
                                        <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                                    </div>
                                </CardHeader>
                            </Card>
                        </div>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  <CarouselPrevious />
                  <CarouselNext />
                </Carousel>
            </div>
        </section>


        <section id="review" className="container py-20">
             <div className="max-w-2xl mx-auto text-center">
                <h2 className="font-headline text-3xl font-bold text-primary">Laissez votre avis</h2>
                <p className="mt-2 text-muted-foreground">Votre avis compte ! Partagez votre expérience pour nous aider à nous améliorer.</p>
             </div>
             <Card className="max-w-2xl mx-auto mt-10 shadow-lg">
                <CardContent className="p-6">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onReviewSubmit)} className="space-y-6">
                             <FormField control={form.control} name="name" render={({ field }: any) => (
                                <FormItem><FormLabel>Votre nom</FormLabel><FormControl><Input placeholder="Moussa Camara" {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <FormField control={form.control} name="message" render={({ field }: any) => (
                                <FormItem><FormLabel>Votre avis</FormLabel><FormControl><Textarea placeholder="J'ai utilisé TrackGuinea et..." rows={4} {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <Button type="submit" className="w-full" size="lg" disabled={form.formState.isSubmitting}>
                                Envoyer mon avis
                                <MessageSquare className="ml-2 h-4 w-4"/>
                            </Button>
                        </form>
                    </Form>
                </CardContent>
             </Card>
        </section>

      </main>
      <footer className="bg-muted border-t pt-12">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Column 1: Logo and Info */}
            <div className="space-y-4">
              <Logo />
              <p className="text-sm text-muted-foreground">
                Votre partenaire de confiance pour des solutions de transport fiables et efficaces en Guinée.
              </p>
              <div className="flex items-center space-x-3">
                <a href="#" className="text-muted-foreground hover:text-primary"><Facebook size={20} /></a>
                <a href="#" className="text-muted-foreground hover:text-primary"><Twitter size={20} /></a>
                <a href="#" className="text-muted-foreground hover:text-primary"><Linkedin size={20} /></a>
              </div>
            </div>

            {/* Column 2: Services */}
            <div className="space-y-4">
              <h4 className="font-semibold">Nos Services</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="#services" className="text-muted-foreground hover:text-primary">Transport de Marchandises</Link></li>
                <li><Link href="#services" className="text-muted-foreground hover:text-primary">Envoi de Colis</Link></li>
                <li><Link href="#services" className="text-muted-foreground hover:text-primary">Déménagement</Link></li>
              </ul>
            </div>

            {/* Column 3: Quick Links */}
            <div className="space-y-4">
              <h4 className="font-semibold">Liens Rapides</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="#how-it-works" className="text-muted-foreground hover:text-primary">Comment ça marche ?</Link></li>
                <li><Link href="#price-simulator" className="text-muted-foreground hover:text-primary">Simulateur de prix</Link></li>
                <li><Link href="/login" className="text-muted-foreground hover:text-primary">Espace client</Link></li>
              </ul>
            </div>

            {/* Column 4: Contact */}
            <div className="space-y-4">
              <h4 className="font-semibold">Contact</h4>
              <ul className="space-y-3 text-sm">
                <li className="flex items-start gap-3">
                  <MapPin size={20} className="text-primary mt-1 shrink-0" />
                  <span className="text-muted-foreground">Lambanyi, commune de Ratoma, Immeuble Amizo</span>
                </li>
                <li className="flex items-start gap-3">
                  <Phone size={20} className="text-primary mt-1 shrink-0" />
                  <div className="flex flex-col">
                    <a href="tel:+224612000102" className="text-muted-foreground hover:text-primary">612 00 01 02</a>
                    <a href="tel:+224669998339" className="text-muted-foreground hover:text-primary">669 99 83 39</a>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <Mail size={20} className="text-primary mt-1 shrink-0" />
                  <a href="mailto:info@informafrik.com" className="text-muted-foreground hover:text-primary">info@informafrik.com</a>
                </li>
              </ul>
            </div>
          </div>
          
          <div className="mt-8 border-t py-6 text-sm text-muted-foreground">
             <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="text-center sm:text-left">
                  <p>&copy; {new Date().getFullYear()} Informafrik SARLU. Tous droits réservés.</p>
                  <p className="text-xs">
                    N° RCCM: GN.KAL.2019.B.092 259 | NIF: 749265013
                  </p>
                </div>
                <div className="flex gap-4">
                  <Link href="#" className="hover:text-primary">Politique de confidentialité</Link>
                  <Link href="#" className="hover:text-primary">Conditions d'utilisation</Link>
                </div>
             </div>
          </div>

        </div>
      </footer>
    </div>
  );
}
