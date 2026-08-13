"use client"

import { useAuthState } from "react-firebase-hooks/auth"
import { useDocumentData } from "react-firebase-hooks/firestore"
import { collection, query, where, doc, updateDoc, arrayUnion, getDocs } from "firebase/firestore"
import { db, auth } from "@/lib/firebase"
import { format } from "date-fns"
import { useState, useMemo, useEffect } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MapPin, Package, CalendarIcon, Weight, ArrowRight, Truck, Loader2, Rocket, User, AlertTriangle, Clock, Navigation, Search, Filter, Calculator, Wrench, TrendingUp, Star, CheckCircle2, Zap } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import { formatDurationFromSeconds } from "@/lib/utils"
import type { TransportRequest } from "@/ai/types"
import { createNotification } from "@/lib/notifications"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts"
import TransconnektIntelligence from "@/components/transconnekt-intelligence";

const getRequestIcon = (nature: string) => {
    const isMining = nature.toLowerCase().includes('mine') || nature.toLowerCase().includes('simandou') || nature.toLowerCase().includes('ciment') || nature.toLowerCase().includes('fer');
    if (isMining) return <Truck className="h-4 w-4 text-amber-500" />;
    if (nature.toLowerCase().includes('meuble') || nature.toLowerCase().includes('déménagement')) return <Truck className="h-4 w-4" />;
    if (nature.toLowerCase().includes('urgent') || nature.toLowerCase().includes('document')) return <Rocket className="h-4 w-4" />;
    return <Package className="h-4 w-4" />;
}

// Simulated earnings trend for individual transporter
const earningsTrend = [
  { month: "Jan", gains: 2800000 },
  { month: "Fév", gains: 3200000 },
  { month: "Mar", gains: 4100000 },
  { month: "Avr", gains: 3600000 },
  { month: "Mai", gains: 5200000 },
  { month: "Juin", gains: 6800000 },
];

