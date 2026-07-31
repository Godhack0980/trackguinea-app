"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { collection, addDoc, query, where, orderBy, onSnapshot, updateDoc, doc, Timestamp, getDocs } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Loader2, Send, Paperclip, X, FileText, Image, Bot, Download, ExternalLink, MessageSquare } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';
import { useTranslation } from '@/lib/translations';

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

const AUTO_REPLY_DELAY_MS = 5000;

export default function UserMessagesPage() {
  const { user, userData } = useAuth();
  const { toast } = useToast();
  const { t, lang } = useTranslation();
  
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loadingChat, setLoadingChat] = useState(true);

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const ADMIN_ID_KEY = 'transconnekt_admin_uid';

  const autoReplyMsg = t.chat_auto_welcome || "Bonjour ! Merci de nous avoir contacté. Notre équipe TransConnekt vous répondra dans les plus brefs délais.";

  const getAdminUid = async (): Promise<string> => {
    const cached = sessionStorage.getItem(ADMIN_ID_KEY);
    if (cached && cached !== "null" && cached !== "undefined") return cached;

    const q2 = query(collection(db, 'users'), where('role', '==', 'admin'));
    let snap = await getDocs(q2);
    if (!snap.empty) {
      const adminUid = snap.docs[0].id;
      sessionStorage.setItem(ADMIN_ID_KEY, adminUid);
      return adminUid;
    }

    const q1 = query(collection(db, 'users'), where('isAdmin', '==', true));
    snap = await getDocs(q1);
    if (!snap.empty) {
      const adminUid = snap.docs[0].id;
      sessionStorage.setItem(ADMIN_ID_KEY, adminUid);
      return adminUid;
    }

    return 'transconnekt_default_admin_uid';
  };

  useEffect(() => {
    if (!user) return;

    const initConversation = async () => {
      setLoadingChat(true);
      try {
        const adminUid = await getAdminUid();

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

        const userName = userData?.firstName
          ? `${userData.firstName} ${userData.lastName || ''}`.trim()
          : user.email || 'Utilisateur';

        const convoRef = await addDoc(collection(db, 'conversations'), {
          participants: [user.uid, adminUid],
          participantNames: {
            [user.uid]: userName,
            [adminUid]: t.chat_support_title || 'Support TransConnekt',
          },
          lastMessage: 'Conversation démarrée',
          lastMessageAt: Timestamp.now(),
          unreadCount: { [adminUid]: 0, [user.uid]: 0 },
          createdAt: Timestamp.now(),
        });
        
        setConversationId(convoRef.id);

        setTimeout(async () => {
          await addDoc(collection(db, `conversations/${convoRef.id}/messages`), {
            senderId: adminUid,
            senderName: t.chat_support_title || 'Support TransConnekt',
            text: autoReplyMsg,
            timestamp: Timestamp.now(),
            isRead: false,
          });
          await updateDoc(doc(db, 'conversations', convoRef.id), {
            lastMessage: autoReplyMsg,
            lastMessageAt: Timestamp.now(),
          });
        }, AUTO_REPLY_DELAY_MS);
      } catch (e) {
        console.error("InitConversation error:", e);
        toast({ variant: 'destructive', title: 'Erreur', description: "Impossible d'initialiser le chat support." });
      } finally {
        setLoadingChat(false);
      }
    };

    initConversation();
  }, [user, userData]);

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
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      }, 100);
    });
    return () => unsub();
  }, [messagesQuery, user]);

  const handleSendMessage = async () => {
    if ((!newMessage.trim() && !selectedFile) || !conversationId || !user) return;
    setSending(true);
    const text = newMessage.trim();
    setNewMessage('');
    
    try {
      const adminUid = await getAdminUid();
      const userName = userData?.firstName
        ? `${userData.firstName} ${userData.lastName || ''}`.trim()
        : user.email || 'Utilisateur';

      let fileUrl = "";
      let fileName = "";

      if (selectedFile) {
        setUploading(true);
        const fileRef = ref(storage, `chat-attachments/${user.uid}/${Date.now()}_${selectedFile.name}`);
        const uploadTask = await uploadBytesResumable(fileRef, selectedFile);
        fileUrl = await getDownloadURL(uploadTask.ref);
        fileName = selectedFile.name;
        setSelectedFile(null);
      }

      const msgPayload: any = {
        senderId: user.uid,
        senderName: userName,
        text: fileUrl ? `Fichier envoyé : ${fileName}` : text,
        timestamp: Timestamp.now(),
        isRead: false,
      };

      if (fileUrl) {
        msgPayload.fileUrl = fileUrl;
        msgPayload.fileName = fileName;
      }

      await addDoc(collection(db, `conversations/${conversationId}/messages`), msgPayload);

      await updateDoc(doc(db, 'conversations', conversationId), {
        lastMessage: fileUrl ? `📎 Fichier : ${fileName}` : text,
        lastMessageAt: Timestamp.now(),
        [`unreadCount.${adminUid}`]: (messages.filter(m => m.senderId === user.uid && !m.isRead).length + 1),
      });

      if (adminUid) {
        await addDoc(collection(db, 'notifications'), {
          userId: adminUid,
          message: `Nouveau message de ${userName}: "${fileUrl ? '📎 Fichier : ' + fileName : text.substring(0, 60)}"`,
          href: '/dashboard/admin/messages',
          isRead: false,
          createdAt: Timestamp.now(),
        });
      }
    } catch (e) {
      console.error(e);
      toast({ variant: 'destructive', title: 'Erreur', description: "Impossible d'envoyer le message." });
    } finally {
      setSending(false);
      setUploading(false);
    }
  };

  const formatTime = (ts: Timestamp) => {
    try {
      return formatDistanceToNow(ts.toDate(), { addSuffix: true, locale: lang === 'fr' ? fr : enUS });
    } catch {
      return '';
    }
  };

  if (loadingChat) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)] gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Initialisation du chat support...</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 h-[calc(100vh-120px)] flex flex-col gap-4">
      {/* Header */}
      <div className="border-b border-border/40 pb-4 flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400">
              <MessageSquare size={20} />
            </span>
            {t.chat_title || "Mrasala Support"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t.chat_subtitle || "Discutez en direct avec les conseillers d'assistance TransConnekt."}
          </p>
        </div>
        <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 shrink-0">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> {t.chat_status_online || "Support Connecté"}
        </Badge>
      </div>

      {/* Messenger Panel */}
      <div className="flex-1 flex flex-col overflow-hidden rounded-3xl border border-border/40 bg-card/40 backdrop-blur-md">
        {/* Chat Interlocutor Bar */}
        <div className="px-5 py-3.5 border-b border-border/20 flex items-center gap-3 bg-slate-900/30 shrink-0">
          <Avatar className="h-10 w-10 border border-primary/20">
            <AvatarFallback className="bg-indigo-600 text-white font-bold"><Bot size={20} /></AvatarFallback>
          </Avatar>
          <div>
            <p className="font-bold text-sm text-slate-100">{t.chat_support_title || "Support TransConnekt"}</p>
            <p className="text-xs text-muted-foreground">{t.chat_support_subtitle || "Conseillers d'assistance technique & logistique"}</p>
          </div>
        </div>

        {/* Messages list */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-950/20">
          {messages.map((msg) => {
            const isMe = msg.senderId === user?.uid;
            return (
              <div key={msg.id} className={`flex gap-3 max-w-[80%] ${isMe ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}>
                {!isMe && (
                  <Avatar className="h-8 w-8 shrink-0 mt-1">
                    <AvatarFallback className="bg-indigo-600/30 text-indigo-400 text-xs font-bold"><Bot size={14} /></AvatarFallback>
                  </Avatar>
                )}
                <div className={`space-y-1 ${isMe ? 'items-end' : 'items-start'}`}>
                  <div className={`p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-sm ${
                    isMe 
                      ? 'bg-primary text-white rounded-tr-none font-medium' 
                      : 'bg-slate-900/80 border border-slate-800 text-slate-100 rounded-tl-none'
                  }`}>
                    {msg.text}
                    {msg.fileUrl && (
                      <div className="mt-2 pt-2 border-t border-slate-700/50 flex items-center gap-2">
                        <Paperclip size={14} />
                        <a href={msg.fileUrl} target="_blank" rel="noreferrer" className="underline font-bold text-xs hover:text-primary-foreground flex items-center gap-1">
                          {msg.fileName || 'Fichier joint'} <ExternalLink size={10} />
                        </a>
                      </div>
                    )}
                  </div>
                  <p className={`text-[10px] text-slate-400 px-1 ${isMe ? 'text-right' : 'text-left'}`}>
                    {msg.timestamp ? formatTime(msg.timestamp) : ''}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Input Bar */}
        <div className="p-3 border-t border-border/20 bg-slate-900/40 space-y-2 shrink-0">
          {selectedFile && (
            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-800/80 text-xs text-slate-200">
              <span className="flex items-center gap-2 font-medium truncate max-w-[80%]">
                <Paperclip size={14} className="text-primary" /> {selectedFile.name}
              </span>
              <Button size="icon" variant="ghost" onClick={() => setSelectedFile(null)} className="h-6 w-6 rounded-lg text-slate-400 hover:text-white">
                <X size={14} />
              </Button>
            </div>
          )}

          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              onChange={(e) => e.target.files?.[0] && setSelectedFile(e.target.files[0])}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-xl shrink-0 h-10 w-10 border-border/50 hover:bg-muted/40"
            >
              <Paperclip size={16} />
            </Button>

            <Input
              placeholder={t.chat_placeholder || "Rédiger un message de support..."}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
              className="flex-1 h-10 rounded-xl bg-slate-950/60 border-border/50 text-xs text-white"
            />

            <Button
              onClick={handleSendMessage}
              disabled={sending || uploading || (!newMessage.trim() && !selectedFile)}
              className="h-10 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-xs gap-1.5 px-4 shrink-0 shadow-md shadow-primary/20"
            >
              {sending || uploading ? <Loader2 size={16} className="animate-spin" /> : <Send size={14} />}
              <span>{t.chat_send_btn || "Envoyer"}</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
