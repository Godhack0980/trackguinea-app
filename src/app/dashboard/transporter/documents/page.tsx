
"use client";

import React, { useRef } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { useDocumentData } from "react-firebase-hooks/firestore";
import {
  doc,
  updateDoc,
  Timestamp,
} from "firebase/firestore";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { auth, db, storage } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, FileUp, Trash2, Eye, Calendar as CalendarIcon, Save } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

const documentSchema = z.object({
  docNumber: z.string().min(1, "Le numéro de document est requis."),
  issueDate: z.date({ required_error: "La date de délivrance est requise."}),
  expiryDate: z.date({ required_error: "La date d'expiration est requise."}),
});

type DocumentFormData = z.infer<typeof documentSchema>;

interface DocumentInfo {
  url?: string;
  fileName?: string;
  uploadedAt?: Timestamp;
  docNumber?: string;
  issueDate?: Timestamp;
  expiryDate?: Timestamp;
}

const documentTypes = {
  identityCard: "Carte d'identité",
  license: "Permis de conduire",
  insurance: "Assurance véhicule",
  carteGrise: "Carte grise",
};

type DocumentKey = keyof typeof documentTypes;

const DocumentManager = ({ 
    docKey,
    title,
    docInfo,
    userId 
}: { 
    docKey: DocumentKey, 
    title: string, 
    docInfo: DocumentInfo,
    userId: string
}) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const userDocRef = doc(db, "users", userId);

  const form = useForm<DocumentFormData>({
    resolver: zodResolver(documentSchema),
    defaultValues: {
      docNumber: docInfo?.docNumber || "",
      issueDate: docInfo?.issueDate?.toDate(),
      expiryDate: docInfo?.expiryDate?.toDate(),
    }
  });

  React.useEffect(() => {
    form.reset({
      docNumber: docInfo?.docNumber || "",
      issueDate: docInfo?.issueDate?.toDate(),
      expiryDate: docInfo?.expiryDate?.toDate(),
    });
  }, [docInfo, form]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const fileName = `${docKey}-${Date.now()}-${file.name}`;
    const storageRef = ref(storage, `documents/${userId}/${fileName}`);
    
    try {
      if (docInfo?.fileName) {
          const oldFileRef = ref(storage, `documents/${userId}/${docInfo.fileName}`);
          await deleteObject(oldFileRef).catch(err => console.log("Old file not found, continuing."));
      }
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      
      const updateData = {
        [`documents.${docKey}.url`]: downloadURL,
        [`documents.${docKey}.fileName`]: fileName,
        [`documents.${docKey}.uploadedAt`]: Timestamp.now(),
      };
      await updateDoc(userDocRef, updateData);
      toast({ title: "Téléversement réussi" });
    } catch (err) {
      console.error("Upload error:", err);
      toast({ variant: "destructive", title: "Erreur de téléversement" });
    } finally {
      setIsUploading(false);
      if (e.target) e.target.value = "";
    }
  };

  const handleDeleteFile = async () => {
    if (!docInfo?.fileName) return;
    setIsDeleting(true);
    const storageRef = ref(storage, `documents/${userId}/${docInfo.fileName}`);
    try {
        await deleteObject(storageRef);
        await updateDoc(userDocRef, {
            [`documents.${docKey}.url`]: null,
            [`documents.${docKey}.fileName`]: null,
            [`documents.${docKey}.uploadedAt`]: null,
        });
        toast({ title: "Fichier supprimé" });
    } catch (err) {
        console.error("Delete error:", err);
        toast({ variant: "destructive", title: "Erreur de suppression" });
    } finally {
        setIsDeleting(false);
    }
  };

  const onInfoSubmit = async (values: DocumentFormData) => {
    try {
      const updateData = {
        [`documents.${docKey}.docNumber`]: values.docNumber,
        [`documents.${docKey}.issueDate`]: Timestamp.fromDate(values.issueDate),
        [`documents.${docKey}.expiryDate`]: Timestamp.fromDate(values.expiryDate),
      };
      await updateDoc(userDocRef, updateData);
      toast({ title: "Informations enregistrées" });
    } catch (err) {
      console.error("Update info error:", err);
      toast({ variant: "destructive", title: "Erreur d'enregistrement" });
    }
  };
  
  return (
    <Card className="shadow-md rounded-2xl border-border">
      <CardHeader>
        <CardTitle className="text-lg text-accent">{title}</CardTitle>
        <CardDescription>Renseignez les informations et téléversez une copie du document.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onInfoSubmit)} className="space-y-4">
            <FormField control={form.control} name="docNumber" render={({ field }) => (
              <FormItem><FormLabel>Numéro du document</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
            <div className="grid sm:grid-cols-2 gap-4">
              <FormField control={form.control} name="issueDate" render={({ field }) => (
                <FormItem className="flex flex-col"><FormLabel>Date de délivrance</FormLabel><Popover><PopoverTrigger asChild>
                  <FormControl><Button variant={"outline"} className={cn(!field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP", { locale: fr }) : <span>Choisir...</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl>
                </PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} captionLayout="dropdown-buttons" fromYear={2000} toYear={new Date().getFullYear()} /></PopoverContent></Popover><FormMessage /></FormItem>
              )}/>
              <FormField control={form.control} name="expiryDate" render={({ field }) => (
                <FormItem className="flex flex-col"><FormLabel>Date d'expiration</FormLabel><Popover><PopoverTrigger asChild>
                  <FormControl><Button variant={"outline"} className={cn(!field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP", { locale: fr }) : <span>Choisir...</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl>
                </PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} captionLayout="dropdown-buttons" fromYear={new Date().getFullYear()} toYear={new Date().getFullYear() + 20} /></PopoverContent></Popover><FormMessage /></FormItem>
              )}/>
            </div>
            <Button type="submit" size="sm" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4"/>}
              Enregistrer les infos
            </Button>
          </form>
        </Form>
        <div className="p-4 rounded-md border bg-muted/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex-grow">
            <p className="font-semibold">Fichier</p>
            {docInfo?.url ? (
              <p className="text-sm text-muted-foreground">
                Téléversé le: {docInfo.uploadedAt ? format(docInfo.uploadedAt.toDate(), "PPP 'à' HH:mm", { locale: fr }) : 'N/A'}
              </p>
            ) : (
              <p className="text-sm text-destructive">Aucun fichier téléversé.</p>
            )}
          </div>
          <div className="flex items-center gap-2 self-end sm:self-center">
            <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} accept="application/pdf,image/jpeg,image/png" />
            <Button onClick={() => fileInputRef.current?.click()} variant="outline" size="sm" disabled={isUploading}>
              {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <FileUp className="mr-2 h-4 w-4" />}
              {docInfo?.url ? "Remplacer" : "Ajouter"}
            </Button>
            {docInfo?.url && (
              <>
                <Button asChild variant="secondary" size="sm"><a href={docInfo.url} target="_blank" rel="noopener noreferrer"><Eye className="mr-2 h-4 w-4" />Voir</a></Button>
                <Button onClick={handleDeleteFile} variant="destructive" size="sm" disabled={isDeleting}>
                  {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Trash2 className="mr-2 h-4 w-4" />}Supprimer
                </Button>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}


export default function TransporterDocumentsPage() {
  const [user] = useAuthState(auth);
  const userDocRef = user ? doc(db, "users", user.uid) : null;
  const [userData, loading, error] = useDocumentData(userDocRef);

  if (loading) {
    return <div className="flex justify-center items-center h-full"><Loader2 className="animate-spin h-8 w-8" /></div>
  }
   if (error) {
    return <p className="text-destructive text-center p-4">Erreur: {error.message}</p>
  }
  if (!user) {
    return <p className="text-destructive text-center p-4">Vous devez être connecté pour voir cette page.</p>
  }

  const documentsData = userData?.documents || {};

  return (
    <div className="p-6 space-y-6">
       <h1 className="text-3xl font-bold text-primary">Documents de vérification</h1>
       <Card className="shadow-md rounded-2xl border-border">
        <CardHeader>
            <CardTitle className="text-lg text-accent">Mes documents</CardTitle>
            <CardDescription>
                Remplissez toutes les sections pour faire vérifier votre profil et commencer à accepter des courses.
            </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        {(Object.keys(documentTypes) as DocumentKey[]).map(key => (
          <DocumentManager 
            key={key}
            docKey={key}
            title={documentTypes[key]}
            docInfo={documentsData[key] || {}}
            userId={user.uid}
          />
        ))}
      </div>
    </div>
  );
}
