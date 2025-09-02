
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
import { fr } from "date-fns/locale"
import { PopoverClose } from "@radix-ui/react-popover"
import { useState, useEffect } from "react"


interface Notification {
    id: string;
    message: string;
    href: string;
    isRead: boolean;
    createdAt: any;
}

export default function Notifications() {
    const { user } = useAuth();
    
    const notificationsQuery = user 
        ? query(collection(db, 'notifications'), where('userId', '==', user.uid), orderBy('createdAt', 'desc'))
        : null;

    const [snapshot, loading] = useCollection(notificationsQuery);
    
    // We use a local state to prevent the popover from closing on re-render.
    const [optimisticNotifications, setOptimisticNotifications] = useState<Notification[]>([]);

    useEffect(() => {
        if (snapshot) {
            const serverNotifications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
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
                            <h4 className="font-medium leading-none">Notifications</h4>
                        </div>
                    </div>
                    <div className="grid gap-2 max-h-96 overflow-y-auto">
                       {loading ? (
                         <div className="flex justify-center items-center p-4">
                            <Loader2 className="animate-spin" />
                         </div>
                       ) : optimisticNotifications.length > 0 ? (
                            optimisticNotifications.map(notif => (
                                <PopoverClose asChild key={notif.id}>
                                    <Link
                                        href={notif.href}
                                        onClick={() => handleMarkAsRead(notif.id)}
                                        className={`flex items-start gap-4 p-2 rounded-md hover:bg-muted/50 ${!notif.isRead ? 'bg-primary/10' : ''}`}>
                                        
                                        {!notif.isRead && <span className="flex h-2 w-2 mt-1.5 shrink-0 rounded-full bg-sky-500" />}
                                        <div className="grid gap-1 flex-1">
                                            <p className={`text-sm ${!notif.isRead ? 'font-semibold' : ''}`}>{notif.message}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {notif.createdAt ? formatDistanceToNow(notif.createdAt.toDate(), { addSuffix: true, locale: fr }) : ''}
                                            </p>
                                        </div>
                                    </Link>
                                </PopoverClose>
                            ))
                       ) : (
                         <p className="text-sm text-center text-muted-foreground p-4">Aucune nouvelle notification.</p>
                       )}
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    )
}
