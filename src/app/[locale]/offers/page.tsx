"use client"

import React from 'react';
import SharedHeader from '@/components/shared-header';
import SharedFooter from '@/components/shared-footer';
import AvailableOffersComponent from '@/components/available-offers';
import { Card, CardContent } from "@/components/ui/card";
import { useTranslation } from '@/lib/translations';

export default function PublicOffersPage() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col min-h-screen bg-[#070B13] text-white">
      {/* Header */}
      <SharedHeader />

      <main className="flex-grow pt-28 pb-20">
        <div className="container px-4 mx-auto space-y-12">
          {/* Hero Section */}
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <span className="text-emerald-400 font-bold tracking-wider uppercase text-xs px-3 py-1 bg-emerald-500/10 rounded-full w-fit mx-auto border border-emerald-500/20">
              {t('offers.hero_badge')}
            </span>
            <h1 className="font-headline text-3xl md:text-5xl font-extrabold text-white leading-tight">
              {t('offers.hero_title')}
            </h1>
            <p className="text-slate-400 text-sm md:text-base leading-relaxed">
              {t('offers.hero_desc')}
            </p>
          </div>

          {/* Interactive map and offers list */}
          <Card className="border-slate-900 bg-slate-950/30 backdrop-blur-md rounded-3xl p-6 md:p-8">
            <CardContent className="p-0">
              <AvailableOffersComponent />
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <SharedFooter />
    </div>
  );
}
