import { Truck } from 'lucide-react';
import Link from 'next/link';

export default function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2" aria-label="TrackGuinea Home">
      <Truck className="h-6 w-6 text-primary" />
      <span className="text-xl font-bold font-headline text-primary">TrackGuinea</span>
    </Link>
  );
}
