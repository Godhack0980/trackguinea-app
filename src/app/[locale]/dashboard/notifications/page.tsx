"use client";

import React, { useMemo } from 'react';
import { useAuth } from '@/context/auth-context';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, query, where, orderBy, updateDoc, doc, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Bell, CheckCheck, Loader2, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';

import { useTranslation, translateNotificationMessage } from '@/lib/translations';

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

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-border/40 pb-5">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">{t.notif_title}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t.notif_subtitle}</p>
        </div>
        <div className="flex items-center gap-3">
          {unreadCount > 0 && (
            <Badge className="bg-rose-500/10 text-rose-400 border-rose-500/20 px-3 py-1 rounded-full">
              {unreadCount} {lang === "fr" ? "non lue" : "unread"}{unreadCount > 1 ? 's' : ''}
            </Badge>
          )}
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllAsRead} className="rounded-xl gap-2">
              <CheckCheck size={14} /> {t.notif_read_all}
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="animate-spin h-8 w-8 text-primary" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 gap-3 text-center">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Bell size={28} className="text-primary" />
          </div>
          <h3 className="font-bold text-lg">{t.notif_empty}</h3>
          <p className="text-sm text-muted-foreground">{lang === "fr" ? "Vos notifications apparaîtront ici dès qu'une activité se produit." : "Your notifications will appear here as soon as an activity occurs."}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n: any) => (
            <Card
              key={n.id}
              className={`rounded-xl border transition-all hover:shadow-md ${!n.isRead ? 'border-indigo-500/30 bg-indigo-500/5' : 'border-border/30 bg-card/40'}`}
              onClick={async () => {
                if (!n.isRead) {
                  await updateDoc(doc(db, 'notifications', n.id), { isRead: true });
                }
              }}
            >
              <CardContent className="p-4 flex items-start gap-3">
                <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${!n.isRead ? 'bg-indigo-400' : 'bg-transparent'}`} />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm leading-relaxed ${!n.isRead ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>{translateNotificationMessage(n.message, lang)}</p>
                  <p className="text-[11px] text-muted-foreground/60 mt-1">{formatDate(n.createdAt)}</p>
                </div>
                {n.href && (
                  <Link 
                    href={n.href} 
                    className="shrink-0"
                    onClick={async () => {
                      if (!n.isRead) {
                        await updateDoc(doc(db, 'notifications', n.id), { isRead: true });
                      }
                    }}
                  >
                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground">
                      <ExternalLink size={13} />
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
