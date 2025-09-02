import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDurationFromSeconds(totalSeconds: number): string {
  const days = Math.floor(totalSeconds / (24 * 3600));
  totalSeconds %= (24 * 3600);
  const hours = Math.floor(totalSeconds / 3600);
  totalSeconds %= 3600;
  const minutes = Math.floor(totalSeconds / 60);

  let result = "";
  if (days > 0) {
    result += `${days} jour${days > 1 ? 's' : ''} `;
  }
  if (hours > 0) {
    result += `${hours} heure${hours > 1 ? 's' : ''} `;
  }
  if (minutes > 0) {
     result += `${minutes} minute${minutes > 1 ? 's' : ''}`;
  }
  
  return result.trim();
}
