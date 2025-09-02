
"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { createUserWithEmailAndPassword } from "firebase/auth"
import { doc, setDoc, Timestamp, query, where, collection, getDocs, writeBatch, deleteDoc } from "firebase/firestore"
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
import { useToast } from "@/hooks/use-toast"
import { ArrowRight, Loader2 } from "lucide-react"
import { useState } from "react"

const formSchema = z.object({
  firstName: z.string().min(1, { message: "Le prénom est requis." }),
  lastName: z.string().min(1, { message: "Le nom est requis." }),
  email: z.string().email({ message: "Adresse e-mail invalide." }),
  phone: z.string().min(1, { message: "Le téléphone est requis." }),
  password: z.string().min(8, { message: "Le mot de passe doit contenir au moins 8 caractères." }),
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
      password: "",
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
          role: 'client',
          isVerified: false, // Needs admin verification
          createdAt: Timestamp.now(),
        });
      }
      
      toast({
        title: "Bienvenue !",
        description: "Votre compte a été créé. Il est en cours de vérification par nos administrateurs.",
      });
      
      router.push(redirectPath);

    } catch (error: any) {
      console.error("Error signing up:", error);
      
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
        <CardTitle className="font-headline text-2xl">Inscription Client</CardTitle>
        <CardDescription>Créez votre compte pour commencer à envoyer vos colis.</CardDescription>
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
                        <Input placeholder="Moussa" {...field} />
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
                        <Input placeholder="Camara" {...field} />
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
            <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="animate-spin" /> : "Créer mon compte"}
              {!isSubmitting && <ArrowRight className="ml-2 h-4 w-4" />}
            </Button>
          </form>
        </Form>
      </CardContent>
       <CardFooter className="flex flex-col gap-2 text-sm">
         <p className="text-muted-foreground">
            Vous êtes transporteur ?{' '}
            <Link href="/signup/transporter" className="text-primary hover:underline">
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
