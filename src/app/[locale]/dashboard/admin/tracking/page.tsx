
"use client"

import React from 'react';
import { useCollection } from 'react-firebase-hooks/firestore';
import { db } from '@/lib/firebase';
import {
  collection,
  query,
  where,
} from 'firebase/firestore';
import dynamic from 'next/dynamic';
import { Loader2, Globe } from 'lucide-react';

const AdminMap = dynamic(() => import('@/components/admin-map'), { 
  ssr: false,
  loading: () => (
    <div className="flex flex-col items-center justify-center h-[560px] bg-slate-950 text-white rounded-3xl space-y-3">
      <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      <span className="text-xs font-semibold text-slate-400">Chargement de la Carte Logistique...</span>
    </div>
  )
});

const AdminGlobalTrackingPage = () => {
  const activeJobsQuery = React.useMemo(() => {
    return query(collection(db, 'requests'));
  }, []);

  const usersQuery = React.useMemo(() => {
    return query(collection(db, 'users'));
  }, []);

  const agenciesQuery = React.useMemo(() => {
    return query(collection(db, 'agencies'));
  }, []);

  const corridorsQuery = React.useMemo(() => {
    return query(collection(db, 'corridors'));
  }, []);

  const [activeJobsSnapshot, loadingJobs] = useCollection(activeJobsQuery);
  const [usersSnapshot] = useCollection(usersQuery);
  const [agenciesSnapshot] = useCollection(agenciesQuery);
  const [corridorsSnapshot] = useCollection(corridorsQuery);

  const activeJobs = React.useMemo(() => {
    if (!activeJobsSnapshot) return [];
    return activeJobsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }, [activeJobsSnapshot]);

  const usersList = React.useMemo(() => {
    if (!usersSnapshot) return [];
    return usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }, [usersSnapshot]);

  const agenciesList = React.useMemo(() => {
    if (!agenciesSnapshot) return [];
    return agenciesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }, [agenciesSnapshot]);

  const corridorsList = React.useMemo(() => {
    if (!corridorsSnapshot) return [];
    return corridorsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }, [corridorsSnapshot]);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
        <Globe className="text-indigo-500" /> Suivi Global & Carte Logistique
      </h1>

      {loadingJobs ? (
        <div className="flex justify-center items-center h-[500px]">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        </div>
      ) : (
        <AdminMap 
          activeJobs={activeJobs as any[]}
          usersList={usersList}
          agenciesList={agenciesList}
          corridorsList={corridorsList}
        />
      )}
    </div>
  );
};

export default AdminGlobalTrackingPage;
