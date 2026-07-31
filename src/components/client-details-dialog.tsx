"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
  User, Phone, Mail, MapPin, ShieldCheck, MessageSquare, ExternalLink, Loader2, Building2
} from "lucide-react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";

interface ClientProfileData {
  id: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  phone?: string;
  email?: string;
  city?: string;
  address?: string;
  role?: string;
  isVerified?: boolean;
}

interface ClientDetailsDialogProps {
  clientId: string;
  clientName?: string;
  trigger?: React.ReactNode;
}

export function ClientDetailsDialog({ clientId, clientName, trigger }: ClientDetailsDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<ClientProfileData | null>(null);
  const { toast } = useToast();

  const handleOpenChange = async (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen && clientId && !profile) {
      setLoading(true);
      try {
        const userSnap = await getDoc(doc(db, "users", clientId));
        if (userSnap.exists()) {
          setProfile({ id: userSnap.id, ...userSnap.data() } as ClientProfileData);
        } else {
          setProfile({
            id: clientId,
            firstName: clientName || "Client",
            lastName: "",
          });
        }
      } catch (err) {
        console.error("Error fetching client details:", err);
        toast({
          variant: "destructive",
          title: "Erreur",
          description: "Impossible de charger les détails du client.",
        });
      } finally {
        setLoading(false);
      }
    }
  };

  const displayName = profile 
    ? (profile.companyName || `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || clientName || "Client")
    : (clientName || "Client");

  const cleanPhone = profile?.phone ? profile.phone.replace(/[^0-9+]/g, '') : '';

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button 
            variant="outline" 
            size="sm" 
            className="rounded-full text-xs font-semibold h-8 gap-1.5 border-primary/30 text-primary hover:bg-primary/10 transition-all"
          >
            <User className="h-3.5 w-3.5" />
            <span>Info Client</span>
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-md rounded-3xl bg-card border-border/80 text-foreground shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
            <User className="h-5 w-5 text-primary" /> Fiche Information Client
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Coordonnées et détails de contact du client pour cette livraison.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center items-center py-10">
            <Loader2 className="animate-spin h-8 w-8 text-primary" />
          </div>
        ) : (
          <div className="space-y-5 py-2">
            {/* Header profile card */}
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-muted/30 border border-border/40">
              <Avatar className="h-14 w-14 border-2 border-primary/20">
                <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(displayName)}`} />
                <AvatarFallback className="bg-primary/10 text-primary font-extrabold text-lg">
                  {displayName.charAt(0)}
                </AvatarFallback>
              </Avatar>
              
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-base text-foreground">{displayName}</h3>
                  {profile?.isVerified && (
                    <Badge className="bg-emerald-500/15 text-emerald-500 border-emerald-500/30 text-[10px] font-bold gap-1 px-2 py-0.5">
                      <ShieldCheck className="h-3 w-3" /> Vérifié
                    </Badge>
                  )}
                </div>

                <p className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                  {profile?.role === 'client-company' ? (
                    <span className="flex items-center gap-1 text-accent font-semibold"><Building2 size={12}/> Client Entreprise Pro</span>
                  ) : (
                    <span>Client Particulier</span>
                  )}
                </p>
              </div>
            </div>

            {/* Contact details */}
            <div className="space-y-3">
              {/* Phone & WhatsApp */}
              <div className="p-3.5 rounded-2xl bg-muted/20 border border-border/30 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                    <Phone className="h-4 w-4 text-emerald-500" /> Téléphone
                  </span>
                  <span className="font-bold text-foreground">{profile?.phone || "Non renseigné"}</span>
                </div>

                {cleanPhone && (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <Button 
                      asChild 
                      size="sm"
                      className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 shadow-sm"
                    >
                      <a href={`tel:${cleanPhone}`}>
                        <Phone className="mr-1.5 h-3.5 w-3.5" /> Appeler
                      </a>
                    </Button>

                    <Button 
                      asChild 
                      size="sm"
                      className="rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs h-9 shadow-sm"
                    >
                      <a href={`https://wa.me/${cleanPhone.replace('+', '')}`} target="_blank" rel="noopener noreferrer">
                        <MessageSquare className="mr-1.5 h-3.5 w-3.5" /> WhatsApp
                      </a>
                    </Button>
                  </div>
                )}
              </div>

              {/* Email */}
              {profile?.email && (
                <div className="p-3 rounded-2xl bg-muted/20 border border-border/30 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                    <Mail className="h-4 w-4 text-indigo-500" /> E-mail
                  </span>
                  <a href={`mailto:${profile.email}`} className="font-bold text-primary hover:underline truncate max-w-[200px]">
                    {profile.email}
                  </a>
                </div>
              )}

              {/* City / Address */}
              {(profile?.city || profile?.address) && (
                <div className="p-3 rounded-2xl bg-muted/20 border border-border/30 flex items-start justify-between text-xs">
                  <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 text-rose-500 shrink-0" /> Adresse / Ville
                  </span>
                  <span className="font-bold text-foreground text-right">
                    {[profile.address, profile.city].filter(Boolean).join(", ")}
                  </span>
                </div>
              )}
            </div>

            {/* Direct internal message link */}
            <Button 
              asChild 
              variant="outline" 
              className="w-full rounded-xl border-primary/40 text-primary hover:bg-primary/10 font-bold text-xs h-10"
              onClick={() => setOpen(false)}
            >
              <Link href={`/dashboard/messages?userId=${clientId}`}>
                <MessageSquare className="mr-2 h-4 w-4" />
                Ouvrir la Messagerie Interne
              </Link>
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
