
"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { createUserWithEmailAndPassword } from "firebase/auth"
import { doc, setDoc, Timestamp, query, where, getDocs, getDoc, deleteDoc, collection } from "firebase/firestore"
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
import { ArrowRight, Loader2 } from "lucide-react"
import { useState } from "react"

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
  firstName: z.string().min(1, { message: "Le prénom est requis." }),
  lastName: z.string().min(1, { message: "Le nom est requis." }),
  email: z.string().email({ message: "Adresse e-mail invalide." }),
  phone: z.string().min(1, { message: "Le téléphone est requis." }),
  password: z
    .string()
    .min(8, { message: "Le mot de passe doit contenir au moins 8 caractères." })
    .regex(/[A-Z]/, { message: "Au moins une lettre majuscule est requise." })
    .regex(/[a-z]/, { message: "Au moins une lettre minuscule est requise." })
    .regex(/[0-9]/, { message: "Au moins un chiffre est requis." })
    .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, { message: "Au moins un caractère spécial est requis." }),
  licenseType: z.string({ required_error: "Le type de permis est requis."}),
  vehicleRegistration: z.string().min(1, { message: "L'immatriculation est requise." }),
  experienceYears: z.preprocess(
    (a) => parseInt(z.string().parse(a), 10),
    z.number().min(0, { message: "Les années d'expérience doivent être un nombre positif." })
  ),
  documentType: z.string().min(1, { message: "Le type de pièce est requis." }),
  documentNumber: z.string().min(1, { message: "Le numéro de pièce est requis." }),
  currentPrefecture: z.string().min(1, { message: "La préfecture d'attache est requise." }),
  companyIdCode: z.string().optional(),
  acceptTerms: z.boolean().refine(val => val === true, {
    message: "Veuillez accepter les CGU et politique de confidentialité.",
  }),
})

