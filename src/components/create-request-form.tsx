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
  Calculator, Navigation, PlusCircle, CheckCircle2, Loader2, Sparkles,
  AlertTriangle, Mountain, Fuel, Clock, Activity, ChevronDown, ChevronUp, Brain
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

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

// Known toll routes in Guinea
const TOLL_ROUTES: Record<string, { toll: number; name: string }> = {
  "Conakry-Kindia": { toll: 150000, name: "Péage Coyah–Kindia" },
  "Kindia-Conakry": { toll: 150000, name: "Péage Coyah–Kindia" },
  "Conakry-Mamou": { toll: 300000, name: "Péage Coyah + Kindia–Mamou" },
  "Mamou-Conakry": { toll: 300000, name: "Péage Coyah + Kindia–Mamou" },
  "Conakry-Dabola": { toll: 350000, name: "Péage Coyah + Kindia–Dabola" },
  "Dabola-Conakry": { toll: 350000, name: "Péage Coyah + Kindia–Dabola" },
  "Conakry-Kankan": { toll: 450000, name: "Péages Coyah + Mamou + Dabola" },
  "Kankan-Conakry": { toll: 450000, name: "Péages Coyah + Mamou + Dabola" },
  "Conakry-Nzérékoré": { toll: 500000, name: "Péages Coyah + Mamou + Faranah" },
  "Nzérékoré-Conakry": { toll: 500000, name: "Péages Coyah + Mamou + Faranah" },
};

// Difficult terrain routes
const DIFFICULT_ROUTES = ["Beyla", "Lola", "Macenta", "Guéckédou", "Kissidougou", "Kérouané", "Siguiri"];
const RAINY_MONTHS = [6, 7, 8, 9]; // June-September

