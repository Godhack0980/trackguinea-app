
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { collection, addDoc, Timestamp, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

import { CreateTransportRequestInput, CreateTransportRequestSchema } from "@/ai/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, PackagePlus, Calendar as CalendarIcon, PlusCircle } from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/auth-context";
import { cityNames } from "@/lib/guinea-cities";
import { getRouteDetails } from "@/services/location-service";
import { createNotification } from "@/lib/notifications";

export function CreateTransportRequestForm() {
  const { user, userData } = useAuth();
  const { toast } = useToast();
  
  const form = useForm<CreateTransportRequestInput>({
    resolver: zodResolver(CreateTransportRequestSchema),
    defaultValues: {
      nature: "",
      from: "Conakry",
      to: undefined,
      weight: undefined,
      weightUnit: 'tonne',
      date: undefined,
    },
  });

  async function onSubmit(values: CreateTransportRequestInput) {
    if (!user || !userData) {
        toast({ variant: "destructive", title: "Erreur", description: "Vous devez être connecté pour créer une demande." });
        return;
    }
     if (!values.date) {
      toast({ variant: "destructive", title: "Date manquante", description: "Veuillez sélectionner une date." });
      return;
    }
    try {
        const routeDetails = await getRouteDetails(values.from, values.to);

        await addDoc(collection(db, `requests`), {
            ...values,
            date: Timestamp.fromDate(values.date),
            status: 'En attente',
            createdAt: Timestamp.now(),
            clientId: user.uid,
            clientName: userData.companyName || `${userData.firstName} ${userData.lastName}`,
            distance: routeDetails?.distance || 0,
            duration: routeDetails?.duration || 0
        });
        toast({ title: "Succès", description: "Votre demande de transport a été créée." });
        form.reset({
            nature: "", from: "Conakry", to: undefined,
            weight: undefined, weightUnit: 'tonne', date: undefined,
        });

        // Notify all transporters and transporter companies
        const transportersQuery = query(collection(db, 'users'), where('role', 'in', ['transporter', 'transporter-company']));
        const querySnapshot = await getDocs(transportersQuery);

        querySnapshot.forEach(doc => {
            createNotification({
                userId: doc.id,
                message: `Nouvelle offre de ${values.from} à ${values.to} pour "${values.nature}".`,
                href: '/dashboard/transporter'
            });
        });

    } catch (error) {
        console.error("Erreur lors de la création de la demande :", error);
        toast({ 
            variant: "destructive", title: "Erreur", 
            description: error instanceof Error ? error.message : "Impossible de créer la demande." 
        });
    }
  }
  
  return (
    <Card className="shadow-md rounded-2xl border-border">
        <CardHeader>
            <CardTitle className="text-lg text-accent flex items-center gap-2"><PlusCircle/> Créer une nouvelle demande</CardTitle>
            <CardDescription>Remplissez les détails ci-dessous pour trouver un transporteur.</CardDescription>
        </CardHeader>
        <CardContent>
             <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                        <FormField control={form.control} name="nature" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Nature du colis</FormLabel>
                                <FormControl><Input placeholder="Ex: Meubles de maison, Ciment, etc." {...field} value={field.value ?? ''} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}/>
                        <FormField control={form.control} name="date" render={({ field }) => (
                            <FormItem className="flex flex-col">
                                <FormLabel>Date d'enlèvement</FormLabel>
                                <Popover>
                                    <PopoverTrigger asChild>
                                    <FormControl>
                                        <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                        {field.value ? format(field.value, "PPP", { locale: fr }) : <span>Choisir une date</span>}
                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                        </Button>
                                    </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))}/>
                                    </PopoverContent>
                                </Popover>
                                <FormMessage />
                            </FormItem>
                        )}/>
                         <FormField control={form.control} name="from" render={({ field }) => (
                            <FormItem><FormLabel>Départ</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Sélectionnez une ville"/></SelectTrigger></FormControl>
                                <SelectContent>{cityNames.map(c => <SelectItem key={`from-${c}`} value={c}>{c}</SelectItem>)}</SelectContent>
                                </Select><FormMessage />
                            </FormItem>
                        )}/>
                         <FormField control={form.control} name="to" render={({ field }) => (
                            <FormItem><FormLabel>Arrivée</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Sélectionnez une ville"/></SelectTrigger></FormControl>
                                <SelectContent>{cityNames.map(c => <SelectItem key={`to-${c}`} value={c}>{c}</SelectItem>)}</SelectContent>
                                </Select><FormMessage />
                            </FormItem>
                        )}/>
                         <div className="grid grid-cols-3 gap-2">
                            <div className="col-span-2">
                                <FormField control={form.control} name="weight" render={({ field }) => (
                                    <FormItem><FormLabel>Poids</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="number"
                                            placeholder="Ex: 10"
                                            value={field.value ?? ''}
                                            onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}/>
                            </div>
                            <FormField control={form.control} name="weightUnit" render={({ field }) => (
                                <FormItem><FormLabel>Unité</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                                    <SelectContent>
                                        <SelectItem value="kg">kg</SelectItem>
                                        <SelectItem value="tonne">tonne</SelectItem>
                                    </SelectContent>
                                    </Select><FormMessage />
                                </FormItem>
                            )}/>
                         </div>
                    </div>
                    <Button type="submit" disabled={form.formState.isSubmitting}>
                        {form.formState.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <PackagePlus className="mr-2 h-4 w-4" />}
                        Créer la demande
                    </Button>
                </form>
            </Form>
        </CardContent>
    </Card>
  )
}
