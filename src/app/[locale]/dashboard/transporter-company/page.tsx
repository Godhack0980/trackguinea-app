"use client"

import { useAuth } from "@/context/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Users2, Car, LineChart, Shield, Landmark, PieChart, Wrench, Clock, ClipboardList, ShieldCheck, Download, TrendingUp } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useState, useEffect } from "react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, PieChart as RechartsPieChart, Pie, Cell } from "recharts"
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useTranslation } from "@/lib/translations";
import TransconnektIntelligence from "@/components/transconnekt-intelligence";

export default function TransporterCompanyDashboardPage() {
  const { user, userData, loadingAuth } = useAuth();
  const { t, lang } = useTranslation();

  const [driversList, setDriversList] = useState<any[]>([]);
  const [vehiclesList, setVehiclesList] = useState<any[]>([]);
  const [completedJobsCount, setCompletedJobsCount] = useState(0);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!userData?.companyId) {
      if (!loadingAuth) setLoadingData(false);
      return;
    }

    let active = true;
    setLoadingData(true);

    const fetchData = async () => {
      try {
        // Fetch drivers
        const dQuery = query(collection(db, 'users'), where('companyId', '==', userData.companyId), where('role', '==', 'transporter'));
        const dSnap = await getDocs(dQuery);
        const drivers = dSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Fetch vehicles
        const vQuery = query(collection(db, 'users', userData.companyId, 'vehicles'));
        const vSnap = await getDocs(vQuery);
        const vehicles = vSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Fetch requests assigned to these drivers
        const driverIds = drivers.map(d => d.id);
        let completedJobs = 0;
        if (driverIds.length > 0) {
          const rQuery = query(collection(db, 'requests'), where('assignedTo', 'in', driverIds));
          const rSnap = await getDocs(rQuery);
          completedJobs = rSnap.docs.filter(doc => doc.data().status === 'Terminé').length;
        }

        if (active) {
          setDriversList(drivers);
          setVehiclesList(vehicles);
          setCompletedJobsCount(completedJobs);
          setLoadingData(false);
        }
      } catch (err) {
        console.error("Error loading transporter fleet dashboard data:", err);
        if (active) setLoadingData(false);
      }
    };

    fetchData();
    return () => { active = false; };
  }, [userData?.companyId, loadingAuth]);
  
  if (loadingAuth || !userData) {
    return (
      <div className="flex h-full w-full items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const isLoading = loadingData;

  const driversCount = driversList.length;
  const vehiclesCount = vehiclesList.length;
  
  // Simulated revenue & metrics
  const simulatedMonthlyEarnings = completedJobsCount * 1250000;
  const activeDriversPercent = driversCount > 0 ? 80 : 0;
  const maintenanceCount = Math.round(vehiclesCount * 0.2);
  const activeVehiclesCount = vehiclesCount - maintenanceCount;

  // Donut chart data for fleet utilization
  const fleetData = [
    { name: lang === 'en' ? 'In Service' : 'En service', value: activeVehiclesCount || 1, color: "#10b981" },
    { name: lang === 'en' ? 'In Maintenance' : 'En maintenance', value: maintenanceCount || 0, color: "#f59e0b" },
    { name: t.available || "Disponible", value: Math.max(0, vehiclesCount - activeVehiclesCount - maintenanceCount), color: "#3b82f6" }
  ].filter(d => d.value > 0);

  // Simulated earnings over time
  const monthlyEarningsData = [
    { month: "Jan", gains: Math.round(completedJobsCount * 0.5 * 1250) * 1000 },
    { month: lang === 'en' ? 'Feb' : 'Fév', gains: Math.round(completedJobsCount * 0.7 * 1250) * 1000 },
    { month: "Mar", gains: Math.round(completedJobsCount * 0.8 * 1250) * 1000 },
    { month: lang === 'en' ? 'Apr' : 'Avr', gains: Math.round(completedJobsCount * 0.9 * 1250) * 1000 },
    { month: "Mai", gains: Math.round(completedJobsCount * 1.0 * 1250) * 1000 },
    { month: lang === 'en' ? 'Jun' : 'Juin', gains: Math.round(completedJobsCount * 1.2 * 1250) * 1000 }
  ];

  const stats = [
    { title: t.trans_co_stats_drivers, value: isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : driversCount, icon: <Users2 className="text-indigo-400" />, description: t.trans_co_stats_drivers_desc, link: "/dashboard/transporter-company/drivers" },
    { title: t.trans_co_stats_fleet, value: isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : vehiclesCount, icon: <Car className="text-sky-400" />, description: t.trans_co_stats_fleet_desc, link: "/dashboard/transporter-company/fleet" },
    { title: t.trans_co_stats_gains, value: isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : `${simulatedMonthlyEarnings.toLocaleString(lang === 'en' ? 'en-US' : 'fr-FR')} GNF`, icon: <Landmark className="text-emerald-400" />, description: t.trans_co_stats_gains_desc, link: "/dashboard/transporter-company/drivers" },
  ]

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border/40 pb-5">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">{t.trans_co_title} - {userData.companyName}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t.trans_co_subtitle}</p>
        </div>
      </div>

      <TransconnektIntelligence />

      {/* DEMAND FORECASTING BANNER (Item 26) */}
      <Card className="border-2 border-indigo-500/30 bg-gradient-to-r from-slate-900 via-indigo-950/60 to-slate-900 text-white rounded-3xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-indigo-500/20 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              <TrendingUp className="w-6 h-6 text-indigo-400 animate-pulse" />
            </span>
            <div>
              <h3 className="text-base font-black text-white flex items-center gap-2">
                🔮 Moteur de Prévision de la Demande Fret (7–14 Jours)
                <Badge className="bg-indigo-500 text-white font-bold text-[9px] uppercase">IA Prédictive</Badge>
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Anticipation des volumes de cargaison et recommandations de positionnement de flotte.
              </p>
            </div>
          </div>
          <Link href="/dashboard/corridors">
            <Button variant="outline" className="border-indigo-500/40 text-indigo-200 hover:bg-indigo-500/20 text-xs font-bold rounded-xl h-9">
              Explorer les Corridors →
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-indigo-500/20 space-y-1">
            <div className="flex justify-between items-center">
              <span className="font-bold text-slate-200">Conakry → Bamako</span>
              <span className="font-black text-emerald-400 text-xs">+24% demande</span>
            </div>
            <p className="text-[11px] text-slate-400">18 transports anticipés cette semaine.</p>
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-[10px] text-indigo-300 font-semibold mt-2">
              💡 <strong>Conseil Flotte :</strong> Positionnez 3 camions plateau à Conakry.
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-indigo-500/20 space-y-1">
            <div className="flex justify-between items-center">
              <span className="font-bold text-slate-200">Conakry → Dakar</span>
              <span className="font-black text-emerald-400 text-xs">+18% demande</span>
            </div>
            <p className="text-[11px] text-slate-400">12 transports anticipés cette semaine.</p>
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-[10px] text-indigo-300 font-semibold mt-2">
              💡 <strong>Conseil Flotte :</strong> 2 semi-remorques recommandés.
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-indigo-500/20 space-y-1">
            <div className="flex justify-between items-center">
              <span className="font-bold text-slate-200">Nzérékoré → Abidjan</span>
              <span className="font-black text-emerald-400 text-xs">+12% demande</span>
            </div>
            <p className="text-[11px] text-slate-400">9 transports anticipés cette semaine.</p>
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-[10px] text-indigo-300 font-semibold mt-2">
              💡 <strong>Conseil Flotte :</strong> Demande stable fret agricole.
            </div>
          </div>
        </div>
      </Card>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        {stats.map(stat => (
          <Link href={stat.link} key={stat.title} className="block transition-all duration-300 hover:-translate-y-1">
            <Card className="shadow-lg rounded-3xl border border-border/50 bg-card/60 backdrop-blur-md cursor-pointer hover:bg-card/85 transition-colors h-full">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-bold text-muted-foreground">{stat.title}</CardTitle>
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-800/80 border border-border/50 shrink-0">{stat.icon}</span>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="text-2xl font-extrabold text-foreground">{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Analytics Section */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Earnings Area Chart */}
        <Card className="shadow-lg rounded-3xl border border-border/50 bg-card/60 backdrop-blur-md lg:col-span-2 overflow-hidden">
          <CardHeader className="border-b border-border/20 pb-4">
            <CardTitle className="text-lg font-bold text-foreground">{t.trans_co_gains_title}</CardTitle>
            <CardDescription>{t.trans_co_gains_desc}</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyEarningsData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="companyGains" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                  <XAxis dataKey="month" stroke="#9ca3af" fontSize={10} tickLine={false} />
                  <YAxis stroke="#9ca3af" fontSize={10} tickLine={false} tickFormatter={(tick) => `${(tick / 1000000).toFixed(1)}M`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '16px' }}
                    labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                    itemStyle={{ color: '#10b981' }}
                    formatter={(value: any) => [`${Number(value).toLocaleString(lang === 'en' ? 'en-US' : 'fr-FR')} GNF`, lang === 'en' ? 'Earnings' : 'Revenus']}
                  />
                  <Area type="monotone" dataKey="gains" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#companyGains)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Fleet Distribution Donut Chart */}
        <Card className="shadow-lg rounded-3xl border border-border/50 bg-card/60 backdrop-blur-md lg:col-span-1 overflow-hidden flex flex-col justify-between">
          <CardHeader className="border-b border-border/20 pb-4">
            <CardTitle className="text-lg font-bold text-foreground">{t.trans_co_fleet_title}</CardTitle>
            <CardDescription>{t.trans_co_fleet_desc}</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 flex flex-col items-center justify-center">
            {vehiclesCount > 0 ? (
              <>
                <div className="h-[180px] w-full relative flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={fleetData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={75}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {fleetData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                        itemStyle={{ color: '#fff' }}
                      />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                  <div className="absolute text-center">
                    <span className="text-3xl font-extrabold text-foreground">{vehiclesCount}</span>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">{t.trans_co_fleet_trucks}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-2 w-full mt-6 text-center text-xs">
                  {fleetData.map((d, i) => (
                    <div key={i} className="p-2 rounded-xl bg-slate-900/40 border border-border/20">
                      <span className="inline-block w-2.5 h-2.5 rounded-full mr-1.5" style={{ backgroundColor: d.color }} />
                      <p className="text-muted-foreground text-[10px] font-bold uppercase mt-0.5">{d.name}</p>
                      <p className="text-foreground font-bold text-sm mt-0.5">{d.value}</p>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="py-14 text-center text-muted-foreground text-xs font-semibold">
                <PieChart className="h-10 w-10 mx-auto opacity-35 mb-2" />
                {t.trans_co_fleet_none}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── FLEET MAINTENANCE & DRIVERS TRACKING SYSTEM ── */}
      <div className="grid gap-6 lg:grid-cols-2 text-left">
        {/* Driver Tracking Log */}
        <Card className="shadow-lg rounded-3xl border border-border/50 bg-card/60 backdrop-blur-md p-6 flex flex-col justify-between gap-4">
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400"><Clock size={16}/></span>
              {t.trans_co_drivers_title}
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              {t.trans_co_drivers_desc}
            </p>

            {driversList.length > 0 ? (
              <div className="border border-slate-800/80 rounded-2xl overflow-x-auto bg-[#0B0F19]/40 text-xs">
                <Table className="min-w-[450px]">
                  <TableHeader className="bg-slate-950/40">
                    <TableRow className="border-slate-800 hover:bg-transparent">
                      <TableHead className="text-slate-400 font-bold">{t.trans_co_table_driver}</TableHead>
                      <TableHead className="text-slate-400 font-bold">{t.trans_co_table_license}</TableHead>
                      <TableHead className="text-slate-400 font-bold">{t.trans_co_table_status}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {driversList.map((d, index) => {
                      // Alternate statuses for presentation
                      const statuses = [
                        t.trans_co_driver_active || 'Disponible',
                        t.trans_co_driver_transit || 'En transit',
                        t.trans_co_driver_rest || 'En repos'
                      ];
                      const status = statuses[index % statuses.length];
                      return (
                        <TableRow key={d.id} className="border-slate-800 hover:bg-slate-900/40">
                          <TableCell className="font-semibold text-white">
                            {d.firstName} {d.lastName}
                          </TableCell>
                          <TableCell className="text-slate-300 font-medium">
                            {d.licenseType ? `Permis ${d.licenseType}` : 'Poids Lourd'}
                          </TableCell>
                          <TableCell>
                            <Badge className={
                              status === (t.trans_co_driver_active || 'Disponible') ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                              status === (t.trans_co_driver_transit || 'En transit') ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20" :
                              "bg-slate-500/10 text-slate-400 border border-slate-500/20"
                            }>
                              {status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic">{t.trans_co_drivers_none}</p>
            )}
          </div>
          <div className="flex justify-end pt-2">
            <Button asChild variant="ghost" className="rounded-full text-xs text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/5">
              <Link href="/dashboard/transporter-company/drivers">{t.trans_co_btn_manage} →</Link>
            </Button>
          </div>
        </Card>

        {/* Fleet Maintenance Log & CSV Exporter */}
        <Card className="shadow-lg rounded-3xl border border-border/50 bg-card/60 backdrop-blur-md p-6 flex flex-col justify-between gap-4">
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-500/10 text-sky-400"><Wrench size={16}/></span>
              {t.trans_co_reports_title}
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              {t.trans_co_reports_desc}
            </p>

            <div className="p-3 bg-slate-900/60 border border-slate-800/80 rounded-xl space-y-2.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-400 flex items-center gap-1.5"><ShieldCheck size={14} className="text-emerald-500"/> {t.trans_co_reports_ok}</span>
                <span className="text-white font-bold">{activeVehiclesCount}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 flex items-center gap-1.5"><Wrench size={14} className="text-amber-500"/> {t.trans_co_reports_maint}</span>
                <span className="text-white font-bold">{maintenanceCount}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/20 mt-4">
            <Button asChild className="bg-sky-500 hover:bg-sky-600 text-white rounded-full text-xs h-9 px-4 font-bold">
              <Link href="/dashboard/transporter-company/fleet">{t.trans_co_btn_fleet}</Link>
            </Button>
            
            <Button 
              onClick={() => {
                if (vehiclesList.length === 0) {
                  alert(lang === 'en' ? "No vehicle in the fleet for export." : "Aucun véhicule dans la flotte pour l'export.");
                  return;
                }
                
                let csvContent = "data:text/csv;charset=utf-8,ID,Marque,Modele,Immatriculation,Type,Capacite(tonnes),Statut\n";
                
                vehiclesList.forEach((v) => {
                  const row = `"${v.id}","${v.brand || ''}","${v.model || ''}","${v.registration || ''}","${v.type || ''}","${v.capacity || ''}","${v.status || 'Disponible'}"`;
                  csvContent += row + "\n";
                });

                const encodedUri = encodeURI(csvContent);
                const link = document.createElement("a");
                link.setAttribute("href", encodedUri);
                link.setAttribute("download", `flotte_vehicules_${userData.companyName || 'transporteur'}.csv`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}
              className="bg-primary hover:bg-primary/95 text-white rounded-full text-xs h-9 px-4 font-bold flex items-center gap-1.5 shadow-md shadow-primary/10 transition-all"
            >
              <Download size={14}/> {t.trans_co_btn_export}
            </Button>
          </div>
        </Card>
      </div>

      {/* Navigation Controls */}
      <div className="grid gap-6 md:grid-cols-2 text-left">
        <Card className="shadow-lg rounded-3xl border border-border/50 bg-card/60 backdrop-blur-md overflow-hidden transition-all hover:scale-[1.01]">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400"><Users2 size={16} /></span>
              {t.drivers_title}
            </CardTitle>
            <CardDescription>{lang === 'en' ? 'Manage drivers under contract, send invitations, and assign them to vehicles.' : 'Gérez les conducteurs sous contrat, envoyez des invitations et assignez-les aux véhicules.'}</CardDescription>
          </CardHeader>
          <CardContent className="pb-6">
            <Button asChild className="rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white">
              <Link href="/dashboard/transporter-company/drivers">
                {t.trans_co_driver_panel_btn}
              </Link>
            </Button>
          </CardContent>
        </Card>
        
        <Card className="shadow-lg rounded-3xl border border-border/50 bg-card/60 backdrop-blur-md overflow-hidden transition-all hover:scale-[1.01]">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-500/10 text-sky-400"><Car size={16} /></span>
              {t.fleet_title}
            </CardTitle>
            <CardDescription>{lang === 'en' ? 'Register new trucks (heavy trucks, trailers), configure payload in tons.' : 'Déclarez de nouveaux camions (poids lourds, remorques), configurez la charge utile en tonnes.'}</CardDescription>
          </CardHeader>
          <CardContent className="pb-6">
             <Button asChild className="rounded-xl font-bold bg-sky-600 hover:bg-sky-700 text-white">
              <Link href="/dashboard/transporter-company/fleet">
                {t.trans_co_fleet_panel_btn}
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
