
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
import { Calculator, Loader2, Bot, TrendingUp, Package, Snowflake, Droplets, ShieldAlert, Sun, CloudRain, Clock, AlertTriangle } from "lucide-react"
import { formatDurationFromSeconds } from "@/lib/utils"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"

const cargoTypes = {
    'normale': { label: "Normale", icon: <Package/> },
    'fragile': { label: "Fragile", icon: <Package/> },
    'frigorifique': { label: "Frigorifique", icon: <Snowflake/> },
    'liquide': { label: "Liquide", icon: <Droplets/> },
    'dangereuse': { label: "Dangereuse", icon: <ShieldAlert/> }
}

const seasons = {
    'seche': { label: "Saison Sèche", icon: <Sun/> },
    'pluvieuse': { label: "Saison Pluvieuse", icon: <CloudRain/> }
}


export default function PriceSimulatorPage() {
  const { toast } = useToast();
  const [simulationResult, setSimulationResult] = useState<SimulatePriceOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof SimulatePriceInputSchema>>({
    resolver: zodResolver(SimulatePriceInputSchema),
    defaultValues: {
      from: "Port de Conakry",
      to: undefined,
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
        title: "Simulation terminée !",
        description: "Voici une estimation pour votre course.",
      });
    } catch (error) {
      console.error("Erreur lors de la simulation:", error);
      toast({
        variant: "destructive",
        title: "Erreur de simulation",
        description: "Impossible d'obtenir une estimation pour le moment. Veuillez réessayer.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold text-primary">Simulateur de Prix Détaillé</h1>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <Card className="shadow-md rounded-2xl border-border">
            <CardHeader>
              <CardTitle className="text-lg text-accent">Détails de l'envoi</CardTitle>
              <CardDescription>Remplissez les informations pour obtenir une estimation précise.</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="from"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Départ</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger><SelectValue placeholder={"Sélectionnez une ville"} /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {cityNames.map(location => <SelectItem key={location} value={location}>{location}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="to"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Arrivée</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger><SelectValue placeholder={"Sélectionnez une ville"} /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {cityNames.map(location => <SelectItem key={location} value={location}>{location}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <FormField
                        control={form.control}
                        name="weight"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Poids</FormLabel>
                            <FormControl>
                              <Input type="number" placeholder="Ex: 10" {...field} value={field.value || ''} />
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
                          <FormLabel>Unité</FormLabel>
                           <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger><SelectValue/></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="kg">Kg</SelectItem>
                              <SelectItem value="tonne">Tonnes</SelectItem>
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
                        <FormLabel>Type de marchandise</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger><SelectValue placeholder="Sélectionnez..." /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.entries(cargoTypes).map(([key, {label}]) => <SelectItem key={key} value={key}>{label}</SelectItem>)}
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
                        <FormLabel>Saison</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger><SelectValue placeholder="Sélectionnez..." /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                             {Object.entries(seasons).map(([key, {label}]) => <SelectItem key={key} value={key}>{label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Calculator className="mr-2 h-4 w-4" />}
                    {isLoading ? "Calcul en cours..." : "Estimer le prix"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card className="h-full shadow-md rounded-2xl border-border">
            <CardHeader>
              <CardTitle className="text-lg text-accent">Résultat de la Simulation</CardTitle>
              <CardDescription>Les estimations sont basées sur vos sélections.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading && (
                <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                  <Bot className="h-16 w-16 animate-pulse" />
                  <p className="mt-4 text-lg">Notre IA finalise votre estimation...</p>
                </div>
              )}
              {!isLoading && !simulationResult && (
                <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                  <TrendingUp className="h-16 w-16" />
                  <p className="mt-4 text-center">Les résultats de votre simulation s'afficheront ici.</p>
                </div>
              )}
              {simulationResult && simulationResult.calculationDetails && (
                <div className="space-y-6">
                   {simulationResult.calculationDetails.warning && (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>Calcul Approximatif</AlertTitle>
                      <AlertDescription>
                        {simulationResult.calculationDetails.warning}
                      </AlertDescription>
                    </Alert>
                  )}
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Prix total estimé</p>
                    <p className="text-4xl font-bold font-headline text-primary">
                      {simulationResult.calculationDetails.finalPrice.toLocaleString('fr-FR')} GNF
                    </p>
                  </div>

                  <Card className="shadow-md rounded-2xl border-border">
                    <CardHeader><CardTitle className="text-base text-accent">Détails du Calcul</CardTitle></CardHeader>
                    <CardContent className="space-y-2">
                        <div className="flex justify-between items-center"><span className="text-muted-foreground">Trajet</span> <span className="font-semibold">{form.getValues('from')} → {form.getValues('to')}</span></div>
                        <div className="flex justify-between items-center"><span className="text-muted-foreground">Distance</span> <span className="font-semibold">{simulationResult.distance.toLocaleString('fr-FR')} km</span></div>
                        <div className="flex justify-between items-center"><span className="text-muted-foreground">Durée (Poids Lourd)</span> <span className="font-semibold flex items-center gap-1"><Clock className="h-4 w-4" /> {formatDurationFromSeconds(simulationResult.duration)}</span></div>
                        <div className="flex justify-between items-center"><span className="text-muted-foreground">Prix de base</span> <span className="font-semibold">{simulationResult.calculationDetails.basePrice.toLocaleString('fr-FR')} GNF</span></div>
                        <div className="flex justify-between items-center"><span className="text-muted-foreground">Surcharge (marchandise)</span> <span className="font-semibold text-orange-600">+ {simulationResult.calculationDetails.surcharges.cargo}%</span></div>
                        <div className="flex justify-between items-center"><span className="text-muted-foreground">Surcharge (saison)</span> <span className="font-semibold text-orange-600">+ {simulationResult.calculationDetails.surcharges.season}%</span></div>
                        <div className="flex justify-between items-center"><span className="text-muted-foreground">Remise (volume)</span> <span className="font-semibold text-green-600">- {simulationResult.calculationDetails.discount}%</span></div>
                    </CardContent>
                  </Card>

                  <div>
                    <h4 className="font-semibold">Justification de l'IA</h4>
                    <p className="text-sm text-muted-foreground mt-2 p-4 bg-muted/50 rounded-md">
                      {simulationResult.explanation}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
             {simulationResult && !isLoading && (
                <CardFooter>
                    <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Attention</AlertTitle>
                        <AlertDescription className="text-xs">
                            Ceci est une estimation. Les prix finaux et la durée peuvent varier en fonction des conditions routières, météorologiques et des spécificités de votre demande. Nous vous encourageons à nous contacter pour finaliser les détails.
                        </AlertDescription>
                    </Alert>
                </CardFooter>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
