"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, sendPasswordResetEmail } from "firebase/auth"
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
import { LogIn, Loader2, KeyRound, Eye, EyeOff } from "lucide-react"
import { useState, Suspense, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

const formSchema = z.object({
  email: z.string().email({ message: "Adresse e-mail invalide." }),
  password: z.string().min(1, { message: "Le mot de passe est requis." }),
})

function LoginFormContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectParam = searchParams.get("redirect")
  const vehicleIdParam = searchParams.get("vehicleId")
  
  const { toast } = useToast()
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [sendingReset, setSendingReset] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })

  // Auto-redirect if session is already active
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user: any) => {
      if (user) {
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            handlePostLoginRedirect(userDocSnap.data());
          }
        } catch (e) {
          console.error("Auto-redirect check failed:", e);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const handlePostLoginRedirect = (userData: any) => {
    if (redirectParam) {
      let dest = redirectParam
      if (vehicleIdParam) {
        dest += `?vehicleId=${vehicleIdParam}`
      }
      router.push(dest)
      return
    }

    const userRole = userData.role || 'client'
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

      toast({
        title: "Connexion réussie!",
        description: `Bienvenue !`,
      });

      handlePostLoginRedirect(userData)

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

  const handleForgotPassword = async () => {
    if (!forgotEmail.trim()) {
      toast({ variant: "destructive", title: "Email requis", description: "Veuillez saisir votre adresse e-mail." });
      return;
    }
    setSendingReset(true);
    try {
      await sendPasswordResetEmail(auth, forgotEmail.trim());
      toast({ title: "Email envoyé 📧", description: "Un lien de réinitialisation de mot de passe a été envoyé à votre adresse e-mail." });
      setForgotOpen(false);
      setForgotEmail("");
    } catch (e: any) {
      console.error(e);
      let errMsg = "Impossible d'envoyer l'e-mail de réinitialisation.";
      if (e.code === 'auth/user-not-found') {
        errMsg = "Aucun utilisateur trouvé avec cette adresse e-mail.";
      }
      toast({ variant: "destructive", title: "Erreur", description: errMsg });
    } finally {
      setSendingReset(false);
    }
  };

  return (
    <>
      <Card className="bg-slate-900/60 border border-slate-800 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden">
        <CardHeader className="pb-4">
          <CardTitle className="font-headline text-2xl text-white">Connexion</CardTitle>
          <CardDescription className="text-slate-400">Accédez à votre tableau de bord professionnel.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 text-left">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-200 font-semibold text-xs">Email</FormLabel>
                    <FormControl>
                      <Input placeholder="votre@email.com" className="bg-[#0D1322] border-slate-800 text-white placeholder-slate-500 rounded-xl h-11 focus-visible:ring-primary" {...field} />
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
                      <div className="relative">
                        <Input 
                          type={showPassword ? "text" : "password"} 
                          placeholder="********" 
                          className="bg-[#0D1322] border-slate-800 text-white placeholder-slate-500 rounded-xl h-11 pr-10 focus-visible:ring-primary w-full" 
                          {...field} 
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </FormControl>
                    <div className="flex justify-end mt-1">
                      <button
                        type="button"
                        onClick={() => setForgotOpen(true)}
                        className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold hover:underline"
                      >
                        Mot de passe oublié ?
                      </button>
                    </div>
                    <FormMessage className="text-red-400 text-xs" />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/95 hover:to-indigo-600/95 text-white font-bold h-12 shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all rounded-xl mt-6" size="lg" disabled={form.formState.isSubmitting || isGoogleLoading}>
                {form.formState.isSubmitting ? "Connexion en cours..." : "Se connecter"}
                <LogIn className="ml-2 h-4 w-4" />
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
            disabled={form.formState.isSubmitting || isGoogleLoading}
            onClick={async () => {
              setIsGoogleLoading(true);
              try {
                const provider = new GoogleAuthProvider();
                const result = await signInWithPopup(auth, provider);
                const user = result.user;

                const userDocRef = doc(db, 'users', user.uid);
                const userDocSnap = await getDoc(userDocRef);

                if (!userDocSnap.exists()) {
                  const newUser = {
                    firstName: user.displayName?.split(' ')[0] || '',
                    lastName: user.displayName?.split(' ').slice(1).join(' ') || '',
                    email: user.email,
                    phone: user.phoneNumber || '',
                    role: 'client',
                    isVerified: false,
                    createdAt: Timestamp.now(),
                  }
                  await setDoc(userDocRef, newUser);
                  toast({ title: "Bienvenue !", description: "Votre compte a été créé avec Google." });
                  handlePostLoginRedirect(newUser);
                } else {
                  const userData = userDocSnap.data();
                  if (userData.isSuspended) {
                    await auth.signOut();
                    toast({ variant: "destructive", title: "Compte suspendu", description: "Votre compte a été suspendu. Contactez le support." });
                    return;
                  }
                  toast({ title: "Connexion réussie!", description: "Bienvenue !" });
                  handlePostLoginRedirect(userData);
                }
              } catch (error: any) {
                if (error.code !== 'auth/popup-closed-by-user') {
                  toast({ variant: "destructive", title: "Erreur Google", description: error.message });
                }
              } finally {
                setIsGoogleLoading(false);
              }
            }}
          >
            {isGoogleLoading ? <Loader2 className="animate-spin h-5 w-5" /> : (
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
            )}
            Se connecter avec Google
          </Button>
        </CardContent>
        <CardFooter className="flex flex-col gap-3 text-sm border-t border-slate-800/60 pt-4">
           <p className="text-slate-400">
              Pas encore de compte ?{' '}
              <Link href="/signup/client" className="text-primary hover:text-primary/95 hover:underline font-semibold">
                S'inscrire
              </Link>
            </p>
            <Link href="/" className="w-full">
              <Button variant="outline" className="w-full bg-[#0D1322] border-slate-800 text-slate-300 hover:text-white rounded-xl h-10 text-xs">
                ← Retour à la page d'accueil
              </Button>
            </Link>
        </CardFooter>
      </Card>

      {/* Forgot Password Dialog */}
      <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl bg-slate-950 text-slate-100 border border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <KeyRound size={20} className="text-indigo-400" />
              Mot de passe oublié ?
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              Saisissez votre e-mail ci-dessous. Nous vous enverrons un lien pour réinitialiser votre mot de passe en toute sécurité.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-left">
            <label className="text-slate-300 text-xs font-semibold">Votre adresse e-mail</label>
            <Input
              type="email"
              placeholder="nom@exemple.com"
              value={forgotEmail}
              onChange={(e) => setForgotEmail(e.target.value)}
              className="bg-[#0D1322] border-slate-800 text-white rounded-xl h-11 focus-visible:ring-indigo-500"
            />
          </div>
          <DialogFooter className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => { setForgotOpen(false); setForgotEmail(""); }}
              className="rounded-xl border-slate-800 text-slate-300 hover:bg-slate-900"
            >
              Annuler
            </Button>
            <Button
              type="button"
              onClick={handleForgotPassword}
              disabled={sendingReset || !forgotEmail.trim()}
              className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
            >
              {sendingReset ? "Envoi en cours..." : "Réinitialiser"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center items-center h-48">
        <Loader2 className="animate-spin h-8 w-8 text-primary" />
      </div>
    }>
      <LoginFormContent />
    </Suspense>
  )
}
