
"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { simulatePrice } from "@/ai/flows/simulate-price-flow"
import type { SimulatePriceOutput, SimulatePriceInput } from "@/ai/types"
import { cityNames } from "@/lib/guinea-cities"

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Calculator, Loader2, Bot, ArrowRight, TrendingUp, DraftingCompass, AlertTriangle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"


// This schema should match a subset of SimulatePriceInputSchema
const homeSimulatorSchema = z.object({
  from: z.string().min(1, "La ville de départ est requise."),
  to: z.string().min(1, "La ville d'arrivée est requise."),
  weight: z.preprocess(
    (a) => parseFloat(z.string().parse(a)),
    z.number().positive("Le poids doit être un nombre positif.")
  ),
}).refine(data => data.from !== data.to, {
  message: "Le départ et l'arrivée doivent être différents.",
  path: ["to"],
});


export default function HomePriceSimulator() {
  const { toast } = useToast();
  const [simulationResult, setSimulationResult] = useState<SimulatePriceOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof homeSimulatorSchema>>({
    resolver: zodResolver(homeSimulatorSchema),
    defaultValues: {
      from: "Conakry",
      to: "Kankan",
      weight: '' as any,
    },
  });

  async function onSubmit(values: z.infer<typeof homeSimulatorSchema>) {
    setIsLoading(true);
    setSimulationResult(null);
    try {
      // Add default values for the full simulation schema
      const result = await simulatePrice({
        ...values,
        weightUnit: 'tonne',
        cargoType: 'normale',
        season: 'seche'
      });
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
        description: "Impossible d'obtenir une estimation pour le moment.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="shadow-2xl">
      <CardHeader className="text-center">
        <div className="mx-auto bg-primary/10 p-3 rounded-full w-fit">
             <Calculator className="h-8 w-8 text-primary"/>
        </div>
        <CardTitle className="font-headline text-2xl pt-2">Obtenez une estimation gratuite</CardTitle>
        <CardDescription>Simulez le coût de votre transport en quelques clics.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 md:space-y-0 md:grid md:grid-cols-4 md:gap-4 md:items-end">
             <FormField
                control={form.control}
                name="from"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Départ</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Sélectionnez" /></SelectTrigger>
                      </FormControl>
                      <SelectContent><SelectContent>
                        {cityNames.map(city => <SelectItem key={`from-${city}`} value={city}>{city}</SelectItem>)}
                      </SelectContent></SelectContent>
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
                        <SelectTrigger><SelectValue placeholder="Sélectionnez" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {cityNames.map(city => <SelectItem key={`to-${city}`} value={city}>{city}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            <FormField
                control={form.control}
                name="weight"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Poids (tonnes)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="Ex: 10" {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Calculator className="mr-2 h-4 w-4" />}
                {isLoading ? "Calcul..." : "Estimer"}
            </Button>
          </form>
        </Form>
        {isLoading && (
            <div className="flex flex-col items-center justify-center h-24 text-muted-foreground mt-4">
              <Bot className="h-8 w-8 animate-pulse" />
              <p className="mt-2 text-sm">Notre IA analyse votre demande...</p>
            </div>
        )}
        {simulationResult && !isLoading && (
            <div className="mt-6 space-y-4">
                <CardFooter className="flex-col items-start p-0">
                    <p className="text-sm text-muted-foreground">Estimation du coût du trajet</p>
                    <p className="text-3xl font-bold font-headline text-primary">
                        {simulationResult.minPrice.toLocaleString('fr-FR')} GNF
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                        {simulationResult.explanation}
                    </p>
                </CardFooter>
                 <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Attention</AlertTitle>
                    <AlertDescription className="text-xs">
                        Ceci est une estimation. Les prix finaux et la durée peuvent varier en fonction des conditions routières, météorologiques et des spécificités de votre demande. Nous vous encourageons à nous contacter pour finaliser les détails.
                    </AlertDescription>
                </Alert>
            </div>
        )}
      </CardContent>
    </Card>
  )
}
