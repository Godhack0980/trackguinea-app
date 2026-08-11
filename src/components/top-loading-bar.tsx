"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export default function TopLoadingBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // When path or search params change, complete the bar
    if (loading) {
      setProgress(100);
      const timer = setTimeout(() => {
        setLoading(false);
        setProgress(0);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [pathname, searchParams]);

  useEffect(() => {
    // Intercept clicks on links or sidebar items to trigger immediate loading feedback
    const handleClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest("a, button[data-nav-item='true']");
      if (target) {
        const href = (target as HTMLAnchorElement).getAttribute("href");
        if (href && href.startsWith("/") && !href.startsWith("#")) {
          if (href !== window.location.pathname) {
            setLoading(true);
            setProgress(30);
          }
        }
      }
    };

    window.addEventListener("click", handleClick, { capture: true });
    return () => window.removeEventListener("click", handleClick, { capture: true });
  }, []);

  useEffect(() => {
    let interval: any;
    if (loading && progress < 85) {
      interval = setInterval(() => {
        setProgress((prev) => (prev >= 85 ? prev : prev + Math.floor(Math.random() * 10 + 5)));
      }, 150);
    }
    return () => clearInterval(interval);
  }, [loading, progress]);

  if (!loading && progress === 0) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[99999] pointer-events-none h-1 bg-slate-800/20">
      <div
        className="h-full bg-gradient-to-r from-indigo-500 via-sky-400 to-emerald-400 transition-all duration-300 ease-out shadow-[0_0_12px_rgba(99,102,241,0.8)]"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
