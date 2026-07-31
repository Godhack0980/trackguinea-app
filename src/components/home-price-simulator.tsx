
"use client"

import { useState, useMemo } from "react"
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
import { useTranslation } from "@/lib/translations"

export default function HomePriceSimulator() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [simulationResult, setSimulationResult] = useState<SimulatePriceOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // This schema matches a subset of SimulatePriceInputSchema with localized error messages
  const homeSimulatorSchema = useMemo(() => z.object({
    from: z.string().min(1, t('pricing.err_departure_required')),
    to: z.string().min(1, t('pricing.err_destination_required')),
    weight: z.preprocess(
      (a) => parseFloat(z.string().parse(a)),
      z.number().positive(t('pricing.err_weight_positive'))
    ),
  }).refine(data => data.from !== data.to, {
    message: t('pricing.err_route_identical'),
    path: ["to"],
  }), [t]);

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
        title: t('pricing.sim_success_toast'),
        description: t('pricing.sim_success_toast_desc'),
      });
    } catch (error) {
      console.error("Erreur lors de la simulation:", error);
      toast({
        variant: "destructive",
        title: t('pricing.sim_error_toast'),
        description: t('pricing.sim_error_toast_desc'),
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
        <CardTitle className="font-headline text-2xl pt-2">{t('pricing.home_sim_title')}</CardTitle>
        <CardDescription>{t('pricing.home_sim_desc')}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 md:space-y-0 md:grid md:grid-cols-4 md:gap-4 md:items-end">
             <FormField
                control={form.control}
                name="from"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('pricing.home_sim_from')}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder={t('pricing.sim_cargo_placeholder')} /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {cityNames.map(city => <SelectItem key={`from-${city}`} value={city}>{city}</SelectItem>)}
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
                    <FormLabel>{t('pricing.home_sim_to')}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder={t('pricing.sim_cargo_placeholder')} /></SelectTrigger>
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
                    <FormLabel>{t('pricing.home_sim_weight')}</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="Ex: 10" {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Calculator className="mr-2 h-4 w-4" />}
                {isLoading ? t('pricing.home_sim_calculating') : t('pricing.home_sim_estimate')}
            </Button>
          </form>
        </Form>
        {isLoading && (
            <div className="flex flex-col items-center justify-center h-24 text-muted-foreground mt-4">
              <Bot className="h-8 w-8 animate-pulse" />
              <p className="mt-2 text-sm">{t('pricing.home_sim_ai_loading')}</p>
            </div>
        )}
        {simulationResult && !isLoading && (
            <div className="mt-6 space-y-4">
                <CardFooter className="flex-col items-start p-0">
                    <p className="text-sm text-muted-foreground">{t('pricing.home_sim_estimation_label')}</p>
                    <p className="text-3xl font-bold font-headline text-primary">
                        {simulationResult.minPrice.toLocaleString('fr-FR')} GNF
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                        {simulationResult.explanation}
                    </p>
                </CardFooter>
                 <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>{t('pricing.home_sim_warning_title')}</AlertTitle>
                    <AlertDescription className="text-xs">
                        {t('pricing.home_sim_warning_desc')}
                    </AlertDescription>
                </Alert>
            </div>
        )}
      </CardContent>
    </Card>
  )
}
