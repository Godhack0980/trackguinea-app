
"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { createUserWithEmailAndPassword } from "firebase/auth"
import { doc, setDoc, Timestamp } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"

import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { PasswordInput } from "@/components/ui/password-input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Building, ArrowRight, Loader2 } from "lucide-react"
import { useState } from "react"
import { Textarea } from "@/components/ui/textarea"

import { Checkbox } from "@/components/ui/checkbox"
import PasswordRequirements from "@/components/password-requirements";
import { getFirebaseAuthErrorMessage } from "@/lib/firebase-auth-errors";

const prefecturesGuinea = [
  "Conakry", "Beyla", "Boffa", "Boké", "Coyah", "Dabola", "Dalaba", "Dinguiraye", 
  "Dubréka", "Faranah", "Forécariah", "Fria", "Gaoual", "Guéckédou", "Kankan", 
  "Kérouané", "Kindia", "Kissidougou", "Koubia", "Koundara", "Kouroussa", "Labé", 
  "Lélouma", "Lola", "Macenta", "Mali", "Mamou", "Mandiana", "Nzérékoré", "Pita", 
  "Siguiri", "Télimélé", "Tougué", "Yomou"
];

const formSchema = z.object({
  companyName: z.string().min(1, { message: "Le nom de l'entreprise est requis." }),
  rccm: z.string().min(1, { message: "Le numéro de RCCM est requis." }),
  address: z.string().min(1, { message: "L'adresse est requise." }),
  sector: z.string().min(1, { message: "Le secteur d'activité est requis." }),
  estimatedVolume: z.string().min(1, { message: "Veuillez indiquer le volume de fret estimé." }),
  headquartersPrefecture: z.string().min(1, { message: "La préfecture du siège est requise." }),
  contactFirstName: z.string().min(1, { message: "Le prénom du contact est requis." }),
  contactLastName: z.string().min(1, { message: "Le nom du contact est requis." }),
  email: z.string().email({ message: "Adresse e-mail invalide." }),
  phone: z.string().min(1, { message: "Le téléphone est requis." }),
  password: z
    .string()
    .min(8, { message: "Le mot de passe doit contenir au moins 8 caractères." })
    .regex(/[A-Z]/, { message: "Au moins une lettre majuscule est requise." })
    .regex(/[a-z]/, { message: "Au moins une lettre minuscule est requise." })
    .regex(/[0-9]/, { message: "Au moins un chiffre est requis." })
    .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, { message: "Au moins un caractère spécial est requis." }),
  acceptTerms: z.boolean().refine(val => val === true, {
    message: "Veuillez accepter les CGU et politique de confidentialité.",
  }),
})

