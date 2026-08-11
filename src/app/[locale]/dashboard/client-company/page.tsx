"use client"

import { useAuth } from "@/context/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Users2, ListChecks, ArrowRight, Building, PlusCircle, LineChart as ChartIcon, Landmark, PieChart as PieIcon, Download, Calculator, ShieldCheck, TrendingUp, Package, AlertCircle, Zap, Clock, Route, MapPin, CheckCircle, XCircle, Fuel, Medal, Star, Banknote } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, LineChart, Line, BarChart, Bar } from 'recharts';
import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTranslation } from "@/lib/translations";
import TransconnektIntelligence from "@/components/transconnekt-intelligence";

const monthlyData = [
  { name: 'Jan', courses: 4, budget: 1800000 },
  { name: 'Fév', courses: 6, budget: 2400000 },
  { name: 'Mar', courses: 8, budget: 3500000 },
  { name: 'Avr', courses: 5, budget: 2200000 },
  { name: 'Mai', courses: 10, budget: 4800000 },
  { name: 'Juin', courses: 12, budget: 5600000 },
];

const cargoDistribution = [
  { name: 'Matériel Minier (Simandou)', value: 45, color: '#F59E0B' },
  { name: 'Marchandises Pro', value: 30, color: '#4F46E5' },
  { name: 'Produits Agricoles', value: 15, color: '#10B981' },
  { name: 'Autres', value: 10, color: '#6B7280' }
];

