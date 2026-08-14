"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, CheckCircle2, Building2, Phone, FileText, Award } from "lucide-react";
import { cn } from "@/lib/utils";

export interface VerificationData {
  isVerified?: boolean;
  verificationLevel?: "silver" | "gold" | "certified";
  phoneVerified?: boolean;
  identityVerified?: boolean;
  companyDocsVerified?: boolean;
  transportLicenseVerified?: boolean;
  insuranceVerified?: boolean;
}

interface CompanyVerificationBadgeProps {
  data?: VerificationData;
  showDetails?: boolean;
  className?: string;
}

export default function CompanyVerificationBadge({
  data,
  showDetails = false,
  className
}: CompanyVerificationBadgeProps) {

  const isVerified = Boolean(data?.isVerified);
  const phone = Boolean(data?.phoneVerified);
  const identity = Boolean(data?.identityVerified);
  const docs = Boolean(data?.companyDocsVerified);
  const license = Boolean(data?.transportLicenseVerified);
  const insurance = Boolean(data?.insuranceVerified);

  if (!isVerified) {
    return (
      <Badge className={cn("bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 text-[10px] font-bold", className)}>
        ⚪ En attente de vérification
      </Badge>
    );
  }

  return (
    <div className={cn("inline-flex flex-col gap-1", className)}>
      <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
        🟢 Entreprise Vérifiée ✓
      </Badge>

      {showDetails && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 pt-1 text-[10px] font-semibold text-slate-700 dark:text-slate-300">
          <span className={cn("flex items-center gap-1", phone ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400")}>
            <CheckCircle2 size={10} /> Téléphone ✓
          </span>
          <span className={cn("flex items-center gap-1", identity ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400")}>
            <CheckCircle2 size={10} /> Identité ✓
          </span>
          <span className={cn("flex items-center gap-1", docs ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400")}>
            <CheckCircle2 size={10} /> Registre RCCM ✓
          </span>
          <span className={cn("flex items-center gap-1", license ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400")}>
            <CheckCircle2 size={10} /> Licence Transport ✓
          </span>
          <span className={cn("flex items-center gap-1", insurance ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400")}>
            <CheckCircle2 size={10} /> Assurance Flotte ✓
          </span>
          <span className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-black">
            <Award size={10} /> Transporteur Certifié 🥇
          </span>
        </div>
      )}
    </div>
  );
}
