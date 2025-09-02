
import { db } from './firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';

interface CreateNotificationParams {
  userId: string;
  message: string;
  href: string;
}

/**
 * Creates a new notification document in Firestore.
 * @param {CreateNotificationParams} params - The notification details.
 */
export const createNotification = async ({ userId, message, href }: CreateNotificationParams) => {
  if (!userId) {
    console.error("Notification creation failed: userId is missing.");
    return;
  }
  
  try {
    await addDoc(collection(db, 'notifications'), {
      userId,
      message,
      href,
      isRead: false,
      createdAt: Timestamp.now(),
    });
  } catch (error) {
    console.error("Error creating notification:", error);
  }
};
