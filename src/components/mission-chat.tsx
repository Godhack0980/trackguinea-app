"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '@/context/auth-context';
import { db } from '@/lib/firebase';
import { collection, addDoc, query, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Send, Paperclip, MapPin, X, FileText, Image as ImageIcon, MessageSquare, ExternalLink } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  text: string;
  timestamp: Timestamp;
  fileUrl?: string;
  fileName?: string;
  location?: {
    lat: number;
    lng: number;
  };
}

interface MissionChatProps {
  shipmentId: string;
  missionNumber: string;
}

export default function MissionChat({ shipmentId, missionNumber }: MissionChatProps) {
  const { user, userData } = useAuth();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileBase64, setFileBase64] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentUserName = useMemo(() => {
    if (userData?.firstName) {
      return `${userData.firstName} ${userData.lastName || ''}`.trim();
    }
    return user?.email || 'Utilisateur';
  }, [user, userData]);

  const currentUserRole = userData?.role || 'client';

  // Listen to messages across both shipments and requests collections for 100% real-time reliability
  useEffect(() => {
    if (!shipmentId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    let msgsShipments: Message[] = [];
    let msgsRequests: Message[] = [];

    const updateMergedMessages = () => {
      const allMsgsMap = new Map<string, Message>();
      [...msgsShipments, ...msgsRequests].forEach(m => {
        allMsgsMap.set(m.id, m);
      });
      const sorted = Array.from(allMsgsMap.values()).sort((a, b) => {
        const timeA = a.timestamp?.seconds || 0;
        const timeB = b.timestamp?.seconds || 0;
        return timeA - timeB;
      });
      setMessages(sorted);
      setLoading(false);
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      }, 100);
    };

    const timer = setTimeout(() => setLoading(false), 2500);

    const refShip = collection(db, `shipments/${shipmentId}/messages`);
    const qShip = query(refShip, orderBy('timestamp', 'asc'));
    const unsubShip = onSnapshot(
      qShip,
      (snap) => {
        clearTimeout(timer);
        msgsShipments = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
        updateMergedMessages();
      },
      (err) => console.warn("MissionChat shipment onSnapshot:", err)
    );

    const refReq = collection(db, `requests/${shipmentId}/messages`);
    const qReq = query(refReq, orderBy('timestamp', 'asc'));
    const unsubReq = onSnapshot(
      qReq,
      (snap) => {
        clearTimeout(timer);
        msgsRequests = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
        updateMergedMessages();
      },
      (err) => console.warn("MissionChat request onSnapshot:", err)
    );

    return () => {
      clearTimeout(timer);
      unsubShip();
      unsubReq();
    };
  }, [shipmentId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);

      // Convert to base64 for direct message attachment (mocking storage upload)
      const reader = new FileReader();
      reader.onloadend = () => {
        setFileBase64(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!newMessage.trim() && !selectedFile) || !user || sending) return;

    setSending(true);
    const text = newMessage.trim();
    setNewMessage('');
    
    const payload: Record<string, any> = {
      senderId: user.uid,
      senderName: currentUserName,
      senderRole: currentUserRole,
      text,
      timestamp: Timestamp.now(),
    };

    if (fileBase64) {
      payload.fileUrl = fileBase64;
    }
    if (selectedFile?.name) {
      payload.fileName = selectedFile.name;
    }

    // Clear file selection
    setSelectedFile(null);
    setFileBase64(null);

    try {
      await addDoc(collection(db, `shipments/${shipmentId}/messages`), payload);
      try {
        await addDoc(collection(db, `requests/${shipmentId}/messages`), payload);
      } catch (subErr) {
        // Ignore if request subcollection isn't configured
      }
    } catch (err) {
      console.error("Error sending mission message to shipments:", err);
      // Fallback try writing to requests
      try {
        await addDoc(collection(db, `requests/${shipmentId}/messages`), payload);
      } catch (reqErr) {
        console.error("Error sending mission message to requests:", reqErr);
      }
    } finally {
      setSending(false);
    }
  };

  const handleShareLocation = () => {
    if (!navigator.geolocation || !user) return;

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          await addDoc(collection(db, `shipments/${shipmentId}/messages`), {
            senderId: user.uid,
            senderName: currentUserName,
            senderRole: currentUserRole,
            text: `📍 A partagé sa position GPS en direct`,
            timestamp: Timestamp.now(),
            location: {
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
            },
          });
        } catch (err) {
          console.error("Error sharing location:", err);
        }
      },
      (err) => {
        console.error("Geolocation error:", err);
      }
    );
  };

  return (
    <Card className="flex flex-col h-[500px] border-slate-200 dark:border-border/50 bg-white dark:bg-card/60 shadow-xl rounded-3xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border/20 bg-slate-50 dark:bg-slate-900/40 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-500">
            <MessageSquare size={16} />
          </span>
          <div>
            <h4 className="text-sm font-black text-slate-850 dark:text-white">Messagerie de Mission</h4>
            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider font-mono">Mission: {missionNumber}</p>
          </div>
        </div>
      </div>

      {/* Messages list */}
      <div 
        ref={scrollRef}
        className="flex-grow p-4 overflow-y-auto space-y-4 bg-slate-50/50 dark:bg-slate-950/20"
      >
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full space-y-2">
            <Loader2 className="animate-spin h-6 w-6 text-indigo-500" />
            <p className="text-[10px] text-muted-foreground font-semibold">Chargement du canal...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6 text-muted-foreground space-y-2">
            <MessageSquare size={28} className="opacity-20 text-indigo-400" />
            <p className="text-xs font-bold">Aucun message</p>
            <p className="text-[10px] max-w-[200px]">Utilisez ce chat sécurisé pour échanger des informations et des documents sur cette mission.</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId === user?.uid;
            const isSystem = msg.senderId === "system";
            const msgDate = msg.timestamp?.toDate ? msg.timestamp.toDate() : new Date();
            const timeStr = formatDistanceToNow(msgDate, { addSuffix: true, locale: fr });

            if (isSystem) {
              return (
                <div key={msg.id} className="flex justify-center my-2">
                  <div className="px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-border/30 text-[10px] text-slate-600 dark:text-slate-400 font-bold max-w-[85%] text-center">
                    📢 {msg.text}
                  </div>
                </div>
              );
            }

            return (
              <div 
                key={msg.id} 
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} space-y-1`}
              >
                {/* Meta details */}
                <div className="flex items-center gap-1.5 px-1 text-[10px] text-muted-foreground font-semibold">
                  <span>{msg.senderName}</span>
                  <span className="text-[8px] uppercase tracking-wider px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    {msg.senderRole === "admin" ? "Support" : msg.senderRole === "transporter" ? "Transporteur" : "Client"}
                  </span>
                </div>

                {/* Bubble */}
                <div 
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-xs shadow-md border ${
                    isMe 
                      ? 'bg-indigo-600 text-white border-indigo-700 rounded-tr-none' 
                      : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border-slate-200 dark:border-border/40 rounded-tl-none'
                  }`}
                >
                  {msg.text && <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>}

                  {/* Attachment rendering */}
                  {msg.fileUrl && (
                    <div className="mt-2 pt-2 border-t border-white/20 dark:border-slate-800 flex items-center gap-2">
                      {msg.fileName?.match(/\.(jpeg|jpg|gif|png)$/i) ? (
                        <div className="space-y-1">
                          <img 
                            src={msg.fileUrl} 
                            alt={msg.fileName} 
                            className="max-h-40 rounded-lg object-cover cursor-pointer border border-border/10" 
                            onClick={() => window.open(msg.fileUrl, '_blank')}
                          />
                          <span className="text-[9px] block opacity-70 underline truncate max-w-[150px]">{msg.fileName}</span>
                        </div>
                      ) : (
                        <a 
                          href={msg.fileUrl} 
                          download={msg.fileName} 
                          target="_blank" 
                          rel="noreferrer"
                          className="flex items-center gap-1.5 p-1.5 rounded-lg bg-black/10 dark:bg-slate-950/40 hover:bg-black/20 dark:hover:bg-slate-950/60 transition-colors"
                        >
                          <FileText size={14} className="shrink-0" />
                          <span className="text-[10px] underline truncate max-w-[140px]">{msg.fileName}</span>
                        </a>
                      )}
                    </div>
                  )}

                  {/* Location card */}
                  {msg.location && (
                    <div className="mt-2 p-2 rounded-xl bg-black/15 dark:bg-slate-950/50 flex flex-col gap-1.5">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold">
                        <MapPin size={12} className="text-rose-400" />
                        <span>Coordonnées partagées</span>
                      </div>
                      <p className="text-[9px] opacity-80 font-mono">Lat: {msg.location.lat.toFixed(5)}, Lng: {msg.location.lng.toFixed(5)}</p>
                      <a 
                        href={`https://www.google.com/maps/search/?api=1&query=${msg.location.lat},${msg.location.lng}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[9px] font-black text-rose-300 hover:underline flex items-center gap-1 mt-0.5"
                      >
                        Voir sur Google Maps <ExternalLink size={10} />
                      </a>
                    </div>
                  )}
                </div>

                {/* Time stamp */}
                <span className="text-[8px] text-muted-foreground px-1">{timeStr}</span>
              </div>
            );
          })
        )}
      </div>

      {/* Input row */}
      <div className="p-3 border-t border-border/20 bg-slate-50 dark:bg-slate-900/30 shrink-0">
        {selectedFile && (
          <div className="mb-2 p-2 rounded-xl bg-slate-100 dark:bg-slate-950/50 border border-border/20 flex items-center justify-between text-[10px]">
            <div className="flex items-center gap-2 text-muted-foreground">
              {selectedFile.name.match(/\.(jpeg|jpg|gif|png)$/i) ? <ImageIcon size={14}/> : <FileText size={14}/>}
              <span className="font-bold truncate max-w-[200px]">{selectedFile.name}</span>
            </div>
            <Button 
              size="icon" 
              variant="ghost" 
              className="h-5 w-5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800"
              onClick={() => { setSelectedFile(null); setFileBase64(null); }}
            >
              <X size={12} />
            </Button>
          </div>
        )}

        <form onSubmit={handleSend} className="flex items-center gap-2">
          {/* File Picker */}
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            className="hidden" 
            accept="*/*"
          />
          <Button 
            type="button" 
            size="icon" 
            variant="ghost" 
            onClick={() => fileInputRef.current?.click()}
            className="h-10 w-10 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 text-muted-foreground shrink-0"
          >
            <Paperclip size={16} />
          </Button>

          {/* Location Picker */}
          <Button 
            type="button" 
            size="icon" 
            variant="ghost" 
            onClick={handleShareLocation}
            className="h-10 w-10 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 text-rose-500 shrink-0"
            title="Partager ma position en direct"
          >
            <MapPin size={16} />
          </Button>

          {/* Input text */}
          <Input 
            type="text" 
            placeholder="Écrivez un message..." 
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="flex-grow bg-white dark:bg-slate-950 border-slate-200 dark:border-border/30 h-10 rounded-xl text-xs text-slate-800 dark:text-slate-200"
          />

          {/* Send button */}
          <Button 
            type="submit" 
            size="icon" 
            disabled={(!newMessage.trim() && !selectedFile) || sending}
            className="h-10 w-10 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 rounded-xl text-white shrink-0 border-0"
          >
            {sending ? <Loader2 className="animate-spin h-4 w-4" /> : <Send size={15} />}
          </Button>
        </form>
      </div>
    </Card>
  );
}
