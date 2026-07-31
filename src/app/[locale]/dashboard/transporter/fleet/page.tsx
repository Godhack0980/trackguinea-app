"use client"

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/context/auth-context";
import { collection, addDoc, Timestamp, doc, deleteDoc, query, getDocs, updateDoc } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, MoreHorizontal, Loader2, Car, Trash2, CheckCircle, Navigation, AlertTriangle, UploadCloud, Eye, Image as ImageIcon, Ruler, Scale, RefreshCw, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

const vehicleSchema = z.object({
  model: z.string().min(1, "Le modèle est requis."),
  registration: z.string().min(1, "L'immatriculation est requise."),
  type: z.string().min(1, "Le type de carrosserie est requis."),
  capacity: z.string().min(1, "La capacité de charge est requise."),
  dimensions: z.string().min(1, "Les dimensions sont requises."),
  currentPrefecture: z.string().min(1, "La préfecture actuelle est requise."),
  wheelsCount: z.string().optional(),
  description: z.string().optional(),
});

type VehicleFormData = z.infer<typeof vehicleSchema>;

const vehicleTypes = [
  "Benne",
  "Plateau",
  "Citerne",
  "Porte-conteneur",
  "Porte-char",
  "Frigo",
  "Caterpillar / Engin de chantier",
  "Remorque",
  "Semi-remorque",
  "Plateau Minier",
  "Toupie à Béton / Malaxeur",
  "Porte-engin",
];

const modelSuggestions: Record<string, string[]> = {
  "Benne": [
    "Camions à benne Howo 371",
    "Camions à benne Howo T5G",
    "Camion HOWO TX",
    "Mercedes Actros 4141 Benne 8x4",
    "Mercedes Arocs 3340 Benne",
    "Volvo FMX 460 Benne 8x4",
    "Volvo FM 400 Benne",
    "Scania G420 Benne 8x4",
    "Scania P380 Benne",
    "MAN TGS 33.400 Benne",
    "MAN TGA 41.480 Benne",
    "Renault Kerax 440 Benne",
    "Renault K480 Benne",
    "Iveco Trakker 440 Benne",
    "DAF CF 85 Benne",
    "Shacman F3000 Benne"
  ],
  "Plateau": [
    "Camion à plateau HOWO A7",
    "Mercedes-Benz Actros 2640 Plateau",
    "Mercedes Atego 1518 Plateau",
    "Volvo FH 12 Plateau",
    "Volvo FM 330 Plateau",
    "Scania G400 Plateau",
    "Scania R480 Plateau",
    "MAN TGS 26.400 Plateau",
    "Renault Premium 380 Plateau",
    "Renault Midlum Plateau",
    "Iveco Eurocargo Plateau",
    "Iveco Stralis Plateau",
    "DAF CF 75 Plateau",
    "DAF LF 55 Plateau",
    "Fiat Ducato Plateau",
    "Nissan Cabstar Plateau",
    "Nissan Atleon Plateau"
  ],
  "Citerne": [
    "Mercedes Actros Citerne 32000L",
    "Mercedes Arocs Citerne",
    "Volvo FH 16 Citerne 45000L",
    "MAN TGS Citerne Hydrocarbure",
    "Scania R480 Citerne",
    "Renault Kerax Citerne",
    "Iveco Trakker Citerne"
  ],
  "Porte-conteneur": [
    "Scania R500 Porte-conteneur",
    "DAF XF 105 Porte-conteneur",
    "Volvo FH 12 Porte-conteneur",
    "Renault Premium 420 Porte-conteneur",
    "Renault T460 Porte-conteneur",
    "Krone Box Liner Porte-conteneur"
  ],
  "Porte-char": [
    "Scania R620 Heavy Duty Porte-char",
    "Mercedes Actros SLT Porte-char",
    "Volvo FH16 750 Porte-char",
    "MAN TGX Heavy Transport Porte-char"
  ],
  "Frigo": [
    "Scania G400 Frigo",
    "Renault Premium Frigorifique",
    "Volvo FM 330 Frigo",
    "Mercedes Atego Frigo",
    "Schmitz Cargobull S.KO Frigo"
  ],
  "Caterpillar / Engin de chantier": [
    "Caterpillar 320D (Pelle)",
    "Caterpillar 966H (Chargeuse)",
    "Caterpillar D8T (Bulldozer)",
    "Caterpillar 140M (Niveleuse)",
    "Caterpillar 777D (Tombereau)"
  ],
  "Remorque": [
    "Remorque Double Essieu",
    "Remorque Plateau Standard",
    "Remorque Plateau Ridelles"
  ],
  "Semi-remorque": [
    "Semi-remorque Plateau 3 Essieux",
    "Semi-remorque Benne Céréalière",
    "Semi-remorque Citerne",
    "Semi-remorque Frigorifique",
    "Krone Profi Liner Semi-remorque",
    "Fruehauf Semi-remorque Benne",
    "Fruehauf Semi-remorque Plateau",
    "Schmitz Cargobull S.KI Benne"
  ],
  "Plateau Minier": [
    "Volvo FMX 8x4 Minier",
    "Mercedes Actros 8x4 Minier",
    "Caterpillar 777D (Tombereau)",
    "Komatsu HD785 Minier"
  ],
  "Toupie à Béton / Malaxeur": [
    "Camion malaxeur HOWO",
    "Liebherr Toupie Béton Actros",
    "MAN TGS Toupie Béton",
    "Renault Kerax Malaxeur"
  ],
  "Porte-engin": [
    "Volvo FMX Porte-engin",
    "Mercedes Actros Porte-engin",
    "MAN TGA Porte-engin"
  ]
};

