"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface PasswordRequirementsProps {
  password?: string;
}

export function validatePasswordRules(password: string = "") {
  return {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
  };
}

export function isPasswordValid(password: string = ""): boolean {
  const rules = validatePasswordRules(password);
  return Object.values(rules).every(Boolean);
}

export default function PasswordRequirements({ password = "" }: PasswordRequirementsProps) {
  const rules = validatePasswordRules(password);
  const metCount = Object.values(rules).filter(Boolean).length;

  const strengthText = [
    "Vide",
    "Très Faible",
    "Faible",
    "Moyen",
    "Fort",
    "Excellent"
  ][metCount];

  const strengthColor = [
    "bg-slate-700",
    "bg-red-500",
    "bg-red-500",
    "bg-amber-500",
    "bg-indigo-500",
    "bg-emerald-500"
  ][metCount];

  const percent = metCount * 20;

  return (
    <div className="mt-2 space-y-1.5 text-xs animate-in fade-in duration-200">
      {/* Indicator Bar & Text */}
      <div className="flex justify-between items-center text-[10px] text-slate-400">
        <span>Force du mot de passe</span>
        <span className={cn("font-bold transition-colors duration-200", 
          metCount <= 2 ? "text-red-400" : 
          metCount === 3 ? "text-amber-400" : 
          metCount === 4 ? "text-indigo-400" : "text-emerald-400"
        )}>
          {strengthText}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
        <div 
          className={cn("h-full transition-all duration-300", strengthColor)} 
          style={{ width: `${percent}%` }}
        />
      </div>

      {/* Concise Requirements Instruction */}
      <p className="text-[10px] text-slate-500 leading-normal">
        <span className="font-semibold text-slate-400">Exigences :</span> au moins 8 caractères, au moins 1 majuscule, au moins 1 minuscule, au moins 1 chiffre (0-9), au moins 1 caractère spécial (@, #, !, etc.)
      </p>
    </div>
  );
}
