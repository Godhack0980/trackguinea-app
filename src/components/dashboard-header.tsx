import React from 'react';
import { LucideIcon } from 'lucide-react';

interface DashboardHeaderProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
}

export default function DashboardHeader({ title, subtitle, icon: Icon }: DashboardHeaderProps) {
  return (
    <div className="px-6 lg:px-8 py-8 border-b border-slate-200 bg-white">
      <div className="flex items-start gap-4">
        {Icon && (
          <div className="p-3 bg-teal-100 rounded-lg">
            <Icon className="h-6 w-6 text-teal-700" />
          </div>
        )}
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-slate-900">{title}</h1>
          {subtitle && (
            <p className="mt-2 text-slate-600 text-sm max-w-2xl">{subtitle}</p>
          )}
        </div>
      </div>
    </div>
  );
}
