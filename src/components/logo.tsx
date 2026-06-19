import { Truck } from 'lucide-react';
import Link from 'next/link';

export default function Logo() {
  return (
    <Link href="/" className="flex items-center gap-3" aria-label="TransConnekt Home">
      <svg width="40" height="40" viewBox="0 0 64 64" fill="none" aria-hidden className="h-8 w-8">
        <defs>
          <linearGradient id="tc-grad" x1="0" x2="1">
            <stop offset="0%" stopColor="#4F46E5" />
            <stop offset="100%" stopColor="#06B6D4" />
          </linearGradient>
        </defs>
        <rect x="2" y="8" width="60" height="48" rx="10" fill="url(#tc-grad)" opacity="0.98" />
        <g transform="translate(6,12) scale(0.8)">
          <path d="M6 22 L6 8 L14 8 L14 22 Z M18 22 L18 4 L30 4 L30 8 L22 8 L22 22 Z" fill="white" />
        </g>
      </svg>
      <span className="text-xl font-bold font-headline text-white">TransConnekt</span>
    </Link>
  );
}
