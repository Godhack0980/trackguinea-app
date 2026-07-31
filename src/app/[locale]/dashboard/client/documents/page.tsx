"use client";

import React, { useRef } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { useDocumentData } from "react-firebase-hooks/firestore";
import { doc, updateDoc, Timestamp, collection, query, where, getDocs } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import { auth, db, storage } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { createNotification } from "@/lib/notifications";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Loader2, 
  FileUp, 
  Trash2, 
  Eye, 
  Calendar as CalendarIcon, 
  Save, 
  AlertTriangle,
  UploadCloud,
  CheckCircle2,
  XCircle,
  HelpCircle,
  FileCheck,
  AlertCircle,
  ShieldCheck
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/translations";
import { Progress } from "@/components/ui/progress";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";

import { verifyDocument } from "@/ai/flows/verify-document-flow";

const documentSchema = z.object({
  docNumber: z.string().min(1, "Le numéro de document est requis."),
  expiryDate: z.date({ required_error: "La date d'expiration est requise." }),
});

type DocumentFormData = z.infer<typeof documentSchema>;

interface DocumentInfo {
  url?: string;
  fileName?: string;
  uploadedAt?: Timestamp;
  docNumber?: string;
  expiryDate?: Timestamp;
  status?: 'approved' | 'rejected' | 'pending' | 'processing' | 'manual_verification';
  rejectionReason?: string;
  confidence?: number;
  warnings?: string[];
}

