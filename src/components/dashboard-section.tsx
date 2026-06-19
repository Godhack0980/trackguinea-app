import React from 'react';

interface DashboardSectionProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export default function DashboardSection({ title, description, children, className = '' }: DashboardSectionProps) {
  return (
    <div className={`${className}`}>
      {(title || description) && (
        <div className="mb-6">
          {title && <h2 className="text-xl font-bold text-slate-900">{title}</h2>}
          {description && <p className="mt-2 text-sm text-slate-600">{description}</p>}
        </div>
      )}
      {children}
    </div>
  );
}
