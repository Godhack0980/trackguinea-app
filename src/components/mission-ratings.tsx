"use client";

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, collection, addDoc, Timestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Star, Loader2, Award, ThumbsUp, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';

interface MissionRatingsProps {
  shipmentId: string;
  requestId: string;
  clientId: string;
  transporterId: string;
  userRole: 'client' | 'transporter' | 'admin';
  onReviewSubmitted: () => void;
}

export default function MissionRatings({
  shipmentId,
  requestId,
  clientId,
  transporterId,
  userRole,
  onReviewSubmitted
}: MissionRatingsProps) {
  const { toast } = useToast();

  const [submitting, setSubmitting] = useState(false);
  const [comment, setComment] = useState('');
  const [alreadyReviewed, setAlreadyReviewed] = useState(false);

  // Client metrics
  const [clientScores, setClientScores] = useState({
    punctuality: 5,
    communication: 5,
    cargoCondition: 5,
    professionalism: 5
  });

  // Transporter metrics
  const [transporterScores, setTransporterScores] = useState({
    waitingTime: 5,
    infoQuality: 5,
    behavior: 5
  });

  // Check if current party has already submitted review
  useEffect(() => {
    if (!shipmentId) return;
    const checkShipmentReview = async () => {
      try {
        const snap = await getDoc(doc(db, 'shipments', shipmentId));
        if (snap.exists()) {
          const data = snap.data();
          if (userRole === 'client' && data.clientReviewed) {
            setAlreadyReviewed(true);
          } else if ((userRole === 'transporter' || userRole === 'admin') && data.transporterReviewed) {
            setAlreadyReviewed(true);
          }
        }
      } catch (e) {
        console.error(e);
      }
    };
    checkShipmentReview();
  }, [shipmentId, userRole]);

  const handleClientStarClick = (metric: keyof typeof clientScores, score: number) => {
    setClientScores(prev => ({ ...prev, [metric]: score }));
  };

  const handleTransporterStarClick = (metric: keyof typeof transporterScores, score: number) => {
    setTransporterScores(prev => ({ ...prev, [metric]: score }));
  };

  const handleSubmitReview = async () => {
    setSubmitting(true);
    try {
      const targetUserId = userRole === 'client' ? transporterId : clientId;
      const raterUserId = userRole === 'client' ? clientId : transporterId;

      if (!targetUserId) {
        toast({ variant: 'destructive', title: 'Erreur', description: 'Destinataire de l\'évaluation introuvable.' });
        return;
      }

      // Calculate average score
      let averageScore = 0;
      let detailedScores = {};

      if (userRole === 'client') {
        const { punctuality, communication, cargoCondition, professionalism } = clientScores;
        averageScore = (punctuality + communication + cargoCondition + professionalism) / 4;
        detailedScores = clientScores;
      } else {
        const { waitingTime, infoQuality, behavior } = transporterScores;
        averageScore = (waitingTime + infoQuality + behavior) / 3;
        detailedScores = transporterScores;
      }

      // 1. Save in reviews collection
      await addDoc(collection(db, 'reviews'), {
        shipmentId,
        requestId,
        raterId: raterUserId || 'system',
        targetId: targetUserId,
        averageScore,
        detailedScores,
        comment: comment.trim(),
        createdAt: Timestamp.now()
      });

      // 2. Fetch target user to update rating averages
      const userRef = doc(db, 'users', targetUserId);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const uData = userSnap.data();
        const currentRating = uData.rating || 0;
        const ratingCount = uData.ratingCount || 0;

        const newRatingCount = ratingCount + 1;
        const newAverageRating = currentRating > 0
          ? ((currentRating * ratingCount) + averageScore) / newRatingCount
          : averageScore;

        await updateDoc(userRef, {
          rating: newAverageRating,
          ratingCount: newRatingCount
        });
      }

      // 3. Mark shipment as reviewed by this party
      const shipmentRef = doc(db, 'shipments', shipmentId);
      if (userRole === 'client') {
        await updateDoc(shipmentRef, { clientReviewed: true });
      } else {
        await updateDoc(shipmentRef, { transporterReviewed: true });
      }

      toast({ title: 'Évaluation enregistrée ! ⭐', description: 'Merci pour votre retour d\'expérience.' });
      setAlreadyReviewed(true);
      onReviewSubmitted();
    } catch (e) {
      console.error(e);
      toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de soumettre l\'évaluation.' });
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = (currentScore: number, onClick: (score: number) => void) => {
    return (
      <div className="flex items-center gap-1">
        {Array.from({ length: 5 }, (_, i) => {
          const index = i + 1;
          const active = index <= currentScore;
          return (
            <button
              key={index}
              type="button"
              onClick={() => onClick(index)}
              className="focus:outline-none transition-transform hover:scale-110"
            >
              <Star 
                size={16} 
                className={active ? "text-amber-400 fill-amber-400" : "text-slate-350 dark:text-slate-700"} 
              />
            </button>
          );
        })}
      </div>
    );
  };

  if (alreadyReviewed) {
    return (
      <Card className="border-slate-200 dark:border-border/50 bg-white dark:bg-card/60 shadow-lg rounded-2xl p-5 text-center text-xs space-y-2">
        <Award size={32} className="mx-auto text-emerald-500 animate-bounce" />
        <p className="font-bold text-slate-800 dark:text-slate-200">Évaluation envoyée avec succès !</p>
        <p className="text-[10px] text-muted-foreground">Votre note a été comptabilisée pour calculer le score de confiance de cette entreprise.</p>
      </Card>
    );
  }

  return (
    <Card className="border-slate-200 dark:border-border/50 bg-white dark:bg-card/60 shadow-xl rounded-3xl overflow-hidden">
      <CardHeader className="border-b border-border/20 pb-4">
        <CardTitle className="text-sm font-extrabold flex items-center gap-2">
          <Star className="text-amber-400 fill-amber-400" size={16} />
          {userRole === 'client' ? "Évaluer votre Transporteur" : "Évaluer le Client"}
        </CardTitle>
        <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
          {userRole === 'client' 
            ? "Prenez un instant pour évaluer la qualité de service et la ponctualité de votre chauffeur." 
            : "Partagez votre avis sur le respect des horaires, la clarté et le comportement du client."}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="p-5 space-y-4 text-xs">
        
        {/* Client ratings transporter */}
        {userRole === 'client' ? (
          <div className="space-y-3.5">
            {[
              { key: 'punctuality' as keyof typeof clientScores, label: "Ponctualité & Horaires", desc: "Respect des heures de chargement et déchargement" },
              { key: 'communication' as keyof typeof clientScores, label: "Communication", desc: "Clarté, amabilité et mises à jour de trajet" },
              { key: 'cargoCondition' as keyof typeof clientScores, label: "État de la marchandise", desc: "Soins apportés aux colis et intégrité" },
              { key: 'professionalism' as keyof typeof clientScores, label: "Professionnalisme", desc: "Respect général et tenue de route" }
            ].map(item => (
              <div key={item.key} className="flex items-center justify-between gap-3">
                <div className="text-left">
                  <p className="font-bold text-slate-850 dark:text-slate-200">{item.label}</p>
                  <p className="text-[10px] text-muted-foreground">{item.desc}</p>
                </div>
                {renderStars(clientScores[item.key], (score) => handleClientStarClick(item.key, score))}
              </div>
            ))}
          </div>
        ) : (
          // Transporter ratings client
          <div className="space-y-3.5">
            {[
              { key: 'waitingTime' as keyof typeof transporterScores, label: "Respect des horaires d'attente", desc: "Ponctualité du chargement/déchargement à l'arrivée" },
              { key: 'infoQuality' as keyof typeof transporterScores, label: "Qualité des informations", desc: "Exactitude du volume, poids et adresses" },
              { key: 'behavior' as keyof typeof transporterScores, label: "Comportement général", desc: "Courtoisie, accueil et professionnalisme" }
            ].map(item => (
              <div key={item.key} className="flex items-center justify-between gap-3">
                <div className="text-left">
                  <p className="font-bold text-slate-850 dark:text-slate-200">{item.label}</p>
                  <p className="text-[10px] text-muted-foreground">{item.desc}</p>
                </div>
                {renderStars(transporterScores[item.key], (score) => handleTransporterStarClick(item.key, score))}
              </div>
            ))}
          </div>
        )}

        {/* Text Comment */}
        <div className="space-y-1.5 pt-2 border-t border-border/20">
          <Label htmlFor="comment" className="font-bold text-slate-700 dark:text-slate-300">Commentaire (Optionnel)</Label>
          <Textarea 
            id="comment"
            placeholder="Laissez des détails sur votre expérience..."
            value={comment}
            onChange={e => setComment(e.target.value)}
            className="bg-white dark:bg-slate-950 border-slate-200 dark:border-border/30 rounded-xl min-h-[60px]"
          />
        </div>

        {/* Submit */}
        <Button 
          type="button" 
          onClick={handleSubmitReview}
          disabled={submitting}
          className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white font-bold h-10 rounded-xl flex items-center justify-center gap-2 border-0"
        >
          {submitting ? (
            <>
              <Loader2 className="animate-spin h-4 w-4" /> Envoi en cours...
            </>
          ) : (
            <>
              <Send size={14} /> Soumettre l&apos;évaluation
            </>
          )}
        </Button>

      </CardContent>
    </Card>
  );
}
