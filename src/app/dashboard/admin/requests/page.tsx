
"use client"

import { useState, useMemo } from "react"
import { useCollection } from "react-firebase-hooks/firestore"
import { collection, query, orderBy, where } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { format } from "date-fns"
import { Loader2 } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function AdminRequestsPage() {
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const requestsQuery = useMemo(() => {
    const baseQuery = collection(db, 'requests');
    if (filter !== 'all') {
      return query(baseQuery, where('status', '==', filter), orderBy("createdAt", "desc"));
    }
    return query(baseQuery, orderBy("createdAt", "desc"));
  }, [filter]);

  const [requests, loading, error] = useCollection(requestsQuery);
  
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
    if (!requests) return [];
    return requests.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(req => {
        const term = searchTerm.toLowerCase();
        return (req.clientName?.toLowerCase().includes(term) || req.id.toLowerCase().includes(term));
      });
  }, [requests, searchTerm]);

  if (error) {
    console.error(error);
    return <p className="text-destructive">Erreur: impossible de charger les courses.</p>
  }

  return (
    <div className="p-6 space-y-6">
       <h1 className="text-3xl font-bold text-primary">Toutes les Courses</h1>
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
          <table className="w-full border-collapse">
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
              ) : filteredRequests.length > 0 ? filteredRequests.map((req: any) => {
                return (
                    <tr key={req.id} className="hover:bg-muted/30 transition">
                      <td className="p-3 font-mono text-xs">{req.id}</td>
                      <td className="p-3 font-medium">{req.clientName || 'N/A'}</td>
                      <td className="p-3">{req.transporterName || 'N/A'}</td>
                      <td className="p-3">{req.from} → {req.to}</td>
                      <td className="p-3">{format(req.date.toDate(), "PPP")}</td>
                      <td className="p-3">{getStatusBadge(req.status)}</td>
                    </tr>
                )
              }) : (
                <tr>
                    <td colSpan={6} className="text-center text-muted-foreground p-4">
                        Aucune demande de transport trouvée.
                    </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
