"use client";

import type { ReactNode } from 'react';
import Logo from '@/components/logo';
import FluidDotMatrixCanvas from '@/components/fluid-dot-matrix-canvas';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#070A13] text-white p-4 sm:p-6 lg:p-8 relative overflow-hidden">
      <FluidDotMatrixCanvas />
      
      <div className="absolute top-6 left-6 z-20">
        <Logo width={150} height={45} />
      </div>
      
      <div className="w-full max-w-lg relative z-10 py-12">
        {children}
      </div>
    </div>
  );
}
