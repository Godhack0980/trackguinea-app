"use client";

import React, { useMemo, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, query, where, writeBatch, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Bell, CheckCheck, Loader2, ExternalLink, AlertCircle, AlertTriangle, Info, Truck, FileWarning, Thermometer, Clock, Fuel, Route, MessageSquare, Briefcase, FileCheck, MapPin } from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow, isToday, isThisWeek } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';

import { useTranslation, translateNotificationMessage } from '@/lib/translations';
import { cn } from '@/lib/utils';

export default function NotificationsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t, lang } = useTranslation();

  const notificationsQuery = useMemo(() => {
    return user
      ? query(
          collection(db, 'notifications'),
          where('userId', '==', user.uid)
        )
      : null;
  }, [user?.uid]);

  const [snap, loading] = useCollection(notificationsQuery);
  const [activeTab, setActiveTab] = useState<'all' | 'critical' | 'warning' | 'info'>('all');

  const getNotificationCategory = (msg: string) => {
    const text = (msg || '').toLowerCase();
    
    // Critical
    if (text.includes('immobilisé') || text.includes('stalled')) return { level: 'critical', sub: 'Véhicule immobilisé', icon: Truck };
    if (text.includes('livraison très en retard') || text.includes('critical delay')) return { level: 'critical', sub: 'Retard critique', icon: Clock };
    if (text.includes('document expiré') || text.includes('document expired')) return { level: 'critical', sub: 'Document expiré', icon: FileWarning };
    if (text.includes('température') || text.includes('temperature')) return { level: 'critical', sub: 'Température critique', icon: Thermometer };
    if (text.includes('déconnecté') || text.includes('offline')) return { level: 'critical', sub: 'Chauffeur déconnecté', icon: AlertCircle };
    if (text.includes('accident') || text.includes('panne') || text.includes('critique')) return { level: 'critical', sub: 'Urgence', icon: AlertCircle };
    
    // Warning
    if (text.includes('retard probable') || text.includes('probable delay') || text.includes('retard')) return { level: 'warning', sub: 'Retard probable', icon: Clock };
    if (text.includes('carburant faible') || text.includes('low fuel')) return { level: 'warning', sub: 'Carburant faible', icon: Fuel };
    if (text.includes('expiration prochaine') || text.includes('expiring soon')) return { level: 'warning', sub: 'Expiration proche', icon: FileWarning };
    if (text.includes('itinéraire inhabituel') || text.includes('unusual route')) return { level: 'warning', sub: 'Itinéraire inhabituel', icon: Route };
    if (text.includes('attention') || text.includes('warning')) return { level: 'warning', sub: 'Attention', icon: AlertTriangle };
    
    // Info
    if (text.includes('livraison effectuée') || text.includes('delivered')) return { level: 'info', sub: 'Livraison effectuée', icon: MapPin };
    if (text.includes('nouveau message') || text.includes('message')) return { level: 'info', sub: 'Nouveau message', icon: MessageSquare };
    if (text.includes('nouvelle offre') || text.includes('offer')) return { level: 'info', sub: 'Nouvelle offre', icon: Briefcase };
    if (text.includes('document ajouté') || text.includes('document added')) return { level: 'info', sub: 'Document ajouté', icon: FileCheck };

    return { level: 'info', sub: 'Information', icon: Info };
  };

  const notifications = useMemo(() => {
    if (!snap) return [];
    return snap.docs
      .map(d => ({ id: d.id, ...d.data() as any }))
      .sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return timeB - timeA;
      });
  }, [snap]);

  const filteredNotifications = useMemo(() => {
    if (activeTab === 'all') return notifications;
    return notifications.filter((n: any) => {
      const { level } = getNotificationCategory(translateNotificationMessage(n.message, lang));
      return (n.level || level) === activeTab;
    });
  }, [notifications, activeTab, lang]);

  const groupedNotifications = useMemo(() => {
    const groups = {
      today: [] as any[],
      thisWeek: [] as any[],
      older: [] as any[],
    };
    filteredNotifications.forEach((n: any) => {
      if (!n.createdAt) {
        groups.older.push(n);
        return;
      }
      try {
        const date = n.createdAt.toDate();
        if (isToday(date)) {
          groups.today.push(n);
        } else if (isThisWeek(date)) {
          groups.thisWeek.push(n);
        } else {
          groups.older.push(n);
        }
      } catch {
        groups.older.push(n);
      }
    });
    return groups;
  }, [filteredNotifications]);

  const unreadCount = notifications.filter((n: any) => !n.isRead).length;

  const markAllAsRead = async () => {
    if (!snap) return;
    const batch = writeBatch(db);
    snap.docs.filter(d => !d.data().isRead).forEach(d => {
      batch.update(d.ref, { isRead: true });
    });
    await batch.commit();
    toast({ title: 'Toutes les notifications marquées comme lues ✅' });
  };

  const formatDate = (ts: any) => {
    try {
      const date = ts.toDate();
      if (lang === 'ar') {
        return date.toLocaleDateString('ar-EG', { month: 'long', day: 'numeric', year: 'numeric' });
      }
      return formatDistanceToNow(date, { addSuffix: true, locale: lang === 'fr' ? fr : enUS });
    } catch { return ''; }
  };

  const getUnreadCountByLevel = (level: string) => {
    return notifications.filter(n => {
      const cat = getNotificationCategory(translateNotificationMessage(n.message, lang));
      const notifLevel = n.level || cat.level;
      return notifLevel === level && !n.isRead;
    }).length;
  };

  const renderNotificationGroup = (title: string, items: any[]) => {
    if (items.length === 0) return null;
    return (
      <div className="space-y-3 mb-6">
        <h3 className="text-sm font-semibold text-muted-foreground ml-1">{title}</h3>
        {items.map((n: any) => {
          const { level, sub, icon: Icon } = getNotificationCategory(translateNotificationMessage(n.message, lang));
          const notifLevel = n.level || level;
          
          let borderStyle = "";
          let levelBadge = null;

          if (notifLevel === 'critical') {
            borderStyle = "border-l-4 border-l-rose-500";
            levelBadge = (
              <Badge className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30 text-[10px] tracking-wider font-black rounded-md px-2 py-0.5 select-none">
                <span className="animate-pulse mr-1">🔴</span>CRITIQUE
              </Badge>
            );
          } else if (notifLevel === 'warning') {
            borderStyle = "border-l-4 border-l-amber-500";
            levelBadge = (
              <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30 text-[10px] tracking-wider font-black rounded-md px-2 py-0.5 select-none">
                <span className="mr-1">🟠</span>ATTENTION
              </Badge>
            );
          } else {
            borderStyle = "border-l-4 border-l-sky-500";
            levelBadge = (
              <Badge className="bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/30 text-[10px] tracking-wider font-black rounded-md px-2 py-0.5 select-none">
                <span className="mr-1">🔵</span>INFO
              </Badge>
            );
          }

          const isRead = n.isRead;

          return (
            <Card
              key={n.id}
              className={cn(
                "rounded-2xl transition-all hover:shadow-xl relative overflow-hidden cursor-pointer",
                borderStyle,
                !isRead
                  ? "bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-900/60 shadow-md"
                  : "bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800"
              )}
              onClick={async () => {
                if (!isRead) {
                  await updateDoc(doc(db, 'notifications', n.id), { isRead: true });
                }
              }}
            >
              <CardContent className="p-4 flex items-start gap-4">
                <div className={cn(
                  "mt-1 p-2.5 rounded-xl flex items-center justify-center shrink-0 border",
                  notifLevel === 'critical' && "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
                  notifLevel === 'warning' && "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
                  notifLevel === 'info' && "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20"
                )}>
                  <Icon className="w-5 h-5" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    {levelBadge}
                    <Badge variant="outline" className="text-[10px] border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-md font-bold">
                      {sub}
                    </Badge>
                    {!isRead && (
                      <span className="flex items-center gap-1.5 ml-1">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                        </span>
                        <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400">NOUVEAU</span>
                      </span>
                    )}
                  </div>
                  <p className={cn(
                    "text-sm leading-relaxed",
                    !isRead
                      ? "font-bold text-slate-900 dark:text-white"
                      : "font-semibold text-slate-800 dark:text-slate-200"
                  )}>
                    {translateNotificationMessage(n.message, lang)}
                  </p>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-1">
                    <Clock size={13} />
                    {formatDate(n.createdAt)}
                  </p>
                </div>
                {n.href && (
                  <Link 
                    href={n.href} 
                    className="shrink-0 mt-1"
                    onClick={async () => {
                      if (!isRead) {
                        await updateDoc(doc(db, 'notifications', n.id), { isRead: true });
                      }
                    }}
                  >
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800">
                      <ExternalLink size={16} />
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  const criticalUnread = getUnreadCountByLevel('critical');
  const warningUnread = getUnreadCountByLevel('warning');
  const infoUnread = getUnreadCountByLevel('info');

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white">{t.notif_title}</h1>
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-400 mt-1">{t.notif_subtitle}</p>
        </div>
        <div className="flex items-center gap-3">
          {unreadCount > 0 && (
            <Badge className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20 px-3 py-1.5 rounded-xl">
              {unreadCount} {lang === "fr" ? "non lue" : "unread"}{unreadCount > 1 ? 's' : ''}
            </Badge>
          )}
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllAsRead} className="rounded-xl gap-2 border-slate-700 bg-slate-900/50 hover:bg-slate-800 text-slate-200">
              <CheckCheck size={16} /> {t.notif_read_all}
            </Button>
          )}
        </div>
      </div>

      {/* Levels Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-border/20 pb-4">
        <Button 
          variant={activeTab === 'all' ? 'default' : 'ghost'} 
          size="sm" 
          onClick={() => setActiveTab('all')}
          className={cn("rounded-xl px-4 py-2 text-xs font-semibold gap-2", activeTab === 'all' ? "bg-slate-800 text-white hover:bg-slate-700" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50")}
        >
          {lang === 'fr' ? 'Toutes' : 'All'}
          {unreadCount > 0 && (
            <Badge variant="secondary" className="bg-slate-700/50 text-slate-300 ml-1 px-1.5 rounded-md text-[10px]">
              {unreadCount}
            </Badge>
          )}
        </Button>
        <Button 
          variant={activeTab === 'critical' ? 'default' : 'ghost'} 
          size="sm" 
          onClick={() => setActiveTab('critical')}
          className={cn(
            "rounded-xl px-4 py-2 text-xs font-semibold gap-2",
            activeTab === 'critical' 
              ? "bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:bg-rose-500/30" 
              : "text-rose-500 hover:text-rose-400 hover:bg-rose-500/10"
          )}
        >
          <span className="animate-pulse">🔴</span> {lang === 'fr' ? 'Critique' : 'Critical'}
          {criticalUnread > 0 && (
            <Badge className="bg-rose-500 text-white ml-1 px-1.5 rounded-md text-[10px]">
              {criticalUnread}
            </Badge>
          )}
        </Button>
        <Button 
          variant={activeTab === 'warning' ? 'default' : 'ghost'} 
          size="sm" 
          onClick={() => setActiveTab('warning')}
          className={cn(
            "rounded-xl px-4 py-2 text-xs font-semibold gap-2",
            activeTab === 'warning' 
              ? "bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30" 
              : "text-amber-500 hover:text-amber-400 hover:bg-amber-500/10"
          )}
        >
          <span>🟠</span> {lang === 'fr' ? 'Attention' : 'Warning'}
          {warningUnread > 0 && (
            <Badge className="bg-amber-500 text-slate-950 ml-1 px-1.5 rounded-md text-[10px]">
              {warningUnread}
            </Badge>
          )}
        </Button>
        <Button 
          variant={activeTab === 'info' ? 'default' : 'ghost'} 
          size="sm" 
          onClick={() => setActiveTab('info')}
          className={cn(
            "rounded-xl px-4 py-2 text-xs font-semibold gap-2",
            activeTab === 'info' 
              ? "bg-sky-500/20 text-sky-400 border border-sky-500/30 hover:bg-sky-500/30" 
              : "text-sky-500 hover:text-sky-400 hover:bg-sky-500/10"
          )}
        >
          <span>🔵</span> {lang === 'fr' ? 'Information' : 'Info'}
          {infoUnread > 0 && (
            <Badge className="bg-sky-500 text-white ml-1 px-1.5 rounded-md text-[10px]">
              {infoUnread}
            </Badge>
          )}
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="animate-spin h-8 w-8 text-indigo-500" />
        </div>
      ) : filteredNotifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 gap-4 text-center bg-slate-900/30 rounded-3xl border border-slate-800/50">
          <div className="w-16 h-16 rounded-3xl bg-slate-800/80 flex items-center justify-center shadow-inner">
            <Bell size={32} className="text-slate-400" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-slate-200">{lang === "fr" ? "Aucune notification" : "No notifications"}</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-xs mx-auto">{lang === "fr" ? "Vous êtes à jour. Aucune notification ne correspond à ce niveau." : "You're all caught up. No notifications match this level."}</p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {renderNotificationGroup(lang === 'fr' ? "Aujourd'hui" : "Today", groupedNotifications.today)}
          {renderNotificationGroup(lang === 'fr' ? "Cette semaine" : "This Week", groupedNotifications.thisWeek)}
          {renderNotificationGroup(lang === 'fr' ? "Plus ancien" : "Older", groupedNotifications.older)}
        </div>
      )}
    </div>
  );
}
