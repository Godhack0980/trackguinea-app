
"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from "firebase/auth"
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

  async function handleGoogleSignUp() {
    setIsSubmitting(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Get user info from Google
      const firstName = user.displayName?.split(' ')[0] || '';
      const lastName = user.displayName?.split(' ').slice(1).join(' ') || '';

      const usersRef = collection(db, "users");
      const q = query(usersRef, where("email", "==", user.email), where("isPlaceholder", "==", true));
      const querySnapshot = await getDocs(q);

      let redirectPath = '/dashboard/client';

      if (!querySnapshot.empty) {
        const placeholderDoc = querySnapshot.docs[0];
        
        await setDoc(doc(db, "users", user.uid), {
          ...placeholderDoc.data(),
          firstName: firstName || placeholderDoc.data().firstName,
          lastName: lastName || placeholderDoc.data().lastName,
          email: user.email,
          uid: user.uid,
          isPlaceholder: false,
          isVerified: true,
          authProvider: 'google',
          createdAt: Timestamp.now(),
        });
        
        if(placeholderDoc.id !== user.uid) {
          await deleteDoc(doc(db, "users", placeholderDoc.id));
        }
        
        redirectPath = '/dashboard/client-company';
      } else {
        await setDoc(doc(db, "users", user.uid), {
          firstName: firstName,
          lastName: lastName,
          email: user.email,
          phone: user.phoneNumber || '',
          role: 'client',
          authProvider: 'google',
          isVerified: false,
          createdAt: Timestamp.now(),
        });
      }
      
      toast({
        title: "Bienvenue !",
        description: "Votre compte a été créé. Il est en cours de vérification par nos administrateurs.",
      });
      
      router.push(redirectPath);
    } catch (error: any) {
      console.error("Error signing up with Google:", error);
      
      let description = "Une erreur est survenue. Veuillez réessayer.";
      if (error.code === 'auth/popup-closed-by-user') {
        description = "L'inscription Google a été annulée.";
      } else if (error.code === 'auth/account-exists-with-different-credential') {
        description = "Un compte existe déjà avec cet email.";
      }

      toast({
        variant: "destructive",
        title: "Erreur lors de l'inscription Google",
        description: description,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

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
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">Ou inscrivez-vous avec</span>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={handleGoogleSignUp}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
          )}
          Google
        </Button>
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
