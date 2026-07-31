
"use client"

import React from 'react';
import { useCollection } from 'react-firebase-hooks/firestore';
import { db } from '@/lib/firebase';
import {
  collection,
  query,
  where,
} from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import AdminMap from '@/components/admin-map';
import { Loader2, Globe } from 'lucide-react';

const AdminGlobalTrackingPage = () => {
  const activeJobsQuery = React.useMemo(() => {
    return query(
        collection(db, 'requests'), 
        where('status', '==', 'En cours')
    );
  }, []);

  const [activeJobsSnapshot, loading, error] = useCollection(activeJobsQuery);

  const activeJobs = React.useMemo(() => {
    if (!activeJobsSnapshot) return [];
    return activeJobsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as any[];
  }, [activeJobsSnapshot]);

  if (error) {
    console.error("Erreur de chargement des courses:", error);
    return <p className="text-destructive text-center">Erreur: impossible de charger les courses en cours.</p>
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold text-primary flex items-center gap-2"><Globe/> Suivi Global des Courses</h1>
     <Card className="shadow-md rounded-2xl border-border">
        <CardHeader>
          <CardTitle className="text-lg text-accent">Carte en direct</CardTitle>
          <CardDescription>Visualisez en temps réel la position de toutes les courses actuellement en cours sur la plateforme.</CardDescription>
        </CardHeader>
        <CardContent>
            {loading ? (
                <div className="flex justify-center items-center h-[500px]">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : (
                <AdminMap activeJobs={activeJobs} />
            )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminGlobalTrackingPage;
