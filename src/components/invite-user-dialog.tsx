"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useToast } from "@/hooks/use-toast"
import { db } from "@/lib/firebase"
import { addDoc, collection, Timestamp } from "firebase/firestore"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Loader2 } from "lucide-react"

interface InviteUserDialogProps {
  companyId: string
  companyName: string
  // For now, we only support inviting transporters. This can be expanded later.
  role: "transporter" 
  triggerButton: React.ReactNode
}

const inviteSchema = z.object({
  email: z.string().email("Adresse e-mail invalide."),
  firstName: z.string().min(1, "Le prénom est requis."),
  lastName: z.string().min(1, "Le nom est requis."),
})

export default function InviteUserDialog({
  companyId,
  companyName,
  role,
  triggerButton,
}: InviteUserDialogProps) {
  const [open, setOpen] = useState(false)
  const { toast } = useToast()

  const form = useForm<z.infer<typeof inviteSchema>>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: "", firstName: "", lastName: "" },
  })

  const { isSubmitting } = form.formState

  const onSubmit = async (values: z.infer<typeof inviteSchema>) => {
    try {
      await addDoc(collection(db, "users"), {
        ...values,
        role: role,
        companyId: companyId,
        companyName: companyName,
        companyRole: role === 'transporter' ? 'driver' : 'member', // Simple logic for now
        isPlaceholder: true,
        isVerified: false,
        createdAt: Timestamp.now(),
      })

      toast({
        title: "Invitation envoyée",
        description: `Une invitation a été préparée pour ${values.email}. La personne devra s'inscrire avec cet e-mail pour rejoindre votre entreprise.`,
      })
      form.reset()
      setOpen(false)
    } catch (error) {
      console.error("Erreur lors de l’invitation :", error)
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible d'envoyer l'invitation.",
      })
    }
  }

  const roleText = role === 'transporter' ? "chauffeur" : "membre";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{triggerButton}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Inviter un nouveau {roleText}</DialogTitle>
          <DialogDescription>
            Entrez les informations de la personne. Elle devra ensuite s'inscrire elle-même
            avec le même e-mail pour rejoindre votre flotte.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
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
                    <Input type="email" placeholder={`${roleText}@email.com`} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Envoyer l'invitation
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
