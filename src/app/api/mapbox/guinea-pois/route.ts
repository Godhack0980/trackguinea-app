import { NextResponse } from 'next/server';
import { fetchNationalGuineaPois } from '@/lib/mapbox/poi-service';

export async function GET() {
  try {
    const mapboxToken = process.env.MAPBOX_ACCESS_TOKEN || process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';
    const pois = await fetchNationalGuineaPois(mapboxToken);

    return NextResponse.json(
      { success: true, count: pois.length, pois },
      {
        headers: {
          'Cache-Control': 'public, max-age=21600, s-maxage=86400, stale-while-revalidate=86400',
        },
      }
    );
  } catch (err: any) {
    console.error("Error in /api/mapbox/guinea-pois:", err);
    return NextResponse.json({ success: true, count: 0, pois: [] });
  }
}
