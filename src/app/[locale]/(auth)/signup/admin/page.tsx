
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
import { useToast } from "@/hooks/use-toast"
import { Shield, Loader2 } from "lucide-react"
import { useState } from "react"

import { Checkbox } from "@/components/ui/checkbox"
import PasswordRequirements from "@/components/password-requirements";
import { getFirebaseAuthErrorMessage } from "@/lib/firebase-auth-errors";

const formSchema = z.object({
  firstName: z.string().min(1, { message: "Le prénom est requis." }),
  lastName: z.string().min(1, { message: "Le nom est requis." }),
  email: z.string().email({ message: "Adresse e-mail invalide." }),
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

export default function AdminSignupPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      acceptTerms: false,
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      const user = userCredential.user;
      
      await setDoc(doc(db, "users", user.uid), {
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        role: 'admin',
        isAdmin: true, // This is the key field
        createdAt: Timestamp.now(),
      });
      
      toast({
        title: "Compte Admin créé !",
        description: "Bienvenue dans l'espace d'administration.",
      });
      
      router.push(`/dashboard/admin`);

    } catch (error: any) {
      console.error("Error signing up admin:", error);
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
        <CardTitle className="font-headline text-2xl text-white">Création de Compte Administrateur</CardTitle>
        <CardDescription className="text-slate-400">Cette page est réservée à la création de comptes administrateurs.</CardDescription>
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
                        <Input placeholder="Admin" className="bg-[#0D1322] border-slate-800 text-white placeholder-slate-500 rounded-xl h-11 focus-visible:ring-primary" {...field} />
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
                        <Input placeholder="User" className="bg-[#0D1322] border-slate-800 text-white placeholder-slate-500 rounded-xl h-11 focus-visible:ring-primary" {...field} />
                    </FormControl>
                    <FormMessage className="text-red-400 text-xs" />
                    </FormItem>
                )}
                />
            </div>
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-200 font-semibold text-xs">Email</FormLabel>
                  <FormControl>
                    <Input placeholder="admin@email.com" className="bg-[#0D1322] border-slate-800 text-white placeholder-slate-500 rounded-xl h-11 focus-visible:ring-primary" {...field} />
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
              {isSubmitting ? <Loader2 className="animate-spin" /> : "Créer le compte Admin"}
              {!isSubmitting && <Shield className="ml-2 h-4 w-4" />}
            </Button>
          </form>
        </Form>
      </CardContent>
       <CardFooter className="flex justify-center text-sm">
          <p className="text-muted-foreground">
            Retour à la page de connexion ?{' '}
            <Link href="/login" className="text-primary hover:underline">
              Se connecter.
            </Link>
          </p>
      </CardFooter>
    </Card>
  )
}
