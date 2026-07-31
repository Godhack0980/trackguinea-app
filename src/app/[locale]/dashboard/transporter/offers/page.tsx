"use client"

import React from 'react';
import AvailableOffersComponent from '@/components/available-offers';
import { Card, CardContent } from "@/components/ui/card";

export default function TransporterDashboardOffersPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Offres & Demandes</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Visualisez et postulez aux offres de transport actives à travers la Guinée.
        </p>
      </div>

      <Card className="border-border/60 bg-card/60 backdrop-blur-md rounded-2xl p-6 shadow-md">
        <CardContent className="p-0">
          <AvailableOffersComponent />
        </CardContent>
      </Card>
    </div>
  );
}
