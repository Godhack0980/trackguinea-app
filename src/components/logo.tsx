import Image from 'next/image';
import Link from 'next/link';

interface LogoProps {
  className?: string;
  width?: number;
  height?: number;
}

export default function Logo({ className = "", width, height }: LogoProps) {
  const w = width || 450;
  const h = height || 135;

  return (
    <Link href="/" className={`flex items-center ${className}`} aria-label="TransConnekt Home">
      <div 
        style={{ width: `${w}px`, height: `${h}px` }} 
        className="relative max-w-full transition-transform duration-300 hover:scale-105"
      >
        <Image
          src="/transconnekt-logo.png"
          alt="TransConnekt Logo"
          fill
          className="object-contain object-left"
          priority
        />
      </div>
    </Link>
  );
}
