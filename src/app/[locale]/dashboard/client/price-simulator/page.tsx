"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { simulatePrice } from "@/ai/flows/simulate-price-flow"
import type { SimulatePriceOutput } from "@/ai/types"
import { SimulatePriceInputSchema } from "@/ai/types"
import { cityNames } from "@/lib/guinea-cities"

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Calculator, Loader2, Bot, TrendingUp, Package, Snowflake, Droplets, ShieldAlert, Sun, CloudRain, Clock, AlertTriangle, ArrowRight, Navigation } from "lucide-react"
import { formatDurationFromSeconds } from "@/lib/utils"
import { WestAfricaLocationPicker } from "@/components/west-africa-location-picker"
import { useTranslation } from "@/lib/translations"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"

const cargoTypes = {
    'normale': { label: "Normale", icon: <Package size={14}/> },
    'fragile': { label: "Fragile", icon: <Package size={14}/> },
    'frigorifique': { label: "Frigorifique", icon: <Snowflake size={14}/> },
    'liquide': { label: "Liquide", icon: <Droplets size={14}/> },
    'dangereuse': { label: "Dangereuse", icon: <ShieldAlert size={14}/> }
}

const seasons = {
    'seche': { label: "Saison Sèche", icon: <Sun size={14}/> },
    'pluvieuse': { label: "Saison Pluvieuse", icon: <CloudRain size={14}/> }
}

