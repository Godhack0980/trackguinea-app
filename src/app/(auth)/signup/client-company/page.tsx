
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Building, ArrowRight, Loader2 } from "lucide-react"
import { useState } from "react"
import { Textarea } from "@/components/ui/textarea"

const formSchema = z.object({
  companyName: z.string().min(1, { message: "Le nom de l'entreprise est requis." }),
  rccm: z.string().min(1, { message: "Le numéro de RCCM est requis." }),
  address: z.string().min(1, { message: "L'adresse est requise." }),
  contactFirstName: z.string().min(1, { message: "Le prénom du contact est requis." }),
  contactLastName: z.string().min(1, { message: "Le nom du contact est requis." }),
  email: z.string().email({ message: "Adresse e-mail invalide." }),
  phone: z.string().min(1, { message: "Le téléphone est requis." }),
  password: z.string().min(8, { message: "Le mot de passe doit contenir au moins 8 caractères." }),
})

export default function ClientCompanySignupPage() {
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
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      const user = userCredential.user;
      
      // We set the companyId to the user's UID who created it.
      // This user becomes the 'admin' of the company account.
      await setDoc(doc(db, "users", user.uid), {
        // We use contactFirstName/LastName for the user's name fields for consistency
        firstName: values.contactFirstName,
        lastName: values.contactLastName,
        email: values.email,
        phone: values.phone,
        companyName: values.companyName,
        rccm: values.rccm,
        address: values.address,
        role: 'client-company',
        companyId: user.uid, // The founder's UID is the company ID
        companyRole: 'admin', // The founder is the admin
        isVerified: false, // Company accounts might need verification
        createdAt: Timestamp.now(),
      });
      
      toast({
        title: "Bienvenue !",
        description: "Votre compte entreprise a été créé avec succès.",
      });
      
      router.push(`/dashboard/client-company`);

    } catch (error: any) {
      console.error("Error signing up company:", error);
      
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
        <CardTitle className="font-headline text-2xl">Inscription Entreprise Cliente</CardTitle>
        <CardDescription>Créez votre compte professionnel pour gérer vos transports.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="companyName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom de l'entreprise</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Global Corp" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="rccm"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Numéro de RCCM</FormLabel>
                  <FormControl>
                    <Input placeholder="Numéro de Registre de Commerce" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Adresse de l'entreprise</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Adresse complète..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <div className="grid grid-cols-2 gap-4">
                <FormField
                control={form.control}
                name="contactFirstName"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Prénom du contact</FormLabel>
                    <FormControl>
                        <Input placeholder="Fatoumata" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="contactLastName"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Nom du contact</FormLabel>
                    <FormControl>
                        <Input placeholder="Barry" {...field} />
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
                  <FormLabel>Email de l'entreprise</FormLabel>
                  <FormControl>
                    <Input placeholder="contact@entreprise.com" {...field} />
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
              {isSubmitting ? <Loader2 className="animate-spin" /> : "Créer le compte Entreprise"}
              {!isSubmitting && <ArrowRight className="ml-2 h-4 w-4" />}
            </Button>
          </form>
        </Form>
      </CardContent>
       <CardFooter className="flex justify-center text-sm">
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