const DocumentManager = ({ 
    docInfo,
    userId,
    userData
}: { 
    docInfo: DocumentInfo,
    userId: string,
    userData: any
}) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState(0);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [isVerifying, setIsVerifying] = React.useState(false);
  const [isDragging, setIsDragging] = React.useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = React.useState(false);
  // User must choose the exact sub-type of their identity document before uploading
  const [selectedDocSubType, setSelectedDocSubType] = React.useState<'passport' | 'identityCard' | null>(null);
  const [subTypeError, setSubTypeError] = React.useState(false);
  
  const { t, lang } = useTranslation();
  const userDocRef = doc(db, "users", userId);
  const docKey = 'identityCard';
  const title = t["Pièce d'identité (Carte Nationale ou Passeport)"] || "Pièce d'identité (Carte Nationale ou Passeport)";

  const isInfoSaved = !!(docInfo?.docNumber && docInfo?.expiryDate);

  const form = useForm<DocumentFormData>({
    resolver: zodResolver(documentSchema),
    defaultValues: {
      docNumber: "",
      expiryDate: undefined,
    }
  });

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!isInfoSaved) return;
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (!isInfoSaved) {
      toast({
        variant: "destructive",
        title: "Informations requises",
        description: "Veuillez renseigner et enregistrer vos informations ci-dessus avant de pouvoir téléverser le document.",
      });
      return;
    }
    const file = e.dataTransfer.files?.[0];
    if (file) {
      await processFile(file);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isInfoSaved) {
      toast({
        variant: "destructive",
        title: "Informations requises",
        description: "Veuillez renseigner et enregistrer vos informations ci-dessus avant de pouvoir téléverser le document.",
      });
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;
    await processFile(file);
    if (e.target) e.target.value = "";
  };

  const processFile = async (file: File) => {
    if (typeof window !== 'undefined' && Notification.permission !== 'granted') {
      window.dispatchEvent(new CustomEvent('show-notification-reminder'));
    }
    // Require sub-type selection before upload
    if (!selectedDocSubType) {
      setSubTypeError(true);
      toast({
        variant: "destructive",
        title: "Sélection requise",
        description: "Veuillez d'abord choisir le type de document (Passeport ou Carte Nationale d'Identité) avant de téléverser.",
      });
      return;
    }
    setSubTypeError(false);
    // Validate network connectivity
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      toast({ 
        variant: "destructive", 
        title: "Pas de connexion Internet", 
        description: "Veuillez vous connecter à Internet pour pouvoir téléverser vos justificatifs." 
      });
      return;
    }

    // Validate size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({ 
        variant: "destructive", 
        title: "Fichier trop volumineux", 
        description: "La taille maximale autorisée est de 5 Mo." 
      });
      return;
    }

    // Validate mime-type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      toast({ 
        variant: "destructive", 
        title: "Format non supporté", 
        description: "Seuls les fichiers PDF, JPEG et PNG sont acceptés." 
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    const fileName = `${docKey}-${Date.now()}-${file.name}`;
    const storageRef = ref(storage, `documents/${userId}/${fileName}`);
    
    let uploadTask: ReturnType<typeof uploadBytesResumable> | null = null;
    let timeoutId: NodeJS.Timeout | null = null;

    try {
      if (docInfo?.fileName) {
          const oldFileRef = ref(storage, `documents/${userId}/${docInfo.fileName}`);
          await deleteObject(oldFileRef).catch(err => console.log("Old file not found, continuing."));
      }

      // Use uploadBytesResumable to track progress
      uploadTask = uploadBytesResumable(storageRef, file);

      // Timeout of 120 seconds (2 minutes) to support slow connections uploading large files
      timeoutId = setTimeout(() => {
        if (uploadTask) {
          uploadTask.cancel();
        }
      }, 120000);

      const downloadURL = await new Promise<string>((resolve, reject) => {
        if (!uploadTask) return reject(new Error("Upload task failed to initialize."));
        
        uploadTask.on('state_changed', 
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            setUploadProgress(Math.round(progress));
          }, 
          (error) => {
            if (timeoutId) clearTimeout(timeoutId);
            reject(error);
          }, 
          async () => {
            if (timeoutId) clearTimeout(timeoutId);
            try {
              if (!uploadTask) return reject(new Error("Upload task is null."));
              const url = await getDownloadURL(uploadTask.snapshot.ref);
              resolve(url);
            } catch (err) {
              reject(err);
            }
          }
        );
      });
      
      const updateData = {
        [`documents.${docKey}.url`]: downloadURL,
        [`documents.${docKey}.fileName`]: fileName,
        [`documents.${docKey}.uploadedAt`]: Timestamp.now(),
        [`documents.${docKey}.status`]: 'pending',
        [`documents.${docKey}.rejectionReason`]: null,
        [`documents.${docKey}.subType`]: selectedDocSubType,
      };
      await updateDoc(userDocRef, updateData);
      toast({ title: "Téléversement réussi" });

      // Trigger Gemini Multimodal AI Auto-Verification
      setIsVerifying(true);
      try {
        // Set document status to processing in Firestore
        await updateDoc(userDocRef, {
          [`documents.${docKey}.status`]: 'processing'
        });

        const result = (await verifyDocument({
          url: downloadURL,
          docKey,
          selectedDocSubType,
          expectedFirstName: userData?.firstName || "",
          expectedLastName: userData?.lastName || "",
          enteredDocNumber: form.getValues("docNumber") || undefined,
        })) as any;

        // Update Firestore client-side
        const updateData: any = {
          [`documents.${docKey}.status`]: result.isValid ? 'approved' : 'rejected',
          [`documents.${docKey}.verifiedAt`]: Timestamp.now(),
        };

        if (result.rejectionReason) {
          updateData[`documents.${docKey}.rejectionReason`] = result.rejectionReason;
        } else {
          updateData[`documents.${docKey}.rejectionReason`] = null;
        }

        if (result.docNumber) {
          updateData[`documents.${docKey}.docNumber`] = result.docNumber;
        }
        if (result.issueDateStr) {
          const issueDate = new Date(result.issueDateStr);
          if (!isNaN(issueDate.getTime())) {
            updateData[`documents.${docKey}.issueDate`] = Timestamp.fromDate(issueDate);
          }
        }
        if (result.expiryDateStr) {
          const expiryDate = new Date(result.expiryDateStr);
          if (!isNaN(expiryDate.getTime())) {
            updateData[`documents.${docKey}.expiryDate`] = Timestamp.fromDate(expiryDate);
          }
        }
        if (result.confidence !== undefined) {
          updateData[`documents.${docKey}.confidence`] = result.confidence;
        }
        if (result.warnings !== undefined) {
          updateData[`documents.${docKey}.warnings`] = result.warnings;
        }

        if (result.isValid) {
          updateData[`isIdentityVerified`] = true;
          updateData[`verifiedDocNumber`] = result.docNumber;
          updateData[`verifiedDocExpiry`] = result.expiryDateStr;
          updateData[`verifiedDocType`] = selectedDocSubType;
          if (result.dobStr) {
            updateData[`dateOfBirth`] = result.dobStr;
          }
          if (result.nationality) {
            updateData[`nationality`] = result.nationality;
          }
        }

        await updateDoc(userDocRef, updateData);

        // Calculate and update isVerified
        const currentDocs = {
          ...userData?.documents,
          [docKey]: {
            ...userData?.documents?.[docKey],
            status: result.isValid ? 'approved' : 'rejected',
            url: downloadURL,
          }
        };

        const role = userData?.role || 'client';
        let allApproved = false;
        if (role === 'transporter') {
          const requiredKeys = ['identityCard', 'license', 'insurance', 'carteGrise', 'technicalVisit'];
          allApproved = requiredKeys.every(k => currentDocs[k]?.status === 'approved' && !!currentDocs[k]?.url);
        } else {
          allApproved = currentDocs.identityCard?.status === 'approved' && !!currentDocs.identityCard?.url;
        }

        await updateDoc(userDocRef, {
          isVerified: allApproved
        });

        // Send notifications
        const userName = userData?.firstName && userData?.lastName 
          ? `${userData.firstName} ${userData.lastName}` 
          : 'Un utilisateur';
          
        await createNotification({
          userId: userId,
          message: result.isValid 
            ? `Votre document "${title}" a été validé avec succès par notre système.` 
            : `Votre document "${title}" a été refusé par notre système. Raison : ${result.rejectionReason || 'Veuillez soumettre à nouveau.'}`,
          href: '/dashboard/client/documents'
        });

        const adminsQuery = query(collection(db, 'users'), where('role', '==', 'admin'));
        const adminSnapshot = await getDocs(adminsQuery);
        adminSnapshot.forEach(async (adminDoc) => {
          await createNotification({
            userId: adminDoc.id,
            message: result.isValid 
              ? `L'utilisateur ${userName} a validé son document "${title}" via notre système.` 
              : `L'utilisateur ${userName} a eu son document "${title}" refusé par notre système.`,
            href: `/dashboard/admin/verification`
          });
        });

        if (result.isValid) {
          toast({ 
            title: "Document validé !", 
            description: `Votre pièce d'identité a été analysée et validée par notre système.`
          });
        } else {
          toast({ 
            variant: "destructive", 
            title: "Document refusé par notre système", 
            description: result.rejectionReason 
          });
        }
      } catch (verifyErr) {
        console.error("AI verification failed:", verifyErr);
      toast({ 
          variant: "destructive", 
          title: "Vérification indisponible", 
          description: "Le document sera examiné manuellement par l'administration." 
        });
      } finally {
        setIsVerifying(false);
      }

    } catch (err: any) {
      console.error("Upload error:", err);
      if (err?.code === 'storage/canceled') {
        toast({ 
          variant: "destructive", 
          title: "Téléversement expiré (Timeout)", 
          description: "Le téléversement a pris trop de temps ou a été bloqué par un problème réseau (ex: CORS). Veuillez réessayer." 
        });
      } else {
        toast({ 
          variant: "destructive", 
          title: "Erreur de téléversement", 
          description: "Impossible d'importer le fichier. Vérifiez les règles d'accès de votre stockage."
        });
      }
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleReVerify = async () => {
    if (!docInfo?.url) return;
    setIsVerifying(true);
    try {
      // Set document status to processing in Firestore
      await updateDoc(userDocRef, {
        [`documents.${docKey}.status`]: 'processing'
      });

      const result = (await verifyDocument({
        url: docInfo.url,
        docKey,
        selectedDocSubType,
        expectedFirstName: userData?.firstName || "",
        expectedLastName: userData?.lastName || "",
        enteredDocNumber: form.getValues("docNumber") || docInfo.docNumber || undefined,
      })) as any;

      // Update Firestore client-side
      const updateData: any = {
        [`documents.${docKey}.status`]: result.isValid ? 'approved' : 'rejected',
        [`documents.${docKey}.verifiedAt`]: Timestamp.now(),
      };

      if (result.rejectionReason) {
        updateData[`documents.${docKey}.rejectionReason`] = result.rejectionReason;
      } else {
        updateData[`documents.${docKey}.rejectionReason`] = null;
      }

      if (result.docNumber) {
        updateData[`documents.${docKey}.docNumber`] = result.docNumber;
      }
      if (result.issueDateStr) {
        const issueDate = new Date(result.issueDateStr);
        if (!isNaN(issueDate.getTime())) {
          updateData[`documents.${docKey}.issueDate`] = Timestamp.fromDate(issueDate);
        }
      }
      if (result.expiryDateStr) {
        const expiryDate = new Date(result.expiryDateStr);
        if (!isNaN(expiryDate.getTime())) {
          updateData[`documents.${docKey}.expiryDate`] = Timestamp.fromDate(expiryDate);
        }
      }
      if (result.confidence !== undefined) {
        updateData[`documents.${docKey}.confidence`] = result.confidence;
      }
      if (result.warnings !== undefined) {
        updateData[`documents.${docKey}.warnings`] = result.warnings;
      }

      await updateDoc(userDocRef, updateData);

      // Calculate and update isVerified
      const currentDocs = {
        ...userData?.documents,
        [docKey]: {
          ...userData?.documents?.[docKey],
          status: result.isValid ? 'approved' : 'rejected',
          url: docInfo.url,
        }
      };

      const role = userData?.role || 'client';
      let allApproved = false;
      if (role === 'transporter') {
        const requiredKeys = ['identityCard', 'license', 'insurance', 'carteGrise', 'technicalVisit'];
        allApproved = requiredKeys.every(k => currentDocs[k]?.status === 'approved' && !!currentDocs[k]?.url);
      } else {
        allApproved = currentDocs.identityCard?.status === 'approved' && !!currentDocs.identityCard?.url;
      }

      await updateDoc(userDocRef, {
        isVerified: allApproved
      });

      // Send notifications
      const userName = userData?.firstName && userData?.lastName 
        ? `${userData.firstName} ${userData.lastName}` 
        : 'Un utilisateur';
        
      await createNotification({
        userId: userId,
        message: result.isValid 
          ? `Votre document "${title}" a été validé avec succès par notre système.` 
          : `Votre document "${title}" a été refusé par notre système. Raison : ${result.rejectionReason || 'Veuillez soumettre à nouveau.'}`,
        href: '/dashboard/client/documents'
      });

      const adminsQuery = query(collection(db, 'users'), where('role', '==', 'admin'));
      const adminSnapshot = await getDocs(adminsQuery);
      adminSnapshot.forEach(async (adminDoc) => {
        await createNotification({
          userId: adminDoc.id,
          message: result.isValid 
            ? `L'utilisateur ${userName} a validé son document "${title}" via notre système.` 
            : `L'utilisateur ${userName} a eu son document "${title}" refusé par notre système.`,
          href: `/dashboard/admin/verification`
        });
      });

      if (result.isValid) {
        toast({ 
          title: "Document validé !", 
          description: `Votre pièce d'identité a été analysée et validée par notre système.`
        });
      } else {
        toast({ 
          variant: "destructive", 
          title: "Document refusé par notre système", 
          description: result.rejectionReason 
        });
      }
    } catch (verifyErr) {
      console.error("AI verification failed:", verifyErr);
      toast({ 
        variant: "destructive", 
        title: "Vérification indisponible", 
        description: "Le document sera examiné manuellement par l'administration." 
      });
    } finally {
      setIsVerifying(false);
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
            [`documents.${docKey}.status`]: null,
            [`documents.${docKey}.rejectionReason`]: null,
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
    if (!selectedDocSubType) {
      setSubTypeError(true);
      return;
    }

    // Validate passport number rules
    if (selectedDocSubType === 'passport') {
      const cleanNum = values.docNumber.toUpperCase().replace(/[^A-Z0-9]/g, "");
      if (cleanNum.length === 9) {
        if (cleanNum[0] === '0') {
          form.setError("docNumber", {
            type: "manual",
            message: "Le numéro de passeport à 9 caractères doit commencer par la lettre O et non par le chiffre 0."
          });
          return;
        }
        if (cleanNum[0] !== 'O') {
          form.setError("docNumber", {
            type: "manual",
            message: "Le numéro de passeport à 9 caractères doit commencer par la lettre O."
          });
          return;
        }
      } else if (cleanNum.length === 15) {
        if (/[^0-9]/.test(cleanNum)) {
          form.setError("docNumber", {
            type: "manual",
            message: "Le numéro NIN à 15 chiffres ne doit contenir que des chiffres."
          });
          return;
        }
      } else {
        form.setError("docNumber", {
          type: "manual",
          message: "Le numéro de passeport doit comporter soit 9 caractères (commençant par O) soit 15 chiffres (NIN)."
        });
        return;
      }
    }

    try {
      const updateData = {
        [`documents.${docKey}.docNumber`]: values.docNumber,
        [`documents.${docKey}.expiryDate`]: Timestamp.fromDate(values.expiryDate),
        [`documents.${docKey}.subType`]: selectedDocSubType,
      };
      await updateDoc(userDocRef, updateData);
      toast({ title: "Informations enregistrées" });
    } catch (err) {
      console.error("Update info error:", err);
      toast({ variant: "destructive", title: "Erreur d'enregistrement" });
    }
  };

  const handleRequestManualVerification = async () => {
    try {
      await updateDoc(userDocRef, {
        [`documents.${docKey}.status`]: 'manual_verification',
        [`documents.${docKey}.rejectionReason`]: "Demande de vérification manuelle transmise à l'administrateur.",
      });
      toast({
        title: "Demande envoyée",
        description: "Votre demande de vérification manuelle a bien été transmise.",
      });
    } catch (err) {
      console.error("Manual verification request error:", err);
      toast({ variant: "destructive", title: "Erreur lors de l'envoi de la demande" });
    }
  };
  
  const getExpirationWarning = () => {
    if (!docInfo?.expiryDate) return null;
    const expiry = docInfo.expiryDate.toDate();
    const diffTime = expiry.getTime() - Date.now();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return { type: 'expired', message: "Expiré !" };
    }
    if (diffDays <= 30) {
      return { type: 'expiring', message: `${diffDays} jours restants` };
    }
    return null;
  };

  const getValidityProgress = () => {
    if (!docInfo?.expiryDate || !docInfo?.uploadedAt) return null;
    const start = docInfo.uploadedAt.toDate().getTime();
    const end = docInfo.expiryDate.toDate().getTime();
    const now = Date.now();
    
    if (now >= end) return 0;
    if (now <= start) return 100;
    
    const total = end - start;
    const elapsed = now - start;
    const remaining = total - elapsed;
    return Math.round((remaining / total) * 100);
  };

  const expWarning = getExpirationWarning();
  const validityPercent = getValidityProgress();
  const hasUploaded = !!docInfo?.url;

  return (
    <Card className={cn(
      "shadow-xl rounded-3xl border transition-all duration-300 bg-card/60 backdrop-blur-md overflow-hidden",
      hasUploaded ? "border-indigo-500/30 shadow-indigo-500/5" : "border-border/50"
    )}>
      <CardHeader className="pb-3 border-b border-border/20 bg-muted/20">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
            <span className={cn(
              "flex h-8 w-8 items-center justify-center rounded-xl",
              hasUploaded ? "bg-indigo-500/10 text-indigo-400" : "bg-slate-800 text-muted-foreground"
            )}>
              <FileCheck size={16} />
            </span>
            {title}
          </CardTitle>
          <div className="flex items-center gap-2">
            {(isVerifying || docInfo?.status === 'processing') && (
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 animate-pulse flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" /> Vérification...
              </span>
            )}
            {!isVerifying && docInfo?.status === 'approved' && (
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Validé
              </span>
            )}
            {!isVerifying && docInfo?.status === 'rejected' && (
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
                Refusé
              </span>
            )}
            {!isVerifying && docInfo?.status === 'pending' && (
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                En attente
              </span>
            )}
            {!isVerifying && docInfo?.status === 'manual_verification' && (
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                Vérification manuelle
              </span>
            )}
            {expWarning && (
              <span className={cn(
                "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border flex items-center gap-1",
                expWarning.type === 'expired' 
                  ? "bg-red-500/10 text-red-400 border-red-500/20" 
                  : "bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse"
              )}>
                <AlertCircle size={10} /> {expWarning.message}
              </span>
            )}
            <span className={cn(
              "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border",
              hasUploaded 
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                : "bg-red-500/10 text-red-400 border-red-500/20"
            )}>
              {hasUploaded ? "Téléversé" : "Requis"}
            </span>
          </div>
        </div>
        <CardDescription className="text-xs mt-1">Renseignez les informations et téléversez une copie du document pour faire vérifier votre compte.</CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-5 pt-5">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onInfoSubmit)} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
              {/* Document sub-type selector — REQUIRED before upload */}
              <div className="sm:col-span-2">
                <label className={cn(
                  "block text-xs font-bold mb-1.5",
                  subTypeError ? "text-rose-400" : "text-muted-foreground"
                )}>
                  Type de document <span className="text-rose-400">*</span>
                </label>
                <Select
                  value={selectedDocSubType || ""}
                  onValueChange={(v) => {
                    setSelectedDocSubType(v as 'passport' | 'identityCard');
                    setSubTypeError(false);
                  }}
                >
                  <SelectTrigger className={cn(
                    "rounded-xl border-border/50 bg-background",
                    subTypeError && "border-rose-500 ring-1 ring-rose-500/50"
                  )}>
                    <SelectValue placeholder="Choisissez le type de votre document..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="passport">🛂 Passeport Guinéen (9 caractères / 15 chiffres)</SelectItem>
                    <SelectItem value="identityCard">🪪 Carte Nationale d'Identité CEDEAO (16 chiffres)</SelectItem>
                  </SelectContent>
                </Select>
                {subTypeError && (
                  <p className="text-xs text-rose-400 mt-1 flex items-center gap-1">
                    <AlertCircle size={12} /> Sélection obligatoire avant le téléversement.
                  </p>
                )}
              </div>

              <FormField control={form.control} name="docNumber" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold text-muted-foreground">Numéro du document</FormLabel>
                  <FormControl>
                    <Input {...field} className="rounded-xl border-border/50 bg-background" placeholder={selectedDocSubType === 'passport' ? 'Ex: GP1234567 (9 caractères) ou NIN (15 chiffres)' : selectedDocSubType === 'identityCard' ? 'Ex: 1234567890123456 (16 chiffres)' : 'Ex: N° de document'} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}/>
              
              <FormField control={form.control} name="expiryDate" render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel className="text-xs font-bold text-muted-foreground mb-1">Date d'expiration</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button variant={"outline"} className={cn("rounded-xl border-border/50 bg-background text-left font-normal", !field.value && "text-muted-foreground")}>
                          {field.value ? format(field.value, "dd MMM yyyy", { locale: fr }) : <span>Choisir...</span>}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    {/* The Calendar popover is theme-adaptive (no hardcoded dark classes like bg-slate-950) */}
                    <PopoverContent className="w-auto p-0 rounded-2xl">
                      <Calendar mode="single" selected={field.value} onSelect={field.onChange} captionLayout="dropdown-buttons" fromYear={new Date().getFullYear()} toYear={new Date().getFullYear() + 20} />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}/>
            </div>
            
            <div className="flex items-center justify-between gap-4">
              <Button type="submit" size="sm" className="rounded-xl font-bold bg-primary hover:bg-primary/95 text-white" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4"/>}
                Enregistrer les infos
              </Button>
              
              {!isVerifying && !isUploading && docInfo?.url && docInfo?.status !== 'approved' && (
                <Button type="button" onClick={handleReVerify} variant="outline" size="sm" className="rounded-xl border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10 font-bold">
                  Re-analyser le document
                </Button>
              )}
            </div>
          </form>
        </Form>

        {/* Validity progress bar */}
        {hasUploaded && validityPercent !== null && (
          <div className="p-3.5 rounded-2xl border border-border/20 bg-muted/10 space-y-1.5">
            <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase">
              <span>Validité du document</span>
              <span className={cn(
                validityPercent < 15 ? "text-rose-400 animate-pulse" : validityPercent < 30 ? "text-amber-400" : "text-emerald-400"
              )}>
                {validityPercent}% restant{validityPercent > 1 ? 's' : ''}
              </span>
            </div>
            <Progress 
              value={validityPercent} 
              className={cn(
                "h-1.5 bg-slate-900/60 border border-border/20",
                validityPercent < 15 ? "[&>div]:bg-rose-500" : validityPercent < 30 ? "[&>div]:bg-amber-500" : "[&>div]:bg-emerald-500"
              )} 
            />
          </div>
        )}
        
        {/* IA Verification Feedback Alert */}
        {isVerifying && (
          <div className="p-4 rounded-2xl border border-indigo-500/25 bg-indigo-500/5 text-indigo-300 text-xs flex items-start gap-2.5 mb-2 animate-pulse">
            <Loader2 className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5 animate-spin" />
            <div>
              <p className="font-bold text-foreground">Analyse en cours...</p>
              <p className="mt-0.5 text-muted-foreground leading-relaxed text-[11px]">Notre système est en train de vérifier la validité de votre pièce d'identité, d'extraire les dates et de confirmer la correspondance de votre identité. Veuillez patienter quelques instants...</p>
            </div>
          </div>
        )}

        {!isVerifying && docInfo?.status === 'rejected' && docInfo.rejectionReason && (
          <div className="p-4 rounded-2xl border border-rose-500/25 bg-rose-500/5 text-rose-300 text-xs flex items-start gap-2.5 mb-2">
            <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold text-foreground">{t["Document refusé par notre système"] || "Document refusé par notre système"}</p>
              <p className="mt-0.5 text-muted-foreground leading-relaxed text-[11px]">{t[docInfo.rejectionReason] || docInfo.rejectionReason}</p>
              <p className="mt-1 text-[10px] text-rose-400/80 font-medium">{t["Veuillez corriger le document et le téléverser de nouveau pour relancer la vérification."] || "Veuillez corriger le document et le téléverser de nouveau pour relancer la vérification."}</p>
              <div className="mt-3">
                <Button 
                  type="button" 
                  onClick={handleRequestManualVerification}
                  variant="outline" 
                  size="sm" 
                  className="rounded-xl border-amber-500/35 text-amber-400 hover:bg-amber-500/10 hover:text-amber-300 text-[10px] font-bold"
                >
                  {t["Demander une vérification manuelle par un admin"] || "Demander une vérification manuelle par un admin"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {!isVerifying && docInfo?.status === 'manual_verification' && (
          <div className="p-4 rounded-2xl border border-blue-500/25 bg-blue-500/5 text-blue-300 text-xs flex items-start gap-2.5 mb-2">
            <Loader2 className="h-4 w-4 text-blue-400 shrink-0 mt-0.5 animate-spin" />
            <div>
              <p className="font-bold text-foreground">{t["Vérification manuelle en cours"] || "Vérification manuelle en cours"}</p>
              <p className="mt-0.5 text-muted-foreground leading-relaxed text-[11px]">{t["Votre demande a été transmise à un administrateur général pour vérification manuelle. Vous recevrez une notification dès que vos documents auront été vérifiés."] || "Votre demande a été transmise à un administrateur général pour vérification manuelle."}</p>
            </div>
          </div>
        )}

        {/* AI verification checklist */}
        {!isVerifying && docInfo?.status && (
          <div className="p-3.5 rounded-2xl border border-border/10 bg-muted/30 dark:bg-slate-900/10 space-y-2">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{t["Résultats de la vérification :"] || "Résultats de la vérification :"}</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="flex items-center gap-1.5 p-2 rounded-xl bg-background border border-border/20 text-xs text-muted-foreground">
                {docInfo.status === 'approved' ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                ) : docInfo.status === 'rejected' && docInfo.rejectionReason?.toLowerCase().includes("type") ? (
                  <XCircle className="h-4 w-4 text-rose-400 shrink-0" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                )}
                <span className="truncate">{t["Type de document *"] || "Type de Doc"}</span>
              </div>
              <div className="flex items-center gap-1.5 p-2 rounded-xl bg-background border border-border/20 text-xs text-muted-foreground">
                {docInfo.status === 'approved' ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                ) : docInfo.status === 'rejected' && docInfo.rejectionReason?.toLowerCase().includes("nom") ? (
                  <XCircle className="h-4 w-4 text-rose-400 shrink-0" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                )}
                <span className="truncate">{t["Nom & Prénom"] || "Nom & Prénom"}</span>
              </div>
              <div className="flex items-center gap-1.5 p-2 rounded-xl bg-background border border-border/20 text-xs text-muted-foreground">
                {expWarning?.type === 'expired' ? (
                  <XCircle className="h-4 w-4 text-rose-400 shrink-0" />
                ) : docInfo.status === 'approved' ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                )}
                <span className="truncate">{t["Date d'expiration"] || "Date Validité"}</span>
              </div>
            </div>
            {docInfo.confidence !== undefined && (
              <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground p-2 rounded-xl bg-background border border-border/20">
                <span className="font-medium">{t["Score de confiance :"] || "Score de confiance :"}</span>
                <span className={cn(
                  "font-bold",
                  docInfo.confidence >= 80 ? "text-emerald-400" : docInfo.confidence >= 50 ? "text-amber-400" : "text-rose-400"
                )}>
                  {docInfo.confidence}%
                </span>
              </div>
            )}
            {docInfo.warnings && docInfo.warnings.length > 0 && (
              <div className="mt-2 p-2 rounded-xl bg-amber-500/5 border border-amber-500/20 text-xs text-amber-300 space-y-1">
                <p className="font-bold flex items-center gap-1">
                  <AlertCircle size={12} className="shrink-0" /> {t["Alertes détectées :"] || "Alertes détectées :"}
                </p>
                <ul className="list-disc list-inside text-[11px] text-muted-foreground space-y-0.5 animate-pulse">
                  {docInfo.warnings.map((w, idx) => (
                    <li key={idx}>{t[w] || w}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Drag & Drop Upload Zone */}
        {!isInfoSaved ? (
          <div className="p-6 rounded-3xl border-2 border-dashed border-rose-500/25 bg-rose-500/5 backdrop-blur-sm min-h-[140px] flex flex-col items-center justify-center gap-3 text-center">
            <div className="h-12 w-12 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <AlertCircle size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-foreground">{t["Téléversement verrouillé"] || "Téléversement verrouillé"}</p>
              <p className="text-[10px] text-muted-foreground mt-1 max-w-xs mx-auto">
                {t["Veuillez renseigner le type de document, le numéro et la date d'expiration ci-dessus, puis cliquez sur « Enregistrer les infos » pour déverrouiller le téléversement."] || "Veuillez renseigner le type de document, le numéro et la date d'expiration ci-dessus, puis cliquez sur « Enregistrer les infos » pour déverrouiller le téléversement."}
              </p>
            </div>
          </div>
        ) : (
          <div 
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => {
              if (!isUploading && !isVerifying) {
                fileInputRef.current?.click();
              }
            }}
            className={cn(
              "p-6 rounded-3xl border-2 border-dashed transition-all duration-300 cursor-pointer flex flex-col items-center justify-center gap-3 bg-muted/10 dark:bg-slate-950/20 backdrop-blur-sm min-h-[140px]",
              isDragging 
                ? "border-primary bg-primary/5 scale-[0.99] shadow-lg shadow-primary/5" 
                : "border-border/40 hover:border-indigo-500/40 hover:bg-muted/20 dark:hover:bg-slate-900/20",
              (isUploading || isVerifying) && "cursor-not-allowed opacity-80"
            )}
          >
          <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} accept="application/pdf,image/jpeg,image/png" />
          
          {isUploading ? (
            <div className="w-full space-y-3 py-2 text-center">
              <Loader2 className="h-8 w-8 text-primary animate-spin mx-auto" />
              <div>
                <p className="text-xs font-bold text-foreground">{t["Téléversement en cours..."] || "Téléversement en cours..."}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{t["Veuillez ne pas fermer cette page."] || "Veuillez ne pas fermer cette page."}</p>
              </div>
              <div className="max-w-xs mx-auto flex items-center gap-2">
                <Progress value={uploadProgress} className="h-1.5 bg-slate-900/60 border border-border/20 [&>div]:bg-primary" />
                <span className="text-[10px] font-bold text-muted-foreground shrink-0">{uploadProgress}%</span>
              </div>
            </div>
          ) : (
            <>
              <div className={cn(
                "h-12 w-12 rounded-2xl flex items-center justify-center transition-transform duration-300",
                hasUploaded ? "bg-indigo-500/10 text-indigo-400" : "bg-muted dark:bg-slate-900 text-muted-foreground"
              )}>
                <UploadCloud size={24} className={cn(isDragging && "animate-bounce")} />
              </div>
              <div className="text-center">
                <p className="text-xs font-bold text-foreground">
                  {hasUploaded ? (t["Glissez un fichier ou cliquez pour remplacer"] || "Glissez un fichier ou cliquez pour remplacer") : (t["Glissez-déposez votre document ici"] || "Glissez-déposez votre document ici")}
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {t["PDF, JPEG ou PNG jusqu'à 5 Mo"] || "PDF, JPEG ou PNG jusqu'à 5 Mo"}
                </p>
              </div>
            </>
          )}
        </div>
        )}

        {/* Upload Control Center */}
        {hasUploaded && !isUploading && (
          <div className="p-3.5 rounded-2xl border border-border/30 bg-muted/30 dark:bg-slate-950/40 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 shrink-0">
                <FileCheck size={16} />
              </span>
              <div className="min-w-0">
                <p className="font-bold text-foreground truncate max-w-[150px] sm:max-w-[250px]">
                  {docInfo.fileName?.split('-').slice(2).join('-') || (t["Document téléversé"] || "Document téléversé")}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {t["Téléversé le :"] || "Téléversé le :"} {docInfo.uploadedAt ? format(docInfo.uploadedAt.toDate(), "dd MMM yyyy 'à' HH:mm", { locale: fr }) : 'N/A'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-1.5 shrink-0">
              <Button type="button" onClick={() => setIsPreviewOpen(true)} variant="secondary" size="sm" className="h-8 rounded-xl font-bold px-3">
                <Eye className="mr-1.5 h-3.5 w-3.5" /> {t["Voir"] || "Voir"}
              </Button>
              <Button type="button" onClick={handleDeleteFile} variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-500/10" disabled={isDeleting}>
                {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin"/> : <Trash2 className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </div>
        )}
      </CardContent>

      {/* Preview Dialog */}
      {docInfo?.url && (
        <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
          <DialogContent className="max-w-4xl w-[90vw] h-[85vh] bg-slate-950 border-border rounded-3xl overflow-hidden flex flex-col p-6">
            <DialogHeader className="pb-3 border-b border-border/20 flex flex-row items-center justify-between">
              <div>
                <DialogTitle className="text-lg font-bold text-foreground">Prévisualisation du Document</DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">{title}</DialogDescription>
              </div>
            </DialogHeader>
            
            <div className="flex-grow w-full h-full relative mt-4 overflow-hidden rounded-2xl border border-border/30 bg-black flex items-center justify-center">
              {docInfo.fileName?.toLowerCase().includes('.pdf') || docInfo.url.toLowerCase().includes('.pdf') ? (
                <iframe src={`${docInfo.url}#toolbar=0`} className="w-full h-full border-none" title="Document PDF" />
              ) : (
                <img src={docInfo.url} alt={title} className="max-w-full max-h-full object-contain" />
              )}
            </div>
            
            <div className="pt-4 flex justify-end gap-2 shrink-0">
              <Button variant="outline" className="rounded-xl border-border/50 font-bold" onClick={() => setIsPreviewOpen(false)}>Fermer</Button>
              <Button asChild className="rounded-xl font-bold bg-primary text-white">
                <a href={docInfo.url} target="_blank" rel="noopener noreferrer">Ouvrir l'original</a>
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Card>
  )
}

export default function ClientDocumentsPage() {
  const { t, lang } = useTranslation();
  const [user] = useAuthState(auth);
  const userDocRef = user ? doc(db, "users", user.uid) : null;
  const [userData, loading, error] = useDocumentData(userDocRef);

  if (loading) {
    return <div className="flex justify-center items-center h-full min-h-[300px]"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>
  }
  if (error) {
    return <p className="text-destructive text-center p-4">Erreur: {error.message}</p>
  }
  if (!user) {
    return <p className="text-destructive text-center p-4">Vous devez être connecté pour voir cette page.</p>
  }

  const documentsData = userData?.documents || {};
  const identityCardInfo = documentsData.identityCard || {};
  const isVerified = userData?.isVerified || false;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Mes Documents</h1>
      
      {/* Verification Status Card */}
      <Card className={cn(
        "shadow-lg rounded-3xl border",
        isVerified 
          ? "border-emerald-500/25 bg-emerald-500/5 text-emerald-300" 
          : "border-amber-500/25 bg-amber-500/5 text-amber-300"
      )}>
        <CardHeader className="flex flex-row items-center gap-4">
          <span className={cn(
            "flex h-12 w-12 items-center justify-center rounded-2xl border",
            isVerified ? "bg-emerald-500/10 border-emerald-500/20" : "bg-amber-500/10 border-amber-500/20"
          )}>
            {isVerified ? <ShieldCheck className="h-6 w-6 text-emerald-400" /> : <AlertCircle className="h-6 w-6 text-amber-400" />}
          </span>
          <div>
            <CardTitle className="text-lg font-bold text-foreground">
              {isVerified ? "Profil Vérifié & Validé" : "Profil en attente d'approbation"}
            </CardTitle>
            <CardDescription className="text-xs mt-1">
              {isVerified 
                ? "Félicitations, vos documents ont été approuvés. Votre compte est pleinement actif." 
                : "Veuillez fournir une pièce d'identité valide pour que notre système et nos équipes puissent valider votre compte."
              }
            </CardDescription>
          </div>
        </CardHeader>
      </Card>

      <div className="grid lg:grid-cols-1 gap-6">
        <DocumentManager 
            docInfo={identityCardInfo}
            userId={user.uid}
            userData={userData}
        />
      </div>
    </div>
  );
}
