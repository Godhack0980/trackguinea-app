"use client";

import type { ReactNode } from 'react';
import Logo from '@/components/logo';
import { useEffect, useRef, useState } from 'react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const glow1Ref = useRef<HTMLDivElement>(null);
  const glow2Ref = useRef<HTMLDivElement>(null);
  const glow3Ref = useRef<HTMLDivElement>(null);
  const [hasMoved, setHasMoved] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        setHasMoved(true);

        // Direct DOM manipulation to ensure high performance (120fps tracking)
        if (glow1Ref.current) {
          glow1Ref.current.style.left = `${x - 300}px`;
          glow1Ref.current.style.top = `${y - 300}px`;
        }
        if (glow2Ref.current) {
          glow2Ref.current.style.left = `${x - 225}px`;
          glow2Ref.current.style.top = `${y - 225}px`;
        }
        if (glow3Ref.current) {
          glow3Ref.current.style.left = `${x - 175}px`;
          glow3Ref.current.style.top = `${y - 175}px`;
        }
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div 
      ref={containerRef}
      className="flex min-h-screen flex-col items-center justify-center bg-[#070A13] text-white p-4 sm:p-6 lg:p-8 relative overflow-hidden"
    >
      {/* Glow 1 (Outer Indigo - Wobbly Wave) */}
      <div 
        ref={glow1Ref}
        className="absolute w-[600px] h-[600px] pointer-events-none select-none mix-blend-screen opacity-0"
        style={{
          background: "radial-gradient(circle, rgba(99,102,241,0.42) 0%, rgba(59,130,246,0.22) 40%, transparent 70%)",
          filter: "blur(90px)",
          animation: "sunrise-glow-1 2.0s cubic-bezier(0.075, 0.82, 0.165, 1) forwards, liquid-blob-1 20s linear infinite",
          // Initial position in top right before mouse moves
          ...(hasMoved ? {} : { right: "-150px", top: "-150px" }),
          transition: 'left 1.2s cubic-bezier(0.15, 0.85, 0.35, 1), top 1.2s cubic-bezier(0.15, 0.85, 0.35, 1)'
        }}
      />

      {/* Glow 2 (Middle Blue - Wobbly Wave) */}
      <div 
        ref={glow2Ref}
        className="absolute w-[450px] h-[450px] pointer-events-none select-none mix-blend-screen opacity-0"
        style={{
          background: "radial-gradient(circle, rgba(59,130,246,0.5) 0%, rgba(99,102,241,0.25) 50%, transparent 80%)",
          filter: "blur(70px)",
          animation: "sunrise-glow-2 2.3s cubic-bezier(0.075, 0.82, 0.165, 1) forwards, liquid-blob-2 16s linear infinite",
          // Initial position in top right before mouse moves
          ...(hasMoved ? {} : { right: "-50px", top: "-50px" }),
          transition: 'left 0.8s cubic-bezier(0.15, 0.85, 0.35, 1), top 0.8s cubic-bezier(0.15, 0.85, 0.35, 1)'
        }}
      />

      {/* Glow 3 (Inner Core - White-Indigo Sun Center) */}
      <div 
        ref={glow3Ref}
        className="absolute w-[350px] h-[350px] pointer-events-none select-none mix-blend-screen opacity-0"
        style={{
          background: "radial-gradient(circle, rgba(255,255,255,0.7) 0%, rgba(99,102,241,0.48) 30%, rgba(59,130,246,0.2) 60%, transparent 90%)",
          filter: "blur(50px)",
          animation: "sunrise-glow-3 2.6s cubic-bezier(0.075, 0.82, 0.165, 1) forwards, liquid-blob-3 12s linear infinite",
          // Initial position in top right before mouse moves
          ...(hasMoved ? {} : { right: "0px", top: "0px" }),
          transition: 'left 0.4s cubic-bezier(0.15, 0.85, 0.35, 1), top 0.4s cubic-bezier(0.15, 0.85, 0.35, 1)'
        }}
      />
      
      {/* Decorative Subtle Grid Lines overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-10 pointer-events-none" />

      {/* Embedded CSS for keyframes (sunrise & dynamic wandering float) */}
      <style jsx global>{`
        @keyframes sunrise-glow-1 {
          0% {
            transform: scale(0.3) translate(200px, -200px);
            opacity: 0;
          }
          100% {
            transform: scale(1) translate(0, 0);
            opacity: 1;
          }
        }
        @keyframes sunrise-glow-2 {
          0% {
            transform: scale(0.3) translate(150px, -150px);
            opacity: 0;
          }
          100% {
            transform: scale(1) translate(0, 0);
            opacity: 0.95;
          }
        }
        @keyframes sunrise-glow-3 {
          0% {
            transform: scale(0.3) translate(100px, -100px);
            opacity: 0;
          }
          100% {
            transform: scale(1) translate(0, 0);
            opacity: 0.9;
          }
        }
        @keyframes liquid-blob-1 {
          0%, 100% {
            border-radius: 40% 60% 70% 30% / 40% 50% 60% 50%;
            transform: rotate(0deg) scale(1);
          }
          33% {
            border-radius: 70% 30% 52% 48% / 60% 40% 60% 40%;
            transform: rotate(120deg) scale(1.15);
          }
          66% {
            border-radius: 50% 50% 30% 70% / 40% 60% 40% 60%;
            transform: rotate(240deg) scale(0.85);
          }
        }
        @keyframes liquid-blob-2 {
          0%, 100% {
            border-radius: 50% 50% 30% 70% / 50% 60% 40% 60%;
            transform: rotate(0deg) scale(1.05);
          }
          50% {
            border-radius: 30% 70% 70% 30% / 60% 40% 60% 40%;
            transform: rotate(-180deg) scale(0.9);
          }
        }
        @keyframes liquid-blob-3 {
          0%, 100% {
            border-radius: 60% 40% 50% 50% / 40% 60% 40% 60%;
            transform: rotate(0deg) scale(0.95);
          }
          50% {
            border-radius: 40% 60% 60% 40% / 60% 40% 70% 30%;
            transform: rotate(180deg) scale(1.05);
          }
        }
      `}</style>

      <div className="absolute top-6 left-6 z-20">
        <Logo width={150} height={45} />
      </div>
      
      <div className="w-full max-w-lg relative z-10 py-12">
        {children}
      </div>
    </div>
  );
}
