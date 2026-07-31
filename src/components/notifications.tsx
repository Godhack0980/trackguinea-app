
"use client"

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from "./ui/button"
import { Bell, Loader2 } from "lucide-react"
import { useCollection } from "react-firebase-hooks/firestore"
import { collection, query, where, orderBy, doc, updateDoc } from "firebase/firestore"
import { useAuth } from "@/context/auth-context"
import { db } from "@/lib/firebase"
import { Badge } from "./ui/badge"
import Link from "next/link"
import { formatDistanceToNow } from 'date-fns';
import { fr, enUS } from "date-fns/locale"
import { PopoverClose } from "@radix-ui/react-popover"
import { useState, useEffect, useMemo } from "react"
import { useTranslation, translateNotificationMessage } from "@/lib/translations"


interface Notification {
    id: string;
    message: string;
    href: string;
    isRead: boolean;
    createdAt: any;
}

export default function Notifications() {
    const { user } = useAuth();
    const { t, lang } = useTranslation();
    
    const notificationsQuery = useMemo(() => {
        return user 
            ? query(collection(db, 'notifications'), where('userId', '==', user.uid))
            : null;
    }, [user?.uid]);

    const [snapshot, loading] = useCollection(notificationsQuery);
    
    // We use a local state to prevent the popover from closing on re-render.
    const [optimisticNotifications, setOptimisticNotifications] = useState<Notification[]>([]);

    useEffect(() => {
        if (snapshot) {
            const serverNotifications = snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() } as Notification))
                .sort((a, b) => {
                    const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
                    const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
                    return timeB - timeA;
                });
            setOptimisticNotifications(serverNotifications);
        }
    }, [snapshot]);
    
    const unreadCount = optimisticNotifications.filter(n => !n.isRead).length;

    const handleMarkAsRead = async (notificationId: string) => {
        if(!user) return;
        
        // Optimistically update the UI
        setOptimisticNotifications(prev => 
            prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
        );

        // Update firestore in the background
        const docRef = doc(db, 'notifications', notificationId);
        try {
            await updateDoc(docRef, { isRead: true });
        } catch (error) {
            // If the update fails, revert the optimistic update
            console.error("Failed to mark notification as read:", error);
            setOptimisticNotifications(prev => 
                prev.map(n => n.id === notificationId ? { ...n, isRead: false } : n)
            );
        }
    }

    const handleMarkAllAsRead = async () => {
        if (!user || unreadCount === 0) return;

        // Optimistically update all in UI
        setOptimisticNotifications(prev =>
            prev.map(n => ({ ...n, isRead: true }))
        );

        // Update in Firestore
        try {
            const promises = optimisticNotifications
                .filter(n => !n.isRead)
                .map(n => updateDoc(doc(db, 'notifications', n.id), { isRead: true }));
            await Promise.all(promises);
        } catch (error) {
            console.error("Failed to mark all as read:", error);
            if (snapshot) {
                const serverNotifications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
                setOptimisticNotifications(serverNotifications);
            }
        }
    };
    
    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell />
                    {unreadCount > 0 && (
                        <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 justify-center p-0">{unreadCount}</Badge>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
                <div className="grid gap-4">
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <h4 className="font-medium leading-none">{t.notifications}</h4>
                            <div className="flex items-center gap-1.5">
                                {unreadCount > 0 && (
                                    <>
                                        <button 
                                            onClick={handleMarkAllAsRead} 
                                            className="text-[10px] text-muted-foreground hover:text-foreground font-bold transition-colors"
                                        >
                                            {t.allRead}
                                        </button>
                                        <span className="text-muted-foreground/30 text-[10px] select-none">|</span>
                                    </>
                                )}
                                <PopoverClose asChild>
                                  <Link href="/dashboard/notifications" className="text-xs text-primary hover:underline font-medium">
                                    {t.notif_view_all || (lang === "ar" ? "عرض الكل" : lang === "fr" ? "Voir tout" : "View all")}
                                  </Link>
                                </PopoverClose>
                            </div>
                        </div>
                    </div>
                    <div className="grid gap-2 max-h-96 overflow-y-auto">
                       {loading ? (
                         <div className="flex justify-center items-center p-4">
                            <Loader2 className="animate-spin" />
                         </div>
                       ) : optimisticNotifications.length > 0 ? (
                            optimisticNotifications.slice(0, 10).map(notif => (
                                <PopoverClose asChild key={notif.id}>
                                    <Link
                                        href={notif.href}
                                        onClick={() => handleMarkAsRead(notif.id)}
                                        className={`flex items-start gap-4 p-2 rounded-md hover:bg-muted/50 ${!notif.isRead ? 'bg-primary/10' : ''}`}>
                                        
                                        {!notif.isRead && <span className="flex h-2 w-2 mt-1.5 shrink-0 rounded-full bg-sky-500" />}
                                        <div className="grid gap-1 flex-1">
                                            <p className={`text-sm ${!notif.isRead ? 'font-semibold' : ''}`}>{translateNotificationMessage(notif.message, lang)}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {notif.createdAt ? formatDistanceToNow(notif.createdAt.toDate(), { addSuffix: true, locale: lang === 'fr' ? fr : enUS }) : ''}
                                            </p>
                                        </div>
                                    </Link>
                                </PopoverClose>
                            ))
                       ) : (
                         <p className="text-sm text-center text-muted-foreground p-4">{lang === 'fr' ? "Aucune nouvelle notification." : "No new notifications."}</p>
                       )}
                    </div>
                    {optimisticNotifications.length > 10 && (
                      <PopoverClose asChild>
                        <Link href="/dashboard/notifications" className="text-xs text-center text-primary hover:underline font-medium py-1">
                          {lang === 'fr' 
                            ? `Voir ${optimisticNotifications.length - 10} notification${optimisticNotifications.length - 10 > 1 ? 's' : ''} supplémentaire${optimisticNotifications.length - 10 > 1 ? 's' : ''}...`
                            : `View ${optimisticNotifications.length - 10} more notification${optimisticNotifications.length - 10 > 1 ? 's' : ''}...`
                          }
                        </Link>
                      </PopoverClose>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    )
}
