
"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from "firebase/auth"
import { doc, setDoc, getDoc, Timestamp, query, where, collection, getDocs, deleteDoc } from "firebase/firestore"
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
import { ArrowRight, Loader2 } from "lucide-react"
import { useState } from "react"

import { Checkbox } from "@/components/ui/checkbox"
import PasswordRequirements, { isPasswordValid } from "@/components/password-requirements";
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
  residencePrefecture: z.string().min(1, { message: "La préfecture est requise." }),
  frequentShipment: z.string().min(1, { message: "Veuillez indiquer le type d'envoi." }),
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

export default function ClientSignupPage() {
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
      residencePrefecture: "",
      frequentShipment: "",
      password: "",
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

      let redirectPath = '/dashboard/client';

      if (!querySnapshot.empty) {
        const placeholderDoc = querySnapshot.docs[0];
        
        await setDoc(doc(db, "users", user.uid), {
           ...placeholderDoc.data(),
           ...values,
           uid: user.uid,
           isPlaceholder: false,
           isVerified: true, // Auto-verified if invited by a company
           createdAt: Timestamp.now(),
        });
        
        if(placeholderDoc.id !== user.uid) {
            await deleteDoc(doc(db, "users", placeholderDoc.id));
        }
        
        redirectPath = '/dashboard/client-company';

      } else {
        await setDoc(doc(db, "users", user.uid), {
          firstName: values.firstName,
          lastName: values.lastName,
          email: values.email,
          phone: values.phone,
          residencePrefecture: values.residencePrefecture,
          frequentShipment: values.frequentShipment,
          role: 'client',
          isVerified: false, // Needs admin verification
          createdAt: Timestamp.now(),
        });
      }
      
      toast({
        title: "Bienvenue !",
        description: "Votre compte a été créé. Notre système procède à la vérification de vos informations.",
      });
      
      router.push(redirectPath);

    } catch (error: any) {
      console.error("Error signing up:", error);
      
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
        <CardTitle className="font-headline text-2xl text-white">Inscription Client</CardTitle>
        <CardDescription className="text-slate-400">Créez votre compte pour commencer à envoyer vos cargaisons.</CardDescription>
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
                      <Input placeholder="Moussa" className="bg-[#0D1322] border-slate-800 text-white placeholder-slate-500 rounded-xl h-11 focus-visible:ring-primary" {...field} />
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
                      <Input placeholder="Camara" className="bg-[#0D1322] border-slate-800 text-white placeholder-slate-500 rounded-xl h-11 focus-visible:ring-primary" {...field} />
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
                name="residencePrefecture"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-200 font-semibold text-xs">Préfecture de résidence</FormLabel>
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
              <FormField
                control={form.control}
                name="frequentShipment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-200 font-semibold text-xs">Type d'envois fréquents</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-[#0D1322] border-slate-800 text-slate-100 rounded-xl h-11">
                          <SelectValue placeholder="Choisir" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-[#0D1322] border-slate-800 text-slate-100 rounded-xl">
                        <SelectItem value="Colis/Paquets" className="focus:bg-slate-800 focus:text-white cursor-pointer">Colis & Paquets 📦</SelectItem>
                        <SelectItem value="Déménagement" className="focus:bg-slate-800 focus:text-white cursor-pointer">Déménagement 🏠</SelectItem>
                        <SelectItem value="Marchandises" className="focus:bg-slate-800 focus:text-white cursor-pointer">Marchandises Générales 🚛</SelectItem>
                        <SelectItem value="Agricole" className="focus:bg-slate-800 focus:text-white cursor-pointer">Produits Agricoles 🌾</SelectItem>
                      </SelectContent>
                    </Select>
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
              {isSubmitting ? <Loader2 className="animate-spin" /> : "Créer mon compte"}
              {!isSubmitting && <ArrowRight className="ml-2 h-4 w-4" />}
            </Button>
          </form>
        </Form>

        {/* Séparateur */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-800" /></div>
          <div className="relative flex justify-center text-xs uppercase"><span className="bg-[#0B0F19] px-3 text-slate-400">ou</span></div>
        </div>

        {/* Bouton Google */}
        <Button
          type="button"
          variant="outline"
          className="w-full gap-2 bg-[#0D1322] border-slate-800 hover:bg-slate-800/50 hover:text-white text-slate-200 rounded-xl h-12"
          size="lg"
          disabled={isSubmitting}
          onClick={async () => {
            setIsSubmitting(true);
            try {
              const provider = new GoogleAuthProvider();
              const result = await signInWithPopup(auth, provider);
              const user = result.user;

              // Vérifier si l'utilisateur existe déjà dans Firestore
              const userDocRef = doc(db, 'users', user.uid);
              const userDocSnap = await getDoc(userDocRef);

              if (!userDocSnap.exists()) {
                // Nouvel utilisateur → créer le profil
                await setDoc(userDocRef, {
                  firstName: user.displayName?.split(' ')[0] || '',
                  lastName: user.displayName?.split(' ').slice(1).join(' ') || '',
                  email: user.email,
                  phone: user.phoneNumber || '',
                  residencePrefecture: "Conakry",
                  frequentShipment: "Colis/Paquets",
                  role: 'client',
                  isVerified: false,
                  createdAt: Timestamp.now(),
                });
              }

              toast({ title: "Bienvenue !", description: "Connexion avec Google réussie." });
              const userData = userDocSnap.exists() ? userDocSnap.data() : { role: 'client' };
              switch (userData.role) {
                case 'admin': router.push('/dashboard/admin'); break;
                case 'transporter': router.push('/dashboard/transporter'); break;
                case 'client-company': router.push('/dashboard/client-company'); break;
                case 'transporter-company': router.push('/dashboard/transporter-company'); break;
                default: router.push('/dashboard/client');
              }
            } catch (error: any) {
              if (error.code !== 'auth/popup-closed-by-user') {
                toast({ variant: "destructive", title: "Erreur Google", description: error.message });
              }
            } finally {
              setIsSubmitting(false);
            }
          }}
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          S'inscrire avec Google
        </Button>
      </CardContent>
       <CardFooter className="flex flex-col gap-2.5 text-sm border-t border-slate-800/60 pt-4">
          <p className="text-slate-400">
             Vous êtes transporteur ?{' '}
             <Link href="/signup/transporter" className="text-indigo-400 hover:text-indigo-300 hover:underline font-semibold">
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
