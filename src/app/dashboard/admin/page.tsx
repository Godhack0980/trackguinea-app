
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
import { LineChart, Users, TrendingUp, AlertCircle } from 'lucide-react';

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
    <div className="min-h-screen bg-slate-50">
      <div className="px-6 lg:px-8 py-8 border-b border-slate-200 bg-white">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-teal-100 rounded-lg">
            <LineChart className="h-6 w-6 text-teal-700" />
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-slate-900">Tableau de Bord Administrateur</h1>
            <p className="mt-2 text-slate-600 text-sm">Gérez la plateforme et suivez les statistiques</p>
          </div>
        </div>
      </div>

      <div className="px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Key Metrics */}
          <div>
            <h2 className="text-lg font-bold text-slate-900 mb-4">Métriques Principales</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="border-0 shadow-md rounded-xl bg-white overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-600">Clients Inscrits</p>
                      <p className="mt-2 text-3xl font-bold text-slate-900">{clientsCount}</p>
                    </div>
                    <div className="p-3 bg-blue-100 rounded-lg">
                      <Users className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-md rounded-xl bg-white overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-600">Transporteurs</p>
                      <p className="mt-2 text-3xl font-bold text-slate-900">{transportersCount}</p>
                    </div>
                    <div className="p-3 bg-green-100 rounded-lg">
                      <TrendingUp className="h-6 w-6 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-md rounded-xl bg-white overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-600">Demandes en attente</p>
                      <p className="mt-2 text-3xl font-bold text-slate-900">{requestsStats.pending}</p>
                    </div>
                    <div className="p-3 bg-orange-100 rounded-lg">
                      <AlertCircle className="h-6 w-6 text-orange-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-md rounded-xl bg-white overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-600">Demandes en cours</p>
                      <p className="mt-2 text-3xl font-bold text-slate-900">{requestsStats.inProgress}</p>
                    </div>
                    <div className="p-3 bg-teal-100 rounded-lg">
                      <LineChart className="h-6 w-6 text-teal-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card className="border-0 shadow-md rounded-xl bg-white overflow-hidden">
                <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-teal-50 to-cyan-50 px-6 py-5">
                  <CardTitle className="text-teal-900">Demandes de la semaine</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="h-[300px]">
                    <Bar data={chartData} options={chartOptions} />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div>
              <Card className="border-0 shadow-md rounded-xl bg-white overflow-hidden">
                <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-teal-50 to-cyan-50 px-6 py-5">
                  <CardTitle className="text-teal-900 text-base">Résumé</CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-slate-600">Demandes terminées</span>
                      <span className="font-semibold text-slate-900">{requestsStats.completed}</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full" style={{width: '45%'}}></div>
                    </div>
                  </div>
                  <div className="pt-2">
                    <p className="text-xs text-slate-600">Taux de complétion: <span className="font-semibold text-slate-900">45%</span></p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Map Section */}
          <div>
            <h2 className="text-lg font-bold text-slate-900 mb-4">Suivi en Temps Réel</h2>
            <Card className="border-0 shadow-md rounded-xl bg-white overflow-hidden">
              <CardContent className="p-0">
                <AdminMap activeJobs={activeJobs} />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
