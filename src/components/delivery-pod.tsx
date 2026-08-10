"use client";

import React, { useState, useRef, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { doc, updateDoc, collection, addDoc, Timestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Camera, Edit3, Trash2, CheckCircle2, ShieldCheck, MapPin, X } from 'lucide-react';

interface DeliveryPodProps {
  shipmentId: string;
  requestId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function DeliveryPod({ shipmentId, requestId, isOpen, onClose, onSuccess }: DeliveryPodProps) {
  const { toast } = useToast();
  
  const [recipientName, setRecipientName] = useState('');
  const [remarks, setRemarks] = useState('');
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [photoName, setPhotoName] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [fetchingGps, setFetchingGps] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const lastPosRef = useRef({ x: 0, y: 0 });

  // Get GPS position immediately when modal opens
  useEffect(() => {
    if (isOpen) {
      setFetchingGps(true);
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setGpsCoords({
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
            });
            setFetchingGps(false);
          },
          (err) => {
            console.error("GPS error:", err);
            setFetchingGps(false);
          },
          { enableHighAccuracy: true, timeout: 5000 }
        );
      } else {
        setFetchingGps(false);
      }
    }
  }, [isOpen]);

  // Setup Canvas drawing handlers when Canvas element mounts/resizes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Reset styles
    ctx.strokeStyle = '#1e1b4b'; // Indigo dark
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, [isOpen]);

  if (!isOpen) return null;

  // Drawing functions for signature pad
  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    
    // Scale coordinates to match actual canvas resolution vs screen size
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    return {
      x: ((clientX - rect.left) / rect.width) * canvas.width,
      y: ((clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    isDrawingRef.current = true;
    const pos = getCoordinates(e);
    lastPosRef.current = pos;
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    e.preventDefault();

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const pos = getCoordinates(e);

    ctx.beginPath();
    ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();

    lastPosRef.current = pos;
  };

  const stopDrawing = () => {
    isDrawingRef.current = false;
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPhotoName(file.name);

      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoBase64(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleConfirm = async () => {
    if (!recipientName.trim()) {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Le nom du réceptionnaire est requis.' });
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Check if canvas is empty (basic check: see if any non-zero pixels exist)
    const ctx = canvas.getContext('2d');
    const buffer = ctx ? ctx.getImageData(0, 0, canvas.width, canvas.height).data : [];
    const isCanvasEmpty = !Array.from(buffer).some(val => val !== 0);

    if (isCanvasEmpty) {
      toast({ variant: 'destructive', title: 'Erreur', description: 'La signature du destinataire est requise.' });
      return;
    }

    setSubmitting(true);
    try {
      const signatureUrl = canvas.toDataURL(); // Base64 signature
      
      const podData = {
        recipientName: recipientName.trim(),
        remarks: remarks.trim(),
        photoUrl: photoBase64 || '',
        signatureUrl,
        lat: gpsCoords?.lat || 9.53, // fallback to Conakry coordinates
        lng: gpsCoords?.lng || -13.67,
        timestamp: Date.now()
      };

      // 1. Update Shipment document in Firestore
      await updateDoc(doc(db, 'shipments', shipmentId), {
        status: 'livre',
        lastUpdated: Date.now(),
        pod: podData
      });

      // 2. Update parent request status to Terminé
      if (requestId) {
        await updateDoc(doc(db, 'requests', requestId), {
          status: 'Terminé',
          completedAt: Timestamp.now()
        });
      }

      // 3. Add system log to chat
      await addDoc(collection(db, `shipments/${shipmentId}/messages`), {
        senderId: 'system',
        senderName: 'Système',
        senderRole: 'system',
        text: `📦 Mission livrée. Destinataire: ${recipientName.trim()}. Preuve de livraison (POD) enregistrée et signée.`,
        timestamp: Timestamp.now()
      });

      toast({ title: 'Succès ! 🎉', description: 'La livraison a été confirmée et signée.' });
      onSuccess();
      onClose();
    } catch (e) {
      console.error("Error saving POD:", e);
      toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible d\'enregistrer les données de livraison.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <Card className="max-w-md w-full border-slate-200 dark:border-border/50 bg-white dark:bg-[#0D1322] text-slate-900 dark:text-white rounded-3xl overflow-hidden shadow-2xl">
        <CardHeader className="border-b border-border/20 pb-4 relative shrink-0">
          <CardTitle className="text-base font-extrabold flex items-center gap-2">
            <ShieldCheck className="text-emerald-500" size={18} />
            Preuve de Livraison Numérique (POD)
          </CardTitle>
          <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
            Enregistrez les informations requises pour valider définitivement le transport.
          </CardDescription>
          <Button 
            size="icon" 
            variant="ghost" 
            className="absolute top-4 right-4 h-8 w-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-900"
            onClick={onClose}
          >
            <X size={15} />
          </Button>
        </CardHeader>
        
        <CardContent className="p-5 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
          
          {/* GPS Coordinates display */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-border/10 flex items-center gap-3">
            <MapPin size={18} className="text-rose-500 animate-bounce" />
            <div className="text-[10px] text-left">
              <p className="font-extrabold text-slate-700 dark:text-slate-300">Position GPS d&apos;arrivée</p>
              {fetchingGps ? (
                <p className="text-muted-foreground flex items-center gap-1.5"><Loader2 size={10} className="animate-spin"/> Localisation en cours...</p>
              ) : gpsCoords ? (
                <p className="text-slate-600 dark:text-slate-400 font-mono">Lat: {gpsCoords.lat.toFixed(5)}, Lng: {gpsCoords.lng.toFixed(5)} (Précision OK)</p>
              ) : (
                <p className="text-amber-500 font-bold">Signal faible · Utilisation coordonnées estimées</p>
              )}
            </div>
          </div>

          {/* Recipient name */}
          <div className="space-y-1">
            <Label htmlFor="recipient" className="text-slate-700 dark:text-slate-300 font-bold">Nom complet du réceptionnaire *</Label>
            <Input 
              id="recipient"
              placeholder="Ex: M. Ousmane Diallo"
              value={recipientName}
              onChange={e => setRecipientName(e.target.value)}
              className="bg-white dark:bg-slate-950 border-slate-200 dark:border-border/30 h-10 rounded-xl"
            />
          </div>

          {/* Remarks */}
          <div className="space-y-1">
            <Label htmlFor="remarks" className="text-slate-700 dark:text-slate-300 font-bold">Observations / Remarques (Optionnel)</Label>
            <Textarea 
              id="remarks"
              placeholder="Ex: Colis scellés intacts. Déchargement rapide."
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              className="bg-white dark:bg-slate-950 border-slate-200 dark:border-border/30 rounded-xl min-h-[60px]"
            />
          </div>

          {/* Photo delivery upload */}
          <div className="space-y-1">
            <Label className="text-slate-700 dark:text-slate-300 font-bold">Preuve en photo (Optionnel)</Label>
            <div className="flex items-center gap-3">
              <input 
                type="file" 
                id="photoPod" 
                accept="image/*" 
                capture="environment"
                onChange={handlePhotoUpload} 
                className="hidden" 
              />
              <Button 
                type="button" 
                variant="outline"
                onClick={() => document.getElementById('photoPod')?.click()}
                className="h-10 rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-border/20 text-xs font-bold gap-1.5 shrink-0"
              >
                <Camera size={14} /> Prendre une photo
              </Button>
              <div className="text-[10px] text-muted-foreground truncate max-w-[200px]">
                {photoName || "Aucune image sélectionnée"}
              </div>
            </div>
            {photoBase64 && (
              <img src={photoBase64} alt="POD" className="mt-2 h-20 rounded-xl object-cover border border-border/10" />
            )}
          </div>

          {/* Interactive Signature canvas pad */}
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <Label className="text-slate-700 dark:text-slate-300 font-bold">Signature du réceptionnaire *</Label>
              <Button 
                type="button" 
                size="sm" 
                variant="ghost" 
                onClick={clearCanvas}
                className="h-7 px-2 text-[10px] text-rose-500 hover:text-rose-600 font-bold flex items-center gap-1"
              >
                <Trash2 size={11} /> Effacer
              </Button>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-border/30 bg-slate-50 overflow-hidden relative">
              <canvas
                ref={canvasRef}
                width={400}
                height={160}
                className="w-full h-40 cursor-crosshair touch-none"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
              />
            </div>
          </div>

          {/* Submission button */}
          <div className="pt-2 flex gap-2">
            <Button 
              type="button" 
              variant="ghost" 
              disabled={submitting} 
              onClick={onClose} 
              className="flex-1 rounded-xl"
            >
              Annuler
            </Button>
            <Button 
              type="button" 
              onClick={handleConfirm}
              disabled={submitting || !recipientName.trim()}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl gap-1.5 border-0"
            >
              {submitting ? (
                <>
                  <Loader2 className="animate-spin h-4 w-4" /> Enregistrement...
                </>
              ) : (
                <>
                  <CheckCircle2 size={15} /> Valider la Livraison
                </>
              )}
            </Button>
          </div>

        </CardContent>
      </Card>
    </div>
  );
}
