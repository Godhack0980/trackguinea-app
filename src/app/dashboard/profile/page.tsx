
"use client"

import { useState, useEffect, useRef } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useAuthState } from 'react-firebase-hooks/auth';
import { useDocumentData } from 'react-firebase-hooks/firestore';
import { doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { auth, db, storage } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Loader2, Mail, Phone, Truck, ShieldCheck, Star, Edit, Save, X, AlertTriangle, UserCog, Camera } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { useToast } from "@/hooks/use-toast"
import Image from "next/image"

const profileSchema = z.object({
  firstName: z.string().min(1, "Le prénom est requis."),
  lastName: z.string().min(1, "Le nom est requis."),
  phone: z.string().min(1, "Le numéro de téléphone est requis."),
});

export default function ProfilePage() {
  const [isEditing, setIsEditing] = useState(false)
  const { toast } = useToast()
  
  const [user, loadingAuth] = useAuthState(auth);
  const userDocRef = user ? doc(db, 'users', user.uid) : null;
  const [userData, loadingData, error] = useDocumentData(userDocRef, {
    snapshotListenOptions: { includeMetadataChanges: true },
  });

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      phone: "",
    },
  });
  
  useEffect(() => {
    if (userData) {
      form.reset({
        firstName: userData.firstName ?? '',
        lastName: userData.lastName ?? '',
        phone: userData.phone ?? '',
      });
      if(userData.photoURL) {
          setAvatarPreview(userData.photoURL);
      }
    }
  }, [userData, form]);


  const getInitials = () => {
    if (userData?.firstName && userData?.lastName) {
      return `${userData.firstName[0]}${userData.lastName[0]}`
    }
    return userData?.email?.[0]?.toUpperCase() ?? 'U';
  }
  
  const handleEditToggle = () => {
    if (isEditing) {
      setAvatarFile(null);
      setAvatarPreview(userData?.photoURL || null);
      form.reset({
        firstName: userData?.firstName ?? '',
        lastName: userData?.lastName ?? '',
        phone: userData?.phone ?? '',
      })
    }
    setIsEditing(!isEditing);
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          setAvatarFile(file);
          setAvatarPreview(URL.createObjectURL(file));
      }
  }

  const onSubmit = async (values: z.infer<typeof profileSchema>) => {
    if (!user || !userDocRef) {
        toast({ variant: 'destructive', title: "Erreur", description: "Utilisateur non connecté." });
        return;
    }
    setIsUploading(true);
    try {
        let photoURL = userData?.photoURL;

        if (avatarFile) {
            const storageRef = ref(storage, `profile-pictures/${user.uid}/${avatarFile.name}`);
            const snapshot = await uploadBytes(storageRef, avatarFile);
            photoURL = await getDownloadURL(snapshot.ref);
        }

        const dataToUpdate = {
            ...values,
            photoURL: photoURL,
        };

        await updateDoc(userDocRef, dataToUpdate);
        toast({
          title: "Profil mis à jour",
          description: "Vos informations ont été enregistrées avec succès.",
        });
        setIsEditing(false);
        setAvatarFile(null);
      } catch (err: any) {
        console.error("Error updating profile:", err);
        toast({
          variant: 'destructive',
          title: "Erreur de mise à jour",
          description: `Impossible de mettre à jour le profil. ${err.message}`,
        });
      } finally {
        setIsUploading(false);
      }
  };


  if (loadingData || loadingAuth) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    )
  }

  if (error) {
     return (
       <div className="min-h-screen bg-slate-50">
         <div className="px-6 lg:px-8 py-8 border-b border-slate-200 bg-white">
           <h1 className="text-3xl font-bold text-slate-900">Mon Profil</h1>
         </div>
         <div className="px-6 lg:px-8 py-8">
           <Card className="border-0 shadow-md rounded-xl bg-red-50 border border-red-200">
             <CardContent className="p-6">
               <p className="text-red-700">Impossible de charger le profil. {error.message}</p>
             </CardContent>
           </Card>
         </div>
       </div>
     )
  }

  if (!userData) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="px-6 lg:px-8 py-8 border-b border-slate-200 bg-white">
          <h1 className="text-3xl font-bold text-slate-900">Mon Profil</h1>
        </div>
        <div className="px-6 lg:px-8 py-8">
          <Card className="border-0 shadow-md rounded-xl">
            <CardContent className="p-6">
              <p className="text-slate-600">Les informations de l'utilisateur ne sont pas disponibles pour le moment.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }
  

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="px-6 lg:px-8 py-8 border-b border-slate-200 bg-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Mon Profil</h1>
            <p className="mt-2 text-slate-600 text-sm">Gérez vos informations personnelles</p>
          </div>
          <Button variant={isEditing ? "ghost" : "default"} onClick={handleEditToggle} className={isEditing ? "text-slate-600 hover:text-red-600" : "bg-teal-600 hover:bg-teal-700"}>
            {isEditing ? <><X className="mr-2 h-4 w-4" /> Annuler</> : <><Edit className="mr-2 h-4 w-4" /> Modifier</>}
          </Button>
        </div>
      </div>

      <div className="px-6 lg:px-8 py-8">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {/* Profile Header */}
            <Card className="border-0 shadow-md rounded-xl bg-white overflow-hidden">
              <div className="h-24 bg-gradient-to-r from-teal-500 to-cyan-500"></div>
              <CardContent className="px-6 pb-6">
                <div className="flex flex-col sm:flex-row sm:items-end gap-6 -mt-12 mb-6">
                  <div className="relative">
                    <Avatar className="h-32 w-32 border-4 border-white shadow-lg">
                      <AvatarImage src={avatarPreview || `https://placehold.co/128x128/008080/FFFFFF/png?text=${getInitials()}`} />
                      <AvatarFallback className="bg-teal-100 text-teal-700 text-3xl">{getInitials()}</AvatarFallback>
                    </Avatar>
                    {isEditing && (
                      <>
                        <input
                          type="file"
                          accept="image/png, image/jpeg"
                          ref={fileInputRef}
                          onChange={handleAvatarChange}
                          className="hidden"
                        />
                        <Button 
                          type="button" 
                          size="icon" 
                          className="absolute bottom-2 right-2 rounded-full bg-teal-600 hover:bg-teal-700 shadow-lg"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <Camera className="h-4 w-4"/>
                        </Button>
                      </>
                    )}
                  </div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                      {userData.firstName} {userData.lastName}
                      {userData.isVerified && userData.role === 'transporter' && (
                        <ShieldCheck className="h-6 w-6 text-green-500" />
                      )}
                    </h2>
                    <p className="text-sm text-slate-600 mt-1 capitalize">
                      {userData.role === 'client' && 'Client'}
                      {userData.role === 'transporter' && 'Transporteur'}
                      {userData.role === 'client-company' && 'Entreprise (Client)'}
                      {userData.role === 'transporter-company' && 'Entreprise (Transporteur)'}
                      {userData.role === 'admin' && 'Administrateur'}
                    </p>
                  </div>
                </div>

                {/* Contact Information */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <Mail className="h-5 w-5 text-slate-400"/>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Email</p>
                      <p className="text-sm font-medium text-slate-900">{userData.email}</p>
                    </div>
                  </div>
                  {isEditing ? (
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input placeholder="Téléphone" {...field} className="mt-2"/>
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  ) : (
                    <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
                      <Phone className="h-5 w-5 text-slate-400"/>
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Téléphone</p>
                        <p className="text-sm font-medium text-slate-900">{userData.phone}</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Editable Information */}
            {isEditing && (
              <Card className="border-0 shadow-md rounded-xl bg-white">
                <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-teal-50 to-cyan-50">
                  <CardTitle>Informations Personnelles</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid sm:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Prénom</FormLabel>
                          <FormControl>
                            <Input placeholder="Prénom" {...field} />
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
                            <Input placeholder="Nom" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="mt-6 flex justify-end gap-3">
                    <Button type="button" variant="ghost" onClick={handleEditToggle}>Annuler</Button>
                    <Button type="submit" disabled={isUploading || form.formState.isSubmitting} className="bg-teal-600 hover:bg-teal-700">
                      {(isUploading || form.formState.isSubmitting) ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2"/>
                          Enregistrement...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2"/>
                          Enregistrer
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Transporter Information */}
            {userData.role === 'transporter' && (
              <Card className="border-0 shadow-md rounded-xl bg-white overflow-hidden">
                <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-teal-50 to-cyan-50">
                  <CardTitle className="flex items-center gap-2">
                    <Truck className="h-5 w-5 text-teal-600"/> Informations du Véhicule
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid sm:grid-cols-2 gap-6">
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Type de véhicule</p>
                      <p className="text-sm font-medium text-slate-900 mt-2 capitalize">{userData.vehicleType || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Immatriculation</p>
                      <p className="text-sm font-medium text-slate-900 mt-2 uppercase">{userData.vehicleRegistration || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Type de permis</p>
                      <p className="text-sm font-medium text-slate-900 mt-2">{userData.licenseType || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Années d'expérience</p>
                      <p className="text-sm font-medium text-slate-900 mt-2">{userData.experienceYears || 0} ans</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Statistics */}
            {userData.role === 'transporter' && (
              <div>
                <h3 className="text-lg font-bold text-slate-900 mb-4">Statistiques</h3>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card className="border-0 shadow-md rounded-xl bg-white">
                    <CardContent className="p-6">
                      <div className="text-center">
                        <p className="text-3xl font-bold text-teal-600 flex items-center justify-center gap-1">
                          {userData.rating || '0'} <Star className="h-5 w-5 text-yellow-400" fill="currentColor"/>
                        </p>
                        <p className="text-xs text-slate-600 uppercase tracking-wide mt-2">Évaluation</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-0 shadow-md rounded-xl bg-white">
                    <CardContent className="p-6">
                      <div className="text-center">
                        <p className="text-3xl font-bold text-slate-900">{userData.jobsCompleted || 0}</p>
                        <p className="text-xs text-slate-600 uppercase tracking-wide mt-2">Courses terminées</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {/* Verification Status */}
            {userData.isVerified === false && userData.role === 'transporter' && (
              <Card className="border-0 shadow-md rounded-xl bg-orange-50 border border-orange-200">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <AlertTriangle className="h-6 w-6 text-orange-600 flex-shrink-0 mt-0.5"/>
                    <div>
                      <h3 className="font-semibold text-orange-900">Profil en attente de vérification</h3>
                      <p className="text-sm text-orange-800 mt-2">Votre profil doit être vérifié par un administrateur avant de pouvoir accéder à toutes les fonctionnalités.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </form>
        </Form>
      </div>
    </div>
  );
}