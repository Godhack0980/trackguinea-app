
"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { createUserWithEmailAndPassword } from "firebase/auth"
import { doc, setDoc, Timestamp, query, where, getDocs, deleteDoc, collection } from "firebase/firestore"
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { ArrowRight, Loader2 } from "lucide-react"
import { useState } from "react"

const formSchema = z.object({
  firstName: z.string().min(1, { message: "Le prénom est requis." }),
  lastName: z.string().min(1, { message: "Le nom est requis." }),
  email: z.string().email({ message: "Adresse e-mail invalide." }),
  phone: z.string().min(1, { message: "Le téléphone est requis." }),
  password: z.string().min(8, { message: "Le mot de passe doit contenir au moins 8 caractères." }),
  licenseType: z.string({ required_error: "Le type de permis est requis."}),
  vehicleRegistration: z.string().min(1, { message: "L'immatriculation est requise." }),
  experienceYears: z.preprocess(
    (a) => parseInt(z.string().parse(a), 10),
    z.number().min(0, { message: "Les années d'expérience doivent être un nombre positif." })
  ),
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
      
      if (!querySnapshot.empty) {
        // This is a driver invited by a company, update their existing document
        const placeholderDoc = querySnapshot.docs[0];
        const placeholderData = placeholderDoc.data();
        
        await setDoc(doc(db, "users", user.uid), {
           ...placeholderData, // get original data (companyId, etc)
           ...values, // overwrite with new data from form
           uid: user.uid,
           isPlaceholder: false, // Remove placeholder flag
           createdAt: Timestamp.now(),
        });
        
        // Delete the old placeholder doc if it has a different ID
        if(placeholderDoc.id !== user.uid) {
            await deleteDoc(doc(db, "users", placeholderDoc.id));
        }

        redirectPath = '/dashboard/transporter-company';
      } else {
        // This is a standard individual transporter
        await setDoc(doc(db, "users", user.uid), {
          ...values,
          role: 'transporter',
          isVerified: false,
          createdAt: Timestamp.now(),
        });
      }
      
      toast({
        title: "Compte créé avec succès !",
        description: "Votre profil est en cours de vérification. Vous serez notifié.",
      });

      router.push(redirectPath);

    } catch (error: any) {
      console.error("Error signing up transporter:", error);
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
    <Card>
      <CardHeader>
        <CardTitle className="font-headline text-2xl">Inscription Transporteur (Poids Lourd)</CardTitle>
        <CardDescription>Rejoignez notre réseau de transporteurs professionnels.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
             <div className="grid grid-cols-2 gap-4">
                <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Prénom</FormLabel>
                    <FormControl>
                        <Input placeholder="Thierno" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Nom</FormLabel>
                    <FormControl>
                        <Input placeholder="Bah" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="votre@email.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Téléphone</FormLabel>
                  <FormControl>
                    <Input placeholder="+224 XX XX XX XX" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mot de passe</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="********" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="licenseType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type de Permis</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionnez..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="C">Permis C</SelectItem>
                        <SelectItem value="C1">Permis C1</SelectItem>
                        <SelectItem value="CE">Permis CE</SelectItem>
                        <SelectItem value="C1E">Permis C1E</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="experienceYears"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Années d'expérience</FormLabel>
                    <FormControl>
                        <Input type="number" placeholder="ex: 5" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>
             <FormField
                control={form.control}
                name="vehicleRegistration"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Immatriculation du véhicule</FormLabel>
                    <FormControl>
                        <Input placeholder="AB 1234 CD" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
            <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="animate-spin" /> : "Devenir transporteur"}
              {!isSubmitting && <ArrowRight className="ml-2 h-4 w-4" />}
            </Button>
          </form>
        </Form>
      </CardContent>
       <CardFooter className="flex flex-col gap-2 text-sm">
         <p className="text-muted-foreground">
            Vous êtes client ?{' '}
            <Link href="/signup/client" className="text-primary hover:underline">
              Inscrivez-vous ici.
            </Link>
          </p>
          <p className="text-muted-foreground">
            Déjà un compte ?{' '}
            <Link href="/login" className="text-primary hover:underline">
              Se connecter.
            </Link>
          </p>
      </CardFooter>
    </Card>
  )
}
