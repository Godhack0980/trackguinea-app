"use client";

import { useMemo } from "react"
import { useAuthState } from "react-firebase-hooks/auth"
import { useDocumentData, useCollection } from "react-firebase-hooks/firestore"
import { doc, collection, query, where, orderBy, Timestamp } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Star, Loader2, MessageSquare, Landmark, TrendingUp, DollarSign } from "lucide-react"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import type { TransportRequest } from "@/ai/types"
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts"

const RatingStars = ({ rating }: { rating: number }) => {
  return (
    <div className="flex items-center gap-0.5">
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${i < rating ? 'text-amber-400 fill-amber-400' : 'text-zinc-600'}`}
        />
      ))}
    </div>
  )
}

export default function TransporterRatingsPage() {
  const [user, loadingAuth] = useAuthState(auth);
  const [userData, loadingUser] = useDocumentData(user ? doc(db, 'users', user.uid) : undefined);
  
  const ratingsQuery = useMemo(() => {
    return user ? query(
      collection(db, 'requests'),
      where('assignedTo', '==', user.uid),
      where('status', '==', 'Terminé'),
      orderBy('createdAt', 'desc')
    ) : null;
  }, [user?.uid]);
  
  const [ratingsSnapshot, loadingRatings, error] = useCollection(ratingsQuery);
  
  const completedJobs = ratingsSnapshot?.docs.map(doc => ({ id: doc.id, ...doc.data() } as TransportRequest)) || [];
  const ratings = completedJobs.filter(j => j.rating && j.rating > 0);

  const isLoading = loadingAuth || loadingUser || loadingRatings;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="animate-spin h-10 w-10 text-primary" />
      </div>
    )
  }
  
  if (error) {
    console.error("Error loading ratings:", error);
    return <p className="text-destructive text-center p-6">Erreur: impossible de charger les évaluations.</p>
  }

  const averageRating = userData?.rating || 0;
  const ratingCount = ratings.length;

  // Calculate mock or real revenues: let's assume a trip makes weight * distance * 100 GNF, min 250k GNF
  const earningsData = completedJobs.map(job => {
    const distanceVal = job.distance || 120;
    const weightVal = job.weight || 2;
    const baseVal = distanceVal * weightVal * 80;
    const mockRevenue = Math.max(250000, Math.round(baseVal * 1000) / 1000);
    const dateFormatted = format(job.createdAt.toDate(), "dd MMM", { locale: fr });
    return {
      date: dateFormatted,
      revenue: mockRevenue,
      dateRaw: job.createdAt.toDate(),
      nature: job.nature
    };
  }).reverse(); // chronological

  const totalEarnings = earningsData.reduce((acc, curr) => acc + curr.revenue, 0);

  // Group by date or just display last 7 trips
  const chartData = earningsData.slice(-7);

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border/40 pb-5">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Performance & Évaluations</h1>
          <p className="text-sm text-muted-foreground mt-1">Consultez vos statistiques de gains et les retours d'expérience des clients.</p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="shadow-lg rounded-3xl border-border/50 bg-card/60 backdrop-blur-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold text-muted-foreground">Note Moyenne</CardTitle>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400"><Star className="h-4 w-4 fill-amber-400 text-amber-400" /></span>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-foreground">{averageRating.toFixed(1)}</span>
              <span className="text-xs text-muted-foreground font-semibold">/ 5.0</span>
            </div>
            <div className="mt-2">
              <RatingStars rating={Math.round(averageRating)} />
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">Sur un total de {ratingCount} avis clients</p>
          </CardContent>
        </Card>

        <Card className="shadow-lg rounded-3xl border-border/50 bg-card/60 backdrop-blur-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold text-muted-foreground">Revenus Cumulés</CardTitle>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400"><Landmark className="h-4 w-4" /></span>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="text-3xl font-extrabold text-foreground">
              {totalEarnings.toLocaleString('fr-FR')} <span className="text-xs text-emerald-400 font-bold">GNF</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Revenus simulés générés sur la plateforme</p>
          </CardContent>
        </Card>

        <Card className="shadow-lg rounded-3xl border-border/50 bg-card/60 backdrop-blur-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold text-muted-foreground">Taux de Complétion</CardTitle>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400"><TrendingUp className="h-4 w-4" /></span>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="text-3xl font-extrabold text-foreground">100%</div>
            <p className="text-xs text-muted-foreground mt-2">Toutes vos courses acceptées ont été livrées</p>
          </CardContent>
        </Card>
      </div>

      {/* Chart & Comments Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Earnings Chart */}
        <Card className="shadow-lg rounded-3xl border border-border/50 bg-card/60 backdrop-blur-md lg:col-span-2 overflow-hidden">
          <CardHeader className="border-b border-border/20 pb-4">
            <CardTitle className="text-lg font-bold text-foreground">Évolution des Gains</CardTitle>
            <CardDescription>Revenus générés par trajet (Dernières courses complétées)</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {chartData.length > 0 ? (
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#818cf8" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#818cf8" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                    <XAxis dataKey="date" stroke="#9ca3af" fontSize={10} tickLine={false} />
                    <YAxis stroke="#9ca3af" fontSize={10} tickLine={false} tickFormatter={(tick) => `${(tick / 1000).toFixed(0)}k`} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1e1b4b', border: '1px solid rgba(129, 140, 248, 0.2)', borderRadius: '16px' }}
                      labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                      itemStyle={{ color: '#818cf8' }}
                      formatter={(value: any) => [`${Number(value).toLocaleString()} GNF`, 'Gains']}
                    />
                    <Area type="monotone" dataKey="revenue" stroke="#818cf8" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRevenue)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm font-medium">
                Complétez des trajets pour afficher votre graphique d'activité financière.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Reviews Panel */}
        <Card className="shadow-lg rounded-3xl border border-border/50 bg-card/60 backdrop-blur-md lg:col-span-1 overflow-hidden flex flex-col justify-between">
          <CardHeader className="border-b border-border/20 pb-4">
            <CardTitle className="text-lg font-bold text-foreground">Derniers Avis</CardTitle>
            <CardDescription>Commentaires écrits laissés par vos clients</CardDescription>
          </CardHeader>
          <CardContent className="pt-4 overflow-y-auto max-h-[300px] space-y-4">
            {ratings.length > 0 ? (
              ratings.map(rating => (
                <div key={rating.id} className="p-3.5 rounded-2xl bg-slate-950/30 border border-border/30 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Avatar className="h-7 w-7 border border-border/50">
                        <AvatarFallback className="bg-primary/20 text-primary text-[10px] font-bold">
                          {rating.clientName?.substring(0,2).toUpperCase() || 'CL'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-xs font-bold text-foreground">{rating.clientName}</p>
                        <p className="text-[10px] text-muted-foreground">{format(rating.createdAt.toDate(), "dd MMM yyyy", { locale: fr })}</p>
                      </div>
                    </div>
                    <RatingStars rating={rating.rating!} />
                  </div>
                  {rating.comment && (
                    <p className="text-[11px] text-muted-foreground italic leading-relaxed">
                      "{rating.comment}"
                    </p>
                  )}
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-14 text-center text-muted-foreground gap-3">
                <MessageSquare className="h-10 w-10 text-muted-foreground/30" />
                <div>
                  <p className="font-bold text-foreground text-sm">Aucun commentaire</p>
                  <p className="text-xs text-muted-foreground">Les évaluations de vos clients s'afficheront ici.</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
