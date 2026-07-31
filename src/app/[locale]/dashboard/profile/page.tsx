
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
import { Loader2, Mail, Phone, Truck, ShieldCheck, Star, Edit, Save, X, AlertTriangle, UserCog, Camera, Key } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { useToast } from "@/hooks/use-toast"
import Image from "next/image"
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "firebase/auth"
import { useTranslation } from "@/lib/translations"
import { PasswordInput } from "@/components/ui/password-input"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"

const profileSchema = z.object({
  firstName: z.string().min(1, "Le prénom est requis."),
  lastName: z.string().min(1, "Le nom est requis."),
  phone: z.string().min(1, "Le numéro de téléphone est requis."),
});

export default function ProfilePage() {
  const [isEditing, setIsEditing] = useState(false)
  const { toast } = useToast()
  const { t, lang } = useTranslation()

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);

  const handleChangePassword = async () => {
    if (!currentPassword) {
        toast({ variant: "destructive", title: "Erreur", description: "Le mot de passe actuel est requis." });
        return;
    }
    if (!newPassword || newPassword.length < 8) {
        toast({ variant: "destructive", title: "Erreur", description: "Le nouveau mot de passe doit faire au moins 8 caractères." });
        return;
    }
    if (newPassword !== confirmNewPassword) {
        toast({ variant: "destructive", title: "Erreur", description: "Les nouveaux mots de passe ne correspondent pas." });
        return;
    }
    setUpdatingPassword(true);
    try {
        const currentUser = auth.currentUser;
        if (!currentUser || !currentUser.email) throw new Error("Utilisateur non authentifié.");
        
        // Re-authenticate first
        const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
        await reauthenticateWithCredential(currentUser, credential);
        
        // Update password
        await updatePassword(currentUser, newPassword);
        
        toast({ title: "Mot de passe modifié ✅", description: "Votre mot de passe a été mis à jour avec succès." });
        setShowPasswordDialog(false);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmNewPassword("");
    } catch (e: any) {
        console.error("Error changing password:", e);
        let msg = "Impossible de changer le mot de passe.";
        if (e.code === 'auth/wrong-password') {
            msg = "Le mot de passe actuel est incorrect.";
        } else if (e.code === 'auth/invalid-credential') {
            msg = "Identifiants invalides. Veuillez vérifier votre mot de passe actuel.";
        }
        toast({ variant: "destructive", title: "Erreur", description: msg });
    } finally {
        setUpdatingPassword(false);
    }
  };
  
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
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (error) {
     return <Card className="shadow-md rounded-2xl border-border"><CardHeader><CardTitle>Erreur</CardTitle></CardHeader><CardContent><p>Impossible de charger le profil. {error.message}</p></CardContent></Card>
  }

  if (!userData) {
    return (
        <Card className="shadow-md rounded-2xl border-border">
            <CardHeader>
                <CardTitle>Profil non disponible</CardTitle>
            </CardHeader>
            <CardContent>
                <p>Les informations de l'utilisateur ne sont pas disponibles pour le moment.</p>
            </CardContent>
        </Card>
    )
  }
  

  return (
    <div className="p-6 space-y-6">
       <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-primary">{t.profile}</h1>
            <Button variant="outline" onClick={handleEditToggle}>
            {isEditing ? <><X className="mr-2 h-4 w-4" /> {t.cancel}</> : <><Edit className="mr-2 h-4 w-4" /> {lang === "fr" ? "Modifier le profil" : "Edit Profile"}</>}
            </Button>
       </div>
      <Card className="shadow-md rounded-2xl border-border">
         <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
                <CardHeader className="flex flex-col items-center text-center space-y-4">
                 <div className="relative">
                    <Avatar className="h-24 w-24">
                        <AvatarImage src={avatarPreview || `https://placehold.co/96x96/E0F8F8/008080/png?text=${getInitials()}`} asChild>
                            <Image src={avatarPreview || `https://placehold.co/96x96/E0F8F8/008080/png?text=${getInitials()}`} width={96} height={96} alt="Avatar"/>
                        </AvatarImage>
                        <AvatarFallback className="text-3xl">{getInitials()}</AvatarFallback>
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
                         <Button type="button" size="icon" variant="secondary" className="absolute bottom-0 right-0 rounded-full" onClick={() => fileInputRef.current?.click()}>
                            <Camera className="h-4 w-4"/>
                            <span className="sr-only">Changer la photo</span>
                         </Button>
                        </>
                    )}
                </div>
                <div>
                    <CardTitle className="text-3xl flex items-center gap-2">
                    {userData.firstName} {userData.lastName}
                    {userData.role === 'transporter' && userData.isVerified && <span title="Vérifié"><ShieldCheck className="h-6 w-6 text-green-500"/></span>}
                    </CardTitle>
                    <CardDescription className="capitalize">{lang === "fr" ? "Connecté en tant que" : "Signed in as"}: {userData.role}</CardDescription>
                </div>
                </CardHeader>
                <CardContent className="mt-6 max-w-lg mx-auto">
                    {isEditing ? (
                        <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="firstName"
                                    render={({ field }) => (
                                        <FormItem>
                                        <FormLabel>{t.profile_first_name}</FormLabel>
                                        <FormControl>
                                            <Input {...field} />
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
                                        <FormLabel>{t.profile_last_name}</FormLabel>
                                        <FormControl>
                                            <Input {...field} />
                                        </FormControl>
                                        <FormMessage />
                                        </FormItem>
                                    )}
                                />
                        </div>
                        <FormField
                                control={form.control}
                                name="phone"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>{t.profile_phone}</FormLabel>
                                    <FormControl>
                                        <Input {...field} />
                                    </FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <div className="flex justify-end gap-2">
                                <Button type="button" variant="ghost" onClick={handleEditToggle}>Annuler</Button>
                                <Button type="submit" disabled={isUploading || form.formState.isSubmitting}>
                                    {(isUploading || form.formState.isSubmitting) ? <Loader2 className="animate-spin"/> : <><Save className="mr-2 h-4 w-4"/> Enregistrer</>}
                                </Button>
                            </div>
                        </div>
                    ) : (
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 p-3 bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-500/10 rounded-xl">
                            <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">ID Unique :</span>
                            <span className="font-mono text-sm font-bold text-slate-800 dark:text-slate-200 select-all">{userData.uniqueId || user?.uid}</span>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-md">
                            <Mail className="h-5 w-5 text-muted-foreground"/>
                            <span className="font-medium">{userData.email}</span>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-md">
                            <Phone className="h-5 w-5 text-muted-foreground"/>
                            <span className="font-medium">{userData.phone}</span>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-md">
                            <UserCog className="h-5 w-5 text-muted-foreground"/>
                            <span className="font-medium capitalize">{userData.role}</span>
                        </div>

                        {/* Modification du mot de passe */}
                        <Dialog open={showPasswordDialog} onOpenChange={(val) => {
                            setShowPasswordDialog(val);
                            if (!val) {
                                setCurrentPassword("");
                                setNewPassword("");
                                setConfirmNewPassword("");
                            }
                        }}>
                            <DialogTrigger asChild>
                                <Button type="button" variant="outline" className="w-full border-slate-800 text-slate-300 hover:text-white rounded-xl flex items-center justify-center gap-2 h-11 transition-all">
                                    <Key size={16} className="text-indigo-400" />
                                    {lang === "fr" ? "Modifier mon mot de passe" : "Change Password"}
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="rounded-2xl border-border max-w-sm">
                                <DialogHeader>
                                    <DialogTitle className="text-lg font-bold">{lang === "fr" ? "Modifier le mot de passe" : "Change Password"}</DialogTitle>
                                    <DialogDescription className="text-xs">
                                        {lang === "fr" ? "Sécurisez votre compte en mettant à jour votre mot de passe d'accès." : "Secure your account by updating your access password."}
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-3 py-3">
                                    <div className="space-y-1">
                                        <Label className="text-xs font-bold text-muted-foreground">Mot de passe actuel</Label>
                                        <PasswordInput
                                            placeholder="********"
                                            value={currentPassword}
                                            onChange={e => setCurrentPassword(e.target.value)}
                                            disabled={updatingPassword}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs font-bold text-muted-foreground">Nouveau mot de passe</Label>
                                        <PasswordInput
                                            placeholder="Min. 8 caractères"
                                            value={newPassword}
                                            onChange={e => setNewPassword(e.target.value)}
                                            disabled={updatingPassword}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs font-bold text-muted-foreground">Confirmer le nouveau mot de passe</Label>
                                        <PasswordInput
                                            placeholder="Confirmez"
                                            value={confirmNewPassword}
                                            onChange={e => setConfirmNewPassword(e.target.value)}
                                            disabled={updatingPassword}
                                        />
                                    </div>
                                </div>
                                <DialogFooter className="gap-2">
                                    <Button type="button" variant="ghost" disabled={updatingPassword} onClick={() => setShowPasswordDialog(false)}>Annuler</Button>
                                    <Button type="button" onClick={handleChangePassword} disabled={updatingPassword} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
                                        {updatingPassword ? <><Loader2 className="animate-spin mr-2 h-4 w-4" />Modification...</> : "Mettre à jour"}
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>

                        {userData.role === 'transporter' && (
                        <>
                            <Card className="shadow-md rounded-2xl border-border">
                                <CardHeader>
                                    <CardTitle className="text-lg text-accent flex items-center"><Truck className="mr-3"/> Informations du véhicule</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Type de véhicule</span>
                                        <span className="font-medium capitalize">{userData.vehicleType}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Immatriculation</span>
                                        <span className="font-medium uppercase">{userData.vehicleRegistration}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Type de permis</span>
                                        <span className="font-medium">{userData.licenseType}</span>
                                    </div>
                                </CardContent>
                            </Card>
                            <div className="grid grid-cols-2 gap-4 text-center">
                                <Card className="p-3 shadow-md rounded-2xl border-border">
                                    <p className="text-sm text-muted-foreground">Évaluation</p>
                                    <p className="font-bold text-lg flex items-center justify-center gap-1">
                                        {userData.rating || 'N/A'} <Star className="h-4 w-4 text-amber-400" fill="currentColor"/>
                                    </p>
                                </Card>
                                <Card className="p-3 shadow-md rounded-2xl border-border">
                                    <p className="text-sm text-muted-foreground">Courses terminées</p>
                                    <p className="font-bold text-lg">{userData.jobsCompleted || 0}</p>
                                </Card>
                                <Card className="p-3 shadow-md rounded-2xl border-border">
                                    <p className="text-sm text-muted-foreground">Années d'expérience</p>
                                    <p className="font-bold text-lg">{userData.experienceYears || 0}</p>
                                </Card>
                            </div>
                            {userData.isVerified === false && (
                                <Badge variant="destructive" className="w-full justify-center text-base p-2">
                                <AlertTriangle className="mr-2" />
                                Profil en attente de vérification
                                </Badge>
                            )}
                        </>
                        )}
                    </div>
                    )}
                </CardContent>
                 {isEditing && (
                    <CardFooter>
                        <p className="text-xs text-muted-foreground text-center w-full">Pour modifier votre email ou d'autres informations sensibles, veuillez contacter le support.</p>
                    </CardFooter>
                )}
            </form>
        </Form>
      </Card>
    </div>
  )
}

    