const dimensionSuggestions: Record<string, string[]> = {
  "Benne": ["8.2m x 2.5m x 3.4m", "7.5m x 2.4m x 3.2m", "6.8m x 2.4m x 3.0m"],
  "Plateau": ["12.5m x 2.5m x 2.8m", "10.0m x 2.4m x 2.6m", "13.6m x 2.5m x 3.0m"],
  "Citerne": ["11.8m x 2.5m x 3.1m", "12.0m x 2.5m x 3.2m", "10.5m x 2.4m x 3.0m"],
  "Porte-conteneur": ["12.2m x 2.5m x 3.8m", "13.7m x 2.5m x 4.0m", "12.5m x 2.5m x 1.5m"],
  "Porte-char": ["15.0m x 3.0m x 3.6m", "16.5m x 3.2m x 3.8m", "14.5m x 3.0m x 3.5m"],
  "Frigo": ["13.6m x 2.6m x 4.0m", "8.5m x 2.5m x 3.6m", "10.5m x 2.5m x 3.8m"],
  "Caterpillar / Engin de chantier": ["9.8m x 3.4m x 3.5m", "8.5m x 3.2m x 3.2m", "11.2m x 3.5m x 3.6m"],
  "Remorque": ["6.2m x 2.4m x 2.8m", "8.0m x 2.5m x 3.0m", "7.5m x 2.4m x 2.8m"],
  "Semi-remorque": ["13.6m x 2.5m x 4.0m", "12.5m x 2.5m x 3.8m"],
  "Plateau Minier": ["10.5m x 2.6m x 3.2m", "12.0m x 2.8m x 3.4m"],
  "Toupie à Béton / Malaxeur": ["8.5m x 2.5m x 3.8m", "9.0m x 2.5m x 3.9m"],
  "Porte-engin": ["14.0m x 3.0m x 3.5m", "15.5m x 3.1m x 3.7m"],
};

const wheelsOptions = [
  "4 roues",
  "6 roues",
  "10 roues (Pata)",
  "12 roues",
  "18 roues",
  "22 roues",
  "Chenilles (Engin chantier)",
];

const prefecturesGuinea = [
  "Conakry", "Beyla", "Boffa", "Boké", "Coyah", "Dabola", "Dalaba", "Dinguiraye", 
  "Dubréka", "Faranah", "Forécariah", "Fria", "Gaoual", "Guéckédou", "Kankan", 
  "Kérouané", "Kindia", "Kissidougou", "Koubia", "Koundara", "Kouroussa", "Labé", 
  "Lélouma", "Lola", "Macenta", "Mali", "Mamou", "Mandiana", "Nzérékoré", "Pita", 
  "Siguiri", "Télimélé", "Tougué", "Yomou"
];

