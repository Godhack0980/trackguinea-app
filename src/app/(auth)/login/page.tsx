
"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from "firebase/auth"
import { doc, getDoc, setDoc, Timestamp } from "firebase/firestore"
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
import { LogIn, Loader2 } from "lucide-react"
import { useState } from "react"

const formSchema = z.object({
  email: z.string().email({ message: "Adresse e-mail invalide." }),
  password: z.string().min(1, { message: "Le mot de passe est requis." }),
})

export default function LoginPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })

  async function handleGoogleSignIn() {
    setIsSubmitting(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);

      // If user doesn't exist in Firestore, create a new record
      if (!userDocSnap.exists()) {
        const firstName = user.displayName?.split(' ')[0] || '';
        const lastName = user.displayName?.split(' ').slice(1).join(' ') || '';

        await setDoc(userDocRef, {
          firstName: firstName,
          lastName: lastName,
          email: user.email,
          phone: user.phoneNumber || '',
          role: 'client',
          authProvider: 'google',
          isVerified: false,
          createdAt: Timestamp.now(),
        });

        toast({
          title: "Compte créé",
          description: "Votre compte a été créé. Il est en cours de vérification par nos administrateurs.",
        });
        router.push('/dashboard/client');
      } else {
        const userData = userDocSnap.data();

        if (userData.isSuspended) {
          await auth.signOut();
          toast({
            variant: "destructive",
            title: "Compte suspendu",
            description: "Votre compte a été suspendu par un administrateur. Veuillez contacter le support.",
          });
          return;
        }

        const userRole = userData.role || 'client';

        toast({
          title: "Connexion réussie!",
          description: `Bienvenue !`,
        });

        // Redirect based on role
        switch (userRole) {
          case 'admin':
            router.push('/dashboard/admin');
            break;
          case 'transporter':
            router.push('/dashboard/transporter');
            break;
          case 'client-company':
            router.push('/dashboard/client-company');
            break;
          case 'transporter-company':
            router.push('/dashboard/transporter-company');
            break;
          default:
            router.push('/dashboard/client');
        }
      }
    } catch (error: any) {
      console.error("Error signing in with Google:", error);

      let description = "Une erreur est survenue. Veuillez réessayer.";
      if (error.code === 'auth/popup-closed-by-user') {
        description = "La connexion Google a été annulée.";
      } else if (error.code === 'auth/account-exists-with-different-credential') {
        description = "Un compte existe déjà avec cet email.";
      }

      toast({
        variant: "destructive",
        title: "Erreur de connexion Google",
        description: description,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, values.email, values.password);
      
      const userDocRef = doc(db, 'users', userCredential.user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (!userDocSnap.exists()) {
         throw new Error("User data not found in Firestore.");
      }
      
      const userData = userDocSnap.data();

      if (userData.isSuspended) {
        await auth.signOut();
        toast({
          variant: "destructive",
          title: "Compte suspendu",
          description: "Votre compte a été suspendu par un administrateur. Veuillez contacter le support.",
        });
        return;
      }
      
      const userRole = userData.role || 'client';

      toast({
        title: "Connexion réussie!",
        description: `Bienvenue !`,
      });

      // Redirect based on role
      switch (userRole) {
        case 'admin':
          router.push('/dashboard/admin');
          break;
        case 'transporter':
          router.push('/dashboard/transporter');
          break;
        case 'client-company':
           router.push('/dashboard/client-company');
           break;
        case 'transporter-company':
           router.push('/dashboard/transporter-company');
           break;
        default:
          router.push('/dashboard/client'); 
      }

    } catch (error: any) {
       console.error("Error signing in:", error.code, error.message);

       let description = "Une erreur inconnue est survenue.";
       switch (error.code) {
          case 'auth/invalid-credential':
          case 'auth/user-not-found':
          case 'auth/wrong-password':
              description = "L'adresse e-mail ou le mot de passe que vous avez entré est incorrect.";
              break;
          case 'auth/too-many-requests':
              description = "L'accès à ce compte a été temporairement désactivé en raison de nombreuses tentatives de connexion infructueuses. Vous pouvez le restaurer immédiatement en réinitialisant votre mot de passe ou vous pouvez réessayer plus tard.";
              break;
          case 'auth/network-request-failed':
              description = "Problème de connexion réseau. Veuillez vérifier votre connexion internet.";
              break;
          default:
              description = `Une erreur est survenue lors de la connexion. (${error.message})`;
       }

       toast({
        variant: "destructive",
        title: "Erreur de connexion",
        description: description,
      });
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline text-2xl">Connexion</CardTitle>
        <CardDescription>Accédez à votre tableau de bord.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
            <Button type="submit" className="w-full" size="lg" disabled={form.formState.isSubmitting || isSubmitting}>
              {form.formState.isSubmitting || isSubmitting ? "Connexion en cours..." : "Se connecter"}
              {!form.formState.isSubmitting && !isSubmitting && <LogIn className="ml-2 h-4 w-4" />}
              {(form.formState.isSubmitting || isSubmitting) && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
            </Button>
          </form>
        </Form>
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">Ou connectez-vous avec</span>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={handleGoogleSignIn}
          disabled={isSubmitting || form.formState.isSubmitting}
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
      <CardFooter className="flex justify-center text-sm">
         <p className="text-muted-foreground">
            Pas encore de compte ?{' '}
            <Link href="/signup/client" className="text-primary hover:underline">
              S'inscrire
            </Link>
          </p>
      </CardFooter>
    </Card>
  )
}