interface SmartAnalysis {
  distance: number;
  duration: number;
  estimatedPrice: number;
  difficulty: "facile" | "modéré" | "difficile";
  difficultyReasons: string[];
  tolls: { name: string; amount: number }[];
  totalTolls: number;
  risks: string[];
  compatibleVehicles: string[];
  availableTransporters: number;
  fuelEstimate: number;
}

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

  const [smartAnalysis, setSmartAnalysis] = useState<SmartAnalysis | null>(null);
  const [showFullAnalysis, setShowFullAnalysis] = useState(false);
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
      setSmartAnalysis(null);
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

        // --- Smart Analysis Computation ---
        const fromCity = fromLoc.split(" (")[0].split(",")[0].trim();
        const toCity = toLoc.split(" (")[0].split(",")[0].trim();

        // Difficulty
        const difficultyReasons: string[] = [];
        let difficultyScore = 0;
        if (details.distance > 500) { difficultyScore += 2; difficultyReasons.push("Distance supérieure à 500 km"); }
        else if (details.distance > 250) { difficultyScore += 1; difficultyReasons.push("Distance modérée (250-500 km)"); }
        if (DIFFICULT_ROUTES.some(r => toCity.includes(r) || fromCity.includes(r))) {
          difficultyScore += 2; difficultyReasons.push("Zone à terrain difficile (pistes latéritiques)");
        }
        const currentMonth = new Date().getMonth() + 1;
        if (RAINY_MONTHS.includes(currentMonth)) {
          difficultyScore += 1; difficultyReasons.push("Saison des pluies en cours");
        }
        if (selectedCategory === "simandou" || selectedCategory === "citerne") {
          difficultyScore += 1; difficultyReasons.push("Transport spécialisé nécessitant des précautions supplémentaires");
        }
        const difficulty: SmartAnalysis["difficulty"] = difficultyScore >= 4 ? "difficile" : difficultyScore >= 2 ? "modéré" : "facile";

        // Tolls
        const tollKey = `${fromCity}-${toCity}`;
        const tolls: { name: string; amount: number }[] = [];
        if (TOLL_ROUTES[tollKey]) {
          tolls.push({ name: TOLL_ROUTES[tollKey].name, amount: TOLL_ROUTES[tollKey].toll });
        }
        const totalTolls = tolls.reduce((sum, t) => sum + t.amount, 0);

        // Risks
        const risks: string[] = [];
        if (RAINY_MONTHS.includes(currentMonth)) risks.push("Risque d'inondation et de routes impraticables (saison des pluies)");
        if (DIFFICULT_ROUTES.some(r => toCity.includes(r) || fromCity.includes(r))) risks.push("Routes non bitumées possibles sur certains tronçons");
        if (details.distance > 600) risks.push("Trajet long nécessitant un relais chauffeur ou une pause obligatoire");
        if (selectedCategory === "frigorifique") risks.push("Maintien de la chaîne du froid impératif");
        if (selectedCategory === "citerne") risks.push("Transport de matières dangereuses — réglementation spéciale");
        if (risks.length === 0) risks.push("Aucun risque majeur identifié pour ce trajet");

        // Compatible Vehicles
        const wt = weightVal || 1;
        const compatibleVehicles = VEHICLE_TYPES.filter(v => {
          if (wt <= 3.5) return true; // all vehicles fit small loads
          if (wt <= 10) return !v.includes("Pick-up");
          if (wt <= 20) return v.includes("20 Tonnes") || v.includes("30-40") || v.includes("Benne") || v.includes("Citerne") || v.includes("Engin");
          return v.includes("30-40") || v.includes("Benne") || v.includes("Engin");
        });

        // Available transporters count (real Firestore query)
        let availableTransporters = 0;
        try {
          const transportersQuery = query(
            collection(db, "users"),
            where("role", "in", ["transporter", "transporter-company"]),
            where("isVerified", "==", true)
          );
          const snap = await getDocs(transportersQuery);
          availableTransporters = snap.size;
        } catch {
          availableTransporters = 12; // fallback
        }

        // Fuel estimate (average 35L/100km for heavy trucks, diesel ~12000 GNF/L)
        const fuelEstimate = Math.round((details.distance / 100) * 35 * 12000);

        setSmartAnalysis({
          distance: details.distance,
          duration: details.duration,
          estimatedPrice: price,
          difficulty,
          difficultyReasons,
          tolls,
          totalTolls,
          risks,
          compatibleVehicles,
          availableTransporters,
          fuelEstimate,
        });
      } else {
        setRouteInfo(null);
        setSmartAnalysis(null);
      }
    } catch (e) {
      console.error("Route estimate calculation error:", e);
      setRouteInfo(null);
      setSmartAnalysis(null);
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

              {/* CARGO WEIGHT VS VEHICLE CAPACITY VALIDATION BANNER (Item 10) */}
              {(() => {
                const weightVal = typeof watchWeight === 'number' ? watchWeight : parseFloat(String(watchWeight || '0')) || 0;
                if (weightVal <= 0 || !selectedVehicle) return null;

                const getCapacity = (v: string) => {
                  if (v.includes("60") || v.includes("Engin Lourd")) return 60;
                  if (v.includes("35") || v.includes("30") || v.includes("Semi-Remorque") || v.includes("Citerne")) return 35;
                  if (v.includes("20") || v.includes("3 Essieux")) return 20;
                  if (v.includes("15") || v.includes("Frigorifique")) return 15;
                  if (v.includes("10") || v.includes("Bâché")) return 10;
                  if (v.includes("Pickup") || v.includes("Camionnette")) return 3.5;
                  return 20;
                };

                const currentCap = getCapacity(selectedVehicle);

                if (weightVal > currentCap) {
                  let recommended = "Camion Semi-Remorque Plateau (30-35 Tonnes)";
                  if (weightVal > 35) recommended = "Engin Lourd / Porte-Engin Lowbed (40-60 Tonnes)";
                  else if (weightVal <= 20) recommended = "Camion Benne 3 Essieux (15-20 Tonnes)";

                  return (
                    <div className="mt-3 p-3.5 rounded-2xl bg-amber-500/10 border-2 border-amber-500/30 text-amber-900 dark:text-amber-300 animate-in fade-in-50 space-y-1">
                      <div className="flex items-center gap-2 text-xs font-black">
                        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                        <span>⚠️ Alerte Capacité & Sécurité Logistique</span>
                      </div>
                      <p className="text-[11px] leading-relaxed">
                        Votre cargaison pèse <strong>{weightVal} tonnes</strong>, ce qui dépasse la charge maximale tolérée par l'engin <em>"{selectedVehicle}"</em> ({currentCap} tonnes).
                      </p>
                      <button
                        type="button"
                        onClick={() => setSelectedVehicle(recommended)}
                        className="text-[10px] font-bold text-amber-700 dark:text-amber-200 underline hover:text-amber-900 dark:hover:text-white pt-1 block"
                      >
                        👉 Basculer automatiquement vers l'engin adapté : {recommended}
                      </button>
                    </div>
                  );
                }
                return null;
              })()}
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

            {/* SMART ANALYSIS PANEL — TransConnekt Intelligence */}
            {smartAnalysis && routeInfo && (
              <div className="rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/60 text-white border border-indigo-500/20 shadow-2xl animate-in fade-in-50 overflow-hidden">
                {/* Header */}
                <div className="p-4 pb-3 flex items-center justify-between border-b border-white/5">
                  <div className="flex items-center gap-3">
                    <span className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                      <Brain size={20} />
                    </span>
                    <div>
                      <p className="text-sm font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-200 via-sky-300 to-emerald-400">
                        Analyse TransConnekt
                      </p>
                      <p className="text-[10px] text-slate-400">Calculs automatiques basés sur votre trajet</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowFullAnalysis(!showFullAnalysis)}
                    className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-indigo-500/10 transition-all"
                  >
                    {showFullAnalysis ? <><ChevronUp size={14} /> Réduire</> : <><ChevronDown size={14} /> Détails</>}
                  </button>
                </div>

                {/* Primary Metrics Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-white/5">
                  <div className="p-3.5 bg-slate-950/50">
                    <p className="text-[9px] uppercase font-extrabold text-emerald-500/70 tracking-wider">Prix Estimé</p>
                    <p className="text-lg font-black text-emerald-400 tracking-tight mt-0.5">
                      {smartAnalysis.estimatedPrice.toLocaleString("fr-FR")} <span className="text-xs font-bold text-emerald-500/60">GNF</span>
                    </p>
                  </div>
                  <div className="p-3.5 bg-slate-950/50">
                    <p className="text-[9px] uppercase font-extrabold text-sky-500/70 tracking-wider">Distance</p>
                    <p className="text-lg font-black text-sky-400 mt-0.5">
                      {smartAnalysis.distance} <span className="text-xs font-bold text-sky-500/60">km</span>
                    </p>
                  </div>
                  <div className="p-3.5 bg-slate-950/50">
                    <p className="text-[9px] uppercase font-extrabold text-amber-500/70 tracking-wider">Durée Estimée</p>
                    <p className="text-lg font-black text-amber-400 mt-0.5">
                      {Math.round(smartAnalysis.duration / 3600)}h{Math.round((smartAnalysis.duration % 3600) / 60) > 0 ? `${Math.round((smartAnalysis.duration % 3600) / 60).toString().padStart(2, "0")}` : ""}
                    </p>
                  </div>
                  <div className="p-3.5 bg-slate-950/50">
                    <p className="text-[9px] uppercase font-extrabold text-indigo-500/70 tracking-wider">Difficulté</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Badge className={cn(
                        "text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border",
                        smartAnalysis.difficulty === "facile" && "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
                        smartAnalysis.difficulty === "modéré" && "bg-amber-500/10 text-amber-400 border-amber-500/20",
                        smartAnalysis.difficulty === "difficile" && "bg-rose-500/10 text-rose-400 border-rose-500/20"
                      )}>
                        {smartAnalysis.difficulty === "facile" ? "🟢" : smartAnalysis.difficulty === "modéré" ? "🟠" : "🔴"} {smartAnalysis.difficulty}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Extended Analysis (collapsible) */}
                {showFullAnalysis && (
                  <div className="p-4 space-y-4 border-t border-white/5 animate-in slide-in-from-top-2">
                    {/* Tolls */}
                    <div>
                      <p className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider flex items-center gap-1.5 mb-2">
                        <Fuel size={12} className="text-amber-400" /> Péages & Carburant
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/60">
                          <p className="text-[9px] uppercase text-slate-500 font-bold">Péages</p>
                          {smartAnalysis.tolls.length > 0 ? (
                            smartAnalysis.tolls.map((toll, i) => (
                              <p key={i} className="text-xs text-slate-200 font-medium mt-1">
                                🛣️ {toll.name} — <span className="text-amber-400 font-bold">{toll.amount.toLocaleString("fr-FR")} GNF</span>
                              </p>
                            ))
                          ) : (
                            <p className="text-xs text-emerald-400 font-medium mt-1">✅ Aucun péage sur cet axe</p>
                          )}
                        </div>
                        <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/60">
                          <p className="text-[9px] uppercase text-slate-500 font-bold">Carburant Estimé</p>
                          <p className="text-sm font-bold text-amber-400 mt-1">
                            ⛽ {smartAnalysis.fuelEstimate.toLocaleString("fr-FR")} GNF
                          </p>
                          <p className="text-[9px] text-slate-500 mt-0.5">~35L/100km × {smartAnalysis.distance} km</p>
                        </div>
                      </div>
                    </div>

                    {/* Risks */}
                    <div>
                      <p className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider flex items-center gap-1.5 mb-2">
                        <AlertTriangle size={12} className="text-rose-400" /> Risques Identifiés
                      </p>
                      <div className="space-y-1.5">
                        {smartAnalysis.risks.map((risk, i) => (
                          <div key={i} className="flex items-start gap-2 text-xs text-slate-300">
                            <span className={cn(
                              "mt-0.5 shrink-0 text-[10px]",
                              risk.includes("Aucun") ? "text-emerald-400" : "text-rose-400"
                            )}>
                              {risk.includes("Aucun") ? "✅" : "⚠️"}
                            </span>
                            <span>{risk}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Difficulty Reasons */}
                    {smartAnalysis.difficultyReasons.length > 0 && (
                      <div>
                        <p className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider flex items-center gap-1.5 mb-2">
                          <Mountain size={12} className="text-indigo-400" /> Facteurs de Difficulté
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {smartAnalysis.difficultyReasons.map((r, i) => (
                            <Badge key={i} className="text-[9px] bg-slate-800/60 text-slate-300 border border-slate-700/60 rounded-lg px-2 py-1">
                              {r}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Compatible Vehicles & Available Transporters */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider flex items-center gap-1.5 mb-2">
                          <Truck size={12} className="text-sky-400" /> Véhicules Compatibles ({smartAnalysis.compatibleVehicles.length})
                        </p>
                        <div className="space-y-1">
                          {smartAnalysis.compatibleVehicles.slice(0, 4).map((v, i) => (
                            <p key={i} className="text-[10px] text-slate-300 flex items-center gap-1.5">
                              <span className="h-1.5 w-1.5 rounded-full bg-sky-400 shrink-0" />
                              {v.split(" (")[0]}
                            </p>
                          ))}
                          {smartAnalysis.compatibleVehicles.length > 4 && (
                            <p className="text-[9px] text-slate-500 italic">+{smartAnalysis.compatibleVehicles.length - 4} autres...</p>
                          )}
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider flex items-center gap-1.5 mb-2">
                          <Users size={12} className="text-emerald-400" /> Transporteurs Disponibles
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-2xl font-black text-emerald-400">{smartAnalysis.availableTransporters}</span>
                          <span className="text-[10px] text-slate-400 leading-tight">transporteurs<br/>vérifiés sur le réseau</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
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
