"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, doc, Timestamp, where, getDocs, deleteDoc, limit } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Send, MessageSquare, Bot, Search, User, Clock, UserPlus, Loader2, Paperclip, X, FileText, Download, Archive, Trash2, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

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
  archived?: boolean;
}

export default function AdminMessagesPage() {
  const { user, userData } = useAuth();
  const { toast } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConvoId, setSelectedConvoId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // New conversation states
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedId = sessionStorage.getItem('selectedConvoId');
      if (storedId) {
        setSelectedConvoId(storedId);
        sessionStorage.removeItem('selectedConvoId');
      }
    }
  }, []);
  const [searchTermUser, setSearchTermUser] = useState('');
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Load all conversations for admin
  const conversationsQuery = useMemo(() => {
    if (!user?.uid) return null;
    return query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', user.uid)
    );
  }, [user?.uid]);

  useEffect(() => {
    if (!conversationsQuery) return;
    const unsub = onSnapshot(conversationsQuery, snap => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Conversation));
      list.sort((a, b) => {
        const aTime = a.lastMessageAt?.toMillis ? a.lastMessageAt.toMillis() : 0;
        const bTime = b.lastMessageAt?.toMillis ? b.lastMessageAt.toMillis() : 0;
        return bTime - aTime;
      });
      setConversations(list);
    });
    return () => unsub();
  }, [conversationsQuery]);

  const [userStatuses, setUserStatuses] = useState<Record<string, { isOnline: boolean; lastSeen?: Timestamp }>>({});

  // Subscribe to user online status for conversation participants
  useEffect(() => {
    if (conversations.length === 0 || !user?.uid) return;
    
    // Extract unique other participant UIDs
    const uids = Array.from(new Set(
      conversations.map(c => c.participants.find(p => p !== user.uid)).filter(Boolean) as string[]
    ));

    if (uids.length === 0) return;

    // Firebase limit is 30 for 'in' queries, so slice to 30
    const usersQuery = query(
      collection(db, 'users'),
      where('__name__', 'in', uids.slice(0, 30))
    );

    const unsub = onSnapshot(usersQuery, snap => {
      const statuses: Record<string, { isOnline: boolean; lastSeen?: Timestamp }> = {};
      snap.docs.forEach(docSnap => {
        const data = docSnap.data();
        statuses[docSnap.id] = {
          isOnline: data.isOnline === true,
          lastSeen: data.lastSeen
        };
      });
      setUserStatuses(prev => ({ ...prev, ...statuses }));
    });

    return () => unsub();
  }, [conversations, user?.uid]);

  const isUserOnline = (uid: string) => {
    const status = userStatuses[uid];
    if (!status) return false;
    if (!status.isOnline) return false;
    if (status.lastSeen) {
      const diff = Date.now() - status.lastSeen.toMillis();
      return diff < 300000; // 5 minutes activity window
    }
    return false;
  };

  // Subscribe to messages
  const messagesQuery = useMemo(() => {
    if (!selectedConvoId) return null;
    return query(
      collection(db, `conversations/${selectedConvoId}/messages`),
      orderBy('timestamp', 'asc')
    );
  }, [selectedConvoId]);

  useEffect(() => {
    if (!messagesQuery || !user || !selectedConvoId) return;
    const unsub = onSnapshot(messagesQuery, snap => {
      const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Message));
      setMessages(msgs);
      setTimeout(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }, 50);
      
      // Mark all as read in subcollection
      snap.docs
        .filter(d => d.data().senderId !== user.uid && !d.data().isRead)
        .forEach(d => updateDoc(d.ref, { isRead: true }));

      // Also reset unreadCount in the conversation document
      updateDoc(doc(db, 'conversations', selectedConvoId), {
        [`unreadCount.${user.uid}`]: 0
      }).catch(err => console.error("Error resetting unreadCount:", err));
    });
    return () => unsub();
  }, [messagesQuery, user, selectedConvoId]);

  // Load all users for chat initialization
  const loadAllUsers = async () => {
    setLoadingUsers(true);
    try {
      const q = query(collection(db, 'users'));
      const snap = await getDocs(q);
      const fetched = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as any))
        .filter((u: any) => u.id !== user?.uid && u.role !== 'admin');
      setAllUsers(fetched);
    } catch (e) {
      console.error("Error loading users for chat:", e);
      toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de charger la liste des utilisateurs.' });
    } finally {
      setLoadingUsers(false);
    }
  };

  const startNewConversation = async (targetUser: any) => {
    if (!user) return;
    try {
      // Check if conversation already exists
      const existing = conversations.find(c => c.participants.includes(targetUser.id));
      if (existing) {
        setSelectedConvoId(existing.id);
        setIsNewChatOpen(false);
        return;
      }

      // Create new conversation document
      const targetName = targetUser.companyName || `${targetUser.firstName || ''} ${targetUser.lastName || ''}`.trim() || targetUser.email || 'Utilisateur';
      const adminName = userData?.firstName ? `${userData.firstName} ${userData.lastName || ''}`.trim() : 'Support TransConnekt';

      const docRef = await addDoc(collection(db, 'conversations'), {
        participants: [user.uid, targetUser.id],
        participantNames: {
          [user.uid]: adminName,
          [targetUser.id]: targetName,
        },
        lastMessage: 'Conversation démarrée par l\'admin',
        lastMessageAt: Timestamp.now(),
        unreadCount: {
          [user.uid]: 0,
          [targetUser.id]: 0,
        },
        createdAt: Timestamp.now()
      });

      // Send initial support message
      await addDoc(collection(db, `conversations/${docRef.id}/messages`), {
        senderId: user.uid,
        senderName: adminName,
        text: 'Bonjour ! Comment pouvons-nous vous aider ?',
        timestamp: Timestamp.now(),
        isRead: false,
      });

      toast({ title: 'Conversation démarrée ✅' });
      setSelectedConvoId(docRef.id);
      setIsNewChatOpen(false);
      setSearchTermUser('');
    } catch (e) {
      console.error("Error starting new conversation:", e);
      toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de créer la conversation.' });
    }
  };

  // Filter users by name or ID
  const filteredUsersForChat = allUsers.filter(u => {
    const term = searchTermUser.toLowerCase();
    const firstName = u.firstName || '';
    const lastName = u.lastName || '';
    const email = u.email || '';
    const companyName = u.companyName || '';
    const id = u.id || '';
    return (
      firstName.toLowerCase().includes(term) ||
      lastName.toLowerCase().includes(term) ||
      email.toLowerCase().includes(term) ||
      companyName.toLowerCase().includes(term) ||
      id.toLowerCase().includes(term)
    );
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const sendMessage = async () => {
    if ((!newMessage.trim() && !selectedFile) || !selectedConvoId || !user) return;
    setSending(true);
    const text = newMessage.trim();
    setNewMessage('');
    try {
      const convo = conversations.find(c => c.id === selectedConvoId);
      const otherUid = convo?.participants.find(p => p !== user.uid);

      let fileUrl = "";
      let fileName = "";

      // File attachment upload
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
        senderName: 'Support TransConnekt',
        text: fileUrl ? `Fichier envoyé : ${fileName}` : text,
        timestamp: Timestamp.now(),
        isRead: false,
      };

      if (fileUrl) {
        msgPayload.fileUrl = fileUrl;
        msgPayload.fileName = fileName;
      }

      await addDoc(collection(db, `conversations/${selectedConvoId}/messages`), msgPayload);

      const unreadRefKey = otherUid ? `unreadCount.${otherUid}` : null;
      const convoDocData: any = {
        lastMessage: fileUrl ? `📎 Fichier : ${fileName}` : text,
        lastMessageAt: Timestamp.now(),
      };
      if (otherUid && unreadRefKey) {
        const currentUnread = convo?.unreadCount?.[otherUid] || 0;
        convoDocData[unreadRefKey] = currentUnread + 1;
      }

      await updateDoc(doc(db, 'conversations', selectedConvoId), convoDocData);

      // Send push notification to the user
      if (otherUid) {
        await addDoc(collection(db, 'notifications'), {
          userId: otherUid,
          message: `Support TransConnekt: "${fileUrl ? '📎 Fichier : ' + fileName : text.substring(0, 60)}"`,
          href: '/dashboard/messages',
          isRead: false,
          createdAt: Timestamp.now(),
        });
      }
    } catch (e) {
      toast({ variant: 'destructive', title: 'Erreur', description: "Impossible d'envoyer." });
    } finally {
      setSending(false);
      setUploading(false);
    }
  };

  const formatTime = (ts: Timestamp) => {
    try { return formatDistanceToNow(ts.toDate(), { addSuffix: true, locale: fr }); } catch { return ''; }
  };

  const getUserName = (convo: Conversation) => {
    if (!user) return 'Utilisateur';
    const otherUid = convo.participants.find(p => p !== user.uid);
    return otherUid ? (convo.participantNames?.[otherUid] || 'Utilisateur') : 'Utilisateur';
  };

  // Archive entire conversation
  const toggleArchiveConversation = async () => {
    if (!selectedConvoId || !selectedConvo) return;
    const isArchived = selectedConvo.archived === true;
    try {
      await updateDoc(doc(db, 'conversations', selectedConvoId), {
        archived: !isArchived
      });
      toast({
        title: isArchived ? "Conversation désarchivée ✅" : "Conversation archivée 📁",
        description: isArchived ? "La conversation est de retour dans vos discussions." : "La conversation a été déplacée dans vos archives."
      });
      setSelectedConvoId(null);
    } catch (e) {
      toast({ variant: 'destructive', title: 'Erreur', description: "Action impossible." });
    }
  };

  // Delete message from subcollection
  const handleDeleteMessage = async (msgId: string) => {
    if (!selectedConvoId) return;
    try {
      await deleteDoc(doc(db, `conversations/${selectedConvoId}/messages`, msgId));
      toast({ title: "Message supprimé" });

      // Fetch the new latest message to update parent conversation preview
      const msgsRef = collection(db, `conversations/${selectedConvoId}/messages`);
      const q = query(msgsRef, orderBy('timestamp', 'desc'), limit(1));
      const snap = await getDocs(q);
      
      if (!snap.empty) {
        const newLatest = snap.docs[0].data();
        await updateDoc(doc(db, 'conversations', selectedConvoId), {
          lastMessage: newLatest.fileUrl ? `📎 Fichier : ${newLatest.fileName}` : newLatest.text,
          lastMessageAt: newLatest.timestamp
        });
      } else {
        await updateDoc(doc(db, 'conversations', selectedConvoId), {
          lastMessage: "Conversation démarrée par l'admin",
          lastMessageAt: Timestamp.now()
        });
      }
    } catch (e) {
      console.error("Error deleting message:", e);
      toast({ variant: 'destructive', title: 'Erreur', description: "Impossible de supprimer le message." });
    }
  };

  const filteredConvos = useMemo(() => {
    return conversations.filter(c => {
      const isArchived = c.archived === true;
      const matchesTab = activeTab === 'archived' ? isArchived : !isArchived;
      const matchesSearch = getUserName(c).toLowerCase().includes(search.toLowerCase());
      return matchesTab && matchesSearch;
    });
  }, [conversations, search, activeTab, user]);

  const selectedConvo = conversations.find(c => c.id === selectedConvoId);
  const otherUserName = selectedConvo ? getUserName(selectedConvo) : '';

  return (
    <div className="p-4 md:p-6 h-[calc(100vh-120px)] flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-border/40 pb-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Messagerie</h1>
          <p className="text-sm text-muted-foreground mt-1">Conversations avec tous les utilisateurs de la plateforme.</p>
        </div>
        <div className="flex items-center gap-3">
          <Dialog open={isNewChatOpen} onOpenChange={open => { setIsNewChatOpen(open); if(open) loadAllUsers(); }}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 text-white rounded-xl shadow-lg px-4 py-2 flex items-center gap-2 font-bold">
                <UserPlus size={16} /> Contacter un utilisateur
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md rounded-2xl bg-slate-950 text-slate-100 border border-slate-800">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold text-slate-100">Démarrer une conversation</DialogTitle>
                <DialogDescription className="text-slate-400">
                  Recherchez un utilisateur par nom, email ou identifiant unique (ID) pour ouvrir un canal de discussion.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2 text-left">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    placeholder="Nom, email ou ID..."
                    value={searchTermUser}
                    onChange={e => setSearchTermUser(e.target.value)}
                    className="pl-8 rounded-xl h-10 bg-slate-900 border-slate-800 text-slate-100 placeholder:text-slate-500 focus-visible:ring-indigo-500"
                  />
                </div>
                <div className="max-h-60 overflow-y-auto divide-y divide-slate-800 border border-slate-800 rounded-xl bg-slate-950">
                  {loadingUsers ? (
                    <div className="flex justify-center items-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
                  ) : filteredUsersForChat.length === 0 ? (
                    <p className="text-sm text-center text-slate-400 py-8">Aucun utilisateur trouvé.</p>
                  ) : (
                    filteredUsersForChat.map(u => (
                      <button
                        key={u.id}
                        onClick={() => startNewConversation(u)}
                        className="w-full p-3 flex items-center justify-between hover:bg-slate-900 transition-colors text-left text-slate-100 border-b border-slate-900"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-sm text-slate-100 truncate">{u.companyName || `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'Sans nom'}</p>
                          <p className="text-xs text-slate-400 truncate">{u.email}</p>
                          <p className="text-[10px] font-mono text-indigo-400 mt-0.5 truncate">ID: {u.id}</p>
                        </div>
                        <Badge className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[10px] capitalize shrink-0 ml-2">{u.role}</Badge>
                      </button>
                    ))
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" className="rounded-xl border-slate-800 text-slate-200 hover:bg-slate-900 hover:text-white" onClick={() => setIsNewChatOpen(false)}>Fermer</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Badge className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20 px-3 py-1 rounded-full text-sm">
            {conversations.length} conversation{conversations.length > 1 ? 's' : ''}
          </Badge>
        </div>
      </div>

      <div className="flex flex-1 gap-4 overflow-hidden rounded-2xl border border-border/40 bg-card/40 backdrop-blur-md">
        
        {/* Sidebar: Conversations List */}
        <div className={cn(
          "w-full md:w-72 lg:w-80 border-r border-border/20 flex flex-col shrink-0",
          selectedConvoId ? "hidden md:flex" : "flex"
        )}>
          
          {/* Active vs Archived Tabs */}
          <div className="flex border-b border-border/10">
            <button
              onClick={() => setActiveTab('active')}
              className={cn(
                "flex-1 py-3 text-xs font-bold text-center border-b-2 transition-all",
                activeTab === 'active' 
                  ? "border-primary text-primary bg-primary/5" 
                  : "border-transparent text-muted-foreground hover:text-white hover:bg-white/5"
              )}
            >
              Discussions
            </button>
            <button
              onClick={() => setActiveTab('archived')}
              className={cn(
                "flex-1 py-3 text-xs font-bold text-center border-b-2 transition-all",
                activeTab === 'archived' 
                  ? "border-primary text-primary bg-primary/5" 
                  : "border-transparent text-muted-foreground hover:text-white hover:bg-white/5"
              )}
            >
              Archivées
            </button>
          </div>

          <div className="p-3 border-b border-border/20">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Rechercher..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8 h-8 bg-slate-800/60 border-slate-700 text-sm rounded-xl"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-border/10">
            {filteredConvos.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-muted-foreground text-sm gap-2">
                <MessageSquare size={24} className="opacity-30" />
                <p>Aucune conversation</p>
              </div>
            ) : filteredConvos.map(convo => {
              const name = getUserName(convo);
              const isSelected = selectedConvoId === convo.id;
              const unread = user ? (convo.unreadCount?.[user.uid] || 0) : 0;
              const otherParticipantUid = convo.participants.find(p => p !== user?.uid);
              const isParticipantOnline = otherParticipantUid ? isUserOnline(otherParticipantUid) : false;
              return (
                <button
                  key={convo.id}
                  onClick={() => setSelectedConvoId(convo.id)}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 text-left hover:bg-white/5 transition-colors",
                    isSelected && "bg-indigo-600/10 border-l-2 border-indigo-500"
                  )}
                >
                  <div className="relative shrink-0">
                    <div className="w-9 h-9 rounded-full bg-indigo-500/10 flex items-center justify-center">
                      <User size={16} className="text-indigo-400" />
                    </div>
                    {isParticipantOnline && (
                      <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-slate-950 animate-pulse" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-sm truncate">{name}</span>
                      {unread > 0 && <Badge className="bg-rose-500 text-white text-[10px] h-4 w-4 p-0 rounded-full flex items-center justify-center">{unread}</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{convo.lastMessage || 'Nouvelle conversation'}</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                      {convo.lastMessageAt ? formatTime(convo.lastMessageAt) : ''}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main: Chat Panel */}
        <div className={cn(
          "flex-1 flex flex-col overflow-hidden animate-in fade-in duration-300",
          selectedConvoId ? "flex" : "hidden md:flex"
        )}>
          {!selectedConvoId ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-8">
              <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center">
                <MessageSquare size={32} className="text-indigo-400" />
              </div>
              <h3 className="font-bold text-lg">Sélectionnez une conversation</h3>
              <p className="text-sm text-muted-foreground max-w-xs">Cliquez sur une conversation dans la liste pour commencer à discuter avec un utilisateur.</p>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className="px-4 py-3 border-b border-border/20 flex items-center justify-between bg-slate-900/30 shrink-0">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden h-8 w-8 rounded-full text-slate-400 hover:text-white mr-1"
                    onClick={() => setSelectedConvoId(null)}
                  >
                    <ArrowLeft size={16} />
                  </Button>
                  
                  {(() => {
                    const otherUid = selectedConvo?.participants.find(p => p !== user?.uid);
                    const isOnline = otherUid ? isUserOnline(otherUid) : false;
                    const statusInfo = otherUid ? userStatuses[otherUid] : null;
                    return (
                      <>
                        <div className="relative">
                          <div className="w-9 h-9 rounded-full bg-indigo-500/10 flex items-center justify-center">
                            <User size={16} className="text-indigo-400" />
                          </div>
                          {isOnline && (
                            <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-slate-950 animate-pulse" />
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-sm flex items-center gap-1.5">
                            {otherUserName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {isOnline ? (
                              <span className="text-emerald-400 font-semibold">En ligne</span>
                            ) : statusInfo?.lastSeen ? (
                              `En ligne ${formatTime(statusInfo.lastSeen)}`
                            ) : (
                              selectedConvo?.archived ? "Archivée dans les dossiers" : "Conversation en cours"
                            )}
                          </p>
                        </div>
                      </>
                    );
                  })()}
                </div>
                
                <Button 
                  onClick={toggleArchiveConversation}
                  variant="outline"
                  size="sm"
                  className="rounded-xl h-8 border-slate-800 text-slate-300 hover:bg-slate-800 text-xs font-semibold flex items-center gap-1.5"
                >
                  <Archive size={14} className="text-indigo-400" />
                  {selectedConvo?.archived ? "Désarchiver" : "Archiver"}
                </Button>
              </div>

              {/* Messages */}
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-950/10">
                {messages.map(m => {
                  const isMe = m.senderId === user?.uid;
                  return (
                    <div key={m.id} className={cn("flex gap-2 group", isMe ? "justify-end" : "justify-start")}>
                      {!isMe && (
                        <div className="w-7 h-7 rounded-full bg-indigo-500/20 flex items-center justify-center shrink-0 mt-1">
                          <User size={12} className="text-indigo-400" />
                        </div>
                      )}
                      
                      {/* Delete button (Left of bubble for admin's own message) */}
                      {isMe && (
                        <button
                          onClick={() => handleDeleteMessage(m.id)}
                          className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-rose-500 p-1.5 self-center transition-all duration-200"
                          title="Supprimer ce message pour tout le monde"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}

                      <div className={cn(
                        "max-w-[70%] rounded-2xl px-4 py-2.5 text-sm flex flex-col gap-1 shadow-sm",
                        isMe
                          ? "bg-indigo-600 text-white rounded-tr-sm"
                          : "bg-slate-800 text-slate-100 rounded-tl-sm"
                      )}>
                        {m.fileUrl ? (
                          <div className="space-y-1.5 text-left">
                            {m.fileUrl.match(/\.(jpeg|jpg|gif|png)/i) ? (
                              <img src={m.fileUrl} alt={m.fileName} className="max-w-full h-auto max-h-48 object-contain rounded-lg" />
                            ) : (
                              <div className="flex items-center gap-2 bg-slate-900/60 p-2 rounded-xl border border-white/5">
                                <FileText size={16} className="text-indigo-400 shrink-0" />
                                <span className="text-xs font-semibold truncate max-w-[130px]">{m.fileName}</span>
                              </div>
                            )}
                            <a href={m.fileUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] underline block text-indigo-200 mt-1">
                              Télécharger
                            </a>
                          </div>
                        ) : (
                          <p className="leading-relaxed whitespace-pre-wrap text-left">{m.text}</p>
                        )}
                        <span className={cn("text-[9px] mt-0.5", isMe ? "text-indigo-200/80 text-right" : "text-slate-400 text-left")}>
                          {formatTime(m.timestamp)}
                        </span>
                      </div>

                      {/* Delete button (Right of bubble for user's message) */}
                      {!isMe && (
                        <button
                          onClick={() => handleDeleteMessage(m.id)}
                          className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-rose-500 p-1.5 self-center transition-all duration-200"
                          title="Supprimer le message de l'utilisateur"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}

                      {isMe && (
                        <div className="w-7 h-7 rounded-full bg-indigo-500/10 flex items-center justify-center shrink-0 mt-1">
                          <Bot size={12} className="text-indigo-400" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Input Area */}
              <div className="p-3 border-t border-border/20 bg-slate-900/40 flex flex-col gap-2 shrink-0">
                {selectedFile && (
                  <div className="flex items-center justify-between bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 rounded-xl text-xs text-indigo-400">
                    <span className="truncate">{selectedFile.name}</span>
                    <button onClick={removeSelectedFile} className="hover:text-rose-400 shrink-0"><X size={14}/></button>
                  </div>
                )}
                
                <div className="flex gap-2">
                  <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    disabled={sending || uploading}
                    onClick={() => fileInputRef.current?.click()}
                    className="h-10 w-10 shrink-0 rounded-xl bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-300"
                  >
                    <Paperclip size={16} />
                  </Button>
                  
                  <Input
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    disabled={sending || uploading}
                    placeholder={`Répondre à ${otherUserName}...`}
                    className="flex-1 bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500 text-sm rounded-xl h-10 focus-visible:ring-indigo-500"
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                  />
                  <Button
                    onClick={sendMessage}
                    disabled={sending || uploading || (!newMessage.trim() && !selectedFile)}
                    className="h-10 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center gap-1.5 shrink-0"
                  >
                    {sending || uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send size={15} />}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  );
}
