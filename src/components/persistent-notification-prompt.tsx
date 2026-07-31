"use client";

import React, { useEffect, useState, useRef } from "react";
import { useAuth } from "@/context/auth-context";
import { collection, query, where, onSnapshot, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "./ui/button";
import { Bell, ArrowRight, ArrowUpLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function PersistentNotificationPrompt() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showModal, setShowModal] = useState(false);
  const [showArrowGuide, setShowArrowGuide] = useState(false);
  const pageLoadTime = useRef(Timestamp.now());

  const requestPermissionSafe = (callback: (perm: NotificationPermission) => void) => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    try {
      const result = Notification.requestPermission(callback);
      if (result && typeof result.then === "function") {
        result.then(callback);
      }
    } catch (err) {
      Notification.requestPermission(callback);
    }
  };

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    
    // Soft reminder on mount if not allowed
    if (Notification.permission !== "granted") {
      setShowModal(true);
    }
  }, []);

  // Listen to custom trigger events when using notification-sensitive services
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleReminderTrigger = () => {
      if (Notification.permission !== "granted") {
        setShowModal(true);
      }
    };

    window.addEventListener("show-notification-reminder", handleReminderTrigger);
    return () => {
      window.removeEventListener("show-notification-reminder", handleReminderTrigger);
    };
  }, []);

  // Native notification trigger on new Firestore notifications
  useEffect(() => {
    if (!user?.uid) return;
    if (typeof window === "undefined" || !("Notification" in window) || Notification.permission !== "granted") return;

    const q = query(
      collection(db, "notifications"),
      where("userId", "==", user.uid),
      where("isRead", "==", false)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const data = change.doc.data();
          const createdAt = data.createdAt;
          // Only notify for fresh items created after page load
          if (createdAt && createdAt.toMillis() > pageLoadTime.current.toMillis()) {
            try {
              new Notification("TransConnekt 🚛", {
                body: data.message,
                icon: "/transconnekt-logo.png",
                badge: "/transconnekt-logo.png",
              });
            } catch (err) {
              console.error("Browser push notification error:", err);
            }
          }
        }
      });
    });

    return () => unsub();
  }, [user?.uid]);

  const handleButtonClick = () => {
    if (typeof window === "undefined" || !("Notification" in window)) return;

    const currentPermission = Notification.permission;

    if (currentPermission === "denied") {
      setShowArrowGuide(true);
      toast({
        variant: "destructive",
        title: "Notifications bloquées 🚫",
        description: "Veuillez activer les notifications dans votre barre d'adresse en suivant la flèche.",
      });
      return;
    }

    requestPermissionSafe((perm) => {
      if (perm === "granted") {
        setShowModal(false);
        setShowArrowGuide(false);
        toast({
          title: "Notifications activées 🔔",
          description: "Merci ! Vous recevrez des alertes en temps réel.",
        });
      } else if (perm === "denied") {
        setShowArrowGuide(true);
        toast({
          variant: "destructive",
          title: "Action requise 🚫",
          description: "Veuillez accepter la demande d'autorisation ou suivre le cadenas pour débloquer.",
        });
      }
    });
  };

  if (!showModal) return null;

  return (
    <>
      {/* Floating Animated Arrow Pointer - desktop only, hidden on mobile */}
      {showArrowGuide && (
        <div className="hidden md:flex fixed top-2 left-2 md:left-20 z-[10000] items-start gap-3 max-w-sm bg-slate-900 border-2 border-indigo-500 rounded-2xl p-4 shadow-2xl animate-bounce shadow-indigo-500/20">
          <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 shrink-0">
            <ArrowUpLeft size={24} className="animate-pulse" />
          </div>
          <div className="space-y-1">
            <p className="text-xs font-bold text-white flex items-center gap-1">
              Débloquez ici ! 🔒
            </p>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Cliquez sur le cadenas (ou l&apos;icône de réglages) juste au-dessus dans votre barre d&apos;adresse, passez les notifications sur <strong>Autoriser</strong>, puis actualisez la page.
            </p>
            <button 
              onClick={() => setShowArrowGuide(false)}
              className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold mt-1 underline"
            >
              Fermer le guide
            </button>
          </div>
        </div>
      )}

      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
        <div className="w-full max-w-md bg-slate-900 border border-indigo-500/30 rounded-3xl p-6 shadow-2xl shadow-indigo-500/10 space-y-6">
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center animate-bounce">
              <Bell size={32} />
            </div>
            <h2 className="text-xl font-bold text-white">Activez les notifications 🔔</h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              Pour recevoir en temps réel les messages du support, les attributions de courses et les validations de vos documents, vous devez autoriser les notifications.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/40 border border-slate-800/80 space-y-3 text-xs">
            <p className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Comment activer :</p>
            <ul className="space-y-2 text-slate-300">
              <li className="flex items-start gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-400 text-[10px] font-bold">1</span>
                <span className="hidden md:inline">Regardez la flèche 👆 en haut à gauche et cliquez sur le cadenas 🔒.</span>
                <span className="md:hidden">Cliquez sur le bouton de réglages de votre site/navigateur.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-400 text-[10px] font-bold">2</span>
                <span>Activez ou autorisez l&apos;option <strong>Notifications</strong>.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-400 text-[10px] font-bold">3</span>
                <span>Actualisez votre page.</span>
              </li>
            </ul>
          </div>

          <div className="flex flex-col gap-2">
            <Button 
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-5 font-bold flex items-center justify-center gap-1.5"
              onClick={handleButtonClick}
            >
              Autoriser les notifications <ArrowRight size={16} />
            </Button>
            <Button
              variant="ghost"
              className="w-full text-slate-400 hover:text-white rounded-xl py-5 font-semibold text-xs transition-colors"
              onClick={() => {
                setShowModal(false);
                setShowArrowGuide(false);
              }}
            >
              Plus tard
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