const AddVehicleDialog = ({
  userId,
  userData,
  onSuccess
}: {
  userId: string;
  userData: any;
  onSuccess: () => void;
}) => {
    const [open, setOpen] = useState(false);
    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    const [imageFiles, setImageFiles] = useState<File[]>([]);
    const [imagePreviews, setImagePreviews] = useState<string[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [showModelSuggestions, setShowModelSuggestions] = useState(false);
    const [showDimSuggestions, setShowDimSuggestions] = useState(false);

    const form = useForm<VehicleFormData>({
        resolver: zodResolver(vehicleSchema),
        defaultValues: { 
          model: "", 
          registration: "", 
          type: "", 
          capacity: "", 
          dimensions: "", 
          currentPrefecture: "",
          wheelsCount: "",
          description: "" 
        },
    });

    const watchedType = form.watch("type");
    const suggestions = watchedType ? (modelSuggestions[watchedType] || []) : [];
    const dimSuggestions = watchedType ? (dimensionSuggestions[watchedType] || []) : [];

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        const filesArray = Array.from(e.target.files);
        const newFiles = [...imageFiles, ...filesArray].slice(0, 5); // Max 5 pictures
        setImageFiles(newFiles);

        const newPreviews: string[] = [];
        let loaded = 0;
        if (newFiles.length === 0) {
          setImagePreviews([]);
          return;
        }

        newFiles.forEach((file) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            newPreviews.push(reader.result as string);
            loaded++;
            if (loaded === newFiles.length) {
              setImagePreviews(newPreviews);
            }
          };
          reader.readAsDataURL(file);
        });
      }
    };

    const removeImage = (index: number) => {
      const newFiles = imageFiles.filter((_, i) => i !== index);
      const newPreviews = imagePreviews.filter((_, i) => i !== index);
      setImageFiles(newFiles);
      setImagePreviews(newPreviews);
    };

    const onSubmit = async (values: VehicleFormData) => {
        try {
            setIsUploading(true);
            const vehiclesCollection = collection(db, "users", userId, "vehicles");
            
            const vehicleData: any = {
                ...values,
                status: 'Disponible',
                addedAt: Timestamp.now(),
                ownerId: userId,
                ownerName: userData?.firstName && userData?.lastName 
                  ? `${userData.firstName} ${userData.lastName}` 
                  : userData?.companyName || 'Transporteur Particulier',
                ownerPhone: userData?.phone || '',
                ownerCity: userData?.city || 'Conakry',
                ownerType: userData?.role === 'transporter-company' ? 'company' : 'individual',
                images: [],
                imageUrl: ''
            };

            const imageUrls: string[] = [];
            if (imageFiles.length > 0) {
              for (let i = 0; i < imageFiles.length; i++) {
                const file = imageFiles[i];
                const fileExtension = file.name.split('.').pop();
                const fileName = `vehicle-${Date.now()}-${i}.${fileExtension}`;
                const storageRef = ref(storage, `vehicles/${userId}/${fileName}`);
                
                const uploadTask = uploadBytesResumable(storageRef, file);
                
                const url = await new Promise<string>((resolve, reject) => {
                  uploadTask.on('state_changed', 
                    (snapshot) => {
                      const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                      // Overall progress
                      const overall = Math.round(((i * 100) + progress) / imageFiles.length);
                      setUploadProgress(overall);
                    }, 
                    (error) => reject(error), 
                    async () => {
                      const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
                      resolve(downloadUrl);
                    }
                  );
                });
                imageUrls.push(url);
              }
              vehicleData.images = imageUrls;
              vehicleData.imageUrl = imageUrls[0] || '';
            }

            await addDoc(vehiclesCollection, vehicleData);

            toast({ title: "Véhicule ajouté", description: "Le véhicule a été ajouté avec succès." });
            form.reset();
            setImageFiles([]);
            setImagePreviews([]);
            setUploadProgress(0);
            setOpen(false);
            onSuccess();
        } catch (error: any) {
            console.error("Error adding vehicle:", error);
            toast({ variant: "destructive", title: "Erreur", description: error.message || "Impossible d'ajouter le véhicule." });
        } finally {
            setIsUploading(false);
        }
    };
    
    return (
        <Dialog open={open} onOpenChange={(val) => {
          if (!isUploading) {
            setOpen(val);
            if (!val) {
              form.reset();
              setImageFiles([]);
              setImagePreviews([]);
              setUploadProgress(0);
            }
          }
        }}>
            <DialogTrigger asChild>
                 <Button className="bg-primary hover:bg-primary/90 text-white rounded-xl shadow-lg px-4 py-2 flex items-center gap-2 font-bold transition-all">
                  <PlusCircle className="h-4 w-4" />
                  Ajouter un véhicule
                </Button>
            </DialogTrigger>
            <DialogContent className="rounded-2xl border-border bg-background text-foreground max-w-lg w-[90vw] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold text-foreground">Enregistrer un Véhicule</DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground mt-1">Saisissez les spécifications de votre engin pour le publier dans la galerie.</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-muted-foreground">Photos du véhicule (Différents angles, max 5)</label>
                          <div className="grid grid-cols-5 gap-2">
                            {imagePreviews.map((preview, index) => (
                              <div key={index} className="relative aspect-square rounded-xl overflow-hidden border border-border">
                                <img src={preview} alt={`Angle ${index + 1}`} className="w-full h-full object-cover" />
                                <button
                                  type="button"
                                  disabled={isUploading}
                                  onClick={() => removeImage(index)}
                                  className="absolute top-1 right-1 h-5 w-5 bg-rose-600/90 text-white rounded-full flex items-center justify-center hover:bg-rose-500 transition-colors"
                                >
                                  <X size={12} />
                                </button>
                              </div>
                            ))}
                            {imagePreviews.length < 5 && (
                              <div 
                                onClick={() => fileInputRef.current?.click()}
                                className="aspect-square border-2 border-dashed border-border/50 rounded-xl flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-all text-center p-1"
                              >
                                <UploadCloud className="h-5 w-5 text-muted-foreground" />
                                <span className="text-[9px] font-bold text-foreground leading-tight">Ajouter</span>
                              </div>
                            )}
                          </div>
                          <input 
                            type="file" 
                            ref={fileInputRef} 
                            className="hidden" 
                            onChange={handleFileChange} 
                            accept="image/jpeg,image/png"
                            multiple
                            disabled={isUploading}
                          />
                          {isUploading && uploadProgress > 0 && (
                            <div className="space-y-1 mt-2">
                              <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase">
                                <span>Téléversement des images</span>
                                <span>{uploadProgress}%</span>
                              </div>
                              <Progress value={uploadProgress} className="h-1 bg-muted [&>div]:bg-primary" />
                            </div>
                          )}
                        </div>

                        <FormField control={form.control} name="type" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-bold text-muted-foreground">Type de Carrosserie</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger className="rounded-xl border-border/50 bg-background text-xs">
                                    <SelectValue placeholder="Choisissez le type de carrosserie..." />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent className="rounded-xl bg-popover text-popover-foreground border-border">
                                  {vehicleTypes.map(type => (
                                    <SelectItem key={type} value={type} className="text-xs">{type}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                        )}/>

                        <div className="grid sm:grid-cols-2 gap-4">
                          <FormField control={form.control} name="model" render={({ field }) => (
                              <FormItem className="relative">
                                <FormLabel className="text-xs font-bold text-muted-foreground">Modèle & Marque</FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <Input 
                                      placeholder="Ex: Mercedes Actros, Shacman, ou écrivez..." 
                                      {...field} 
                                      className="rounded-xl border-border/50 bg-background" 
                                      disabled={isUploading} 
                                      onFocus={() => setShowModelSuggestions(true)}
                                      onBlur={() => {
                                        setTimeout(() => setShowModelSuggestions(false), 200);
                                      }}
                                      autoComplete="off"
                                    />
                                    {showModelSuggestions && suggestions.length > 0 && (
                                      <div className="absolute z-50 w-full mt-1 bg-popover text-popover-foreground border border-border rounded-xl shadow-lg max-h-48 overflow-y-auto py-1">
                                        {suggestions
                                          .filter(m => m.toLowerCase().includes((field.value || "").toLowerCase()))
                                          .map(m => (
                                            <div
                                              key={m}
                                              className="px-3 py-2 text-xs hover:bg-muted cursor-pointer font-medium transition-colors"
                                              onMouseDown={() => {
                                                field.onChange(m);
                                                setShowModelSuggestions(false);
                                              }}
                                            >
                                              {m}
                                            </div>
                                          ))}
                                      </div>
                                    )}
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                          )}/>

                          <FormField control={form.control} name="registration" render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs font-bold text-muted-foreground">Plaque d'Immatriculation</FormLabel>
                                <FormControl>
                                  <Input placeholder="RC-1234-GN" {...field} className="rounded-xl border-border/50 bg-background" disabled={isUploading} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                          )}/>
                        </div>

                        <div className="grid sm:grid-cols-3 gap-4">
                          <FormField control={form.control} name="capacity" render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs font-bold text-muted-foreground">Charge Utile (T/Kg)</FormLabel>
                                <FormControl>
                                  <Input placeholder="Ex: 25 Tonnes" {...field} className="rounded-xl border-border/50 bg-background" disabled={isUploading} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                          )}/>

                          <FormField control={form.control} name="dimensions" render={({ field }) => (
                              <FormItem className="relative">
                                <FormLabel className="text-xs font-bold text-muted-foreground">Dimensions (L x l x h)</FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <Input 
                                      placeholder="Ex: 12m x 2.5m x 3m" 
                                      {...field} 
                                      className="rounded-xl border-border/50 bg-background" 
                                      disabled={isUploading} 
                                      onFocus={() => setShowDimSuggestions(true)}
                                      onBlur={() => {
                                        setTimeout(() => setShowDimSuggestions(false), 200);
                                      }}
                                      autoComplete="off"
                                    />
                                    {showDimSuggestions && dimSuggestions.length > 0 && (
                                      <div className="absolute z-50 w-full mt-1 bg-popover text-popover-foreground border border-border rounded-xl shadow-lg max-h-48 overflow-y-auto py-1">
                                        {dimSuggestions
                                          .filter(d => d.toLowerCase().includes((field.value || "").toLowerCase()))
                                          .map(d => (
                                            <div
                                              key={d}
                                              className="px-3 py-2 text-xs hover:bg-muted cursor-pointer font-medium transition-colors"
                                              onMouseDown={() => {
                                                field.onChange(d);
                                                setShowDimSuggestions(false);
                                              }}
                                            >
                                              {d}
                                            </div>
                                          ))}
                                      </div>
                                    )}
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                          )}/>

                          <FormField control={form.control} name="wheelsCount" render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs font-bold text-muted-foreground">Nombre de Roues</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value || ""}>
                                  <FormControl>
                                    <SelectTrigger className="rounded-xl border-border/50 bg-background text-xs">
                                      <SelectValue placeholder="Choisir..." />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent className="rounded-xl bg-popover text-popover-foreground border-border">
                                    {wheelsOptions.map(wheels => (
                                      <SelectItem key={wheels} value={wheels} className="text-xs">{wheels}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                          )}/>
                        </div>

                        <FormField control={form.control} name="currentPrefecture" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-bold text-muted-foreground">Localisation Actuelle (Préfecture)</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger className="rounded-xl border-border/50 bg-background text-xs">
                                    <SelectValue placeholder="Choisissez la préfecture..." />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent className="rounded-xl bg-popover text-popover-foreground border-border max-h-56">
                                  {prefecturesGuinea.map(pref => (
                                    <SelectItem key={pref} value={pref} className="text-xs">{pref}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                        )}/>

                        <FormField control={form.control} name="description" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-bold text-muted-foreground">Description & Particularités</FormLabel>
                              <FormControl>
                                <Textarea placeholder="Précisez ici les particularités de transport de cet engin..." {...field} className="rounded-xl border-border/50 bg-background min-h-[60px]" disabled={isUploading} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                        )}/>

                        <DialogFooter className="pt-4 gap-2">
                             <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="rounded-xl" disabled={isUploading}>Annuler</Button>
                             <Button type="submit" className="rounded-xl bg-primary text-white font-bold" disabled={isUploading}>
                                {isUploading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : null}
                                {isUploading ? "Enregistrement..." : "Ajouter à la Flotte"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}