export default function ClientCompanySignupPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      companyName: "",
      rccm: "",
      address: "",
      sector: "",
      estimatedVolume: "",
      headquartersPrefecture: "",
      contactFirstName: "",
      contactLastName: "",
      email: "",
      phone: "",
      password: "",
      acceptTerms: false,
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      const user = userCredential.user;
      
      const randomNum = Math.floor(1000 + Math.random() * 9000);
      const uniqueId = `TG-PRO-${randomNum}`;

      await setDoc(doc(db, "users", user.uid), {
        firstName: values.contactFirstName,
        lastName: values.contactLastName,
        email: values.email,
        phone: values.phone,
        companyName: values.companyName,
        rccm: values.rccm,
        address: values.address,
        sector: values.sector,
        estimatedVolume: values.estimatedVolume,
        headquartersPrefecture: values.headquartersPrefecture,
        role: 'client-company',
        companyId: uniqueId,
        companyRole: 'admin', 
        isVerified: false, 
        uniqueId: uniqueId,
        createdAt: Timestamp.now(),
      });
      
      toast({
        title: "Compte Entreprise créé !",
        description: "Votre compte a été créé. Notre équipe va valider vos informations professionnelles sous 24h.",
      });
      
      router.push(`/dashboard/client-company`);

    } catch (error: any) {
      console.error("Error signing up company:", error);
      const description = getFirebaseAuthErrorMessage(error);
      toast({
        variant: "destructive",
        title: "Erreur lors de l'inscription",
        description: description,
      });
    } finally {
        setIsSubmitting(false);
    }
  }

  return (
    <Card className="bg-slate-900/60 border border-slate-800 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
            <Building className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle className="font-headline text-2xl text-white">Inscription Entreprise Cliente</CardTitle>
            <CardDescription className="text-slate-400">Pour les sociétés ayant des besoins logistiques réguliers.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 text-left">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="companyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-200 font-semibold text-xs">Nom de l'entreprise</FormLabel>
                    <FormControl>
                      <Input placeholder="Soguipah SA" className="bg-[#0D1322] border-slate-800 text-white placeholder-slate-500 rounded-xl h-11 focus-visible:ring-primary" {...field} />
                    </FormControl>
                    <FormMessage className="text-red-400 text-xs" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="rccm"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-200 font-semibold text-xs">N° RCCM (Registre du Commerce)</FormLabel>
                    <FormControl>
                      <Input placeholder="GN.CKY.202X.B.XXXX" className="bg-[#0D1322] border-slate-800 text-white placeholder-slate-500 rounded-xl h-11 focus-visible:ring-primary" {...field} />
                    </FormControl>
                    <FormMessage className="text-red-400 text-xs" />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="sector"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-200 font-semibold text-xs">Secteur d'activité</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-[#0D1322] border-slate-800 text-slate-100 rounded-xl h-11">
                          <SelectValue placeholder="Choisir" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-[#0D1322] border-slate-800 text-slate-100 rounded-xl">
                        <SelectItem value="Agroalimentaire" className="focus:bg-slate-800 focus:text-white cursor-pointer">Agroalimentaire 🌾</SelectItem>
                        <SelectItem value="Mines" className="focus:bg-slate-800 focus:text-white cursor-pointer">Mines & Énergie 💎</SelectItem>
                        <SelectItem value="Construction" className="focus:bg-slate-800 focus:text-white cursor-pointer">BTP & Construction 🏗️</SelectItem>
                        <SelectItem value="Commerce" className="focus:bg-slate-800 focus:text-white cursor-pointer">Commerce de gros 🛍️</SelectItem>
                        <SelectItem value="Autre" className="focus:bg-slate-800 focus:text-white cursor-pointer">Autre secteur 🏢</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-red-400 text-xs" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="estimatedVolume"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-200 font-semibold text-xs">Volume de fret mensuel</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-[#0D1322] border-slate-800 text-slate-100 rounded-xl h-11">
                          <SelectValue placeholder="Choisir" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-[#0D1322] border-slate-800 text-slate-100 rounded-xl">
                        <SelectItem value="Moins de 5 tonnes" className="focus:bg-slate-800 focus:text-white cursor-pointer">{"< 5 Tonnes 📦"}</SelectItem>
                        <SelectItem value="5 à 20 tonnes" className="focus:bg-slate-800 focus:text-white cursor-pointer">5 à 20 Tonnes 🚛</SelectItem>
                        <SelectItem value="Plus de 20 tonnes" className="focus:bg-slate-800 focus:text-white cursor-pointer">{"> 20 Tonnes 🚢"}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-red-400 text-xs" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="headquartersPrefecture"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-200 font-semibold text-xs">Préfecture du Siège</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-[#0D1322] border-slate-800 text-slate-100 rounded-xl h-11">
                          <SelectValue placeholder="Choisir" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-[#0D1322] border-slate-800 text-slate-100 rounded-xl max-h-56">
                        {prefecturesGuinea.map(pref => (
                          <SelectItem key={pref} value={pref} className="focus:bg-slate-800 focus:text-white cursor-pointer">{pref}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-red-400 text-xs" />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-200 font-semibold text-xs">Adresse de l'entreprise</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Adresse complète..." className="bg-[#0D1322] border-slate-800 text-white placeholder-slate-500 rounded-xl min-h-[60px] focus-visible:ring-primary" {...field} />
                  </FormControl>
                  <FormMessage className="text-red-400 text-xs" />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="contactFirstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-200 font-semibold text-xs">Prénom du contact</FormLabel>
                    <FormControl>
                      <Input placeholder="Fatoumata" className="bg-[#0D1322] border-slate-800 text-white placeholder-slate-500 rounded-xl h-11 focus-visible:ring-primary" {...field} />
                    </FormControl>
                    <FormMessage className="text-red-400 text-xs" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="contactLastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-200 font-semibold text-xs">Nom du contact</FormLabel>
                    <FormControl>
                      <Input placeholder="Barry" className="bg-[#0D1322] border-slate-800 text-white placeholder-slate-500 rounded-xl h-11 focus-visible:ring-primary" {...field} />
                    </FormControl>
                    <FormMessage className="text-red-400 text-xs" />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-200 font-semibold text-xs">Email de l'entreprise</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="contact@entreprise.com" className="bg-[#0D1322] border-slate-800 text-white placeholder-slate-500 rounded-xl h-11 focus-visible:ring-primary" {...field} />
                    </FormControl>
                    <FormMessage className="text-red-400 text-xs" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-200 font-semibold text-xs">Téléphone de contact</FormLabel>
                    <FormControl>
                      <Input placeholder="+224 6XX XX XX" className="bg-[#0D1322] border-slate-800 text-white placeholder-slate-500 rounded-xl h-11 focus-visible:ring-primary" {...field} />
                    </FormControl>
                    <FormMessage className="text-red-400 text-xs" />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-200 font-semibold text-xs">Mot de passe</FormLabel>
                  <FormControl>
                    <PasswordInput placeholder="********" className="bg-[#0D1322] border-slate-800 text-white placeholder-slate-500 rounded-xl h-11 focus-visible:ring-primary" {...field} />
                  </FormControl>
                  <PasswordRequirements password={field.value} />
                  <FormMessage className="text-red-400 text-xs" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="acceptTerms"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md p-2">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      className="bg-[#0D1322] border-slate-800 text-white data-[state=checked]:bg-primary mt-0.5"
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none text-left">
                    <FormLabel className="text-slate-300 text-xs cursor-pointer select-none">
                      J'accepte les{" "}
                      <Link href="/terms" className="text-primary hover:underline font-semibold" target="_blank">
                        Conditions Générales d'Utilisation (CGU)
                      </Link>{" "}
                      et la{" "}
                      <Link href="/privacy" className="text-primary hover:underline font-semibold" target="_blank">
                        Politique de Confidentialité
                      </Link>
                    </FormLabel>
                    <FormMessage className="text-red-400 text-[11px]" />
                  </div>
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/95 hover:to-indigo-600/95 text-white font-bold h-12 shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all rounded-xl mt-6" size="lg" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="animate-spin" /> : "Créer le compte Entreprise"}
              {!isSubmitting && <ArrowRight className="ml-2 h-4 w-4" />}
            </Button>
          </form>
        </Form>
      </CardContent>
       <CardFooter className="flex flex-col gap-2.5 text-sm border-t border-slate-800/60 pt-4">
          <p className="text-slate-400">
            Déjà un compte ?{' '}
            <Link href="/login" className="text-primary hover:text-primary/95 hover:underline font-semibold">
              Se connecter.
            </Link>
          </p>
          <Link href="/" className="w-full">
            <Button variant="outline" className="w-full bg-[#0D1322] border-slate-800 text-slate-300 hover:text-white rounded-xl h-10 text-xs mt-1">
              ← Retour à la page d'accueil
            </Button>
          </Link>
      </CardFooter>
    </Card>
  )
}
