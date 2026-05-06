import { supabase } from './supabase';
import type { Campaign, CampaignRow } from '@/types/campaign.types';
import { formatWasteVolumeLabel } from './wasteVolume';

type CampaignQueryResult = CampaignRow & {
  campaign_participants?: { profile_id: string }[];
  reports?: {
    id: number;
    image_urls: string[];
    waste_type: string;
    waste_volume: string;
    location_category: string;
    latitude: number;
    longitude: number;
  } | null;
};

interface CreateCampaignParams {
  latitude: number;
  longitude: number;
  radiusKm: number;
}

function determineCampaignStatus(startTime: string, endTime: string, dbStatus: string): 'upcoming' | 'ongoing' | 'finished' {
  if (dbStatus === 'finished') return 'finished';
  const now = new Date();
  const start = new Date(startTime);
  const end = new Date(endTime);
  if (now < start) return 'upcoming';
  if (now >= start && now <= end) return 'ongoing';
  return 'finished';
}

/**
 * Get campaign data (hasCampaign + details) by report IDs in a single query.
 * Used by the Dashboard to show campaign badges on map markers.
 */
export async function getCampaignDataByReportIds(reportIds: number[]): Promise<{
  campaignMap: Map<number, boolean>;
  campaignDetailsMap: Map<number, { id: number; status: string }>;
}> {
  try {
    const { data, error } = await supabase
      .from('campaigns')
      .select('id, report_id, status, start_time, end_time')
      .in('report_id', reportIds);

    if (error) throw error;

    const campaignMap = new Map<number, boolean>();
    const campaignDetailsMap = new Map<number, { id: number; status: string }>();

    // Initialize all to false
    reportIds.forEach(id => campaignMap.set(id, false));

    if (data) {
      data.forEach((campaign: { id: number; report_id: number; status: string; start_time: string; end_time: string }) => {
        campaignMap.set(campaign.report_id, true);
        const actualStatus = determineCampaignStatus(campaign.start_time, campaign.end_time, campaign.status);
        campaignDetailsMap.set(campaign.report_id, { id: campaign.id, status: actualStatus });
      });
    }

    return { campaignMap, campaignDetailsMap };
  } catch {
    return { campaignMap: new Map(), campaignDetailsMap: new Map() };
  }
}

/**
 * Check if a report has an associated campaign
 */
export async function checkReportHasCampaign(reportId: number): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('campaigns')
      .select('id')
      .eq('report_id', reportId)
      .limit(1);
    if (error) throw error;
    return data != null && data.length > 0;
  } catch {
    return false;
  }
}

  export async function fetchCampaigns(userId?: string): Promise<Campaign[]> {
    try {
      const { data: campaigns, error } = await supabase
        .from('campaigns')
        .select(`
          *,
          campaign_participants(profile_id)
        `)
        .order('start_time', { ascending: false });

      if (error) throw error;
      if (!campaigns) return [];

      const { data: reports, error: reportsError } = await supabase.rpc('get_reports_with_coordinates');
      if (reportsError) {
      }

      const reportsMap = new Map<number, any>();
      if (reports) {
        reports.forEach((report: any) => {
          reportsMap.set(report.id, report);
        });
      }

      return campaigns.map((campaign: any) => {
        const participantCount = campaign.campaign_participants?.length || 0;
        const isJoined = userId
          ? campaign.campaign_participants?.some((p: { profile_id: string }) => p.profile_id === userId)
          : false;

        const campaignWithReport: CampaignQueryResult = {
          ...(campaign as CampaignRow),
          reports: reportsMap.get(campaign.report_id) || null,
        };

        return transformCampaignRow(campaignWithReport, participantCount, isJoined);
      });
    } catch {
      throw new Error('Gagal memuat data campaign');
    }
  }

  export async function joinCampaign(campaignId: number, userId: string): Promise<boolean> {
    const { data: existing } = await supabase
      .from('campaign_participants')
      .select('*')
      .eq('campaign_id', campaignId)
      .eq('profile_id', userId)
      .single();

    if (existing) {
      throw new Error('Anda sudah bergabung dengan campaign ini');
    }

    const { data: participantsData, error: participantsError } = await supabase
      .from('campaign_participants')
      .select('profile_id')
      .eq('campaign_id', campaignId);

    if (participantsError) throw participantsError;

    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('max_participants')
      .eq('id', campaignId)
      .single();

    if (campaignError) throw campaignError;

    const participantCount = participantsData?.length || 0;
    if (participantCount >= (campaign?.max_participants || 0)) {
      throw new Error('Campaign sudah penuh');
    }

    const { error } = await supabase
      .from('campaign_participants')
      .insert({
        campaign_id: campaignId,
        profile_id: userId,
      } as never);

    if (error) throw error;

    await supabase.from('notifications').insert({
      user_id: userId,
      title: 'Berhasil Bergabung',
      message: `Anda telah berhasil bergabung dengan campaign. Bersiaplah untuk berkontribusi!`,
      type: 'campaign_update',
      related_id: campaignId
    });

    return true;
  }

  export async function leaveCampaign(campaignId: number, userId: string): Promise<boolean> {
    const { error } = await supabase
      .from('campaign_participants')
      .delete()
      .eq('campaign_id', campaignId)
      .eq('profile_id', userId);

    if (error) throw error;
    return true;
  }

  export async function generateCampaignFromNearbyReports(
    _params: CreateCampaignParams
  ): Promise<Campaign | null> {
    return null;
  }

  function transformCampaignRow(
    row: CampaignQueryResult,
    participantCount = 0,
    isJoined = false
  ): Campaign {
    const startTime = new Date(row.start_time);
    const endTime = new Date(row.end_time);

    const date = startTime.toISOString().split('T')[0];
    const timeStart = startTime.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const timeEnd = endTime.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    const locationName = row.reports
      ? getLocationName(row.reports.location_category)
      : 'Lokasi tidak tersedia';

    const coordinates: [number, number] | undefined = row.reports
      ? [row.reports.longitude, row.reports.latitude]
      : undefined;

    const imageUrl = row.reports?.image_urls?.[0] || '/images/template-image.png';
    const wasteTypes = row.reports ? [row.reports.waste_type] : [];
    const estimatedVolume = row.reports ? formatWasteVolume(row.reports.waste_volume) : undefined;

    return {
      id: row.id.toString(),
      title: row.title,
      description: row.description,
      location: {
        name: locationName,
        coordinates,
      },
      date,
      time: `${timeStart} - ${timeEnd}`,
      participants: participantCount,
      maxParticipants: row.max_participants,
      status: determineCampaignStatus(row.start_time, row.end_time, row.status),
      imageUrl,
      organizer: row.organizer_name,
      wasteTypes,
      estimatedVolume,
      reportIds: row.reports ? [row.reports.id] : undefined,
      isJoined,
    };
  }

  function getLocationName(locationCategory: string): string {
    const locationNames: Record<string, string> = {
      sungai: 'Sungai',
      pinggir_jalan: 'Pinggir Jalan',
      area_publik: 'Area Publik',
      tanah_kosong: 'Tanah Kosong',
      lainnya: 'Lainnya',
    };

    return locationNames[locationCategory] || locationCategory;
  }

  function formatWasteVolume(volume: string): string {
    return formatWasteVolumeLabel(volume);
  }

export function clearCampaignsCache() {
  // Stub for compatibility with old imports
}