export default function TransporterDashboard() {
  const { toast } = useToast();
  const [user, loadingAuth] = useAuthState(auth);
  
  const [requestsList, setRequestsList] = useState<TransportRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);

  const userDocRef = user ? doc(db, 'users', user.uid) : null;
  const [userData, loadingUser] = useDocumentData(userDocRef);
  
  // State for search and filter
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCity, setSelectedCity] = useState("all");

  // Simulator state
  const [simRoute, setSimRoute] = useState("conakry-mamou");
  const [simTonnage, setSimTonnage] = useState("10");
  const [simResult, setSimResult] = useState<{ gross: number; fuel: number; net: number } | null>(null);

  useEffect(() => {
    let active = true;
    setLoadingRequests(true);

    const fetchRequests = async () => {
      try {
        const qRef = query(collection(db, 'requests'), where('status', '==', 'En attente'));
        const snap = await getDocs(qRef);
        if (active) {
          const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as TransportRequest));
          setRequestsList(list);
          setLoadingRequests(false);
        }
      } catch (err) {
        console.error("Error loading transporter requests:", err);
        if (active) setLoadingRequests(false);
      }
    };

    fetchRequests();
    return () => { active = false; };
  }, []);

  const isLoading = loadingAuth || loadingUser || loadingRequests;

  const handleApply = async (request: TransportRequest) => {
    if (!user || !userData) {
      toast({ variant: 'destructive', title: "Erreur", description: "Vous devez être connecté pour postuler."});
      return;
    }

    try {
      const docRef = doc(db, `requests`, request.id);
      await updateDoc(docRef, {
        applicants: arrayUnion(user.uid)
      });
      
      await createNotification({
        userId: request.clientId,
        message: `${userData.firstName} ${userData.lastName} a postulé à votre demande "${request.nature}".`,
        href: `/dashboard/client/requests`
      });

      toast({ title: "Offre envoyée !", description: "Votre candidature a été transmise au client." });
      
      // Refresh list after applying
      const qRef = query(collection(db, 'requests'), where('status', '==', 'En attente'));
      const snap = await getDocs(qRef);
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as TransportRequest));
      setRequestsList(list);
    } catch (error) {
       console.error("Error applying to request:", error);
       toast({ variant: 'destructive', title: "Erreur", description: "Impossible de postuler."});
    }
  }

  const filteredRequests = useMemo(() => {
    if (!user) return [];
    
    return requestsList.filter(request => {
        const isEligible = !request.applicants?.includes(user.uid) && request.status === 'En attente';
        if (!isEligible) return false;

        const matchesSearch = request.nature.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              request.from.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              request.to.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesCity = selectedCity === "all" || request.from === selectedCity;

        return matchesSearch && matchesCity;
    });
  }, [requestsList, user, searchTerm, selectedCity]);

  const handleSimulate = () => {
    let price = 3800000;
    if (simRoute === 'conakry-kankan') price = 8500000;
    if (simRoute === 'conakry-nzerekore') price = 12900000;
    if (simRoute === 'conakry-beyla') price = 15800000;

    if (simTonnage === '25') price *= 1.8;
    if (simTonnage === '40') price *= 2.6;

    const fuel = price * 0.38;
    const net = price - fuel - 250000;

    setSimResult({ gross: Math.round(price), fuel: Math.round(fuel), net: Math.round(net) });
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-full py-20"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>
  }

  if (userData && userData.isVerified === false) {
    return (
        <Card className="shadow-lg rounded-3xl border-destructive/20 bg-destructive/5 text-destructive p-6 max-w-2xl mx-auto mt-10">
            <CardHeader className="p-0 pb-3 flex flex-row items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10 text-destructive"><AlertTriangle size={20}/></span>
                <div>
                  <CardTitle className="text-xl font-bold">Profil en attente de vérification</CardTitle>
                  <CardDescription className="text-destructive/80 text-xs">Validation administrative obligatoire.</CardDescription>
                </div>
            </CardHeader>
            <CardContent className="p-0 pt-2 text-sm leading-relaxed space-y-3">
                <p>
                  Votre compte doit être validé par un administrateur avant de pouvoir accéder au réseau et soumettre des offres sur les demandes de transport en Guinée.
                </p>
                <p className="text-xs text-muted-foreground">
                  Veuillez téléverser votre permis de conduire et votre attestation d&apos;assurance dans la section <Link href="/dashboard/transporter/documents" className="text-primary font-semibold underline">Mes documents</Link>.
                </p>
            </CardContent>
        </Card>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-border/40 pb-5">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Espace Transporteur Pro</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Bienvenue, <span className="font-semibold text-foreground">{userData?.firstName || 'Transporteur'}</span> — Gérez vos missions et estimez vos gains.
          </p>
        </div>
        {userData?.isVerified ? (
          <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold px-3 py-1.5">
            <CheckCircle2 size={12} className="mr-1.5" />
            Profil Vérifié
          </Badge>
        ) : (
          <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-semibold px-3 py-1.5">
            <AlertTriangle size={12} className="mr-1.5 text-amber-400" />
            En attente de vérification
          </Badge>
        )}
      </div>

      <TransconnektIntelligence />

      {/* Metrics Cards */}
      <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-4">
        <Link href="/dashboard/transporter" className="block transition-all duration-300 hover:-translate-y-1">
          <Card className="shadow-lg rounded-2xl border-border/50 bg-card/60 backdrop-blur-md cursor-pointer hover:bg-card/85 transition-colors h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-bold text-muted-foreground">Offres Disponibles</CardTitle>
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary"><Truck size={16} /></span>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="text-3xl font-extrabold text-foreground">{filteredRequests.length}</div>
               <p className="text-xs text-muted-foreground mt-1">Chargements sans transporteur</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/transporter/jobs" className="block transition-all duration-300 hover:-translate-y-1">
          <Card className="shadow-lg rounded-2xl border-border/50 bg-card/60 backdrop-blur-md cursor-pointer hover:bg-card/85 transition-colors h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-bold text-muted-foreground">Missions en Cours</CardTitle>
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600"><Package size={16} /></span>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="text-3xl font-extrabold text-foreground">{userData?.jobsInProgress || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Courses actives</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/transporter/ratings" className="block transition-all duration-300 hover:-translate-y-1">
          <Card className="shadow-lg rounded-2xl border-border/50 bg-card/60 backdrop-blur-md cursor-pointer hover:bg-card/85 transition-colors h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-bold text-muted-foreground">Note Globale</CardTitle>
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500"><Star size={16} /></span>
            </CardHeader>
            <CardContent className="pt-2">
               <div className="text-3xl font-extrabold text-foreground">{userData?.rating?.toFixed(1) || 'N/A'} <span className="text-xs text-muted-foreground font-semibold">/ 5.0</span></div>
              <p className="text-xs text-muted-foreground mt-1">Évaluations clients</p>
            </CardContent>
          </Card>
        </Link>

        <Card className="shadow-lg rounded-2xl border-border/50 bg-card/60 backdrop-blur-md h-full">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold text-muted-foreground">Gains du Mois</CardTitle>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400"><TrendingUp size={16} /></span>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="text-2xl font-extrabold text-indigo-400">
              {((userData?.completedJobs || 0) * 4200000).toLocaleString('fr-FR')} 
              <span className="text-xs text-muted-foreground font-semibold ml-1">GNF</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Estimation basée sur les missions</p>
          </CardContent>
        </Card>
      </div>

      {/* Earnings Trend Chart + Simulator - Full Width */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Area Chart - Earnings History */}
        <Card className="lg:col-span-2 shadow-lg rounded-3xl border border-border/50 bg-card/60 backdrop-blur-md overflow-hidden">
          <CardHeader className="border-b border-border/20 pb-4">
            <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <TrendingUp size={18} className="text-indigo-400" /> Évolution des Gains Mensuels
            </CardTitle>
            <CardDescription>Estimations des revenus sur les 6 derniers mois (en GNF)</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={earningsTrend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="transporterGains" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                  <XAxis dataKey="month" stroke="#9ca3af" fontSize={10} tickLine={false} />
                  <YAxis stroke="#9ca3af" fontSize={10} tickLine={false} tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(99, 102, 241, 0.2)', borderRadius: '16px' }}
                    labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                    itemStyle={{ color: '#a5b4fc' }}
                    formatter={(value: number) => [`${value.toLocaleString('fr-FR')} GNF`, 'Gains']}
                  />
                  <Area type="monotone" dataKey="gains" stroke="#6366f1" strokeWidth={2.5} fillOpacity={1} fill="url(#transporterGains)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Earnings Simulator - Interactive */}
        <Card className="shadow-lg rounded-3xl border border-border/50 bg-card/60 backdrop-blur-md p-6 flex flex-col gap-4">
          <div>
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary"><Calculator size={16}/></span>
              Simulateur de Gains
            </h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Estimez le chiffre d&apos;affaires d&apos;un trajet selon l&apos;itinéraire et la capacité utile.
            </p>

            <div className="space-y-3 mt-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1">TRAJET COMMERCIAL</label>
                <Select value={simRoute} onValueChange={setSimRoute}>
                  <SelectTrigger className="h-10 rounded-xl bg-background text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="conakry-mamou">Conakry → Mamou (~270 km)</SelectItem>
                    <SelectItem value="conakry-kankan">Conakry → Kankan (~660 km)</SelectItem>
                    <SelectItem value="conakry-nzerekore">Conakry → Nzérékoré (~950 km)</SelectItem>
                    <SelectItem value="conakry-beyla">Conakry → Beyla (Simandou, ~1000 km)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1">CAPACITÉ DU VÉHICULE</label>
                <Select value={simTonnage} onValueChange={setSimTonnage}>
                  <SelectTrigger className="h-10 rounded-xl bg-background text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="10">Camion Porteur (10 Tonnes)</SelectItem>
                    <SelectItem value="25">Semi-remorque standard (25 Tonnes)</SelectItem>
                    <SelectItem value="40">Benne Mines / Convoi Spécial (40 Tonnes)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {simResult && (
            <div className="space-y-2 text-xs border border-border/30 rounded-2xl p-3 bg-background/30">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Gain Brut :</span>
                <span className="font-bold text-foreground">{simResult.gross.toLocaleString('fr-FR')} GNF</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Carburant (38%) :</span>
                <span className="font-bold text-red-400">-{simResult.fuel.toLocaleString('fr-FR')} GNF</span>
              </div>
              <div className="flex justify-between border-t border-border/30 pt-2">
                <span className="font-bold text-foreground">Bénéfice Net :</span>
                <span className="font-extrabold text-emerald-400">{simResult.net.toLocaleString('fr-FR')} GNF</span>
              </div>
            </div>
          )}

          <Button 
            onClick={handleSimulate}
            className="bg-primary hover:bg-primary/95 text-white rounded-full text-xs h-9 px-4 font-bold mt-auto"
          >
            <Zap size={13} className="mr-1.5" />
            Calculer mes gains
          </Button>
        </Card>
      </div>

      {/* Filter Bar + Requests List + Corridor Alerts */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Filter + Requests */}
        <div className="lg:col-span-2 space-y-4">
          {/* Filter Bar */}
          <Card className="shadow-md rounded-2xl border-border/50 p-4 bg-muted/10 flex flex-col md:flex-row items-center gap-4">
            <div className="relative w-full md:w-1/2">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/60" size={16} />
              <Input 
                placeholder="Rechercher une marchandise ou trajet..." 
                value={searchTerm} 
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)} 
                className="pl-10 h-10 rounded-xl bg-background"
              />
            </div>
            <div className="w-full md:w-1/4 flex items-center gap-2">
              <Filter size={16} className="text-primary shrink-0" />
              <Select value={selectedCity} onValueChange={setSelectedCity}>
                <SelectTrigger className="h-10 rounded-xl bg-background"><SelectValue placeholder="Ville de départ..." /></SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all">Toutes les villes</SelectItem>
                  <SelectItem value="Conakry">Conakry</SelectItem>
                  <SelectItem value="Kamsar">Kamsar</SelectItem>
                  <SelectItem value="Mamou">Mamou</SelectItem>
                  <SelectItem value="Kankan">Kankan</SelectItem>
                  <SelectItem value="Nzérékoré">Nzérékoré</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </Card>

          {/* Requests List */}
          <Card className="shadow-lg rounded-3xl border-border/50 bg-card/60 backdrop-blur-md overflow-hidden">
            <CardHeader className="border-b border-border/40 pb-4">
              <CardTitle className="text-xl font-bold text-foreground">Demandes de Fret Disponibles</CardTitle>
              <CardDescription>
                Postulez directement sur les chargements ci-dessous pour entrer en contact avec les clients.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 p-4 md:p-6">
                {filteredRequests.length > 0 ? (
                    filteredRequests.map(request => {
                        const isMiningJob = request.nature.toLowerCase().includes('mine') || request.nature.toLowerCase().includes('simandou') || request.nature.toLowerCase().includes('fer') || request.nature.toLowerCase().includes('ciment');
                        return (
                            <Card key={request.id} className={`p-4 shadow-md rounded-2xl border transition-all duration-300 hover:scale-[1.01] ${
                              isMiningJob 
                                ? 'border-amber-500/35 bg-gradient-to-r from-amber-500/5 via-transparent to-transparent shadow-amber-500/5 shadow-lg' 
                                : 'border-border/60'
                            }`}>
                                <div className="grid md:grid-cols-4 gap-4 items-center">
                                    <div className="md:col-span-3 space-y-2.5">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <CardTitle className="flex items-center gap-2.5 text-base font-bold text-foreground">
                                                <span className={`flex h-8 w-8 items-center justify-center rounded-xl ${
                                                  isMiningJob ? 'bg-amber-500/10 text-amber-500' : 'bg-primary/10 text-primary'
                                                }`}>
                                                  {getRequestIcon(request.nature)}
                                                </span>
                                                {request.nature}
                                            </CardTitle>
                                            {isMiningJob && <Badge className="bg-amber-500 text-zinc-950 font-bold border-0 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider">Simandou 2040</Badge>}
                                        </div>
                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs md:text-sm text-muted-foreground font-medium">
                                            <p className="flex items-center gap-1.5">
                                                <MapPin size={14} className="text-primary" /> {request.from} <ArrowRight size={12} className="text-muted-foreground/60" /> {request.to}
                                            </p>
                                            <span className="w-1.5 h-1.5 rounded-full bg-border" />
                                            <p className="flex items-center gap-1"><Weight size={14} className="text-primary"/> {request.weight} {request.weightUnit}</p>
                                            <span className="w-1.5 h-1.5 rounded-full bg-border" />
                                            <p className="flex items-center gap-1"><CalendarIcon size={14} className="text-primary"/> {format(request.date.toDate(), "PPP")}</p>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground/80 pt-1 border-t border-border/30">
                                            {request.distance && <p className="flex items-center gap-1"><Navigation size={12} /> {request.distance} km</p>}
                                            {request.duration && <p className="flex items-center gap-1"><Clock size={12} /> {formatDurationFromSeconds(request.duration)}</p>}
                                        </div>
                                    </div>
                                    <div className="md:col-span-1 flex justify-end">
                                         <Button onClick={() => handleApply(request)} className={`rounded-full shadow-md font-semibold ${
                                           isMiningJob ? 'bg-amber-500 hover:bg-amber-600 text-zinc-950 shadow-amber-500/10' : 'bg-primary hover:bg-primary/95 text-white'
                                         }`}>
                                            Postuler
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        )
                    })
                ) : (
                    <div className="flex flex-col items-center justify-center py-14 text-center text-muted-foreground gap-3">
                      <Package className="h-12 w-12 text-muted-foreground/40" />
                      <div>
                        <p className="font-bold text-foreground text-lg">Aucune offre disponible</p>
                        <p className="text-sm">Toutes les offres correspondent à vos candidatures ou ne correspondent pas aux filtres.</p>
                      </div>
                    </div>
                )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Corridor Alerts + Quick Links */}
        <div className="lg:col-span-1 space-y-6">
          {/* Simandou Corridor Alerts */}
          <Card className="shadow-lg rounded-3xl border border-amber-500/20 bg-gradient-to-br from-slate-900/90 to-[#1C1200]/90 backdrop-blur-md p-6 space-y-4">
            <h3 className="text-lg font-bold text-amber-500 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500"><Wrench size={16}/></span>
              Corridor Simandou 2040
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Conditions de route et opportunités minières prioritaires sur l&apos;axe transguinéen.
            </p>

            <div className="space-y-3 pt-1 text-xs">
              <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 text-slate-300">
                <span className="font-bold text-amber-400 block mb-1 flex items-center gap-1"><Zap size={11}/> Opportunité Fret Premium</span>
                Transport de structures métalliques lourdes depuis Kamsar → Base minière de Beyla. ~1000 km, 40 tonnes.
              </div>
              <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-slate-300">
                <span className="font-bold text-emerald-400 block mb-1">🛣️ Météo & Viabilité Routière</span>
                Axe Mamou–Kankan dégagé. Conditions optimales pour convois double-essieux.
              </div>
              <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/20 text-slate-300">
                <span className="font-bold text-blue-400 block mb-1">📦 Cargo disponible à Conakry</span>
                Cargaison de matériel de forage en attente d&apos;acheminement vers Kérouané. Urgent.
              </div>
            </div>
          </Card>

          {/* Quick Actions */}
          <Card className="shadow-lg rounded-3xl border border-border/50 bg-card/60 backdrop-blur-md p-5 space-y-3">
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Accès Rapide</h3>
            <div className="space-y-2">
              {[
                { label: "Mes Courses", desc: "Historique & missions actives", href: "/dashboard/transporter/jobs", color: "text-primary" },
                { label: "Mes Documents", desc: "Permis, assurance, attestations", href: "/dashboard/transporter/documents", color: "text-sky-400" },
                { label: "Mes Évaluations", desc: "Notes et avis clients", href: "/dashboard/transporter/ratings", color: "text-amber-400" },
              ].map(({ label, desc, href, color }) => (
                <Link key={href} href={href} className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/30 transition-colors group">
                  <div>
                    <p className={`text-sm font-semibold ${color}`}>{label}</p>
                    <p className="text-[11px] text-muted-foreground">{desc}</p>
                  </div>
                  <ArrowRight size={14} className="text-muted-foreground group-hover:text-foreground transition-colors" />
                </Link>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
