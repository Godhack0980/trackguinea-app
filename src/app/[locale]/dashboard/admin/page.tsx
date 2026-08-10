"use client"

import React, { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, Timestamp, query, where } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import dynamic from 'next/dynamic';
const AdminMap = dynamic(() => import('@/components/admin-map'), { ssr: false });
import type { TransportRequest } from '@/ai/types';
import { Loader2, Users, Truck, AlertCircle, Play, TrendingUp, HelpCircle, Search, FileText, ArrowRight, Clock, Star, MapPin } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from "recharts";
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import TransconnektIntelligence from '@/components/transconnekt-intelligence';

// Helper to generate unique ID label for users if not present in DB
const getUserIdLabel = (user: any, docId: string) => {
  if (user.uniqueId) return user.uniqueId;
  const roleMap: Record<string, string> = {
    'client': 'CLI',
    'client-company': 'PRO',
    'transporter': 'IND',
    'transporter-company': 'TRP',
    'admin': 'ADM'
  };
  const prefix = roleMap[user.role] || 'USR';
  const shortId = docId ? docId.substring(0, 4).toUpperCase() : Math.floor(1000 + Math.random() * 9000);
  return `TG-${prefix}-${shortId}`;
};

// Helper to generate unique ID label for requests if not present in DB
const getCourseIdLabel = (req: any, docId: string) => {
  if (req.uniqueId) return req.uniqueId;
  const shortId = docId ? docId.substring(0, 4).toUpperCase() : Math.floor(1000 + Math.random() * 9000);
  return `TG-CRS-${shortId}`;
};

