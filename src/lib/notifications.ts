"use client";

import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface NotificationParams {
  userId: string;
  message: string;
  href?: string;
  type?: string;
}

/**
 * Creates a persistent notification in Firestore for a given user.
 */
export async function createNotification({ userId, message, href, type }: NotificationParams) {
  try {
    await addDoc(collection(db, 'notifications'), {
      userId,
      message,
      href: href || '',
      type: type || 'info',
      isRead: false,
      createdAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error creating Firestore notification:', error);
  }
}

/**
 * Requests HTML5 Notification permission from the browser.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (e) {
      console.error("Error requesting notification permission:", e);
    }
  }

  return false;
}

/**
 * Fires a native desktop browser notification with optional audio chime.
 */
export function sendBrowserNotification(title: string, options?: { body?: string; icon?: string; tag?: string }) {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return;
  }

  if (Notification.permission === 'granted') {
    try {
      // Play audio chime if sound is enabled
      const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3");
      audio.volume = 0.4;
      audio.play().catch(() => {});

      const n = new Notification(title, {
        icon: options?.icon || '/transconnekt-logo.png',
        badge: '/transconnekt-logo.png',
        tag: options?.tag || 'transconnekt-message',
        body: options?.body || '',
      });

      n.onclick = () => {
        window.focus();
        n.close();
      };
    } catch (e) {
      console.error("Error displaying notification:", e);
    }
  }
}
