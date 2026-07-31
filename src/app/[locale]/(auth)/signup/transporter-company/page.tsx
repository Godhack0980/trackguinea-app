
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Truck, ArrowRight, Loader2 } from "lucide-react"
import { useState } from "react"
import { Textarea } from "@/components/ui/textarea"

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
  contactFirstName: z.string().min(1, { message: "Le prénom du contact est requis." }),
  contactLastName: z.string().min(1, { message: "Le nom du contact est requis." }),
  email: z.string().email({ message: "Adresse e-mail invalide." }),
  phone: z.string().min(1, { message: "Le téléphone est requis." }),
  password: z.string().min(8, { message: "Le mot de passe doit contenir au moins 8 caractères." }),
  fleetSize: z.preprocess(
    (a) => parseInt(z.string().parse(a), 10),
    z.number().min(1, { message: "La taille de la flotte doit être d'au moins 1." })
  ),
  truckTypes: z.string().min(1, { message: "Le type de camions principal est requis." }),
  coverageZones: z.string().min(1, { message: "La zone de couverture est requise." }),
  headquartersPrefecture: z.string().min(1, { message: "La préfecture du siège est requise." }),
})

export default function TransporterCompanySignupPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      companyName: "",
      rccm: "",
      address: "",
      contactFirstName: "",
      contactLastName: "",
      email: "",
      phone: "",
      password: "",
      fleetSize: 1,
      truckTypes: "",
      coverageZones: "",
      headquartersPrefecture: "",
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      const user = userCredential.user;
      
      const randomNum = Math.floor(1000 + Math.random() * 9000);
      const uniqueId = `TG-TRP-${randomNum}`;

      await setDoc(doc(db, "users", user.uid), {
        firstName: values.contactFirstName,
        lastName: values.contactLastName,
        email: values.email,
        phone: values.phone,
        companyName: values.companyName,
        rccm: values.rccm,
        address: values.address,
        fleetSize: values.fleetSize,
        truckTypes: values.truckTypes,
        coverageZones: values.coverageZones,
        headquartersPrefecture: values.headquartersPrefecture,
        role: 'transporter-company',
        isVerified: false,
        uniqueId: uniqueId,
        companyId: user.uid, 
        companyRole: 'admin', 
        createdAt: Timestamp.now(),
      });
      
      toast({
        title: "Compte créé avec succès !",
        description: "Votre profil d'entreprise est en cours de vérification par nos administrateurs. Vous serez notifié.",
      });
      
      router.push(`/dashboard/transporter-company`);

    } catch (error: any) {
      console.error("Error signing up transporter company:", error);
      
      let description = "Une erreur est survenue. Veuillez réessayer.";
      if (error.code === 'auth/email-already-in-use') {
        description = "Cette adresse e-mail est déjà utilisée par un autre compte.";
      }

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
        <CardTitle className="font-headline text-2xl text-white">Inscription Entreprise de Transport (Pro)</CardTitle>
        <CardDescription className="text-slate-400">Rejoignez notre réseau de transporteurs routiers professionnels en Guinée.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 text-left">
            <FormField
              control={form.control}
              name="companyName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-200 font-semibold text-xs">Nom de l'entreprise</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: TransExpress Guinée" className="bg-[#0D1322] border-slate-800 text-white placeholder-slate-500 rounded-xl h-11 focus-visible:ring-primary" {...field} />
                  </FormControl>
                  <FormMessage className="text-red-400 text-xs" />
                </FormItem>
              )}
            />

             <div className="grid grid-cols-2 gap-4">
                <FormField
                control={form.control}
                name="rccm"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-200 font-semibold text-xs">Numéro de RCCM</FormLabel>
                    <FormControl>
                      <Input placeholder="Registre de Commerce" className="bg-[#0D1322] border-slate-800 text-white placeholder-slate-500 rounded-xl h-11 focus-visible:ring-primary" {...field} />
                    </FormControl>
                    <FormMessage className="text-red-400 text-xs" />
                  </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="fleetSize"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-200 font-semibold text-xs">Taille de la flotte</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="Ex: 15" className="bg-[#0D1322] border-slate-800 text-white placeholder-slate-500 rounded-xl h-11 focus-visible:ring-primary" {...field} />
                    </FormControl>
                    <FormMessage className="text-red-400 text-xs" />
                  </FormItem>
                )}
                />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="truckTypes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-200 font-semibold text-xs">Type de Camions</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-[#0D1322] border-slate-800 text-slate-100 rounded-xl h-11">
                          <SelectValue placeholder="Choisir" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-[#0D1322] border-slate-800 text-slate-100 rounded-xl">
                        <SelectItem value="Benne" className="focus:bg-slate-800 focus:text-white cursor-pointer">Benne</SelectItem>
                        <SelectItem value="Plateau" className="focus:bg-slate-800 focus:text-white cursor-pointer">Plateau</SelectItem>
                        <SelectItem value="Citerne" className="focus:bg-slate-800 focus:text-white cursor-pointer">Citerne</SelectItem>
                        <SelectItem value="Porte-char" className="focus:bg-slate-800 focus:text-white cursor-pointer">Porte-char</SelectItem>
                        <SelectItem value="Frigo" className="focus:bg-slate-800 focus:text-white cursor-pointer">Frigorifique</SelectItem>
                        <SelectItem value="Multi-types" className="focus:bg-slate-800 focus:text-white cursor-pointer">Flotte Mixte</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-red-400 text-xs" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="coverageZones"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-200 font-semibold text-xs">Couverture</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-[#0D1322] border-slate-800 text-slate-100 rounded-xl h-11">
                          <SelectValue placeholder="Choisir" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-[#0D1322] border-slate-800 text-slate-100 rounded-xl">
                        <SelectItem value="Nationale" className="focus:bg-slate-800 focus:text-white cursor-pointer">Toute la Guinée 🇬🇳</SelectItem>
                        <SelectItem value="Regionale" className="focus:bg-slate-800 focus:text-white cursor-pointer">Région/Conakry</SelectItem>
                        <SelectItem value="Transfrontaliere" className="focus:bg-slate-800 focus:text-white cursor-pointer">Sous-Région 🌍</SelectItem>
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
                    <FormLabel className="text-slate-200 font-semibold text-xs">Siège Social</FormLabel>
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
                      <Input placeholder="Sekou" className="bg-[#0D1322] border-slate-800 text-white placeholder-slate-500 rounded-xl h-11 focus-visible:ring-primary" {...field} />
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
                      <Input placeholder="Diallo" className="bg-[#0D1322] border-slate-800 text-white placeholder-slate-500 rounded-xl h-11 focus-visible:ring-primary" {...field} />
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
                      <Input type="email" placeholder="contact@transport-express.com" className="bg-[#0D1322] border-slate-800 text-white placeholder-slate-500 rounded-xl h-11 focus-visible:ring-primary" {...field} />
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
                  <FormMessage className="text-red-400 text-xs" />
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
