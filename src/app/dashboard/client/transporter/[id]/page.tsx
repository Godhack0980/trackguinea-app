
"use client"

import React from "react";
import { useDocumentData } from "react-firebase-hooks/firestore"
import { doc, Timestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Loader2, Mail, Phone, Truck, ShieldCheck, Star } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const pastJobs = [
    { from: 'Conakry', to: 'Mamou', date: '2024-05-10' },
    { from: 'Conakry', to: 'Labé', date: '2024-04-22' },
    { from: 'Boké', to: 'Conakry', date: '2024-04-05' },
];

export default function TransporterProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = React.use(params);
  const id = unwrappedParams.id;

  const transporterDocRef = doc(db, 'users', id);
  const [transporter, loading, error] = useDocumentData(transporterDocRef);

  if (loading) {
    return <div className="flex h-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>
  }

  if (error) {
    return (
      <Card className="shadow-md rounded-2xl border-border">
        <CardHeader><CardTitle className="text-destructive">Erreur de chargement</CardTitle></CardHeader>
        <CardContent>
            <p>Une erreur est survenue lors de la récupération des données du profil.</p>
            <p className="text-sm text-muted-foreground mt-2">Détail: {error.message}</p>
        </CardContent>
      </Card>
    )
  }
  
  if (!transporter) {
    return (
       <Card className="shadow-md rounded-2xl border-border">
        <CardHeader><CardTitle>Profil non trouvé</CardTitle></CardHeader>
        <CardContent>
            <p>Impossible de trouver un transporteur avec l'identifiant <code className="p-1 bg-muted rounded-sm text-sm">{id}</code>.</p>
             <p className="text-sm text-muted-foreground mt-2">Veuillez vérifier le lien ou retourner à la liste des transporteurs.</p>
        </CardContent>
      </Card>
    )
  }
  
  const getInitials = () => {
    if (transporter.firstName && transporter.lastName) {
      return `${transporter.firstName[0]}${transporter.lastName[0]}`
    }
    return 'T';
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold text-primary">Profil du Transporteur</h1>
      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-6">
           <Card className="shadow-md rounded-2xl border-border">
            <CardHeader className="items-center text-center">
               <Avatar className="h-24 w-24 mb-2">
                 <AvatarImage src={`https://placehold.co/96x96/008080/FFFFFF/png?text=${getInitials()}`} />
                <AvatarFallback className="text-3xl">{getInitials()}</AvatarFallback>
              </Avatar>
              <CardTitle className="text-2xl flex items-center gap-2">
                {transporter.firstName} {transporter.lastName}
                {transporter.isVerified && <ShieldCheck className="h-6 w-6 text-green-500" title="Vérifié"/>}
              </CardTitle>
              <CardDescription>
                Membre depuis {transporter.memberSince ? new Intl.DateTimeFormat('fr-FR', { year: 'numeric', month: 'long' }).format((transporter.memberSince as Timestamp).toDate()) : 'N/A'}
              </CardDescription>
              <Badge variant={transporter.availability === 'Disponible' ? 'secondary' : 'outline'} className={transporter.availability === 'Disponible' ? 'text-green-600' : ''}>
                {transporter.availability || 'N/A'}
              </Badge>
            </CardHeader>
            <CardContent className="text-center">
                <Dialog>
                    <DialogTrigger asChild>
                        <Button className="w-full">Contacter {transporter.firstName}</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Contacter {transporter.firstName} {transporter.lastName}</DialogTitle>
                            <DialogDescription>
                                Utilisez les informations ci-dessous pour joindre le transporteur.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                             <div className="flex items-center gap-4 p-3 rounded-md bg-muted">
                                <Phone className="h-5 w-5 text-primary"/>
                                <span className="font-mono text-lg">{transporter.phone}</span>
                             </div>
                             <div className="flex items-center gap-4 p-3 rounded-md bg-muted">
                                <Mail className="h-5 w-5 text-primary"/>
                                <span className="font-mono text-lg">{transporter.email}</span>
                             </div>
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button asChild variant="outline">
                                <a href={`mailto:${transporter.email}`}>
                                    <Mail className="mr-2 h-4 w-4"/> Envoyer un e-mail
                                </a>
                            </Button>
                             <Button asChild>
                                <a href={`tel:${transporter.phone}`}>
                                    <Phone className="mr-2 h-4 w-4"/> Appeler
                                </a>
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </CardContent>
          </Card>
           <Card className="shadow-md rounded-2xl border-border">
            <CardHeader><CardTitle className="text-lg text-accent">Contact</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
                 <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground"/>
                    <span className="font-medium">{transporter.email}</span>
                </div>
                 <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground"/>
                    <span className="font-medium">{transporter.phone}</span>
                </div>
            </CardContent>
           </Card>
        </div>
        <div className="md:col-span-2 space-y-6">
           <Card className="shadow-md rounded-2xl border-border">
            <CardHeader>
                <CardTitle className="text-lg text-accent">Statistiques & Évaluations</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4 text-center">
                <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Évaluation</p>
                    <p className="text-xl font-bold flex items-center justify-center gap-1">
                        {transporter.rating ? transporter.rating.toFixed(1) : 'N/A'} <Star className="h-4 w-4 text-amber-400" fill="currentColor"/>
                    </p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Courses terminées</p>
                    <p className="text-xl font-bold">{transporter.jobsCompleted || 0}</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Années d'expérience</p>
                    <p className="text-xl font-bold">{transporter.experienceYears || 0}</p>
                </div>
            </CardContent>
          </Card>
          <Card className="shadow-md rounded-2xl border-border">
             <CardHeader>
                <CardTitle className="text-lg text-accent flex items-center"><Truck className="mr-3"/> Informations du véhicule</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <p className="text-muted-foreground">Type de véhicule</p>
                        <p className="font-medium capitalize">{transporter.vehicleType || 'Poids Lourd'}</p>
                    </div>
                     <div>
                        <p className="text-muted-foreground">Immatriculation</p>
                        <p className="font-mono font-medium uppercase">{transporter.vehicleRegistration || 'N/A'}</p>
                    </div>
                     <div>
                        <p className="text-muted-foreground">Type de permis</p>
                        <p className="font-medium">{transporter.licenseType || 'N/A'}</p>
                    </div>
                </div>
            </CardContent>
          </Card>
           <Card className="shadow-md rounded-2xl border-border">
             <CardHeader>
                <CardTitle className="text-lg text-accent">Exemples de trajets récents</CardTitle>
            </CardHeader>
            <CardContent>
                <ul className="space-y-2 text-sm">
                    {pastJobs.map((job, index) => (
                        <li key={index} className="flex items-center gap-3 p-2 bg-muted/50 rounded-md">
                            <Truck className="h-4 w-4 text-primary"/>
                            <span className="font-medium">{job.from} → {job.to}</span>
                            <span className="text-muted-foreground ml-auto">{job.date}</span>
                        </li>
                    ))}
                </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
