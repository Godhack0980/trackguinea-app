import { NextResponse } from 'next/server';
import { applyRateLimit } from '@/lib/rate-limit';

export async function GET(req: Request) {
  // Apply Rate Limit: 60 requests per minute per IP
  const rateLimitError = applyRateLimit(req, 'mapbox-config', { limit: 60, windowMs: 60 * 1000 });
  if (rateLimitError) return rateLimitError;

  const mapboxToken = process.env.MAPBOX_ACCESS_TOKEN || process.env.NEXT_PUBLIC_MAPBOX_TOKEN || 'process.env.NEXT_PUBLIC_MAPBOX_TOKEN!';

  return NextResponse.json(
    { token: mapboxToken },
    {
      headers: {
        'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400',
      },
    }
  );
}