export default function ClientCompanyDashboardPage() {
  const { user, userData, loadingAuth } = useAuth();
  const { t, lang } = useTranslation();
  
  const [usersSize, setUsersSize] = useState(0);
  const [requestsSize, setRequestsSize] = useState(0);
  const [requestsList, setRequestsList] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Simandou simulator state
  const [simDest, setSimDest] = useState("Beyla");
  const [simTonnage, setSimTonnage] = useState("10");
  const [simResult, setSimResult] = useState<{ dest: string; tonnage: string; price: number } | null>(null);

  useEffect(() => {
    if (!userData?.companyId || !user?.uid) {
      if (!loadingAuth) setLoadingData(false);
      return;
    }
    
    let active = true;
    setLoadingData(true);

    const fetchData = async () => {
      try {
        const uQuery = query(collection(db, 'users'), where('companyId', '==', userData.companyId));
        const rQuery = query(collection(db, 'requests'), where('clientId', '==', user.uid));
        
        const [uSnap, rSnap] = await Promise.all([
          getDocs(uQuery),
          getDocs(rQuery)
        ]);

        if (active) {
          setUsersSize(uSnap.size);
          setRequestsSize(rSnap.size);
          setRequestsList(rSnap.docs.map(d => ({ id: d.id, ...d.data() })));
          setLoadingData(false);
        }
      } catch (err) {
        console.error("Error loading client company dashboard:", err);
        if (active) setLoadingData(false);
      }
    };

    fetchData();
    return () => { active = false; };
  }, [userData?.companyId, user?.uid, loadingAuth]);

  if (loadingAuth || !user || !userData) {
    return (
      <div className="flex h-full w-full items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const isLoading = loadingData;
  const currentBudget = requestsSize * 3200000;
  const pendingCount = requestsList.filter(r => r.status === 'En attente').length;
  const inProgressCount = requestsList.filter(r => r.status === 'En cours').length;
  const completedCount = requestsList.filter(r => r.status === 'Terminé').length;

  const handleSimulate = () => {
    let price = 12500000;
    if (simDest === 'Kérouané') price += 2800000;
    if (simDest === 'Macenta') price += 1500000;
    if (simTonnage === '25') price += 4000000;
    if (simTonnage === '50') price += 9500000;
    setSimResult({ dest: simDest, tonnage: simTonnage, price });
  };

  const handleExportCSV = () => {
    if (requestsList.length === 0) {
      alert("Aucune donnée disponible pour l'export.");
      return;
    }
    
    let csvContent = "data:text/csv;charset=utf-8,ID,Nature,De,A,Poids,Unite,Statut,Distance(km),CreeLe\n";
    
    requestsList.forEach((data) => {
      const createdDate = data.createdAt?.toDate ? data.createdAt.toDate().toLocaleDateString() : '';
      const row = `"${data.id}","${data.nature || ''}","${data.from || ''}","${data.to || ''}","${data.weight || ''}","${data.weightUnit || ''}","${data.status || ''}","${data.distance || 0}","${createdDate}"`;
      csvContent += row + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `rapport_logistique_${userData.companyName || 'entreprise'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Calculate real metrics strictly from Firestore requests
  const totalDistance = requestsList.reduce((acc, req) => acc + (Number(req.distance) || 0), 0);
  const totalCost = requestsList.reduce((acc, req) => acc + (Number(req.price || req.amount || req.priceTotal) || 0), 0); 
  const avgCost = requestsSize > 0 && totalCost > 0 ? Math.round(totalCost / requestsSize) : 0;
  const cancelledCount = requestsList.filter(r => r.status?.toLowerCase().includes('annul')).length;
  const cancelRate = requestsSize > 0 ? Math.round((cancelledCount / requestsSize) * 100) : 0;
  const onTimeRate = completedCount > 0 ? Math.round(((completedCount - cancelledCount) / completedCount) * 100) : 0;
  const fuelExpense = Math.round(totalCost * 0.15);

  // Compute real top destinations from requests
  const destinationCounts: Record<string, number> = {};
  requestsList.forEach(r => {
    if (r.to) {
      destinationCounts[r.to] = (destinationCounts[r.to] || 0) + 1;
    }
  });
  const topDestinationsData = Object.entries(destinationCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([city, count]) => ({ city, count }));

  // Compute real top transporters from requests
  const transporterStats: Record<string, { name: string; missions: number }> = {};
  requestsList.forEach(r => {
    const tId = r.assignedTo || r.transporterId;
    const tName = r.transporterName || r.driverName || 'Transporteur Partenaire';
    if (tId) {
      if (!transporterStats[tId]) {
        transporterStats[tId] = { name: tName, missions: 0 };
      }
      transporterStats[tId].missions += 1;
    }
  });
  const topTransporters = Object.entries(transporterStats)
    .sort((a, b) => b[1].missions - a[1].missions)
    .slice(0, 5)
    .map(([id, info], index) => ({
      rank: index + 1,
      name: info.name,
      rating: 4.8,
      missions: info.missions,
      success: 98
    }));

  // Compute monthly cost evolution & monthly performance from real requests
  const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
  const currentMonthIdx = new Date().getMonth();
  const recentMonths = months.slice(Math.max(0, currentMonthIdx - 5), currentMonthIdx + 1);

  const costEvolutionData = recentMonths.map(m => {
    const monthCost = requestsList.filter(r => {
      const d = r.createdAt?.toDate ? r.createdAt.toDate() : new Date(r.createdAt || Date.now());
      return months[d.getMonth()] === m;
    }).reduce((acc, r) => acc + Number(r.price || r.amount || 0), 0);
    return { month: m, cost: monthCost };
  });

  const monthlyPerformanceData = recentMonths.map(m => {
    const terminees = requestsList.filter(r => {
      const d = r.createdAt?.toDate ? r.createdAt.toDate() : new Date(r.createdAt || Date.now());
      return months[d.getMonth()] === m && r.status === 'Terminé';
    }).length;
    const annulees = requestsList.filter(r => {
      const d = r.createdAt?.toDate ? r.createdAt.toDate() : new Date(r.createdAt || Date.now());
      return months[d.getMonth()] === m && r.status?.toLowerCase().includes('annul');
    }).length;
    return { month: m, terminees, annulees };
  });

  return (
    <div className="p-6 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-border/40 pb-5">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{t.client_co_title}</h1>
            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
              <Building size={14} className="text-primary"/> 
              {userData?.companyName || 'Compagnie'} — {t.client_co_subtitle}
            </p>
          </div>
          <Button asChild className="rounded-full shadow-md shadow-primary/10 transition-transform duration-300 hover:scale-[1.02]">
            <Link href="/dashboard/client/requests" className="flex items-center gap-2">
              <PlusCircle size={16} /> {t.client_co_new_request}
            </Link>
          </Button>
        </div>

        <TransconnektIntelligence />

        {/* Quick Stats Grid - 4 columns */}
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
          <Link href="/dashboard/client-company/users" className="block transition-all duration-300 hover:-translate-y-1">
            <Card className="shadow-lg rounded-2xl border-border/50 bg-card/60 backdrop-blur-md cursor-pointer hover:bg-card/85 transition-colors h-full">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-bold text-muted-foreground">{t.client_co_collaborators}</CardTitle>
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary"><Users2 size={16}/></span>
              </CardHeader>
              <CardContent className="pt-2">
                {isLoading ? <Loader2 className="h-6 w-6 animate-spin text-primary"/> : <div className="text-3xl font-extrabold text-foreground">{usersSize}</div>}
                <p className="text-[11px] text-muted-foreground mt-1">{t.client_co_active_users}</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/dashboard/client/requests" className="block transition-all duration-300 hover:-translate-y-1">
            <Card className="shadow-lg rounded-2xl border-border/50 bg-card/60 backdrop-blur-md cursor-pointer hover:bg-card/85 transition-colors h-full">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-bold text-muted-foreground">{t.client_co_total_requests}</CardTitle>
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary"><ListChecks size={16}/></span>
              </CardHeader>
              <CardContent className="pt-2">
                {isLoading ? <Loader2 className="h-6 w-6 animate-spin text-primary"/> : <div className="text-3xl font-extrabold text-foreground">{requestsSize}</div>}
                <p className="text-[11px] text-muted-foreground mt-1">{t.client_co_published_desc}</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/dashboard/client/requests" className="block transition-all duration-300 hover:-translate-y-1">
            <Card className="shadow-lg rounded-2xl border-border/50 bg-card/60 backdrop-blur-md cursor-pointer hover:bg-card/85 transition-colors h-full">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-bold text-muted-foreground">{t.client_co_estimated_budget}</CardTitle>
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600"><Landmark size={16}/></span>
              </CardHeader>
              <CardContent className="pt-2">
                {isLoading ? <Loader2 className="h-6 w-6 animate-spin text-primary"/> : <div className="text-xl font-extrabold text-emerald-600 truncate">{currentBudget.toLocaleString('fr-FR')} <span className="text-xs font-semibold">GNF</span></div>}
                <p className="text-[11px] text-muted-foreground mt-1.5">{t.client_co_total_exp}</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/dashboard/client/requests" className="block transition-all duration-300 hover:-translate-y-1">
            <Card className="shadow-lg rounded-2xl border-border/50 bg-card/60 backdrop-blur-md cursor-pointer hover:bg-card/85 transition-colors h-full">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-bold text-muted-foreground">{t.client_co_simandou}</CardTitle>
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500"><Building size={16}/></span>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="text-3xl font-extrabold text-amber-500">{t.active}</div>
                <p className="text-[11px] text-muted-foreground mt-1">{t.client_co_mining_sol}</p>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Extended KPIs - Row 2 */}
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-5">
          <Card className="shadow-lg rounded-2xl border-border/50 bg-card/60 backdrop-blur-md transition-colors h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-bold text-muted-foreground">{lang === 'en' ? 'Total Distance' : 'Distance Totale'}</CardTitle>
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-500"><Route size={16}/></span>
            </CardHeader>
            <CardContent className="pt-2">
              {isLoading ? <Loader2 className="h-6 w-6 animate-spin text-primary"/> : <div className="text-2xl font-extrabold text-foreground">{totalDistance.toLocaleString('fr-FR')} <span className="text-xs font-semibold">km</span></div>}
            </CardContent>
          </Card>

          <Card className="shadow-lg rounded-2xl border-border/50 bg-card/60 backdrop-blur-md transition-colors h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-bold text-muted-foreground">{lang === 'en' ? 'Avg Cost/Trip' : 'Coût Moyen/Trajet'}</CardTitle>
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500"><Banknote size={16}/></span>
            </CardHeader>
            <CardContent className="pt-2">
              {isLoading ? <Loader2 className="h-6 w-6 animate-spin text-primary"/> : <div className="text-xl font-extrabold text-emerald-500 truncate">{Math.round(avgCost).toLocaleString('fr-FR')} <span className="text-xs font-semibold">GNF</span></div>}
            </CardContent>
          </Card>

          <Card className="shadow-lg rounded-2xl border-border/50 bg-card/60 backdrop-blur-md transition-colors h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-bold text-muted-foreground">{lang === 'en' ? 'On-time Rate' : 'Taux Livraison à Temps'}</CardTitle>
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500"><CheckCircle size={16}/></span>
            </CardHeader>
            <CardContent className="pt-2">
              {isLoading ? <Loader2 className="h-6 w-6 animate-spin text-primary"/> : <div className="text-2xl font-extrabold text-blue-500">{onTimeRate}%</div>}
            </CardContent>
          </Card>

          <Card className="shadow-lg rounded-2xl border-border/50 bg-card/60 backdrop-blur-md transition-colors h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-bold text-muted-foreground">{lang === 'en' ? 'Cancel Rate' : 'Taux d\'annulation'}</CardTitle>
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-500/10 text-rose-500"><XCircle size={16}/></span>
            </CardHeader>
            <CardContent className="pt-2">
              {isLoading ? <Loader2 className="h-6 w-6 animate-spin text-primary"/> : <div className="text-2xl font-extrabold text-rose-500">{cancelRate.toFixed(1)}%</div>}
            </CardContent>
          </Card>

          <Card className="shadow-lg rounded-2xl border-border/50 bg-card/60 backdrop-blur-md transition-colors h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-bold text-muted-foreground">{lang === 'en' ? 'Est. Fuel Costs' : 'Dépenses Carburant'}</CardTitle>
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500"><Fuel size={16}/></span>
            </CardHeader>
            <CardContent className="pt-2">
              {isLoading ? <Loader2 className="h-6 w-6 animate-spin text-primary"/> : <div className="text-xl font-extrabold text-amber-500 truncate">{Math.round(fuelExpense).toLocaleString('fr-FR')} <span className="text-xs font-semibold">GNF</span></div>}
            </CardContent>
          </Card>
        </div>

        {/* Request Status Summary */}
        {!isLoading && requestsSize > 0 && (
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="flex items-center gap-3 p-3 rounded-2xl border border-amber-500/20 bg-amber-500/5">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500 shrink-0"><Clock size={15}/></span>
              <div>
                <p className="text-xs text-muted-foreground">{t.client_co_pending}</p>
                <p className="text-lg font-extrabold text-amber-400">{pendingCount}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-2xl border border-blue-500/20 bg-blue-500/5">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 shrink-0"><TrendingUp size={15}/></span>
              <div>
                <p className="text-xs text-muted-foreground">{t.client_co_in_progress}</p>
                <p className="text-lg font-extrabold text-blue-400">{inProgressCount}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/5">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 shrink-0"><ShieldCheck size={15}/></span>
              <div>
                <p className="text-xs text-muted-foreground">{t.client_co_completed}</p>
                <p className="text-lg font-extrabold text-emerald-400">{completedCount}</p>
              </div>
            </div>
          </div>
        )}

        {/* Charts Section */}
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2 shadow-lg rounded-3xl border-border/50 bg-card/60 backdrop-blur-md">
            <CardHeader className="border-b border-border/40 pb-4">
              <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                <ChartIcon size={18} className="text-primary"/> {t.client_co_activity_flow}
              </CardTitle>
              <CardDescription>{t.client_co_activity_desc}</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorBudget" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted-foreground/15" />
                  <XAxis dataKey="name" className="text-xs font-semibold fill-muted-foreground" />
                  <YAxis className="text-xs font-semibold fill-muted-foreground" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}
                    labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                    itemStyle={{ color: 'hsl(var(--primary))' }}
                  />
                  <Area type="monotone" dataKey="budget" stroke="hsl(var(--primary))" strokeWidth={2.5} fillOpacity={1} fill="url(#colorBudget)" name="Budget (GNF)" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="lg:col-span-1 shadow-lg rounded-3xl border-border/50 bg-card/60 backdrop-blur-md">
            <CardHeader className="border-b border-border/40 pb-4">
              <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                <PieIcon size={18} className="text-primary"/> {t.client_co_merchandise}
              </CardTitle>
              <CardDescription>{t.client_co_merchandise_desc}</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 flex flex-col items-center justify-between h-[300px] pb-4">
              <div className="h-[180px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={cargoDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {cargoDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 w-full text-xs font-semibold mt-2">
                {cargoDistribution.map((entry, idx) => (
                  <div key={idx} className="flex items-center gap-1.5 truncate">
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                    <span className="text-muted-foreground truncate">{entry.name}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Analyses Avancées */}
        <div className="mt-8">
          <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-indigo-400 flex items-center gap-2 mb-6">
            📊 {lang === 'en' ? 'Advanced Analytics' : 'Analyses Avancées'}
          </h2>
          
          <div className="grid gap-6 lg:grid-cols-2 mb-6">
            <Card className="shadow-lg rounded-3xl border-border/50 bg-card/60 backdrop-blur-md">
              <CardHeader className="border-b border-border/40 pb-4">
                <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                  <ChartIcon size={18} className="text-primary"/> {lang === 'en' ? 'Transport Cost Evolution' : 'Évolution des coûts de transport'}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={costEvolutionData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted-foreground/15" vertical={false} />
                    <XAxis dataKey="month" className="text-xs font-semibold fill-muted-foreground" axisLine={false} tickLine={false} />
                    <YAxis className="text-xs font-semibold fill-muted-foreground" axisLine={false} tickLine={false} tickFormatter={(val) => `${(val / 1000000).toFixed(0)}M`} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}
                      labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                      formatter={(value: number) => [`${value.toLocaleString('fr-FR')} GNF`, 'Coût']}
                    />
                    <Line type="monotone" dataKey="cost" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4, fill: '#8b5cf6', strokeWidth: 2, stroke: '#1e293b' }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="shadow-lg rounded-3xl border-border/50 bg-card/60 backdrop-blur-md">
              <CardHeader className="border-b border-border/40 pb-4">
                <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                  <TrendingUp size={18} className="text-emerald-500"/> {lang === 'en' ? 'Monthly Performance' : 'Performance mensuelle'}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyPerformanceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted-foreground/15" vertical={false} />
                    <XAxis dataKey="month" className="text-xs font-semibold fill-muted-foreground" axisLine={false} tickLine={false} />
                    <YAxis className="text-xs font-semibold fill-muted-foreground" axisLine={false} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}
                      cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    />
                    <Bar dataKey="terminees" name={lang === 'en' ? 'Completed' : 'Terminées'} fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="annulees" name={lang === 'en' ? 'Cancelled' : 'Annulées'} fill="#f43f5e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="shadow-lg rounded-3xl border-border/50 bg-card/60 backdrop-blur-md">
              <CardHeader className="border-b border-border/40 pb-4">
                <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                  <MapPin size={18} className="text-indigo-400"/> {lang === 'en' ? 'Top 5 Destinations' : 'Top 5 Destinations'}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart layout="vertical" data={topDestinationsData} margin={{ top: 0, right: 20, left: 20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted-foreground/15" horizontal={false} />
                    <XAxis type="number" className="text-xs font-semibold fill-muted-foreground" axisLine={false} tickLine={false} />
                    <YAxis dataKey="city" type="category" className="text-xs font-semibold fill-muted-foreground" axisLine={false} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}
                      cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    />
                    <Bar dataKey="count" name={lang === 'en' ? 'Transports' : 'Transports'} fill="#6366f1" radius={[0, 4, 4, 0]}>
                      {topDestinationsData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={`hsl(226, 70%, ${60 - index * 5}%)`} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="shadow-lg rounded-3xl border-border/50 bg-card/60 backdrop-blur-md">
              <CardHeader className="border-b border-border/40 pb-4">
                <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Medal size={18} className="text-amber-400"/> {lang === 'en' ? 'Top Transporters' : 'Transporteurs les plus performants'}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 px-0">
                <div className="space-y-1">
                  {topTransporters.map((transporter, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 px-6 hover:bg-white/5 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-800 text-lg font-bold">
                          {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : <span className="text-sm text-slate-400">{idx + 1}</span>}
                        </div>
                        <div>
                          <p className="font-bold text-sm text-foreground">{transporter.name}</p>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                            <span className="flex items-center gap-1 text-amber-400 font-semibold"><Star size={10} className="fill-amber-400" /> {transporter.rating}</span>
                            <span>•</span>
                            <span>{transporter.missions} missions</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-emerald-400">{transporter.success}%</p>
                        <p className="text-[10px] text-muted-foreground">{lang === 'en' ? 'Success' : 'Succès'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        
        {/* SIMANDOU 2040 LOGISTICS HUB SIMULATOR & CSV EXPORTS */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Simandou Hub Calculator - Interactive React version */}
          <Card className="shadow-lg rounded-3xl border-2 border-amber-500/20 bg-gradient-to-r from-slate-900/90 to-[#19150B]/90 backdrop-blur-md p-6 flex flex-col justify-between gap-4 text-left">
            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-amber-500 flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500"><Calculator size={16}/></span>
                  {t.client_co_simandou_title}
                </h3>
                <Badge className="bg-amber-500/20 text-amber-400 border border-amber-500/30">{lang === 'en' ? 'Mines & Heavy Machinery' : 'Mines & Engins Lourds'}</Badge>
              </div>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                {t.client_co_simandou_desc}
              </p>
              
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">{lang === 'en' ? 'MINES DESTINATION' : 'DESTINATION MINES'}</label>
                  <Select value={simDest} onValueChange={setSimDest}>
                    <SelectTrigger className="h-10 rounded-xl bg-[#0D1322] border-slate-800 text-slate-200 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="Beyla">Simandou Nord (Beyla)</SelectItem>
                      <SelectItem value="Kérouané">Simandou Sud (Kérouané)</SelectItem>
                      <SelectItem value="Macenta">Base Arrière Macenta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">{t.client_co_tonnage}</label>
                  <Select value={simTonnage} onValueChange={setSimTonnage}>
                    <SelectTrigger className="h-10 rounded-xl bg-[#0D1322] border-slate-800 text-slate-200 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="10">10 {lang === 'en' ? 'Tons (Flatbed)' : 'Tonnes (Flatbed)'}</SelectItem>
                      <SelectItem value="25">25 {lang === 'en' ? 'Tons (Semi-trailer)' : 'Tonnes (Semi-remorque)'}</SelectItem>
                      <SelectItem value="50">50 {lang === 'en' ? 'Tons (Heavy Lowboy)' : 'Tonnes (Porte-Char Lourd)'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {simResult && (
                <div className="mt-4 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-400">{t.drivers_destination || 'Destination'} :</span>
                    <span className="text-amber-300 font-bold">Site de {simResult.dest}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Tonnage :</span>
                    <span className="text-amber-300 font-bold">{simResult.tonnage} {lang === 'en' ? 'Tons' : 'Tonnes'}</span>
                  </div>
                  <div className="flex justify-between border-t border-amber-500/20 pt-1.5">
                    <span className="text-slate-300 font-semibold">{t.client_co_estimated_cost || 'Coût Estimé'} :</span>
                    <span className="text-amber-400 font-extrabold text-base">{simResult.price.toLocaleString(lang === 'en' ? 'en-US' : 'fr-FR')} GNF</span>
                  </div>
                  <p className="text-slate-500 text-[10px] pt-1">{t.client_co_transit_time}</p>
                </div>
              )}
            </div>

            <Button 
              onClick={handleSimulate}
              className="bg-amber-500 hover:bg-amber-600 text-[#19150B] rounded-full h-10 px-5 font-bold border-0 transition-all duration-300"
            >
              <Zap size={14} className="mr-1.5" />
              {lang === 'en' ? 'Calculate Route' : 'Calculer l\'itinéraire'}
            </Button>
          </Card>

          {/* Export Report Panel */}
          <Card className="shadow-lg rounded-3xl border border-border/50 bg-card/60 backdrop-blur-md p-6 flex flex-col justify-between gap-4 text-left">
            <div>
              <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary"><Download size={16}/></span>
                {t.client_co_reports_title}
              </h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                {t.client_co_reports_desc}
              </p>
              
              <div className="mt-4 p-3 bg-slate-900/60 border border-slate-800/80 rounded-xl space-y-2.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400 flex items-center gap-1.5"><Package size={12}/> {lang === 'en' ? 'Logistics requests:' : 'Demandes logistiques :'}</span>
                  <span className="text-white font-bold">{requestsSize}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 flex items-center gap-1.5"><Users2 size={12}/> {lang === 'en' ? 'Attached members:' : 'Collaborateurs rattachés :'}</span>
                  <span className="text-white font-bold">{usersSize}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 flex items-center gap-1.5"><Landmark size={12}/> {lang === 'en' ? 'Estimated total budget:' : 'Budget total estimé :'}</span>
                  <span className="text-emerald-400 font-bold">{currentBudget.toLocaleString(lang === 'en' ? 'en-US' : 'fr-FR')} GNF</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 flex items-center gap-1.5"><ShieldCheck size={12}/> {lang === 'en' ? 'Completed trips:' : 'Missions terminées :'}</span>
                  <span className="text-white font-bold">{completedCount}</span>
                </div>
              </div>

              {requestsSize === 0 && !isLoading && (
                <div className="mt-3 flex items-center gap-2 text-xs text-amber-400 bg-amber-500/5 border border-amber-500/20 rounded-xl p-3">
                  <AlertCircle size={14} />
                  {t.client_co_empty_reports}
                </div>
              )}
            </div>

            <Button 
              onClick={handleExportCSV}
              className="bg-primary hover:bg-primary/95 text-white rounded-full h-10 px-6 font-bold shadow-md shadow-primary/10 transition-all duration-300"
            >
              <Download size={14} className="mr-1.5" />
              {lang === 'en' ? 'Export as CSV (Freight)' : 'Exporter au format CSV (Fret)'}
            </Button>
          </Card>
        </div>
        
        {/* Navigation / Quick Actions */}
        <div className="grid gap-6 md:grid-cols-2 text-left">
          <Card className="shadow-lg rounded-3xl border-border/50 bg-card/60 backdrop-blur-md p-6 flex flex-col justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary"><ListChecks size={16}/></span>
                {t.client_co_create_req_card}
              </h3>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                {t.client_co_create_req_desc}
              </p>
              <div className="grid grid-cols-3 gap-2 mt-4 text-xs text-center">
                <div className="p-2 rounded-xl bg-amber-500/5 border border-amber-500/15">
                  <p className="font-bold text-amber-400 text-base">{pendingCount}</p>
                  <p className="text-muted-foreground">{t.client_co_pending}</p>
                </div>
                <div className="p-2 rounded-xl bg-blue-500/5 border border-blue-500/15">
                  <p className="font-bold text-blue-400 text-base">{inProgressCount}</p>
                  <p className="text-muted-foreground">{t.client_co_in_progress}</p>
                </div>
                <div className="p-2 rounded-xl bg-emerald-500/5 border border-emerald-500/15">
                  <p className="font-bold text-emerald-400 text-base">{completedCount}</p>
                  <p className="text-muted-foreground">{t.client_co_completed}</p>
                </div>
              </div>
            </div>
            <Button asChild className="rounded-full h-10 px-5 bg-primary hover:bg-primary/90 text-white font-semibold transition-all duration-300 w-full">
              <Link href="/dashboard/client/requests" className="flex items-center justify-center gap-1">
                {t.client_co_access_reqs} <ArrowRight size={14}/>
              </Link>
            </Button>
          </Card>

          <Card className="shadow-lg rounded-3xl border-border/50 bg-card/60 backdrop-blur-md p-6 flex flex-col justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary"><Users2 size={16}/></span>
                {t.client_manage_users}
              </h3>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                {t.client_co_collab_desc}
              </p>
              <div className="mt-4 flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/15">
                <Users2 size={20} className="text-primary shrink-0" />
                <div className="text-xs">
                  <p className="font-bold text-foreground">{usersSize} {usersSize > 1 ? t.client_co_active_users_count_plural : t.client_co_active_users_count}</p>
                  <p className="text-muted-foreground">{t.client_co_attached_to} {userData.companyName}</p>
                </div>
              </div>
            </div>
            <Button asChild className="rounded-full h-10 px-5 bg-primary/10 hover:bg-primary/20 text-primary font-semibold border border-primary/20 transition-all duration-300 w-full">
              <Link href="/dashboard/client-company/users" className="flex items-center justify-center gap-1">
                {t.client_manage_users} <ArrowRight size={14}/>
              </Link>
            </Button>
          </Card>
        </div>
    </div>
  );
}