export default function AdminDashboard() {
  const [clientsCount, setClientsCount] = useState(0);
  const [transportersCount, setTransportersCount] = useState(0);
  const [requestsStats, setRequestsStats] = useState({
    pending: 0,
    inProgress: 0,
    completed: 0,
  });
  const [weeklyRequests, setWeeklyRequests] = useState<{ day: string, count: number }[]>([]);
  const [activeJobs, setActiveJobs] = useState<TransportRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // States for search and detailed viewing
  const [searchId, setSearchId] = useState('');
  const [searchResults, setSearchResults] = useState<{
    type: 'user' | 'course' | 'none';
    data: any;
    history?: any[];
  } | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);

  // Global lists for caching / calculations
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [allRequests, setAllRequests] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch Users
        const usersRef = collection(db, 'users');
        const usersSnap = await getDocs(usersRef);
        let clients = 0;
        let transporters = 0;
        const usersList: any[] = [];
        
        usersSnap.forEach((doc) => {
          const user = { id: doc.id, ...doc.data() } as any;
          usersList.push(user);
          if (user.role === 'client' || user.role === 'client-company') clients++;
          if (user.role === 'transporter' || user.role === 'transporter-company') transporters++;
        });
        setAllUsers(usersList);
        setClientsCount(clients);
        setTransportersCount(transporters);

        // Fetch Requests
        const requestsRef = collection(db, 'requests');
        const requestsSnap = await getDocs(requestsRef);
        let pending = 0;
        let inProgress = 0;
        let completed = 0;
        const active: TransportRequest[] = [];
        const requestsList: any[] = [];

        requestsSnap.forEach((doc) => {
          const req = { id: doc.id, ...doc.data() } as any;
          requestsList.push(req);
          if (req.status === 'En attente') pending++;
          if (req.status === 'En cours') {
            inProgress++;
            active.push(req);
          }
          if (req.status === 'Terminé') completed++;
        });
        setAllRequests(requestsList);
        setRequestsStats({ pending, inProgress, completed });
        setActiveJobs(active);

        // Process Weekly volume directly
        const sevenDaysAgoTime = Date.now() - 7 * 24 * 60 * 60 * 1000;
        const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
        const daily = Array(7).fill(0);

        requestsSnap.forEach((doc) => {
          const data = doc.data();
          if (data.createdAt?.toDate) {
            const date = data.createdAt.toDate();
            if (date.getTime() >= sevenDaysAgoTime) {
              const day = date.getDay(); // 0-6
              daily[day]++;
            }
          }
        });

        const formattedWeekly = days.map((day, idx) => ({
          day,
          count: daily[idx]
        }));
        setWeeklyRequests(formattedWeekly);
      } catch (err) {
        console.error("Error loading admin stats:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleSearch = () => {
    if (!searchId.trim()) {
      setSearchResults(null);
      return;
    }
    
    setSearchLoading(true);
    const cleanedSearch = searchId.trim().toUpperCase();

    // 1. Search in Requests
    const matchedRequest = allRequests.find(req => {
      const uniqueId = getCourseIdLabel(req, req.id).toUpperCase();
      return uniqueId === cleanedSearch || req.id.toUpperCase() === cleanedSearch;
    });

    if (matchedRequest) {
      setSearchResults({
        type: 'course',
        data: matchedRequest
      });
      setSearchLoading(false);
      return;
    }

    // 2. Search in Users
    const matchedUser = allUsers.find(user => {
      const uniqueId = getUserIdLabel(user, user.id).toUpperCase();
      return uniqueId === cleanedSearch || user.id.toUpperCase() === cleanedSearch;
    });

    if (matchedUser) {
      // Find course history for this user
      const userHistory = allRequests.filter(req => 
        req.clientId === matchedUser.id || req.assignedTransporterId === matchedUser.id
      );

      setSearchResults({
        type: 'user',
        data: matchedUser,
        history: userHistory
      });
      setSearchLoading(false);
      return;
    }

    // 3. No match found
    setSearchResults({
      type: 'none',
      data: null
    });
    setSearchLoading(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="animate-spin h-10 w-10 text-primary" />
      </div>
    )
  }

  const metrics = [
    { title: "Clients Inscrits", value: clientsCount, icon: <Users className="text-sky-400" />, desc: "Comptes particuliers & pro", link: "/dashboard/admin/users" },
    { title: "Transporteurs", value: transportersCount, icon: <Truck className="text-indigo-400" />, desc: "Indépendants & flottes", link: "/dashboard/admin/users" },
    { title: "Demandes en attente", value: requestsStats.pending, icon: <HelpCircle className="text-amber-400" />, desc: "En attente de chauffeur", link: "/dashboard/admin/requests" },
    { title: "Demandes en cours", value: requestsStats.inProgress, icon: <Play className="text-emerald-400" />, desc: "Cargaisons en transit", link: "/dashboard/admin/tracking" }
  ];

  return (
    <div className="p-6 space-y-6 text-left">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border/40 pb-5">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Console Administrateur</h1>
          <p className="text-sm text-muted-foreground mt-1">Supervisez l'activité globale, gérez les demandes et observez le transit en temps réel.</p>
        </div>
      </div>

      <TransconnektIntelligence />

      {/* ── BARRE DE RECHERCHE GÉNÉRALISTE D'IDENTIFIANTS UNIQUES ── */}
      <Card className="shadow-xl rounded-3xl border-2 border-primary/20 bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/40 text-white overflow-hidden">
        <CardContent className="p-6 md:p-8 space-y-6">
          <div className="max-w-2xl">
            <h3 className="text-lg font-bold flex items-center gap-2 mb-2">
              <Search className="w-5 h-5 text-primary" />
              Recherche d'identifiants uniques (IDs)
            </h3>
            <p className="text-slate-400 text-xs mb-4">
              Saisissez l'ID Unique d'un Client, d'un Transporteur, d'une Entreprise (ex: <code className="text-indigo-400 font-bold">TG-CLI-XXXX</code>, <code className="text-indigo-400 font-bold">TG-TRP-XXXX</code>) ou d'une Course (ex: <code className="text-indigo-400 font-bold">TG-CRS-XXXX</code>) pour afficher son dossier complet.
            </p>
            <div className="flex gap-2">
              <Input
                placeholder="Entrez l'identifiant unique (ex: TG-CLI-1048)"
                className="bg-[#0B0F19] border-slate-800 text-slate-100 rounded-xl h-12 text-sm placeholder:text-slate-500 focus-visible:ring-indigo-500"
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
              />
              <Button 
                onClick={handleSearch} 
                className="bg-primary hover:bg-primary/90 text-white rounded-xl h-12 px-6 font-bold shrink-0 shadow-lg shadow-primary/20"
                disabled={searchLoading}
              >
                {searchLoading ? <Loader2 className="animate-spin w-5 h-5" /> : "Rechercher"}
              </Button>
            </div>
          </div>

          {/* Search Results Visualizer */}
          {searchResults && (
            <div className="mt-6 border-t border-slate-800/80 pt-6 animate-fade-in-up">
              {searchResults.type === 'none' && (
                <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl text-sm">
                  <AlertCircle className="w-5 h-5" />
                  Aucun élément trouvé avec l'identifiant unique : <strong className="text-white">"{searchId}"</strong>
                </div>
              )}

              {/* USER PROFILE DETAILS VIEW */}
              {searchResults.type === 'user' && (
                <div className="space-y-6">
                  <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl">
                    <div>
                      <span className="text-xs text-indigo-400 font-bold uppercase tracking-wider">Type de compte : {searchResults.data.role}</span>
                      <h4 className="text-2xl font-bold text-white mt-1">
                        {searchResults.data.companyName || `${searchResults.data.firstName} ${searchResults.data.lastName}`}
                      </h4>
                      <p className="text-slate-400 text-xs mt-1">
                        ID Unique : <code className="text-primary font-bold text-sm bg-primary/10 px-2 py-0.5 rounded">{getUserIdLabel(searchResults.data, searchResults.data.id)}</code>
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={searchResults.data.isVerified ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"}>
                        {searchResults.data.isVerified ? "Vérifié" : "En attente de vérification"}
                      </Badge>
                      {searchResults.data.isSuspended && (
                        <Badge variant="destructive">Suspendu</Badge>
                      )}
                    </div>
                  </div>

                  {/* Comprehensive Parameters Grid */}
                  <div className="grid md:grid-cols-3 gap-6">
                    {/* Column 1: Contacts */}
                    <Card className="bg-[#0B0F19]/60 border border-slate-800/80 rounded-2xl">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-bold text-slate-300">Coordonnées de contact</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3 text-xs">
                        <div>
                          <span className="text-slate-500 block">Nom complet</span>
                          <span className="text-white font-medium">{searchResults.data.firstName} {searchResults.data.lastName}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Adresse Email</span>
                          <span className="text-white font-medium">{searchResults.data.email}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Téléphone</span>
                          <span className="text-white font-medium">{searchResults.data.phone || "Non renseigné"}</span>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Column 2: Specific business registration metadata */}
                    <Card className="bg-[#0B0F19]/60 border border-slate-800/80 rounded-2xl">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-bold text-slate-300">Informations Légales & Région</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3 text-xs">
                        <div>
                          <span className="text-slate-500 block">Ville / Préfecture</span>
                          <span className="text-white font-medium">
                            {searchResults.data.residencePrefecture || searchResults.data.headquartersPrefecture || searchResults.data.currentPrefecture || "Non spécifié"}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Registre de commerce (RCCM)</span>
                          <span className="text-white font-medium">{searchResults.data.rccm || "Non applicable"}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Adresse physique</span>
                          <span className="text-white font-medium truncate block">{searchResults.data.address || "Non renseigné"}</span>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Column 3: Category parameters */}
                    <Card className="bg-[#0B0F19]/60 border border-slate-800/80 rounded-2xl">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-bold text-slate-300">Critères d'Activité & Matériels</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3 text-xs">
                        {/* Clients details */}
                        {searchResults.data.role.includes('client') && (
                          <>
                            <div>
                              <span className="text-slate-500 block">Secteur industriel</span>
                              <span className="text-white font-medium">{searchResults.data.sector || "Non spécifié"}</span>
                            </div>
                            <div>
                              <span className="text-slate-500 block">Volume Fret estimé</span>
                              <span className="text-white font-medium">{searchResults.data.estimatedVolume || "Non spécifié"}</span>
                            </div>
                          </>
                        )}

                        {/* Transporters details */}
                        {searchResults.data.role.includes('transporter') && (
                          <>
                            <div>
                              <span className="text-slate-500 block">Type de permis / Camions</span>
                              <span className="text-white font-medium">
                                {searchResults.data.licenseType ? `Permis ${searchResults.data.licenseType}` : (searchResults.data.truckTypes || "Non spécifié")}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-500 block">Flotte / Immatriculation</span>
                              <span className="text-white font-medium">
                                {searchResults.data.vehicleRegistration || (searchResults.data.fleetSize ? `${searchResults.data.fleetSize} véhicules` : "Non spécifié")}
                              </span>
                            </div>
                          </>
                        )}
                        <div>
                          <span className="text-slate-500 block">Inscrit depuis le</span>
                          <span className="text-white font-medium">
                            {searchResults.data.createdAt?.toDate ? searchResults.data.createdAt.toDate().toLocaleDateString() : "Non spécifié"}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Course / Trip history list */}
                  <div className="space-y-3">
                    <h5 className="text-sm font-bold text-slate-300 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-primary" />
                      Historique détaillé des trajets & courses
                    </h5>
                    {searchResults.history && searchResults.history.length > 0 ? (
                      <div className="border border-slate-800/80 rounded-2xl overflow-x-auto bg-[#0B0F19]/40">
                        <Table className="min-w-[700px]">
                          <TableHeader className="bg-slate-950/40">
                            <TableRow className="border-slate-800 hover:bg-transparent">
                              <TableHead className="text-slate-400 text-xs">ID Course</TableHead>
                              <TableHead className="text-slate-400 text-xs">Nature</TableHead>
                              <TableHead className="text-slate-400 text-xs">Trajet</TableHead>
                              <TableHead className="text-slate-400 text-xs">Distance/Durée</TableHead>
                              <TableHead className="text-slate-400 text-xs">Statut</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {searchResults.history.map((req: any) => (
                              <TableRow key={req.id} className="border-slate-800 hover:bg-slate-900/40">
                                <TableCell className="font-mono text-indigo-400 font-bold text-xs">
                                  {getCourseIdLabel(req, req.id)}
                                </TableCell>
                                <TableCell className="text-slate-300 text-xs">{req.nature}</TableCell>
                                <TableCell className="text-slate-300 text-xs">
                                  {req.from} → {req.to}
                                </TableCell>
                                <TableCell className="text-slate-400 text-xs">
                                  {req.distance} km / {Math.floor(req.duration / 60)}h
                                </TableCell>
                                <TableCell>
                                  <Badge className={
                                    req.status === 'Terminé' ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" :
                                    req.status === 'En cours' ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30" :
                                    "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                                  }>
                                    {req.status}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <p className="text-slate-500 text-xs italic">Aucune course enregistrée dans l'historique de cet utilisateur.</p>
                    )}
                  </div>
                </div>
              )}

              {/* COURSE DETAILS VIEW */}
              {searchResults.type === 'course' && (
                <div className="space-y-6">
                  <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl">
                    <div>
                      <span className="text-xs text-emerald-400 font-bold uppercase tracking-wider">Fiche de Course Fret</span>
                      <h4 className="text-2xl font-bold text-white mt-1">
                        Transport de : {searchResults.data.nature}
                      </h4>
                      <p className="text-slate-400 text-xs mt-1">
                        ID Course : <code className="text-primary font-bold text-sm bg-primary/10 px-2 py-0.5 rounded">{getCourseIdLabel(searchResults.data, searchResults.data.id)}</code>
                      </p>
                    </div>
                    <div>
                      <Badge className={
                        searchResults.data.status === 'Terminé' ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-sm py-1 px-3" :
                        searchResults.data.status === 'En cours' ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 text-sm py-1 px-3" :
                        "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 text-sm py-1 px-3"
                      }>
                        {searchResults.data.status}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Ride Details Card */}
                    <Card className="bg-[#0B0F19]/60 border border-slate-800/80 rounded-2xl">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-bold text-slate-300">Détails logistiques</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3 text-xs">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-indigo-400" />
                          <span className="text-white font-medium">{searchResults.data.from} → {searchResults.data.to}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Poids total estimé</span>
                          <span className="text-white font-medium">{searchResults.data.weight} {searchResults.data.weightUnit}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Distance / Durée</span>
                          <span className="text-white font-medium">{searchResults.data.distance} km (~{Math.floor(searchResults.data.duration / 60)}h)</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Date de livraison prévue</span>
                          <span className="text-white font-medium">
                            {searchResults.data.date?.toDate ? searchResults.data.date.toDate().toLocaleDateString() : "Non spécifié"}
                          </span>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Actors details Card */}
                    <Card className="bg-[#0B0F19]/60 border border-slate-800/80 rounded-2xl">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-bold text-slate-300">Acteurs de la transaction</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3 text-xs">
                        <div>
                          <span className="text-slate-500 block">Client Expéditeur</span>
                          <span className="text-white font-medium">{searchResults.data.clientName}</span>
                          <span className="text-slate-400 block mt-0.5 text-[10px]">ID: {searchResults.data.clientId}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Transporteur assigné</span>
                          <span className="text-white font-medium">{searchResults.data.transporterName || "Non encore assigné"}</span>
                          {searchResults.data.assignedTransporterId && (
                            <span className="text-slate-400 block mt-0.5 text-[10px]">ID: {searchResults.data.assignedTransporterId}</span>
                          )}
                        </div>
                        <div>
                          <span className="text-slate-500 block">Date de publication</span>
                          <span className="text-white font-medium">
                            {searchResults.data.createdAt?.toDate ? searchResults.data.createdAt.toDate().toLocaleDateString() : "Non spécifiée"}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {metrics.map(metric => (
          <Link href={metric.link} key={metric.title} className="block transition-all duration-300 hover:-translate-y-1">
            <Card className="shadow-lg rounded-3xl border border-border/50 bg-card/60 backdrop-blur-md cursor-pointer hover:bg-card/85 transition-colors h-full">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-bold text-muted-foreground">{metric.title}</CardTitle>
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-800/80 border border-border/50 shrink-0">{metric.icon}</span>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="text-3xl font-extrabold text-foreground">{metric.value}</div>
                <p className="text-xs text-muted-foreground mt-1">{metric.desc}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Graphs Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Weekly requests bar chart */}
        <Card className="shadow-lg rounded-3xl border border-border/50 bg-card/60 backdrop-blur-md overflow-hidden">
          <CardHeader className="border-b border-border/20 pb-4">
            <CardTitle className="text-lg font-bold text-foreground">Demandes de la semaine</CardTitle>
            <CardDescription>Volume journalier des nouvelles courses enregistrées</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="h-[285px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyRequests} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                  <XAxis dataKey="day" stroke="#9ca3af" fontSize={10} tickLine={false} />
                  <YAxis stroke="#9ca3af" fontSize={10} tickLine={false} allowDecimals={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                    labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                    itemStyle={{ color: '#818cf8' }}
                  />
                  <Bar dataKey="count" fill="#818cf8" radius={[6, 6, 0, 0]}>
                    {weeklyRequests.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 5 || index === 6 ? '#10b981' : '#818cf8'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Real-time Map */}
        <div className="rounded-3xl overflow-hidden border border-border/50 shadow-lg bg-slate-950">
          <AdminMap activeJobs={activeJobs} />
        </div>
      </div>
    </div>
  );
}
