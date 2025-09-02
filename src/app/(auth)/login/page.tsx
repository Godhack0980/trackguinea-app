
"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { signInWithEmailAndPassword } from "firebase/auth"
import { doc, getDoc } from "firebase/firestore"
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
import { LogIn } from "lucide-react"

const formSchema = z.object({
  email: z.string().email({ message: "Adresse e-mail invalide." }),
  password: z.string().min(1, { message: "Le mot de passe est requis." }),
})

export default function LoginPage() {
  const router = useRouter()
  const { toast } = useToast()
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })

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
            <Button type="submit" className="w-full" size="lg" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Connexion en cours..." : "Se connecter"}
              <LogIn className="ml-2 h-4 w-4" />
            </Button>
          </form>
        </Form>
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
