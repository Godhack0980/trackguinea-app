
"use client"

import React, { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import {
  collection,
  query,
  onSnapshot,
  Timestamp,
  where,
} from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js';
import AdminMap from '@/components/admin-map';
import type { TransportRequest } from '@/ai/types';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const AdminDashboard = () => {
  const [clientsCount, setClientsCount] = useState(0);
  const [transportersCount, setTransportersCount] = useState(0);
  const [requestsStats, setRequestsStats] = useState({
    pending: 0,
    inProgress: 0,
    completed: 0,
  });
  const [weeklyRequests, setWeeklyRequests] = useState<number[]>([]);
  const [activeJobs, setActiveJobs] = useState<TransportRequest[]>([]);

  useEffect(() => {
    // Écoute les utilisateurs
    const usersRef = collection(db, 'users');
    const unsubscribeUsers = onSnapshot(usersRef, (snapshot) => {
      let clients = 0;
      let transporters = 0;
      snapshot.forEach((doc) => {
        const user = doc.data();
        if (user.role === 'client') clients++;
        if (user.role === 'transporter') transporters++;
      });
      setClientsCount(clients);
      setTransportersCount(transporters);
    });

    // Écoute les demandes
    const requestsRef = collection(db, 'requests');
    const unsubscribeRequests = onSnapshot(requestsRef, (snapshot) => {
      let pending = 0;
      let inProgress = 0;
      let completed = 0;
      const active: TransportRequest[] = [];

      snapshot.forEach((doc) => {
        const req = { id: doc.id, ...doc.data() } as TransportRequest;
        if (req.status === 'En attente') pending++;
        if (req.status === 'En cours') {
          inProgress++;
          active.push(req);
        }
        if (req.status === 'Terminé') completed++;
      });

      setRequestsStats({ pending, inProgress, completed });
      setActiveJobs(active);
    });

    // Écoute les demandes de la semaine
    const sevenDaysAgo = Timestamp.fromDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
    const weeklyRef = query(collection(db, 'requests'), where('createdAt', '>=', sevenDaysAgo));
    const unsubscribeWeekly = onSnapshot(weeklyRef, (snapshot) => {
      const daily = Array(7).fill(0);
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.createdAt?.toDate) {
          const day = data.createdAt.toDate().getDay(); // 0 (dim) - 6 (sam)
          daily[day]++;
        }
      });
      setWeeklyRequests(daily);
    });

    return () => {
      unsubscribeUsers();
      unsubscribeRequests();
      unsubscribeWeekly();
    };
  }, []);

  const chartData = {
    labels: ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'],
    datasets: [
      {
        label: 'Demandes / jour',
        data: weeklyRequests,
        backgroundColor: [
          'hsl(var(--chart-1))',
          'hsl(var(--chart-2))',
          'hsl(var(--chart-3))',
          'hsl(var(--chart-4))',
          'hsl(var(--chart-5))',
          'hsl(var(--accent))',
          'hsl(var(--primary))',
        ],
        borderRadius: 6,
        borderSkipped: false,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1,
          color: 'hsl(var(--muted-foreground))',
        },
        grid: {
          color: 'hsl(var(--muted) / 0.4)',
        },
      },
      x: {
        ticks: {
          color: 'hsl(var(--muted-foreground))',
        },
        grid: {
          display: false,
        },
      },
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'hsl(var(--popover))',
        titleColor: 'hsl(var(--foreground))',
        bodyColor: 'hsl(var(--foreground))',
        borderColor: 'hsl(var(--border))',
        borderWidth: 1,
      },
    },
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold text-primary">Tableau de Bord Administrateur</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="shadow-md rounded-2xl border-border">
          <CardHeader>
             <CardTitle className="text-sm font-medium text-muted-foreground">Clients Inscrits</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{clientsCount}</p>
          </CardContent>
        </Card>

        <Card className="shadow-md rounded-2xl border-border">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Transporteurs</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{transportersCount}</p>
          </CardContent>
        </Card>

        <Card className="shadow-md rounded-2xl border-border">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Demandes en attente</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{requestsStats.pending}</p>
          </CardContent>
        </Card>

        <Card className="shadow-md rounded-2xl border-border">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Demandes en cours</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{requestsStats.inProgress}</p>
          </CardContent>
        </Card>

        <div className="lg:col-span-2">
          <Card className="shadow-md rounded-2xl border-border">
              <CardHeader>
                 <CardTitle className="text-lg text-accent">Demandes de la semaine</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                   <div className="h-[250px]">
                      <Bar data={chartData} options={chartOptions} />
                  </div>
              </CardContent>
          </Card>
        </div>
        
         <div className="lg:col-span-2">
           <AdminMap activeJobs={activeJobs} />
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
