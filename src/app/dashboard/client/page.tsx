
"use client"

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

// This page now simply acts as a redirect to the default client view.
export default function ClientDashboardRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/client/tracking');
  }, [router]);

  return (
    <div className="flex h-full w-full items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin" />
      <p className="ml-2">Redirection vers votre tableau de bord...</p>
    </div>
  );
}
