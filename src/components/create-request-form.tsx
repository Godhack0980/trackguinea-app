"use client";

import React, { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { collection, addDoc, Timestamp, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/auth-context";
import { getRouteDetails } from "@/services/location-service";
import { createNotification } from "@/lib/notifications";
import { useTranslation } from "@/lib/translations";
import { WestAfricaLocationPicker } from "@/components/west-africa-location-picker";
import {
  Truck, Package, Home, Pickaxe, Snowflake, Droplets,
  Calendar as CalendarIcon, MapPin, ShieldCheck, Zap, Users,
  Calculator, Navigation, PlusCircle, CheckCircle2, Loader2, Sparkles
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const VEHICLE_TYPES = [
  "Camion Porteur 10 Tonnes (Plateau / Ridelles)",
  "Camion Porteur 20 Tonnes (Plateau / Bâché)",
  "Semi-Remorque 30-40 Tonnes (Conteneur / Plateau)",
  "Benne Basculante (Sable, Granit, Minerais)",
  "Camion Frigorifique (Température Contrôlée)",
  "Camion Citerne (Hydrocarbures & Eau)",
  "Pick-up / Camionnette Express (1.5T - 3.5T)",
  "Engin Lourd / Porte-Engin (Lowshed Minier)",
];

const createRequestSchema = z.object({
  nature: z.string().min(2, "La nature du colis est requise."),
  from: z.string().min(2, "La ville de départ est requise."),
  to: z.string().min(2, "La ville de destination est requise."),
  weight: z.coerce.number().positive("Le poids doit être supérieur à 0."),
  weightUnit: z.string().default("tonne"),
  date: z.date({ required_error: "Veuillez choisir une date d'enlèvement." }),
});

type FormValues = z.infer<typeof createRequestSchema>;

export function CreateTransportRequestForm() {
  const { user, userData } = useAuth();
  const { toast } = useToast();
  const { t, lang } = useTranslation();

  const [selectedCategory, setSelectedCategory] = useState("marchandises");
  const [selectedVehicle, setSelectedVehicle] = useState(VEHICLE_TYPES[0]);
  const [insurance, setInsurance] = useState(false);
  const [express, setExpress] = useState(false);
  const [handling, setHandling] = useState(false);

  const [routeInfo, setRouteInfo] = useState<{
    distance: number;
    duration: number;
    estimatedPrice: number;
  } | null>(null);

  const [isCalculating, setIsCalculating] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(createRequestSchema),
    defaultValues: {
      nature: "",
      from: "Conakry (Guinée)",
      to: "",
      weight: undefined,
      weightUnit: "tonne",
      date: undefined,
    },
  });

  const watchFrom = form.watch("from");
  const watchTo = form.watch("to");
  const watchWeight = form.watch("weight");

  const serviceCategories = useMemo(() => [
    {
      id: "marchandises",
      title: t.req_service_merchandise || "Marchandises & Vrac",
      desc: t.req_service_merchandise_desc || "Ciment, fer, conteneurs, marchandises générales...",
      icon: Truck,
      color: "from-blue-500/20 to-indigo-500/20 border-blue-500/40 text-blue-500",
    },
    {
      id: "colis",
      title: t.req_service_express || "Colis & Paquets Express",
      desc: t.req_service_express_desc || "Documents, cartons, paquets fragiles...",
      icon: Package,
      color: "from-emerald-500/20 to-teal-500/20 border-emerald-500/40 text-emerald-500",
    },
    {
      id: "demenagement",
      title: t.req_service_moving || "Déménagement & Mobilier",
      desc: t.req_service_moving_desc || "Bureaux, appartements, mobilier...",
      icon: Home,
      color: "from-purple-500/20 to-violet-500/20 border-purple-500/40 text-purple-500",
    },
    {
      id: "simandou",
      title: t.req_service_mining || "Simandou & Logistique Minière",
      desc: t.req_service_mining_desc || "Transport lourd, engins, bauxite, granit...",
      icon: Pickaxe,
      color: "from-amber-500/20 to-yellow-500/20 border-amber-500/40 text-amber-500",
    },
    {
      id: "frigorifique",
      title: t.req_service_refrigerated || "Transport Frigorifique",
      desc: t.req_service_refrigerated_desc || "Produits frais, poissons, fruits, agroalimentaire...",
      icon: Snowflake,
      color: "from-cyan-500/20 to-blue-500/20 border-cyan-500/40 text-cyan-500",
    },
    {
      id: "citerne",
      title: t.req_service_tanker || "Citerne & Liquides",
      desc: t.req_service_tanker_desc || "Hydrocarbures, carburant, huiles, eau...",
      icon: Droplets,
      color: "from-rose-500/20 to-orange-500/20 border-rose-500/40 text-rose-500",
    },
  ], [t]);

  const calculateEstimates = async (fromLoc: string, toLoc: string, weightVal?: number) => {
    if (!fromLoc || !toLoc) {
      setRouteInfo(null);
      return;
    }
    setIsCalculating(true);
    try {
      const details = await getRouteDetails(fromLoc, toLoc);
      if (details && details.distance > 0) {
        const baseRate = 12000;
        const weightMultiplier = (weightVal || 1) * 50000;
        const price = Math.round((details.distance * baseRate) + weightMultiplier);
        setRouteInfo({
          distance: details.distance,
          duration: details.duration,
          estimatedPrice: price,
        });
      } else {
        setRouteInfo(null);
      }
    } catch (e) {
      console.error("Route estimate calculation error:", e);
      setRouteInfo(null);
    } finally {
      setIsCalculating(false);
    }
  };

  async function onSubmit(values: FormValues) {
    if (!user || !userData) {
      toast({ variant: "destructive", title: "Non authentifié", description: "Veuillez vous connecter." });
      return;
    }

    try {
      const routeDetails = await getRouteDetails(values.from, values.to);
      const randomNum = Math.floor(10000 + Math.random() * 90000);
      const uniqueCourseId = `TC-${selectedCategory.toUpperCase().substring(0, 3)}-${randomNum}`;

      const calculatedDistance = routeDetails?.distance || routeInfo?.distance || 0;
      const calculatedDuration = routeDetails?.duration || routeInfo?.duration || 0;
      const estimatedPrice = routeInfo?.estimatedPrice || Math.round((calculatedDistance * 12000) + ((values.weight || 1) * 50000));

      const svaServices: string[] = [];
      if (insurance) svaServices.push("Assurance Cargo (+2%)");
      if (express) svaServices.push("Livraison Express Urgente");
      if (handling) svaServices.push("Manutention & Chargement inclus");

      await addDoc(collection(db, `requests`), {
        ...values,
        uniqueId: uniqueCourseId,
        category: selectedCategory,
        vehicleType: selectedVehicle,
        svaServices,
        insuranceSelected: insurance,
        expressSelected: express,
        handlingSelected: handling,
        date: Timestamp.fromDate(values.date),
        status: "En attente",
        createdAt: Timestamp.now(),
        clientId: user.uid,
        clientName: userData.companyName || `${userData.firstName} ${userData.lastName}`,
        distance: calculatedDistance,
        duration: calculatedDuration,
        price: estimatedPrice,
      });

      toast({
        title: "Demande publiée avec succès ! 🎉",
        description: `Votre offre #${uniqueCourseId} est désormais visible sur le réseau TransConnekt.`,
      });

      form.reset({
        nature: "",
        from: "Conakry (Guinée)",
        to: "",
        weight: undefined,
        weightUnit: "tonne",
        date: undefined,
      });
      setRouteInfo(null);

      // Notify transporters
      const transportersQuery = query(collection(db, "users"), where("role", "in", ["transporter", "transporter-company"]));
      const querySnapshot = await getDocs(transportersQuery);

      querySnapshot.forEach((docSnap) => {
        createNotification({
          userId: docSnap.id,
          message: `Nouvelle offre [${selectedCategory.toUpperCase()}] de ${values.from} à ${values.to} pour "${values.nature}".`,
          href: "/dashboard/transporter/offers",
        });
      });
    } catch (error) {
      console.error("Erreur lors de la création de la demande :", error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de créer la demande.",
      });
    }
  }

  return (
    <Card className="shadow-2xl rounded-3xl border-border/60 bg-card/80 backdrop-blur-xl overflow-hidden transition-all">
      {/* Header Banner */}
      <CardHeader className="bg-gradient-to-r from-primary/10 via-indigo-500/10 to-accent/10 border-b border-border/40 pb-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="text-xl font-extrabold text-foreground flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-white shadow-md shadow-primary/30">
              <PlusCircle size={20} />
            </span>
            <span>{t.req_title || "Publier une Demande de Transport"}</span>
          </CardTitle>
          <span className="text-xs font-bold text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/20 flex items-center gap-1">
            <Sparkles size={12} /> {t.req_rebalancing_badge || "Rééquilibrage Réseau Afrique de l'Ouest"}
          </span>
        </div>
        <CardDescription className="text-xs text-muted-foreground mt-1">
          {t.req_subtitle || "Sélectionnez le type de service, vos localisations en Afrique de l'Ouest, et obtenez instantanément des devis."}
        </CardDescription>
      </CardHeader>

      <CardContent className="p-6 space-y-8">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">

            {/* STEP 1: SERVICE CATEGORY SELECTION */}
            <div className="space-y-3">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Truck size={14} className="text-primary" /> {t.req_step_1 || "1. TYPE DE SERVICE LOGISTIQUE"}
              </Label>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                {serviceCategories.map((cat) => {
                  const IconComp = cat.icon;
                  const isSelected = selectedCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategory(cat.id)}
                      className={cn(
                        "p-3 rounded-2xl border flex flex-col items-center text-center gap-2 transition-all duration-300 relative overflow-hidden group",
                        isSelected
                          ? `bg-gradient-to-b ${cat.color} shadow-lg ring-2 ring-primary scale-[1.02]`
                          : "border-border/50 bg-background/50 hover:bg-muted/40 text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <span className={cn(
                        "p-2.5 rounded-xl transition-all",
                        isSelected ? "bg-primary text-white" : "bg-muted text-muted-foreground group-hover:text-primary"
                      )}>
                        <IconComp size={20} />
                      </span>
                      <div>
                        <p className="font-extrabold text-xs text-foreground leading-tight">{cat.title}</p>
                        <p className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5">{cat.desc}</p>
                      </div>
                      {isSelected && (
                        <CheckCircle2 className="absolute top-1.5 right-1.5 h-4 w-4 text-primary fill-primary/20" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* STEP 2: CARGO NATURE & WEIGHT */}
            <div className="space-y-4 border-t border-border/40 pt-6">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Package size={14} className="text-primary" /> {t.req_step_2 || "2. DÉTAILS DE LA MARCHANDISE / COLIS"}
              </Label>

              <div className="grid md:grid-cols-12 gap-4">
                <div className="md:col-span-7 space-y-2">
                  <FormField
                    control={form.control}
                    name="nature"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-bold text-foreground">{t.req_nature_label || "Nature & Description du Colis"}</FormLabel>
                        <FormControl>
                          <Input
                            placeholder={t.req_nature_placeholder || "Ex: 200 sacs de ciment, Conteneur 20FT, Matériel de chantier, Mobilier..."}
                            {...field}
                            value={field.value ?? ""}
                            className="h-11 rounded-xl bg-background border-input text-xs font-medium"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {["Ciment", "Fer & Acier", "Bauxite / Minerais", "Conteneur 40FT", "Déménagement", "Produits Vivriers", "Carburant"].map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => form.setValue("nature", tag)}
                        className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-muted/40 hover:bg-primary/10 hover:text-primary border border-border/40 text-muted-foreground transition-all"
                      >
                        + {tag}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="md:col-span-5 grid grid-cols-12 gap-2">
                  <div className="col-span-8">
                    <FormField
                      control={form.control}
                      name="weight"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-bold text-foreground">{t.req_weight_label || "Poids / Charge"}</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="any"
                              placeholder={t.req_weight_placeholder || "Ex: 15"}
                              {...field}
                              onChange={(e) => {
                                field.onChange(e);
                                calculateEstimates(watchFrom, watchTo, parseFloat(e.target.value));
                              }}
                              value={field.value ?? ""}
                              className="h-11 rounded-xl bg-background border-input text-xs font-bold"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="col-span-4">
                    <FormField
                      control={form.control}
                      name="weightUnit"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-bold text-foreground">{t.req_unit_label || "Unité"}</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value || "tonne"}>
                            <FormControl>
                              <SelectTrigger className="h-11 rounded-xl bg-background border-input text-xs font-bold">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="rounded-xl">
                              <SelectItem value="kg" className="rounded-lg text-xs">kg</SelectItem>
                              <SelectItem value="tonne" className="rounded-lg text-xs">tonne</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* STEP 3: WEST AFRICA LOCATION PICKER */}
            <div className="space-y-4 border-t border-border/40 pt-6">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <MapPin size={14} className="text-primary" /> {t.req_step_3 || "3. TRAJET & LOCALISATION (GUINÉE & SOUS-RÉGION)"}
              </Label>

              <div className="grid md:grid-cols-2 gap-6 p-4 rounded-2xl bg-muted/20 border border-border/40">
                <WestAfricaLocationPicker
                  label={t.req_departure_label || "Zone / Ville de Départ"}
                  placeholder={t.req_departure_placeholder || "Sélectionnez la préfecture/ville de départ..."}
                  value={watchFrom}
                  onChange={(val) => {
                    form.setValue("from", val);
                    calculateEstimates(val, watchTo, watchWeight);
                  }}
                />

                <WestAfricaLocationPicker
                  label={t.req_destination_label || "Zone / Ville de Destination"}
                  placeholder={t.req_destination_placeholder || "Sélectionnez la préfecture/ville d'arrivée..."}
                  value={watchTo}
                  onChange={(val) => {
                    form.setValue("to", val);
                    calculateEstimates(watchFrom, val, watchWeight);
                  }}
                />
              </div>
            </div>

            {/* STEP 4: VEHICLE TYPE & COLLECTION DATE */}
            <div className="space-y-4 border-t border-border/40 pt-6">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <CalendarIcon size={14} className="text-primary" /> {t.req_step_4 || "4. ENGIN SOUHAITÉ & DATE D'ENLÈVEMENT"}
              </Label>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <FormLabel className="text-xs font-bold text-foreground">{t.req_vehicle_label || "Type de Véhicule souhaité"}</FormLabel>
                  <Select defaultValue={selectedVehicle} onValueChange={setSelectedVehicle}>
                    <SelectTrigger className="h-11 rounded-xl bg-background border-input text-xs font-semibold">
                      <SelectValue placeholder="Sélectionnez un engin..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl max-h-60">
                      {VEHICLE_TYPES.map((v) => (
                        <SelectItem key={v} value={v} className="text-xs font-medium rounded-xl">
                          {v}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel className="text-xs font-bold text-foreground mb-1.5">{t.req_date_label || "Date d'enlèvement"}</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "h-11 rounded-xl pl-3 text-left font-semibold text-xs border-input bg-background",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP", { locale: lang === "fr" ? fr : enUS })
                              ) : (
                                <span>{t.req_date_placeholder || "Sélectionner une date sur le calendrier..."}</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 text-primary" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 rounded-2xl" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                            className="rounded-2xl"
                            locale={fr}
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* STEP 5: VALUE-ADDED OPTIONS (SVA) */}
            <div className="space-y-3 border-t border-border/40 pt-6">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <ShieldCheck size={14} className="text-primary" /> {t.req_step_5 || "5. OPTIONS DE GARANTIE & SERVICES À VALEUR AJOUTÉE (SVA)"}
              </Label>

              <div className="grid sm:grid-cols-3 gap-3">
                <label
                  htmlFor="sva-insurance"
                  className={cn(
                    "p-3.5 rounded-2xl border cursor-pointer flex items-start gap-3 transition-all select-none",
                    insurance ? "bg-indigo-500/10 border-indigo-500/50" : "bg-muted/20 border-border/40 hover:bg-muted/40"
                  )}
                >
                  <Checkbox
                    id="sva-insurance"
                    checked={insurance}
                    onCheckedChange={(c) => setInsurance(!!c)}
                    className="mt-0.5"
                  />
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-foreground flex items-center gap-1">
                      <ShieldCheck className="h-3.5 w-3.5 text-indigo-500" /> {t.req_sva_insurance || "Assurance Cargo (+2%)"}
                    </span>
                    <p className="text-[10px] text-muted-foreground leading-tight">{t.req_sva_insurance_desc || "Couvre jusqu'à 250M GNF en cas de dommages ou vol."}</p>
                  </div>
                </label>

                <label
                  htmlFor="sva-express"
                  className={cn(
                    "p-3.5 rounded-2xl border cursor-pointer flex items-start gap-3 transition-all select-none",
                    express ? "bg-amber-500/10 border-amber-500/50" : "bg-muted/20 border-border/40 hover:bg-muted/40"
                  )}
                >
                  <Checkbox
                    id="sva-express"
                    checked={express}
                    onCheckedChange={(c) => setExpress(!!c)}
                    className="mt-0.5"
                  />
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-foreground flex items-center gap-1">
                      <Zap className="h-3.5 w-3.5 text-amber-500" /> {t.req_sva_express || "Livraison Express / Urgente"}
                    </span>
                    <p className="text-[10px] text-muted-foreground leading-tight">{t.req_sva_express_desc || "Attribution prioritaire sur le réseau (+25%)."}</p>
                  </div>
                </label>

                <label
                  htmlFor="sva-handling"
                  className={cn(
                    "p-3.5 rounded-2xl border cursor-pointer flex items-start gap-3 transition-all select-none",
                    handling ? "bg-emerald-500/10 border-emerald-500/50" : "bg-muted/20 border-border/40 hover:bg-muted/40"
                  )}
                >
                  <Checkbox
                    id="sva-handling"
                    checked={handling}
                    onCheckedChange={(c) => setHandling(!!c)}
                    className="mt-0.5"
                  />
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-foreground flex items-center gap-1">
                      <Users className="h-3.5 w-3.5 text-emerald-500" /> {t.req_sva_handling || "Manutention & Chargement"}
                    </span>
                    <p className="text-[10px] text-muted-foreground leading-tight">{t.req_sva_handling_desc || "Équipe mise à disposition au départ et à l'arrivée."}</p>
                  </div>
                </label>
              </div>
            </div>

            {/* DYNAMIC ESTIMATION SUMMARY BAR */}
            {routeInfo && (
              <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 to-indigo-950 text-white border border-indigo-500/30 flex items-center justify-between flex-wrap gap-4 shadow-lg animate-in fade-in-50">
                <div className="flex items-center gap-3">
                  <span className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                    <Calculator size={20} />
                  </span>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-indigo-300">{t.req_estimate_bar_title || "Estimatif Instantané du Trajet"}</p>
                    <div className="flex items-center gap-3 text-xs text-slate-300 mt-0.5">
                      <span className="flex items-center gap-1"><Navigation size={12} className="text-emerald-400" /> {routeInfo.distance} km</span>
                      <span>•</span>
                      <span>{Math.round(routeInfo.duration / 3600)}h</span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-[10px] text-slate-400 uppercase font-bold">{t.req_estimate_price || "Prix Tarif Estimé"}</p>
                  <p className="text-xl font-black text-emerald-400 tracking-tight">
                    {routeInfo.estimatedPrice.toLocaleString("fr-FR")} GNF
                  </p>
                </div>
              </div>
            )}

            {/* SUBMIT BUTTON */}
            <div className="pt-2">
              <Button
                type="submit"
                disabled={form.formState.isSubmitting}
                className="w-full h-12 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black text-sm shadow-xl shadow-primary/25 transition-all duration-300 hover:scale-[1.01]"
              >
                {form.formState.isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    {t.req_publishing || "Publication en cours..."}
                  </>
                ) : (
                  <>
                    <PlusCircle className="mr-2 h-5 w-5" />
                    {t.req_publish_btn || "Publier ma Demande de Transport"}
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
