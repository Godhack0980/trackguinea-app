
"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import { getDocs, collection, query, orderBy, where } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { format } from "date-fns"
import { Loader2, RefreshCw } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"

export default function AdminRequestsPage() {
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [allRequests, setAllRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchRequests = useCallback(async (showSpinner = false) => {
    if (showSpinner) setIsRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const baseQuery = collection(db, 'requests');
      const q = filter !== 'all'
        ? query(baseQuery, where('status', '==', filter), orderBy("createdAt", "desc"))
        : query(baseQuery, orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      setAllRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e: any) {
      console.error("Error loading admin requests:", e);
      setError(e);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [filter]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const getStatusBadge = (status: string) => {
    let className = "px-3 py-1 rounded-full text-sm font-medium ";
    switch (status) {
        case 'En attente': className += 'bg-yellow-100 text-yellow-700'; break;
        case 'En cours': className += 'bg-blue-100 text-blue-700'; break;
        case 'Terminé': className += 'bg-green-100 text-green-700'; break;
        case 'Annulé': className += 'bg-red-100 text-red-700'; break;
        default: className += 'bg-gray-100 text-gray-700'; break;
    }
    return <span className={className}>{status}</span>;
  };

  const filteredRequests = useMemo(() => {
    return allRequests.filter(req => {
      const term = searchTerm.toLowerCase();
      return (req.clientName?.toLowerCase().includes(term) || req.id.toLowerCase().includes(term));
    });
  }, [allRequests, searchTerm]);

  if (error) {
    return <p className="text-destructive p-6">Erreur: impossible de charger les courses. {error.message}</p>;
  }

  return (
    <div className="p-6 space-y-6">
       <div className="flex justify-between items-center">
         <h1 className="text-3xl font-bold text-primary">Toutes les Courses</h1>
         <Button
           variant="ghost"
           size="sm"
           onClick={() => fetchRequests(true)}
           disabled={isRefreshing}
           className="gap-2 text-muted-foreground hover:text-foreground"
         >
           <RefreshCw size={15} className={isRefreshing ? "animate-spin" : ""} />
           Actualiser
         </Button>
       </div>
       <Card className="shadow-md rounded-2xl border-border">
        <CardHeader>
          <CardTitle className="text-lg text-accent">Suivi des demandes</CardTitle>
          <CardDescription>Suivi de toutes les demandes de transport sur la plateforme.</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="flex items-center gap-4 mb-4">
                <Input 
                  placeholder="Rechercher par client ou ID..." 
                  className="max-w-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <Select onValueChange={setFilter} defaultValue="all">
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filtrer par statut" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les statuts</SelectItem>
                    <SelectItem value="En attente">En attente</SelectItem>
                    <SelectItem value="En cours">En cours</SelectItem>
                    <SelectItem value="Terminé">Terminé</SelectItem>
                    <SelectItem value="Annulé">Annulé</SelectItem>
                  </SelectContent>
                </Select>
             </div>
          <div className="w-full overflow-x-auto">
            <table className="w-full border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-muted/50 text-left">
                  <th className="p-3">ID Course</th>
                  <th className="p-3">Client</th>
                  <th className="p-3">Transporteur</th>
                  <th className="p-3">Trajet</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Statut</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="text-center p-4">
                      <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
                    </td>
                  </tr>
                ) : filteredRequests.length > 0 ? filteredRequests.map((req: any) => (
                    <tr key={req.id} className="hover:bg-muted/30 transition">
                      <td className="p-3 font-mono text-xs">{req.id}</td>
                      <td className="p-3 font-medium">{req.clientName || 'N/A'}</td>
                      <td className="p-3">{req.transporterName || 'N/A'}</td>
                      <td className="p-3">{req.from} → {req.to}</td>
                      <td className="p-3">{format(req.date.toDate(), "PPP")}</td>
                      <td className="p-3">{getStatusBadge(req.status)}</td>
                    </tr>
                )) : (
                  <tr>
                      <td colSpan={6} className="text-center text-muted-foreground p-4">
                          Aucune demande de transport trouvée.
                      </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