export default function TransporterSignupPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      password: "",
      licenseType: undefined,
      vehicleRegistration: "",
      experienceYears: 0,
      documentType: "",
      documentNumber: "",
      currentPrefecture: "",
      acceptTerms: false,
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      const user = userCredential.user;

      const usersRef = collection(db, "users");
      const q = query(usersRef, where("email", "==", values.email), where("isPlaceholder", "==", true));
      const querySnapshot = await getDocs(q);

      let redirectPath = '/dashboard/transporter';
      
      const randomNum = Math.floor(1000 + Math.random() * 9000);
      const uniqueId = `TG-IND-${randomNum}`;

      // Check for Pro Enterprise Affiliation via companyIdCode
      let affiliatedCompanyId: string | null = null;
      let affiliatedCompanyName: string | null = null;

      if (values.companyIdCode && values.companyIdCode.trim()) {
        const code = values.companyIdCode.trim();
        const compSnap = await getDoc(doc(db, "users", code));
        if (compSnap.exists()) {
          const cData = compSnap.data();
          affiliatedCompanyId = cData.uid || code;
          affiliatedCompanyName = cData.companyName || `${cData.firstName || ''} ${cData.lastName || ''}`.trim();
        } else {
          const compQuery = query(collection(db, "users"), where("uniqueId", "==", code));
          const compQuerySnap = await getDocs(compQuery);
          if (!compQuerySnap.empty) {
            const cData = compQuerySnap.docs[0].data();
            affiliatedCompanyId = cData.uid;
            affiliatedCompanyName = cData.companyName || `${cData.firstName || ''} ${cData.lastName || ''}`.trim();
          }
        }
      }

      if (!querySnapshot.empty) {
        const placeholderDoc = querySnapshot.docs[0];
        const placeholderData = placeholderDoc.data();
        
        await setDoc(doc(db, "users", user.uid), {
           ...placeholderData, 
           ...values, 
           uid: user.uid,
           isPlaceholder: false, 
           uniqueId: uniqueId,
           role: 'transporter',
           companyId: affiliatedCompanyId || placeholderData.companyId || null,
           companyName: affiliatedCompanyName || placeholderData.companyName || null,
           status: 'disponible',
           createdAt: Timestamp.now(),
        });
        
        await deleteDoc(doc(db, "users", placeholderDoc.id));

        redirectPath = '/dashboard/transporter-company';
      } else {
        await setDoc(doc(db, "users", user.uid), {
          uid: user.uid,
          email: values.email,
          firstName: values.firstName,
          lastName: values.lastName,
          phone: values.phone,
          role: 'transporter',
          licenseType: values.licenseType,
          vehicleRegistration: values.vehicleRegistration,
          experienceYears: values.experienceYears,
          documentType: values.documentType,
          documentNumber: values.documentNumber,
          currentPrefecture: values.currentPrefecture,
          companyId: affiliatedCompanyId || null,
          companyName: affiliatedCompanyName || null,
          uniqueId: uniqueId,
          isPlaceholder: false,
          status: 'disponible',
          createdAt: Timestamp.now(),
        });
      }
      
      toast({
        title: "Inscription réussie !",
        description: "Votre compte de transporteur individuel a bien été créé.",
      });

      router.push(redirectPath);

    } catch (error: any) {
      console.error(error);
      const errMsg = getFirebaseAuthErrorMessage(error);
      toast({
        variant: "destructive",
        title: "Erreur d'inscription",
        description: errMsg,
      });
    } finally {
        setIsSubmitting(false);
    }
  }


  return (
    <Card className="bg-slate-900/60 border border-slate-800 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden max-w-2xl mx-auto">
      <CardHeader className="pb-4">
        <CardTitle className="font-headline text-2xl text-white">Devenir Transporteur</CardTitle>
        <CardDescription className="text-slate-400">Inscrivez-vous en tant que transporteur individuel en Guinée.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 text-left">
             <div className="grid grid-cols-2 gap-4">
                <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-200 font-semibold text-xs">Prénom</FormLabel>
                    <FormControl>
                      <Input placeholder="Mamadou" className="bg-[#0D1322] border-slate-800 text-white placeholder-slate-500 rounded-xl h-11 focus-visible:ring-primary" {...field} />
                    </FormControl>
                    <FormMessage className="text-red-400 text-xs" />
                  </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-200 font-semibold text-xs">Nom</FormLabel>
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
                    <FormLabel className="text-slate-200 font-semibold text-xs">Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="votre@email.com" className="bg-[#0D1322] border-slate-800 text-white placeholder-slate-500 rounded-xl h-11 focus-visible:ring-primary" {...field} />
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
                    <FormLabel className="text-slate-200 font-semibold text-xs">Téléphone</FormLabel>
                    <FormControl>
                      <Input placeholder="+224 6XX XX XX" className="bg-[#0D1322] border-slate-800 text-white placeholder-slate-500 rounded-xl h-11 focus-visible:ring-primary" {...field} />
                    </FormControl>
                    <FormMessage className="text-red-400 text-xs" />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="documentType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-200 font-semibold text-xs">Pièce d'identité</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-[#0D1322] border-slate-800 text-slate-100 rounded-xl h-11">
                          <SelectValue placeholder="Choisir" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-[#0D1322] border-slate-800 text-slate-100 rounded-xl">
                        <SelectItem value="Carte ID" className="focus:bg-slate-800 focus:text-white cursor-pointer">Carte d'Identité Nationale</SelectItem>
                        <SelectItem value="Passeport" className="focus:bg-slate-800 focus:text-white cursor-pointer">Passeport</SelectItem>
                        <SelectItem value="Permis" className="focus:bg-slate-800 focus:text-white cursor-pointer">Permis de Conduire</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-red-400 text-xs" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="documentNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-200 font-semibold text-xs">N° de document</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: G-12345" className="bg-[#0D1322] border-slate-800 text-white placeholder-slate-500 rounded-xl h-11 focus-visible:ring-primary" {...field} />
                    </FormControl>
                    <FormMessage className="text-red-400 text-xs" />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="licenseType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-200 font-semibold text-xs">Permis</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-[#0D1322] border-slate-800 text-slate-100 rounded-xl h-11">
                          <SelectValue placeholder="Permis" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-[#0D1322] border-slate-800 text-slate-100 rounded-xl">
                        <SelectItem value="C" className="focus:bg-slate-800 focus:text-white cursor-pointer">Permis C</SelectItem>
                        <SelectItem value="C1" className="focus:bg-slate-800 focus:text-white cursor-pointer">Permis C1</SelectItem>
                        <SelectItem value="CE" className="focus:bg-slate-800 focus:text-white cursor-pointer">Permis CE</SelectItem>
                        <SelectItem value="C1E" className="focus:bg-slate-800 focus:text-white cursor-pointer">Permis C1E</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-red-400 text-xs" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="experienceYears"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-200 font-semibold text-xs">Expérience (ans)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="5" className="bg-[#0D1322] border-slate-800 text-white placeholder-slate-500 rounded-xl h-11 focus-visible:ring-primary" {...field} />
                    </FormControl>
                    <FormMessage className="text-red-400 text-xs" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="currentPrefecture"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-200 font-semibold text-xs">Ville d'attache</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-[#0D1322] border-slate-800 text-slate-100 rounded-xl h-11">
                          <SelectValue placeholder="Ville" />
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
              name="companyIdCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-200 font-semibold text-xs flex items-center justify-between">
                    <span>ID Unique d'Entreprise Pro (Facultatif)</span>
                    <span className="text-[10px] text-indigo-400 font-normal">Si vous êtes affilié à une société</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: UID ou TG-PRO-XXXX" className="bg-[#0D1322] border-slate-800 text-white placeholder-slate-500 rounded-xl h-11 focus-visible:ring-primary" {...field} />
                  </FormControl>
                  <FormMessage className="text-red-400 text-xs" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="vehicleRegistration"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-200 font-semibold text-xs">Immatriculation du véhicule</FormLabel>
                  <FormControl>
                    <Input placeholder="RC 1234 A" className="bg-[#0D1322] border-slate-800 text-white placeholder-slate-500 rounded-xl h-11 focus-visible:ring-primary" {...field} />
                  </FormControl>
                  <FormMessage className="text-red-400 text-xs" />
                </FormItem>
              )}
            />

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
              {isSubmitting ? <Loader2 className="animate-spin" /> : "Devenir transporteur"}
              {!isSubmitting && <ArrowRight className="ml-2 h-4 w-4" />}
            </Button>
          </form>
        </Form>
      </CardContent>
       <CardFooter className="flex flex-col gap-2.5 text-sm border-t border-slate-800/60 pt-4">
          <p className="text-slate-400">
             Vous êtes client ?{' '}
             <Link href="/signup/client" className="text-indigo-400 hover:text-indigo-300 hover:underline font-semibold">
               Inscrivez-vous ici.
             </Link>
           </p>
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
