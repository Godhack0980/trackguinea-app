
"use client"

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation"
import { signOut } from 'firebase/auth';
import React, { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from "@/context/auth-context";

import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarTrigger,
  SidebarInset,
} from "@/components/ui/sidebar"
import Logo from "@/components/logo"
import {
  LogOut,
  User,
  Truck,
  Loader2,
  Users,
  FileText,
  Star,
  History,
  ClipboardList,
  Shield,
  LineChart,
  MapPin,
  Calculator,
  PackagePlus,
  ShieldCheck,
  Globe,
  Building,
  Users2,
  Car,
  Ban
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import RoleSwitcher from "@/components/role-switcher";
import { auth } from "@/lib/firebase";
import Notifications from "@/components/notifications";

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const { user, loadingAuth, userData } = useAuth();
  const [activeRole, setActiveRole] = useState(userData?.role);

  useEffect(() => {
    if (userData?.role) {
      setActiveRole(userData.role);
    }
  }, [userData?.role]);


  useEffect(() => {
    if (!loadingAuth && !user) {
      router.push('/login');
    }
  }, [user, loadingAuth, router, toast]);

  const handleLogout = async () => {
    try {
        await signOut(auth);
        toast({
            title: "Déconnexion réussie",
            description: "À bientôt !",
        });
        router.push('/');
    } catch (error) {
        toast({
            variant: "destructive",
            title: "Erreur lors de la déconnexion",
            description: "Une erreur est survenue.",
        });
    }
  };
  
  const getInitials = () => {
    if (userData?.firstName && userData?.lastName) {
      return `${userData.firstName[0]}${userData.lastName[0]}`;
    }
     if (userData?.companyName) {
      return `${userData.companyName.substring(0, 2)}`;
    }
    return userData?.email?.[0]?.toUpperCase() ?? 'U';
  }

  if (loadingAuth || !user || !userData) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="ml-2">Chargement de votre session...</p>
      </div>
    );
  }
  
  const isClient = activeRole === 'client';
  const isClientCompany = activeRole === 'client-company';
  const isTransporter = activeRole === 'transporter';
  const isTransporterCompany = activeRole === 'transporter-company';
  const isAdmin = activeRole === 'admin';

  const clientNav = (
    <>
      <SidebarMenuItem>
        <SidebarMenuButton href="/dashboard/client/tracking" isActive={pathname === '/dashboard/client/tracking'} tooltip="Suivi des colis">
          <MapPin />
          <span>Suivi des colis</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
      <SidebarMenuItem>
        <SidebarMenuButton href="/dashboard/client/requests" isActive={pathname.startsWith('/dashboard/client/requests')} tooltip="Mes Demandes">
          <PackagePlus />
          <span>Mes Demandes</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
        <SidebarMenuItem>
        <SidebarMenuButton href="/dashboard/client/price-simulator" isActive={pathname === '/dashboard/client/price-simulator'} tooltip="Simulateur de Prix">
          <Calculator />
          <span>Simulateur de Prix</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
      <SidebarMenuItem>
        <SidebarMenuButton href="/dashboard/client/available-transporters" isActive={pathname.startsWith('/dashboard/client/available-transporters')} tooltip="Transporteurs disponibles">
          <Users />
          <span>Voir les transporteurs</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
        <SidebarMenuItem>
        <SidebarMenuButton href="/dashboard/client/history" isActive={pathname === '/dashboard/client/history'} tooltip="Historique & Évaluations">
          <History />
          <span>Historique & Évaluations</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
      <SidebarMenuItem>
        <SidebarMenuButton href="/dashboard/client/documents" isActive={pathname === '/dashboard/client/documents'} tooltip="Mes documents">
          <FileText />
          <span>Mes documents</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </>
  )

  const clientCompanyNav = (
    <>
      <SidebarMenuItem>
        <SidebarMenuButton href="/dashboard/client-company" isActive={pathname === '/dashboard/client-company'} tooltip="Tableau de bord">
          <LineChart />
          <span>Tableau de bord</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
      {clientNav}
      <SidebarMenuItem>
        <SidebarMenuButton href="/dashboard/client-company/users" isActive={pathname === '/dashboard/client-company/users'} tooltip="Gérer les utilisateurs">
          <Users2 />
          <span>Gérer les utilisateurs</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </>
  )


  const transporterNav = (
     <>
      <SidebarMenuItem>
        <SidebarMenuButton href="/dashboard/transporter" isActive={pathname === '/dashboard/transporter'} tooltip="Demandes disponibles">
          <ClipboardList />
          <span>Demandes disponibles</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
      <SidebarMenuItem>
        <SidebarMenuButton href="/dashboard/transporter/jobs" isActive={pathname === '/dashboard/transporter/jobs'} tooltip="Mes Courses">
          <Truck />
          <span>Mes Courses</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
        <SidebarMenuItem>
        <SidebarMenuButton href="/dashboard/transporter/ratings" isActive={pathname === '/dashboard/transporter/ratings'} tooltip="Mes évaluations">
          <Star />
          <span>Mes évaluations</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
        <SidebarMenuItem>
        <SidebarMenuButton href="/dashboard/transporter/documents" isActive={pathname === '/dashboard/transporter/documents'} tooltip="Mes documents">
          <FileText />
          <span>Mes documents</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </>
  )
  
  const transporterCompanyNav = (
     <>
      <SidebarMenuItem>
        <SidebarMenuButton href="/dashboard/transporter-company" isActive={pathname === '/dashboard/transporter-company'} tooltip="Tableau de bord">
          <LineChart />
          <span>Tableau de bord</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
      <SidebarMenuItem>
        <SidebarMenuButton href="/dashboard/transporter-company/drivers" isActive={pathname === '/dashboard/transporter-company/drivers'} tooltip="Gérer les chauffeurs">
          <Users2 />
          <span>Gérer les chauffeurs</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
      <SidebarMenuItem>
        <SidebarMenuButton href="/dashboard/transporter-company/fleet" isActive={pathname === '/dashboard/transporter-company/fleet'} tooltip="Gérer la flotte">
          <Car />
          <span>Gérer la flotte</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
       <SidebarMenuItem>
        <SidebarMenuButton href="/dashboard/transporter" isActive={pathname === '/dashboard/transporter'} tooltip="Demandes disponibles">
          <ClipboardList />
          <span>Demandes disponibles</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
      <SidebarMenuItem>
        <SidebarMenuButton href="/dashboard/transporter/jobs" isActive={pathname === '/dashboard/transporter/jobs'} tooltip="Courses de l'entreprise">
          <Truck />
          <span>Courses de l'entreprise</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
       <SidebarMenuItem>
        <SidebarMenuButton href="/dashboard/transporter/ratings" isActive={pathname === '/dashboard/transporter/ratings'} tooltip="Évaluations">
          <Star />
          <span>Évaluations</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </>
  )


  return (
    <SidebarProvider>
      <div className="flex min-h-screen">
        <Sidebar>
          <SidebarHeader>
            <Logo />
          </SidebarHeader>
          <SidebarContent>
            <SidebarMenu>
              {isClient && clientNav}
              {isClientCompany && clientCompanyNav} 
              {isTransporter && transporterNav}
              {isTransporterCompany && transporterCompanyNav}
              {isAdmin && (
                <>
                   <SidebarMenuItem>
                    <SidebarMenuButton href="/dashboard/admin" isActive={pathname === '/dashboard/admin'} tooltip="Dashboard">
                      <LineChart />
                      <span>Dashboard</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                   <SidebarMenuItem>
                    <SidebarMenuButton href="/dashboard/admin/tracking" isActive={pathname === '/dashboard/admin/tracking'} tooltip="Suivi Global">
                      <Globe />
                      <span>Suivi Global</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton href="/dashboard/admin/users" isActive={pathname === '/dashboard/admin/users'} tooltip="Utilisateurs">
                      <Users />
                      <span>Utilisateurs</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton href="/dashboard/admin/requests" isActive={pathname === '/dashboard/admin/requests'} tooltip="Toutes les courses">
                      <Truck />
                      <span>Toutes les courses</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                   <SidebarMenuItem>
                    <SidebarMenuButton href="/dashboard/admin/verification" isActive={pathname === '/dashboard/admin/verification'} tooltip="Vérifications">
                      <ShieldCheck />
                      <span>Vérifications</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton href="/dashboard/admin/cancellations" isActive={pathname === '/dashboard/admin/cancellations'} tooltip="Annulations">
                      <Ban />
                      <span>Annulations</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </>
              )}
              <SidebarMenuItem>
                <SidebarMenuButton href="/dashboard/profile" isActive={pathname === '/dashboard/profile'} tooltip="Profil">
                  {isClientCompany || isTransporterCompany ? <Building /> : <User />}
                  <span>Mon profil</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter>
             {userData.isAdmin && <RoleSwitcher 
                currentRole={activeRole} 
                onRoleChange={(newRole) => {
                  setActiveRole(newRole);
                  router.push(`/dashboard/${newRole}`);
                }}
             />}
            <SidebarMenu>
              <SidebarMenuItem>
                <Button onClick={handleLogout} variant="ghost" className="w-full justify-start">
                    <LogOut className="mr-2 h-4 w-4"/>
                    <span>Déconnexion</span>
                </Button>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>
        <SidebarInset>
          <header className="flex h-14 items-center gap-4 border-b bg-background px-4 lg:h-[60px] lg:px-6">
            <SidebarTrigger className="md:hidden" />
            <div className="flex-1">
            </div>
            <div className="flex items-center gap-2">
                <p className="hidden sm:block text-sm font-medium">
                    Bonjour, {userData?.firstName || userData?.companyName || 'Utilisateur'} !
                </p>
                <Notifications />
                <Avatar>
                <AvatarImage src={userData?.photoURL || `https://placehold.co/40x40/008080/FFFFFF/png?text=${getInitials()}`} />
                <AvatarFallback>{getInitials()}</AvatarFallback>
                </Avatar>
            </div>
          </header>
          <main className="flex-1">{children}</main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <AuthProvider>
            <DashboardLayoutContent>{children}</DashboardLayoutContent>
        </AuthProvider>
    )
}
