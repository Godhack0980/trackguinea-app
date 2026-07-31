
"use client"

import "@/lib/i18n";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation"
import { signOut } from 'firebase/auth';
import React, { useEffect, useState, useRef } from 'react';
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
  ChevronDown,
  User,
  Truck,
  Loader2,
  Users,
  FileText,
  Star,
  History,
  ClipboardList,
  Shield,
  Landmark,
  LineChart,
  MapPin,
  Calculator,
  PackagePlus,
  ShieldCheck,
  Globe,
  Building,
  Users2,
  Car,
  Ban,
  Wallet,
  BarChart3,
  ScrollText,
  Briefcase,
  BookOpen,
  TrendingUp,
  MessageSquare,
  FilePlus2,
  Bell,
  Smartphone,
  Coins
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useTranslation, useDomTranslation } from "@/lib/translations"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import RoleSwitcher from "@/components/role-switcher";
import { auth, db } from "@/lib/firebase";
import { doc, updateDoc, Timestamp } from "firebase/firestore";
import Notifications from "@/components/notifications";
import ChatWidget from "@/components/chat-widget";
import PersistentNotificationPrompt from "@/components/persistent-notification-prompt";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const LANGUAGES = [
  { code: 'fr', flag: '🇫🇷', label: 'FR', name: 'Français' },
  { code: 'en', flag: '🇬🇧', label: 'EN', name: 'English' },
  { code: 'es', flag: '🇪🇸', label: 'ES', name: 'Español' },
  { code: 'pt', flag: '🇧🇷', label: 'PT', name: 'Português' },
  { code: 'ar', flag: '🇸🇦', label: 'AR', name: 'العربية' },
  { code: 'de', flag: '🇩🇪', label: 'DE', name: 'Deutsch' },
  { code: 'zh', flag: '🇨🇳', label: 'ZH', name: '中文' },
];

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const { user, loadingAuth, userData } = useAuth();
  const [activeRole, setActiveRole] = useState(userData?.role);
  const { t, lang, setLanguage } = useTranslation();
  useDomTranslation();

  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const langDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (langDropdownRef.current && !langDropdownRef.current.contains(e.target as Node)) {
        setLangDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const currentLang = LANGUAGES.find(l => l.code === lang) ?? LANGUAGES[0];

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

  // Online status & activity tracking
  useEffect(() => {
    if (!user?.uid) return;

    const userDocRef = doc(db, 'users', user.uid);

    const updateOnlineStatus = async (online: boolean) => {
      try {
        await updateDoc(userDocRef, {
          isOnline: online,
          lastSeen: Timestamp.now()
        });
      } catch (err) {
        console.error("Error updating online status:", err);
      }
    };

    // Set online on load/mount
    updateOnlineStatus(true);

    // Periodically update lastSeen every 2 minutes while active
    const interval = setInterval(() => {
      updateOnlineStatus(true);
    }, 120000);

    const handleUnload = () => {
      // Offline on browser tab close
      updateOnlineStatus(false);
    };

    window.addEventListener('beforeunload', handleUnload);

    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleUnload);
      updateOnlineStatus(false);
    };
  }, [user?.uid]);



  const handleLogout = async () => {
    try {
        if (user?.uid) {
            updateDoc(doc(db, 'users', user.uid), {
                isOnline: false,
                lastSeen: Timestamp.now()
            }).catch(() => {});
        }
        await signOut(auth);
        toast({
            title: "Déconnexion réussie",
            description: "À bientôt !",
        });
        window.location.href = '/';
    } catch (error) {
        console.error("Logout error:", error);
        window.location.href = '/';
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
        <SidebarMenuButton href="/dashboard/client/tracking" isActive={pathname === '/dashboard/client/tracking'} tooltip={t.client_tracking}>
          <MapPin />
          <span>{t.client_tracking}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
      <SidebarMenuItem>
        <SidebarMenuButton href="/dashboard/client/requests" isActive={pathname.startsWith('/dashboard/client/requests')} tooltip={t.client_requests}>
          <PackagePlus />
          <span>{t.client_requests}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
        <SidebarMenuItem>
        <SidebarMenuButton href="/dashboard/client/price-simulator" isActive={pathname === '/dashboard/client/price-simulator'} tooltip={t.client_price_simulator}>
          <Calculator />
          <span>{t.client_price_simulator}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
      <SidebarMenuItem>
        <SidebarMenuButton href="/dashboard/client/available-transporters" isActive={pathname.startsWith('/dashboard/client/available-transporters')} tooltip={t.client_view_transporters}>
          <Users />
          <span>{t.client_view_transporters}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
      <SidebarMenuItem>
        <SidebarMenuButton href="/dashboard/client/fleet" isActive={pathname === '/dashboard/client/fleet'} tooltip={t.client_fleet_gallery}>
          <Car />
          <span>{t.client_fleet_gallery}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
        <SidebarMenuItem>
        <SidebarMenuButton href="/dashboard/client/history" isActive={pathname === '/dashboard/client/history'} tooltip={t.client_history}>
          <History />
          <span>{t.client_history}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
      <SidebarMenuItem>
        <SidebarMenuButton href="/dashboard/client/drafts" isActive={pathname.startsWith('/dashboard/client/drafts')} tooltip={t.client_contracts}>
          <FilePlus2 />
          <span>{t.client_contracts}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
      <SidebarMenuItem>
        <SidebarMenuButton href="/dashboard/client/documents" isActive={pathname === '/dashboard/client/documents'} tooltip={t.client_documents}>
          <FileText />
          <span>{t.client_documents}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </>
  )

  const clientCompanyNav = (
    <>
      <SidebarMenuItem>
        <SidebarMenuButton href="/dashboard/client-company" isActive={pathname === '/dashboard/client-company'} tooltip={t.client_dashboard}>
          <LineChart />
          <span>{t.client_dashboard}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
      {clientNav}
      <SidebarMenuItem>
        <SidebarMenuButton href="/dashboard/client-company/users" isActive={pathname === '/dashboard/client-company/users'} tooltip={t.client_manage_users}>
          <Users2 />
          <span>{t.client_manage_users}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </>
  )

  const transporterNav = (
     <>
      <SidebarMenuItem>
        <SidebarMenuButton href="/dashboard/transporter" isActive={pathname === '/dashboard/transporter'} tooltip={t.transporter_home}>
          <ClipboardList />
          <span>{t.transporter_home}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
      <SidebarMenuItem>
        <SidebarMenuButton href="/dashboard/transporter/offers" isActive={pathname === '/dashboard/transporter/offers'} tooltip={t.transporter_offers}>
          <Globe />
          <span>{t.transporter_offers}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
      <SidebarMenuItem>
        <SidebarMenuButton href="/dashboard/transporter/jobs" isActive={pathname.startsWith('/dashboard/transporter/jobs')} tooltip={t.transporter_jobs}>
          <Truck />
          <span>{t.transporter_jobs}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
      <SidebarMenuItem>
        <SidebarMenuButton href="/dashboard/transporter/drafts" isActive={pathname.startsWith('/dashboard/transporter/drafts')} tooltip="Drafts & Contrats">
          <FilePlus2 />
          <span>Drafts & Contrats</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
      <SidebarMenuItem>
        <SidebarMenuButton href="/dashboard/transporter/fleet" isActive={pathname.startsWith('/dashboard/transporter/fleet')} tooltip={t.transporter_vehicle}>
          <Car />
          <span>{t.transporter_vehicle}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
      <SidebarMenuItem>
        <SidebarMenuButton href="/dashboard/transporter/earnings" isActive={pathname.startsWith('/dashboard/transporter/earnings')} tooltip={t.transporter_earnings}>
          <Wallet />
          <span>{t.transporter_earnings}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
      <SidebarMenuItem>
        <SidebarMenuButton href="/dashboard/transporter/documents" isActive={pathname.startsWith('/dashboard/transporter/documents')} tooltip={t.transporter_documents}>
          <FileText />
          <span>{t.transporter_documents}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
      <SidebarMenuItem>
        <SidebarMenuButton href="/dashboard/transporter/ratings" isActive={pathname.startsWith('/dashboard/transporter/ratings')} tooltip={t.transporter_ratings}>
          <Star />
          <span>{t.transporter_ratings}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </>
  )
  
  const transporterCompanyNav = (
     <>
      <SidebarMenuItem>
        <SidebarMenuButton href="/dashboard/transporter-company" isActive={pathname === '/dashboard/transporter-company'} tooltip={t.transporter_dashboard}>
          <LineChart />
          <span>{t.transporter_dashboard}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
      <SidebarMenuItem>
        <SidebarMenuButton href="/dashboard/transporter-company/offers" isActive={pathname === '/dashboard/transporter-company/offers'} tooltip={t.transporter_offers}>
          <Globe />
          <span>{t.transporter_offers}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
      <SidebarMenuItem>
        <SidebarMenuButton href="/dashboard/transporter" isActive={pathname === '/dashboard/transporter'} tooltip={t.transporter_bids}>
          <ClipboardList />
          <span>{t.transporter_bids}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
      <SidebarMenuItem>
        <SidebarMenuButton href="/dashboard/transporter/drafts" isActive={pathname.startsWith('/dashboard/transporter/drafts')} tooltip="Drafts & Contrats Cadres">
          <ScrollText />
          <span>Drafts & Contrats</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
      <SidebarMenuItem>
        <SidebarMenuButton href="/dashboard/transporter-company/fleet" isActive={pathname.startsWith('/dashboard/transporter-company/fleet')} tooltip={t.fleet}>
          <Car />
          <span>{t.fleet}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
      <SidebarMenuItem>
        <SidebarMenuButton href="/dashboard/transporter-company/drivers" isActive={pathname.startsWith('/dashboard/transporter-company/drivers')} tooltip={t.drivers}>
          <Users2 />
          <span>{t.drivers}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
      <SidebarMenuItem>
        <SidebarMenuButton href="/dashboard/transporter-company/finances" isActive={pathname.startsWith('/dashboard/transporter-company/finances')} tooltip={t.finances}>
          <Wallet />
          <span>{t.finances}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
      <SidebarMenuItem>
        <SidebarMenuButton href="/dashboard/transporter-company/invoices" isActive={pathname.startsWith('/dashboard/transporter-company/invoices')} tooltip={t.invoices}>
          <Coins />
          <span>{t.invoices}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
      <SidebarMenuItem>
        <SidebarMenuButton href="/dashboard/transporter-company/customs" isActive={pathname.startsWith('/dashboard/transporter-company/customs')} tooltip={t.customs}>
          <Landmark />
          <span>{t.customs}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
      <SidebarMenuItem>
        <SidebarMenuButton href="/dashboard/transporter-company/security" isActive={pathname.startsWith('/dashboard/transporter-company/security')} tooltip={t.security}>
          <Shield />
          <span>{t.security}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
      <SidebarMenuItem>
        <SidebarMenuButton href="/dashboard/transporter-company/mobile-simulator" isActive={pathname.startsWith('/dashboard/transporter-company/mobile-simulator')} tooltip={t.mobileWorkspace}>
          <Smartphone />
          <span>{t.mobileWorkspace}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
      <SidebarMenuItem>
        <SidebarMenuButton href="/dashboard/transporter-company/reports" isActive={pathname.startsWith('/dashboard/transporter-company/reports')} tooltip={t.reports}>
          <BarChart3 />
          <span>{t.reports}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
      <SidebarMenuItem>
        <SidebarMenuButton href="/dashboard/transporter-company/documents" isActive={pathname.startsWith('/dashboard/transporter-company/documents')} tooltip={t.company_documents}>
          <Briefcase />
          <span>{t.company_documents}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </>
  )


  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full max-w-full overflow-hidden">
        <Sidebar className="border-r border-indigo-950/20">
          <SidebarHeader className="border-b border-white/5 py-4 px-6 bg-slate-950/20">
            <Logo />
          </SidebarHeader>
          <SidebarContent className="py-2">
            <SidebarMenu>
              {isClient && clientNav}
              {isClientCompany && clientCompanyNav} 
              {isTransporter && transporterNav}
              {isTransporterCompany && transporterCompanyNav}
              {isAdmin && (
                <>
                   <SidebarMenuItem>
                    <SidebarMenuButton href="/dashboard/admin" isActive={pathname === '/dashboard/admin'} tooltip={t('navigation.dashboard')}>
                      <LineChart />
                      <span>{t('navigation.dashboard')}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                   <SidebarMenuItem>
                    <SidebarMenuButton href="/dashboard/admin/tracking" isActive={pathname === '/dashboard/admin/tracking'} tooltip={t('navigation.admin_tracking')}>
                      <Globe />
                      <span>{t('navigation.admin_tracking')}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton href="/dashboard/admin/users" isActive={pathname === '/dashboard/admin/users'} tooltip={t('navigation.admin_users')}>
                      <Users />
                      <span>{t('navigation.admin_users')}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton href="/dashboard/admin/finances" isActive={pathname === '/dashboard/admin/finances'} tooltip={t('navigation.admin_finances')}>
                      <Landmark />
                      <span>{t('navigation.finances')}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton href="/dashboard/admin/requests" isActive={pathname === '/dashboard/admin/requests'} tooltip={t('navigation.admin_all_trips')}>
                      <Truck />
                      <span>{t('navigation.admin_all_trips')}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                   <SidebarMenuItem>
                    <SidebarMenuButton href="/dashboard/admin/verification" isActive={pathname === '/dashboard/admin/verification'} tooltip={t('navigation.admin_verifications')}>
                      <ShieldCheck />
                      <span>{t('navigation.admin_verifications')}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton href="/dashboard/admin/cancellations" isActive={pathname === '/dashboard/admin/cancellations'} tooltip={t('navigation.admin_cancellations')}>
                      <Ban />
                      <span>{t('navigation.admin_cancellations')}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton href="/dashboard/admin/drafts" isActive={pathname === '/dashboard/admin/drafts'} tooltip={t('navigation.client_contracts')}>
                      <FilePlus2 />
                      <span>{t('navigation.client_contracts')}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton href="/dashboard/admin/messages" isActive={pathname === '/dashboard/admin/messages'} tooltip={t('navigation.admin_messages')}>
                      <MessageSquare />
                      <span>{t('navigation.admin_messages')}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </>
              )}
              {!isAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton href="/dashboard/messages" isActive={pathname === '/dashboard/messages'} tooltip={t.support_chat}>
                    <MessageSquare />
                    <span>{t.support_chat}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              <SidebarMenuItem>
                <SidebarMenuButton href="/dashboard/notifications" isActive={pathname === '/dashboard/notifications'} tooltip={t.notifications}>
                  <Bell />
                  <span>{t.notifications}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton href="/dashboard/profile" isActive={pathname === '/dashboard/profile'} tooltip={t.profile}>
                  {isClientCompany || isTransporterCompany ? <Building /> : <User />}
                  <span>{t.profile}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter className="border-t border-white/5 p-4 bg-slate-950/20 space-y-3">
             {userData.isAdmin && (
               <div className="px-2">
                 <RoleSwitcher 
                    currentRole={activeRole} 
                    onRoleChange={(newRole) => {
                      setActiveRole(newRole);
                      router.push(`/dashboard/${newRole}`);
                    }}
                 />
               </div>
             )}
            <SidebarMenu>
              <SidebarMenuItem>
                <Button onClick={handleLogout} variant="ghost" className="w-full justify-start text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-all duration-300">
                    <LogOut className="mr-2 h-4 w-4 text-primary"/>
                    <span>{t.logout}</span>
                </Button>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>
        <SidebarInset className="flex-1 w-full min-w-0 overflow-x-hidden">
          <header className="flex h-14 items-center gap-4 border-b border-[#4a486e]/20 bg-[#4a486e]/80 backdrop-blur-md px-4 lg:h-[60px] lg:px-6 sticky top-0 z-10 w-full shadow-lg shadow-[#4a486e]/30">
            <SidebarTrigger className="md:hidden shrink-0" />
            <div className="flex-1 min-w-0">
            </div>
            <div className="flex items-center gap-3 shrink-0">
                <p className="hidden sm:block text-sm font-medium text-muted-foreground truncate max-w-[150px] lg:max-w-[200px]">
                    {t.hello} <span className="font-semibold text-foreground">{userData?.firstName || userData?.companyName || 'Utilisateur'}</span> !
                </p>
                <div className="h-4 w-px bg-border/60 hidden sm:block" />
                {/* ── Language Dropdown ── */}
                <div className="relative" ref={langDropdownRef}>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setLangDropdownOpen(prev => !prev)}
                    className="rounded-full hover:bg-white/10 text-white transition-all duration-300 h-9 px-3 gap-1.5 text-sm font-semibold"
                    title={t('home.lang_label')}
                  >
                    <span className="text-base leading-none">{currentLang.flag}</span>
                    <span className="hidden lg:inline">{currentLang.label}</span>
                    <ChevronDown className={`h-3 w-3 opacity-70 transition-transform duration-200 ${langDropdownOpen ? 'rotate-180' : ''}`} />
                  </Button>

                  {/* Dropdown panel */}
                  {langDropdownOpen && (
                    <div className="absolute right-0 top-full mt-2 w-44 bg-[#2d2b4e] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in-0 slide-in-from-top-2 duration-150">
                      {LANGUAGES.map(l => (
                        <button
                          key={l.code}
                          onClick={() => {
                            setLanguage(l.code as any);
                            setLangDropdownOpen(false);
                          }}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors duration-150 ${
                            l.code === lang
                              ? 'bg-primary/20 text-white'
                              : 'text-white/70 hover:bg-white/10 hover:text-white'
                          }`}
                        >
                          <span className="text-base">{l.flag}</span>
                          <span>{l.name}</span>
                          {l.code === lang && (
                            <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <Notifications />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="focus:outline-none">
                      <Avatar className="h-9 w-9 ring-2 ring-primary/10 transition-transform duration-300 hover:scale-105">
                        <AvatarImage src={userData?.photoURL || `https://placehold.co/40x40/008080/FFFFFF/png?text=${getInitials()}`} />
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold">{getInitials()}</AvatarFallback>
                      </Avatar>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 rounded-xl border border-slate-800 bg-slate-950 text-slate-100">
                    <DropdownMenuLabel className="flex flex-col text-slate-100">
                      <span className="font-bold">{userData?.firstName ? `${userData.firstName} ${userData.lastName || ''}` : userData?.companyName || (t.my_account || 'Mon Compte')}</span>
                      <span className="text-xs text-slate-400 truncate">{user?.email}</span>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-slate-800" />
                    <DropdownMenuItem className="cursor-pointer rounded-lg hover:bg-slate-800 focus:bg-slate-800 text-slate-200 focus:text-white" onClick={() => router.push('/dashboard/profile')}>
                      <User className="mr-2 h-4 w-4 text-indigo-400" />
                      <span>{t.profile}</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer rounded-lg hover:bg-slate-800 focus:bg-slate-800 text-slate-200 focus:text-white" onClick={() => router.push('/docs')}>
                      <BookOpen className="mr-2 h-4 w-4 text-emerald-400" />
                      <span>Documentation & Guides</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-slate-800" />
                    <DropdownMenuItem className="text-rose-400 focus:text-rose-300 focus:bg-rose-500/10 cursor-pointer rounded-lg" onClick={handleLogout}>
                      <LogOut className="mr-2 h-4 w-4 text-rose-500" />
                      <span>{t.logout}</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
            </div>
          </header>
          <main className="flex-1 w-full min-w-0 overflow-x-hidden p-2 sm:p-4 md:p-6">{children}</main>
          {/* Persistent notification permissions & background listener */}
          <PersistentNotificationPrompt />
          {/* Chat Widget — visible to all non-admin users */}
          {!isAdmin && <ChatWidget />}
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
