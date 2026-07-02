import { supabase } from './supabase';
import { formatWasteVolumeLabel } from './wasteVolume';

interface NearbyReportsParams {
  latitude: number;
  longitude: number;
  radiusKm?: number;
  limit?: number;
}

export interface ReportLocation {
  id: number;
  user_id: string;
  image_urls: string[];
  created_at: string;
  waste_type: string;
  waste_volume: string;
  location_category: string;
  notes: string | null;
  latitude: number;
  longitude: number;
  distance_km: number;
}

interface NearbyReportsResponse {
  success: boolean;
  data?: {
    reports: ReportLocation[];
    query: {
      latitude: string;
      longitude: string;
      radius_km: number;
    };
    total_count: number;
  };
  error?: string;
}

export async function getNearbyReports(
  params: NearbyReportsParams
): Promise<NearbyReportsResponse> {
  try {
    const { latitude, longitude, radiusKm = 10, limit = 50 } = params;

    const withTimeout = async <T,>(run: () => Promise<T>, timeoutMs = 12000): Promise<T> => {
      return Promise.race([
        run(),
        new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Request timeout saat mengambil laporan terdekat.')), timeoutMs);
        }),
      ]);
    };

    // Call the RPC function directly — this is exactly what the Edge Function
    // does internally (it just proxies to this same RPC with the anon key).
    // Bypassing the Edge Function avoids all gateway auth header complexity.
    const { data, error } = await withTimeout(async () => {
      const res = await supabase.rpc('get_nearby_reports', {
        p_latitude: latitude,
        p_longitude: longitude,
        p_radius_meters: radiusKm * 1000,
        p_limit: limit,
      });
      return res;
    });

    if (error) {
      throw new Error(error.message);
    }

    const reports: ReportLocation[] = (data ?? [])
      .filter((item: any) => item.status === 'approved')
      .map((item: any) => ({
      ...item,
      distance_km: item.distance_km !== undefined ? item.distance_km : (item.distance ? item.distance / 1000 : 0)
    }));
    return {
      success: true,
      data: {
        reports,
        query: {
          latitude: latitude.toString(),
          longitude: longitude.toString(),
          radius_km: radiusKm,
        },
        total_count: reports.length,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

export function formatWasteType(type: string): string {
  const labels: Record<string, string> = {
    organik: 'Organik',
    anorganik: 'Anorganik',
    campuran: 'Campuran',
  };
  return labels[type] || type;
}

export function formatHazardRisk(risk: string): string {
  const labels: Record<string, string> = {
    tidak_ada: 'Tidak Ada',
    rendah: 'Rendah',
    menengah: 'Menengah',
    tinggi: 'Tinggi',
  };
  return labels[risk] || risk;
}

export function formatWasteVolume(volume: string): string {
  return formatWasteVolumeLabel(volume);
}

export function formatLocationCategory(category: string): string {
  const labels: Record<string, string> = {
    sungai: 'Di sungai',
    pinggir_jalan: 'Pinggir jalan',
    area_publik: 'Area publik',
    tanah_kosong: 'Tanah kosong',
    lainnya: 'Lainnya',
  };
  return labels[category] || category;
}

export function formatDistance(distanceKm: number | undefined): string {
  if (distanceKm === undefined || isNaN(distanceKm)) return '0 m';
  if (distanceKm < 1) return `${Math.round(distanceKm * 1000)} m`;
  return `${Number(distanceKm).toFixed(1)} km`;
}
