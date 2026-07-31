"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { collection, addDoc, query, where, orderBy, onSnapshot, updateDoc, doc, Timestamp, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Send, X, Minimize2, Bot } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: Timestamp;
  isRead: boolean;
  fileUrl?: string;
  fileName?: string;
}

interface Conversation {
  id: string;
  participants: string[];
  participantNames: Record<string, string>;
  lastMessage: string;
  lastMessageAt: Timestamp;
  unreadCount: Record<string, number>;
}

const AUTO_REPLY_DELAY_MS = 5000;
const AUTO_REPLY_MESSAGE = "Bonjour ! Merci de nous avoir contacté. Notre équipe TransConnekt vous répondra dans les plus brefs délais. En attendant, vous pouvez consulter notre FAQ ou appeler le +224 612 00 01 02. 🚛";

export default function ChatWidget() {
  const { user, userData } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Admin UID key cache
  const ADMIN_ID_KEY = 'transconnekt_admin_uid';

  const getAdminUid = async (): Promise<string> => {
    const cached = sessionStorage.getItem(ADMIN_ID_KEY);
    if (cached && cached !== "null" && cached !== "undefined") return cached;

    // 1. Try to find user with role == 'admin'
    const q2 = query(collection(db, 'users'), where('role', '==', 'admin'));
    let snap = await getDocs(q2);
    if (!snap.empty) {
      const adminUid = snap.docs[0].id;
      sessionStorage.setItem(ADMIN_ID_KEY, adminUid);
      return adminUid;
    }

    // 2. Try to find user with isAdmin == true
    const q1 = query(collection(db, 'users'), where('isAdmin', '==', true));
    snap = await getDocs(q1);
    if (!snap.empty) {
      const adminUid = snap.docs[0].id;
      sessionStorage.setItem(ADMIN_ID_KEY, adminUid);
      return adminUid;
    }

    return 'transconnekt_default_admin_uid';
  };

  // Find or create conversation with admin
  const initConversation = async () => {
    if (!user) return;
    try {
      const adminUid = await getAdminUid();

      // Look for existing conversation
      const q = query(
        collection(db, 'conversations'),
        where('participants', 'array-contains', user.uid)
      );
      const snap = await getDocs(q);
      const existing = snap.docs.find(d => {
        const parts = d.data().participants as string[];
        return parts.includes(adminUid);
      });

      if (existing) {
        setConversationId(existing.id);
        return;
      }

      // Create new conversation
      const userName = userData?.firstName
        ? `${userData.firstName} ${userData.lastName || ''}`.trim()
        : user.email || 'Utilisateur';

      const convoRef = await addDoc(collection(db, 'conversations'), {
        participants: [user.uid, adminUid],
        participantNames: {
          [user.uid]: userName,
          [adminUid]: 'Support TransConnekt',
        },
        lastMessage: '',
        lastMessageAt: Timestamp.now(),
        unreadCount: { [adminUid]: 0, [user.uid]: 0 },
        createdAt: Timestamp.now(),
      });
      setConversationId(convoRef.id);

      // Send welcome auto-reply
      setTimeout(async () => {
        await addDoc(collection(db, `conversations/${convoRef.id}/messages`), {
          senderId: adminUid,
          senderName: 'Support TransConnekt',
          text: AUTO_REPLY_MESSAGE,
          timestamp: Timestamp.now(),
          isRead: false,
        });
        await updateDoc(doc(db, 'conversations', convoRef.id), {
          lastMessage: AUTO_REPLY_MESSAGE,
          lastMessageAt: Timestamp.now(),
        });
      }, AUTO_REPLY_DELAY_MS);
    } catch (e) {
      console.error("InitConversation error:", e);
    }
  };

  // Open chat
  const handleOpen = async () => {
    setOpen(true);
    setMinimized(false);
    if (!conversationId) {
      await initConversation();
    }
  };

  // Subscribe to messages (Memoized to prevent HMR and component re-render loops)
  const messagesQuery = useMemo(() => {
    if (!conversationId) return null;
    return query(
      collection(db, `conversations/${conversationId}/messages`),
      orderBy('timestamp', 'asc')
    );
  }, [conversationId]);

  useEffect(() => {
    if (!messagesQuery || !user) return;
    const unsub = onSnapshot(messagesQuery, snap => {
      const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Message));
      setMessages(msgs);
      // Count unread messages from admin
      const unread = msgs.filter(m => m.senderId !== user.uid && !m.isRead).length;
      setUnreadCount(unread);
      // Scroll to bottom
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      }, 50);
    });
    return () => unsub();
  }, [messagesQuery, user]);

  // Mark messages as read when chat is open
  useEffect(() => {
    if (!open || !conversationId || !user || messages.length === 0) return;
    const markRead = async () => {
      const unread = messages.filter(m => m.senderId !== user.uid && !m.isRead);
      for (const m of unread) {
        await updateDoc(doc(db, `conversations/${conversationId}/messages`, m.id), {
          isRead: true
        });
      }
      setUnreadCount(0);
    };
    markRead();
  }, [open, conversationId, user, messages]);

  // Request notification permission on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Push browser notification for incoming messages when chat is closed
  useEffect(() => {
    if (!messages.length || !user) return;
    const last = messages[messages.length - 1];
    if (last.senderId !== user.uid && (!open || minimized)) {
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        new Notification('TransConnekt — Nouveau message', {
          body: last.text,
          icon: '/transconnekt-logo.png',
          badge: '/transconnekt-logo.png',
          tag: 'chat-message',
        });
      }
    }
  }, [messages, user, open, minimized]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !conversationId || !user) return;
    if (typeof window !== 'undefined' && Notification.permission !== 'granted') {
      window.dispatchEvent(new CustomEvent('show-notification-reminder'));
    }
    setSending(true);
    const text = newMessage.trim();
    setNewMessage('');
    try {
      const adminUid = await getAdminUid();
      const userName = userData?.firstName
        ? `${userData.firstName} ${userData.lastName || ''}`.trim()
        : user.email || 'Utilisateur';

      await addDoc(collection(db, `conversations/${conversationId}/messages`), {
        senderId: user.uid,
        senderName: userName,
        text,
        timestamp: Timestamp.now(),
        isRead: false,
      });

      await updateDoc(doc(db, 'conversations', conversationId), {
        lastMessage: text,
        lastMessageAt: Timestamp.now(),
        [`unreadCount.${adminUid}`]: (messages.filter(m => m.senderId === user.uid && !m.isRead).length + 1),
      });

      // Notification Firestore for admin
      if (adminUid) {
        await addDoc(collection(db, 'notifications'), {
          userId: adminUid,
          message: `Nouveau message de ${userName}: "${text.substring(0, 60)}${text.length > 60 ? '...' : ''}"`,
          href: '/dashboard/admin/messages',
          isRead: false,
          createdAt: Timestamp.now(),
        });
      }
    } catch (e) {
      console.error("SendMessage error:", e);
      toast({ variant: 'destructive', title: 'Erreur', description: "Impossible d'envoyer le message." });
    } finally {
      setSending(false);
    }
  };

  const formatTime = (ts: Timestamp) => {
    try {
      return formatDistanceToNow(ts.toDate(), { addSuffix: true, locale: fr });
    } catch {
      return '';
    }
  };

  if (!user) return null;

  return (
    <>
      {/* Floating button */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
        {open && !minimized && (
          <div className="w-[340px] sm:w-[380px] h-[480px] bg-slate-950 border border-indigo-500/20 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-900 to-violet-900 px-4 py-3 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                  <MessageSquare size={16} className="text-white" />
                </div>
                <div>
                  <p className="text-white font-bold text-sm">Support TransConnekt</p>
                  <p className="text-white/60 text-[11px]">Répond généralement rapidement</p>
                </div>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7 text-white/70 hover:text-white hover:bg-white/10 rounded-lg" onClick={() => setMinimized(true)}>
                  <Minimize2 size={14} />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-white/70 hover:text-white hover:bg-white/10 rounded-lg" onClick={() => setOpen(false)}>
                  <X size={14} />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3 bg-slate-950/90">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
                  <div className="w-14 h-14 rounded-full bg-indigo-500/10 flex items-center justify-center">
                    <Bot size={28} className="text-indigo-400" />
                  </div>
                  <p className="text-sm text-muted-foreground px-4">Bonjour ! Comment pouvons-nous vous aider aujourd&apos;hui ?</p>
                </div>
              )}
              {messages.map(m => (
                <div key={m.id} className={cn("flex gap-2", m.senderId === user.uid ? "justify-end" : "justify-start")}>
                  {m.senderId !== user.uid && (
                    <div className="w-7 h-7 rounded-full bg-indigo-500/20 flex items-center justify-center shrink-0 mt-1">
                      <Bot size={14} className="text-indigo-400" />
                    </div>
                  )}
                  <div className={cn(
                    "max-w-[75%] rounded-2xl px-3 py-2 text-sm",
                    m.senderId === user.uid
                      ? "bg-indigo-600 text-white rounded-tr-sm"
                      : "bg-slate-800 text-slate-100 rounded-tl-sm"
                  )}>
                    {m.fileUrl ? (
                      <div className="space-y-1">
                        {m.fileUrl.match(/\.(jpeg|jpg|gif|png)/i) ? (
                          <img src={m.fileUrl} alt={m.fileName} className="max-w-full h-auto rounded-lg" />
                        ) : (
                          <div className="flex items-center gap-2 bg-slate-900/60 p-2 rounded-xl border border-border/10">
                            <span className="text-xs font-semibold truncate max-w-[150px]">{m.fileName}</span>
                          </div>
                        )}
                        <a href={m.fileUrl} target="_blank" rel="noopener noreferrer" className="text-[11px] underline block text-indigo-200 mt-1">Télécharger</a>
                      </div>
                    ) : (
                      <p className="leading-relaxed">{m.text}</p>
                    )}
                    <p className={cn("text-[10px] mt-1", m.senderId === user.uid ? "text-indigo-200" : "text-slate-500")}>
                      {formatTime(m.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Input */}
            <div className="p-3 border-t border-border/20 bg-slate-900/60 flex gap-2 shrink-0">
              <Input
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                placeholder="Votre message..."
                className="flex-1 bg-slate-800 border-slate-700 text-white text-sm rounded-xl h-9"
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              />
              <Button onClick={sendMessage} disabled={sending || !newMessage.trim()} size="icon" className="h-9 w-9 rounded-xl bg-indigo-600 hover:bg-indigo-700 shrink-0">
                <Send size={15} />
              </Button>
            </div>
          </div>
        )}

        {/* Minimized bar */}
        {open && minimized && (
          <div
            className="bg-gradient-to-r from-indigo-900 to-violet-900 rounded-2xl px-4 py-2.5 flex items-center gap-3 cursor-pointer shadow-xl animate-in slide-in-from-bottom-2"
            onClick={() => setMinimized(false)}
          >
            <MessageSquare size={16} className="text-white" />
            <span className="text-white text-sm font-medium">Support TransConnekt</span>
            {unreadCount > 0 && <Badge className="bg-rose-500 text-white text-xs h-5 w-5 p-0 flex items-center justify-center rounded-full">{unreadCount}</Badge>}
          </div>
        )}

        {/* FAB Button */}
        {!open && (
          <button
            onClick={handleOpen}
            className="relative w-14 h-14 rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 shadow-2xl shadow-indigo-500/30 flex items-center justify-center hover:scale-110 transition-transform duration-200"
          >
            <MessageSquare size={22} className="text-white" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>
        )}
      </div>
    </>
  );
}