export default function PriceSimulatorPage() {
  const { toast } = useToast();
  const { t, lang } = useTranslation();
  const [simulationResult, setSimulationResult] = useState<SimulatePriceOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof SimulatePriceInputSchema>>({
    resolver: zodResolver(SimulatePriceInputSchema),
    defaultValues: {
      from: "Conakry (Guinée)",
      to: "",
      weight: '' as any,
      weightUnit: 'tonne',
      cargoType: 'normale',
      season: 'seche'
    },
  });

  async function onSubmit(values: z.infer<typeof SimulatePriceInputSchema>) {
    setIsLoading(true);
    setSimulationResult(null);
    try {
      const result = await simulatePrice(values);
      setSimulationResult(result);
      toast({
        title: t.sim_success_toast || "Simulation terminée !",
        description: t.sim_success_toast_desc || "Estimation calculée avec succès.",
      });
    } catch (error) {
      console.error("Erreur lors de la simulation:", error);
      toast({
        variant: "destructive",
        title: t.sim_error_toast || "Erreur de simulation",
        description: t.sim_error_toast_desc || "Impossible d'obtenir une estimation pour le moment. Veuillez réessayer.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold text-primary">{t.sim_title}</h1>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <Card className="shadow-lg rounded-3xl border-border/50 bg-card/60 backdrop-blur-md overflow-hidden">
            <CardHeader className="border-b border-border/40 pb-4">
              <CardTitle className="text-xl font-bold text-foreground flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary"><Calculator size={18} /></span>
                {t.sim_details_title}
              </CardTitle>
              <CardDescription>{t.sim_details_desc}</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                  <FormField
                    control={form.control}
                    name="from"
                    render={({ field }) => (
                      <FormItem>
                        <WestAfricaLocationPicker
                          label={t.sim_departure || "Ville / Zone de départ"}
                          placeholder="Sélectionnez le départ..."
                          value={field.value}
                          onChange={field.onChange}
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="to"
                    render={({ field }) => (
                      <FormItem>
                        <WestAfricaLocationPicker
                          label={t.sim_destination || "Ville / Zone de destination"}
                          placeholder="Sélectionnez l'arrivée..."
                          value={field.value}
                          onChange={field.onChange}
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <FormField
                        control={form.control}
                        name="weight"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-semibold text-foreground">{t.sim_weight}</FormLabel>
                            <FormControl>
                              <Input type="number" placeholder={t.sim_weight_placeholder || "Ex: 10"} {...field} value={field.value || ''} className="h-11 rounded-xl" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="weightUnit"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-semibold text-foreground">{t.sim_unit}</FormLabel>
                           <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-11 rounded-xl"><SelectValue/></SelectTrigger>
                            </FormControl>
                            <SelectContent className="rounded-xl">
                              <SelectItem value="kg" className="rounded-lg">Kg</SelectItem>
                              <SelectItem value="tonne" className="rounded-lg">{lang === 'en' ? 'Tons' : 'Tonnes'}</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                  </div>
                   <FormField
                    control={form.control}
                    name="cargoType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-semibold text-foreground">{t.sim_cargo_type}</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder={t.sim_cargo_placeholder} /></SelectTrigger>
                          </FormControl>
                          <SelectContent className="rounded-xl">
                            {Object.entries(cargoTypes).map(([key, {label}]) => <SelectItem key={key} value={key} className="rounded-lg">{t[key] || label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="season"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-semibold text-foreground">{t.sim_season}</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder={t.sim_season_placeholder} /></SelectTrigger>
                          </FormControl>
                          <SelectContent className="rounded-xl">
                             {Object.entries(seasons).map(([key, {label}]) => <SelectItem key={key} value={key} className="rounded-lg">{t[key] || label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full h-11 rounded-full bg-primary hover:bg-primary/95 text-white font-semibold shadow-md shadow-primary/20 transition-all duration-300 hover:scale-[1.02]" disabled={isLoading}>
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Calculator className="mr-2 h-4 w-4" />}
                    {isLoading ? (t.sim_estimating || "Calcul en cours...") : (t.sim_estimate_btn || "Estimer le tarif")}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card className="h-full shadow-lg rounded-3xl border-border/50 bg-card/60 backdrop-blur-md overflow-hidden flex flex-col justify-between">
            <div>
              <CardHeader className="border-b border-border/40 pb-4">
                <CardTitle className="text-xl font-bold text-foreground">{t.sim_result_title}</CardTitle>
                <CardDescription>{t.sim_result_desc}</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                {isLoading && (
                  <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground gap-4">
                    <Bot className="h-14 w-14 animate-bounce text-primary" />
                    <div>
                      <p className="text-lg font-bold text-foreground">{t.sim_loading_title}</p>
                      <p className="text-sm">{t.sim_loading_desc}</p>
                    </div>
                  </div>
                )}
                {!isLoading && !simulationResult && (
                  <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground gap-3">
                    <TrendingUp className="h-12 w-12 text-muted-foreground/55" />
                    <div>
                      <p className="font-semibold text-foreground">{t.sim_ready_title}</p>
                      <p className="text-sm">{t.sim_ready_desc}</p>
                    </div>
                  </div>
                )}
                {simulationResult && simulationResult.calculationDetails && (
                  <div className="space-y-6">
                     {simulationResult.calculationDetails.warning && (
                      <Alert variant="destructive" className="rounded-2xl border-destructive/35 bg-destructive/5 text-destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle className="font-bold">{t.sim_warning_title}</AlertTitle>
                        <AlertDescription className="text-xs">
                          {simulationResult.calculationDetails.warning}
                        </AlertDescription>
                      </Alert>
                    )}
                    
                    <div className="text-center p-6 border border-primary/20 bg-primary/5 rounded-3xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 rounded-full bg-primary/10 blur-xl" />
                      <p className="text-sm text-muted-foreground font-semibold uppercase tracking-wider mb-1">{t.sim_total_price}</p>
                      <p className="text-4xl font-bold font-headline text-primary">
                        {simulationResult.calculationDetails.finalPrice.toLocaleString(lang === 'en' ? 'en-US' : 'fr-FR')} GNF
                      </p>
                    </div>
 
                    <Card className="shadow-md rounded-2xl border-border/50 bg-muted/10">
                      <CardHeader className="pb-3 border-b border-border/40"><CardTitle className="text-base text-accent font-bold">{t.sim_details_card}</CardTitle></CardHeader>
                      <CardContent className="space-y-2.5 pt-4 text-sm">
                          <div className="flex justify-between items-center"><span className="text-muted-foreground">{t.sim_route}</span> <span className="font-bold text-foreground flex items-center gap-1.5">{form.getValues('from')} <ArrowRight size={12}/> {form.getValues('to')}</span></div>
                          <div className="flex justify-between items-center"><span className="text-muted-foreground">{t.sim_distance}</span> <span className="font-bold text-foreground flex items-center gap-1"><Navigation size={12} className="text-primary"/> {simulationResult.distance.toLocaleString(lang === 'en' ? 'en-US' : 'fr-FR')} km</span></div>
                          <div className="flex justify-between items-center"><span className="text-muted-foreground">{t.sim_duration}</span> <span className="font-bold text-foreground flex items-center gap-1"><Clock size={12} className="text-primary" /> {formatDurationFromSeconds(simulationResult.duration)}</span></div>
                          <div className="h-px bg-border/40 my-2" />
                          <div className="flex justify-between items-center"><span className="text-muted-foreground">{t.sim_base_price}</span> <span className="font-bold text-foreground">{simulationResult.calculationDetails.basePrice.toLocaleString(lang === 'en' ? 'en-US' : 'fr-FR')} GNF</span></div>
                          <div className="flex justify-between items-center"><span className="text-muted-foreground">{t.sim_cargo_surcharge}</span> <span className="font-bold text-orange-600">+ {simulationResult.calculationDetails.surcharges.cargo}%</span></div>
                          <div className="flex justify-between items-center"><span className="text-muted-foreground">{t.sim_season_surcharge}</span> <span className="font-bold text-orange-600">+ {simulationResult.calculationDetails.surcharges.season}%</span></div>
                          <div className="flex justify-between items-center"><span className="text-muted-foreground">{t.sim_discount}</span> <span className="font-bold text-emerald-600">- {simulationResult.calculationDetails.discount}%</span></div>
                      </CardContent>
                    </Card>
 
                    <div className="space-y-2">
                      <h4 className="font-bold text-foreground border-l-4 border-primary pl-2.5">{t.sim_ai_analysis}</h4>
                      <p className="text-sm text-muted-foreground leading-relaxed p-4 bg-muted/40 rounded-2xl border border-border/50">
                        {simulationResult.explanation}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </div>
            {simulationResult && !isLoading && (
              <CardFooter className="border-t border-border/40 pt-4 p-6">
                  <Alert className="rounded-2xl border-amber-500/30 bg-amber-500/5 text-amber-600 dark:text-amber-400">
                      <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
                      <div className="ml-2">
                        <AlertTitle className="font-bold text-xs">{t.sim_note_title}</AlertTitle>
                        <AlertDescription className="text-[11px] leading-relaxed mt-0.5">
                            {t.sim_note_desc}
                        </AlertDescription>
                      </div>
                  </Alert>
              </CardFooter>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
