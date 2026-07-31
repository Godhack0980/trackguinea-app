"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { Loader2 } from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const { user, userData, loadingAuth } = useAuth();

  useEffect(() => {
    if (loadingAuth) return;

    if (!user) {
      router.push("/login");
      return;
    }

    if (userData) {
      const role = userData.role || "client";
      switch (role) {
        case "admin":
          router.push("/dashboard/admin");
          break;
        case "transporter":
          router.push("/dashboard/transporter");
          break;
        case "client-company":
          router.push("/dashboard/client-company");
          break;
        case "transporter-company":
          router.push("/dashboard/transporter-company");
          break;
        default:
          router.push("/dashboard/client");
      }
    }
  }, [user, userData, loadingAuth, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
      <div className="text-center space-y-4">
        <Loader2 className="animate-spin h-10 w-10 text-primary mx-auto" />
        <p className="text-sm text-slate-400">Redirection vers votre espace...</p>
      </div>
    </div>
  );
}