export default function TransporterFleetPage() {
    const { user, userData, loadingAuth } = useAuth();
    const { toast } = useToast();
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const [vehicles, setVehicles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchVehicles = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const snap = await getDocs(collection(db, 'users', user.uid, 'vehicles'));
            setVehicles(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } catch (error) {
            console.error("Error fetching vehicles:", error);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        if (!loadingAuth) {
            fetchVehicles();
        }
    }, [loadingAuth, fetchVehicles]);

    const handleRemoveVehicle = async (vehicleId: string, imageUrl?: string) => {
        if (!user) return;
        try {
            await deleteDoc(doc(db, "users", user.uid, "vehicles", vehicleId));
            
            if (imageUrl) {
              try {
                const oldFileRef = ref(storage, imageUrl);
                await deleteObject(oldFileRef);
              } catch (storageErr) {
                console.warn("Storage image could not be deleted:", storageErr);
              }
            }

            toast({ title: "Véhicule supprimé" });
            fetchVehicles();
        } catch (error) {
            toast({ variant: "destructive", title: "Erreur", description: "Impossible de supprimer le véhicule." });
        }
    };

    const handleUpdateStatus = async (vehicleId: string, newStatus: 'Disponible' | 'En mission' | 'En maintenance') => {
        if (!user) return;
        setUpdatingId(vehicleId);
        try {
            await updateDoc(doc(db, "users", user.uid, "vehicles", vehicleId), {
                status: newStatus
            });
            toast({ title: "Statut mis à jour", description: `Le véhicule est désormais marqué comme ${newStatus.toLowerCase()}.` });
            fetchVehicles();
        } catch (error) {
            toast({ variant: "destructive", title: "Erreur", description: "Impossible de mettre à jour le statut." });
        } finally {
            setUpdatingId(null);
        }
    };
    
    const getStatusBadge = (status: string) => {
        let className = "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ";
        switch (status) {
            case 'Disponible': 
              className += 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'; 
              return <span className={className}><CheckCircle size={12} /> {status}</span>;
            case 'En mission': 
              className += 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'; 
              return <span className={className}><Navigation size={12} /> {status}</span>;
            case 'En maintenance': 
              className += 'bg-amber-500/10 text-amber-400 border border-amber-500/20'; 
              return <span className={className}><AlertTriangle size={12} /> {status}</span>;
            default: 
              className += 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20'; 
              return <span className={className}>{status}</span>;
        }
    };
    
    if (loadingAuth || !user || !userData) {
        return (
          <div className="flex justify-center items-center h-96">
            <Loader2 className="animate-spin h-10 w-10 text-primary" />
          </div>
        )
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-border/40 pb-5">
                <div>
                  <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Gestion de ma Flotte</h1>
                  <p className="text-sm text-muted-foreground mt-1">Gérez vos camions, mettez à jour leur statut et publiez-les dans la galerie publique.</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={fetchVehicles} className="gap-2 text-muted-foreground">
                    <RefreshCw size={14} /> Actualiser
                  </Button>
                  <AddVehicleDialog userId={user.uid} userData={userData} onSuccess={fetchVehicles} />
                </div>
            </div>
            
            {loading ? (
                <div className="flex justify-center items-center h-48">
                    <Loader2 className="animate-spin text-primary h-8 w-8"/>
                </div>
            ) : vehicles.length > 0 ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {vehicles.map((vehicle) => (
                    <Card key={vehicle.id} className="shadow-xl rounded-3xl border border-border/50 bg-card/60 backdrop-blur-md overflow-hidden flex flex-col justify-between group hover:border-primary/30 transition-all duration-300">
                      <div>
                        <div className="relative h-44 w-full bg-muted flex items-center justify-center overflow-hidden border-b border-border/20">
                          {vehicle.imageUrl ? (
                            <img src={vehicle.imageUrl} alt={vehicle.model} className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500" />
                          ) : (
                            <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                              <ImageIcon className="h-10 w-10 opacity-30" />
                              <span className="text-[10px] uppercase font-bold tracking-wider">Pas de photo</span>
                            </div>
                          )}
                          <div className="absolute top-3 left-3">
                            {getStatusBadge(vehicle.status)}
                          </div>
                          
                          <div className="absolute top-3 right-3">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                  <Button variant="secondary" size="icon" className="h-8 w-8 rounded-xl bg-background hover:bg-muted border border-border shadow-md"><MoreHorizontal size={14}/></Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="rounded-xl border-border bg-popover text-popover-foreground">
                                  <DropdownMenuItem 
                                    className="focus:bg-muted rounded-lg cursor-pointer font-bold text-xs" 
                                    onClick={() => handleUpdateStatus(vehicle.id, 'Disponible')}
                                    disabled={updatingId === vehicle.id}
                                  >
                                      <CheckCircle className="mr-2 h-3.5 w-3.5 text-emerald-400"/> Marquer Disponible
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    className="focus:bg-muted rounded-lg cursor-pointer font-bold text-xs" 
                                    onClick={() => handleUpdateStatus(vehicle.id, 'En mission')}
                                    disabled={updatingId === vehicle.id}
                                  >
                                      <Navigation className="mr-2 h-3.5 w-3.5 text-indigo-400"/> Marquer En mission
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    className="focus:bg-muted rounded-lg cursor-pointer font-bold text-xs" 
                                    onClick={() => handleUpdateStatus(vehicle.id, 'En maintenance')}
                                    disabled={updatingId === vehicle.id}
                                  >
                                      <AlertTriangle className="mr-2 h-3.5 w-3.5 text-amber-400"/> Marquer En maintenance
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    className="text-destructive focus:text-destructive focus:bg-destructive/10 rounded-lg cursor-pointer font-bold text-xs" 
                                    onClick={() => handleRemoveVehicle(vehicle.id, vehicle.imageUrl)}
                                  >
                                      <Trash2 className="mr-2 h-3.5 w-3.5"/> Retirer du parc
                                  </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>

                        <CardHeader className="pb-2">
                          <div className="flex justify-between items-start gap-2">
                            <div>
                              <CardTitle className="text-lg font-bold text-foreground truncate max-w-[200px]" title={vehicle.model}>{vehicle.model}</CardTitle>
                              <CardDescription className="font-mono text-[10px] text-muted-foreground mt-0.5">{vehicle.registration}</CardDescription>
                            </div>
                            <Badge variant="outline" className="rounded-lg text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 border-border/50 text-muted-foreground bg-slate-950/20">{vehicle.type}</Badge>
                          </div>
                        </CardHeader>

                        <CardContent className="space-y-3 pb-2 text-xs">
                          {vehicle.description && (
                            <p className="text-muted-foreground line-clamp-2 leading-relaxed bg-slate-950/10 p-2 rounded-xl border border-border/10 italic text-[11px]">{vehicle.description}</p>
                          )}
                          
                          <div className="grid grid-cols-3 gap-1.5 pt-1 border-t border-border/10">
                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground truncate">
                              <Scale size={12} className="text-indigo-400 shrink-0" />
                              <span className="font-bold text-foreground truncate" title={vehicle.capacity}>{vehicle.capacity}</span>
                            </div>
                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground truncate">
                              <Ruler size={12} className="text-indigo-400 shrink-0" />
                              <span className="font-bold text-foreground truncate" title={vehicle.dimensions}>{vehicle.dimensions}</span>
                            </div>
                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground truncate">
                              <span className="text-indigo-400 shrink-0 font-bold">🛞</span>
                              <span className="font-bold text-foreground truncate" title={vehicle.wheelsCount}>{vehicle.wheelsCount || 'N/A'}</span>
                            </div>
                          </div>
                        </CardContent>
                      </div>

                      <CardFooter className="pt-2 text-[10px] font-bold text-muted-foreground border-t border-border/10 flex items-center justify-between bg-muted/10">
                        <span>LOCALISATION : {(vehicle.currentPrefecture || vehicle.ownerCity).toUpperCase()}</span>
                        <span>AJOUTÉ LE : {vehicle.addedAt ? new Date(vehicle.addedAt.toDate()).toLocaleDateString('fr-FR') : 'N/A'}</span>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
            ) : (
                <Card className="border border-dashed border-border/50 rounded-3xl p-10 bg-card/40 text-center min-h-[300px] flex flex-col justify-center items-center gap-3 backdrop-blur-md">
                    <Car className="h-12 w-12 opacity-30 text-muted-foreground" />
                    <div>
                      <p className="font-bold text-foreground text-lg">Aucun véhicule dans votre parc</p>
                      <p className="text-sm text-muted-foreground max-w-sm mx-auto mt-1">Vous n&apos;avez enregistré aucun engin. Enregistrez votre premier camion pour recevoir des offres de livraison directes.</p>
                    </div>
                    <AddVehicleDialog userId={user.uid} userData={userData} onSuccess={fetchVehicles} />
                </Card>
            )}
        </div>
    )
}
