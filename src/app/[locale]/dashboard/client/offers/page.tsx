"use client"

import React from 'react';
import AvailableOffersComponent from '@/components/available-offers';
import { Card, CardContent } from "@/components/ui/card";

export default function ClientDashboardOffersPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Offres & Demandes</h1>
        <p className="text-slate-400 text-sm mt-1">
          Visualisez les demandes de transport actives en Guinée et localisez les cargaisons proches.
        </p>
      </div>

      <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-md rounded-2xl p-6">
        <CardContent className="p-0">
          <AvailableOffersComponent />
        </CardContent>
      </Card>
    </div>
  );
}
