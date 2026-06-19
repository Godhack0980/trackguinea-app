
"use client"

import { useState } from "react";
import { useAuth } from "@/context/auth-context";
import { useCollection } from "react-firebase-hooks/firestore";
import { collection, addDoc, Timestamp, doc, deleteDoc, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle, MoreHorizontal, Loader2, Car, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const vehicleSchema = z.object({
  model: z.string().min(1, "Le modèle est requis."),
  registration: z.string().min(1, "L'immatriculation est requise."),
  type: z.string().min(1, "Le type est requis."),
});

const AddVehicleDialog = ({ companyId }: { companyId: string }) => {
    const [open, setOpen] = useState(false);
    const { toast } = useToast();
    
    const form = useForm<z.infer<typeof vehicleSchema>>({
        resolver: zodResolver(vehicleSchema),
        defaultValues: { model: "", registration: "", type: "" },
    });

    const onSubmit = async (values: z.infer<typeof vehicleSchema>) => {
        try {
            await addDoc(collection(db, "users", companyId, "vehicles"), {
                ...values,
                status: 'Disponible', 
                addedAt: Timestamp.now(),
            });

            toast({ title: "Véhicule ajouté", description: "Le véhicule a été ajouté à votre flotte." });
            form.reset();
            setOpen(false);
        } catch (error) {
            console.error("Error adding vehicle:", error);
            toast({ variant: "destructive", title: "Erreur", description: "Impossible d'ajouter le véhicule." });
        }
    };
    
    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                 <Button className="bg-primary hover:bg-accent text-white rounded-2xl shadow-lg px-4 py-2 flex items-center gap-2">
                  <PlusCircle className="h-5 w-5" />
                  Ajouter un véhicule
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Ajouter un nouveau véhicule</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                        <FormField control={form.control} name="model" render={({ field }) => (
                            <FormItem><FormLabel>Modèle</FormLabel><FormControl><Input placeholder="MAN TGS 26.440" {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                         <FormField control={form.control} name="registration" render={({ field }) => (
                            <FormItem><FormLabel>Immatriculation</FormLabel><FormControl><Input placeholder="RC-1234-GN" {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                         <FormField control={form.control} name="type" render={({ field }) => (
                            <FormItem><FormLabel>Type de carrosserie</FormLabel><FormControl><Input placeholder="Porte-conteneur, Benne, etc." {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                        <DialogFooter>
                             <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Annuler</Button>
                            <Button type="submit" disabled={form.formState.isSubmitting}>
                                {form.formState.isSubmitting ? <Loader2 className="animate-spin" /> : "Ajouter le véhicule"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}

export default function FleetPage() {
    const { user, userData, loadingAuth } = useAuth();
    const { toast } = useToast();

    const vehiclesQuery = userData?.companyId ? query(collection(db, 'users', userData.companyId, 'vehicles')) : null;
    const [vehiclesSnapshot, loading, error] = useCollection(vehiclesQuery);

    const vehicles = vehiclesSnapshot?.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)) || [];

    const handleRemoveVehicle = async (vehicleId: string) => {
        if (!userData?.companyId) return;
        try {
            await deleteDoc(doc(db, "users", userData.companyId, "vehicles", vehicleId));
            toast({ title: "Véhicule supprimé" });
        } catch (error) {
            toast({ variant: "destructive", title: "Erreur", description: "Impossible de supprimer le véhicule." });
        }
    };
    
    const getStatusBadge = (status: string) => {
        let className = "px-3 py-1 rounded-full text-sm font-medium ";
        switch (status) {
            case 'Disponible': className += 'bg-green-100 text-green-700'; break;
            case 'En mission': className += 'bg-blue-100 text-blue-700'; break;
            case 'En maintenance': className += 'bg-orange-100 text-orange-700'; break;
            default: className += 'bg-gray-100 text-gray-700'; break;
        }
        return <span className={className}>{status}</span>;
    };
    
    if (loadingAuth || !user || !userData) {
        return <div className="flex h-full w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-primary">Gestion de la Flotte</h1>
                 <AddVehicleDialog companyId={userData.companyId} />
            </div>
            <Card className="shadow-md rounded-2xl border-border">
                <CardHeader>
                    <CardTitle className="text-lg text-accent">Liste des Véhicules</CardTitle>
                    <CardDescription>Retrouvez ici tous les véhicules de votre flotte.</CardDescription>
                </CardHeader>
                <CardContent>
                     <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-muted/50 text-left">
                                <th className="p-3">Modèle</th>
                                <th className="p-3">Immatriculation</th>
                                <th className="p-3">Type</th>
                                <th className="p-3">Statut</th>
                                <th className="p-3 text-right"><span className="sr-only">Actions</span></th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="text-center h-24 p-3">
                                        <Loader2 className="mx-auto animate-spin"/>
                                    </td>
                                </tr>
                            ) : error ? (
                                <tr><td colSpan={5} className="text-center text-destructive p-3">Erreur: {error.message}</td></tr>
                            ) : vehicles.length > 0 ? vehicles.map(vehicle => (
                                <tr key={vehicle.id} className="hover:bg-muted/30 transition">
                                    <td className="p-3">
                                         <div className="flex items-center gap-3">
                                            <Car className="text-muted-foreground"/>
                                            <span className="font-medium">{vehicle.model}</span>
                                        </div>
                                    </td>
                                    <td className="p-3 font-mono">{vehicle.registration}</td>
                                    <td className="p-3">{vehicle.type}</td>
                                    <td className="p-3">{getStatusBadge(vehicle.status)}</td>
                                    <td className="p-3 text-right">
                                         <DropdownMenu>
                                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal/></Button></DropdownMenuTrigger>
                                            <DropdownMenuContent>
                                                <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleRemoveVehicle(vehicle.id)}>
                                                    <Trash2 className="mr-2 h-4 w-4"/> Supprimer
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </td>
                                </tr>
                            )) : (
                                <tr><td colSpan={5} className="text-center h-24 text-muted-foreground p-3">Aucun véhicule ajouté pour le moment.</td></tr>
                            )}
                        </tbody>
                     </table>
                </CardContent>
            </Card>
        </div>
    )
}
