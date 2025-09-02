
"use client"

import { useAuthState } from "react-firebase-hooks/auth"
import { useDocumentData, useCollection } from "react-firebase-hooks/firestore"
import { doc, collection, query, where, orderBy, Timestamp } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Star, Loader2, MessageSquare, History } from "lucide-react"
import { format } from "date-fns"
import type { TransportRequest } from "@/ai/types"


const RatingStars = ({ rating }: { rating: number }) => {
  return (
    <div className="flex items-center">
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          className={`h-5 w-5 ${i < rating ? 'text-amber-400' : 'text-gray-300'}`}
          fill={i < rating ? 'currentColor' : 'none'}
        />
      ))}
    </div>
  )
}

export default function TransporterRatingsPage() {
  const [user, loadingAuth] = useAuthState(auth);
  const [userData, loadingUser] = useDocumentData(user ? doc(db, 'users', user.uid) : undefined);
  
  const ratingsQuery = user ? query(
    collection(db, 'requests'),
    where('assignedTo', '==', user.uid),
    where('status', '==', 'Terminé'),
    where('rating', '>', 0),
    orderBy('rating', 'desc'),
    orderBy('createdAt', 'desc')
  ) : null;
  
  const [ratingsSnapshot, loadingRatings, error] = useCollection(ratingsQuery);
  const ratings = ratingsSnapshot?.docs.map(doc => ({ id: doc.id, ...doc.data() }))

  const isLoading = loadingAuth || loadingUser || loadingRatings;

  if (isLoading) {
    return <div className="flex justify-center items-center h-full"><Loader2 className="animate-spin h-8 w-8" /></div>
  }
  
  if (error) {
    console.error("Error loading ratings:", error);
    return <p className="text-destructive text-center">Erreur: impossible de charger les évaluations.</p>
  }

  const averageRating = userData?.rating || 0;
  const ratingCount = userData?.ratingCount || 0;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold text-primary">Mes Évaluations</h1>
      <Card className="shadow-md rounded-2xl border-border">
        <CardHeader>
          <CardTitle className="text-lg text-accent">Évaluation Moyenne</CardTitle>
          <div className="flex items-center gap-2 pt-2">
            <p className="text-3xl font-bold">{averageRating.toFixed(1)}</p>
            <RatingStars rating={Math.round(averageRating)} />
            <span className="text-muted-foreground">({ratingCount} évaluations)</span>
          </div>
        </CardHeader>
      </Card>

      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-accent">Commentaires des clients</h3>
        {ratings && ratings.length > 0 ? ratings.map(rating => {
          const typedRating = rating as TransportRequest;
          return (
          <Card key={typedRating.id} className="shadow-md rounded-2xl border-border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback>{typedRating.clientName?.substring(0,2) || 'CL'}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">{typedRating.clientName}</p>
                    <p className="text-sm text-muted-foreground">{format((typedRating.createdAt as Timestamp).toDate(), "PPP")}</p>
                  </div>
                </div>
                <RatingStars rating={typedRating.rating!} />
              </div>
            </CardHeader>
            {typedRating.comment && (
              <CardContent>
                <p className="text-muted-foreground italic">"{typedRating.comment}"</p>
              </CardContent>
            )}
          </Card>
        )}) : (
          <Card className="shadow-md rounded-2xl border-border">
            <CardContent className="p-10 text-center text-muted-foreground">
                <MessageSquare className="mx-auto h-12 w-12" />
                <p className="mt-4 font-semibold">Aucune évaluation reçue</p>
                <p className="text-sm">Vos évaluations de clients apparaîtront ici une fois les courses terminées.</p>
            </CardContent>
        </Card>
        )}
      </div>
    </div>
  )
}
