import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase admin client (bypass RLS for background jobs)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  // Simple authorization check using an Authorization header or query param
  // Example: curl -H "Authorization: Bearer <CRON_SECRET>" http://localhost:3000/api/cron/campaign-reminders
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const now = new Date();
    
    // Fetch upcoming campaigns
    const { data: campaigns, error: campaignsError } = await supabase
      .from('campaigns')
      .select('id, title, start_time, min_participants')
      .eq('status', 'upcoming');

    if (campaignsError) throw campaignsError;
    if (!campaigns || campaigns.length === 0) {
      return NextResponse.json({ success: true, message: 'No upcoming campaigns found.' });
    }

    const notificationsToInsert: any[] = [];
    const campaignsToCancel: number[] = [];

    for (const campaign of campaigns) {
      const startTime = new Date(campaign.start_time);
      const diffMs = startTime.getTime() - now.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);

      // Only process campaigns that haven't started yet
      if (diffHours < 0) continue;

      // Check participants count
      const { count } = await supabase
        .from('campaign_participants')
        .select('*', { count: 'exact', head: true })
        .eq('campaign_id', campaign.id);
        
      const participantCount = count || 0;

      // 1. Cancellation Logic (if < 24 hours and participants < min_participants)
      if (diffHours < 24 && campaign.min_participants > 0 && participantCount < campaign.min_participants) {
        campaignsToCancel.push(campaign.id);
        
        // Notify participants
        const { data: participants } = await supabase
          .from('campaign_participants')
          .select('profile_id')
          .eq('campaign_id', campaign.id);
          
        if (participants) {
          for (const p of participants) {
            notificationsToInsert.push({
              user_id: p.profile_id,
              title: 'Campaign Dibatalkan',
              message: `Mohon maaf, campaign "${campaign.title}" dibatalkan karena tidak mencapai target minimal partisipan.`,
              type: 'campaign_update',
              related_id: campaign.id
            });
          }
        }
        continue; // Skip reminders for cancelled campaigns
      }

      // 2. Reminder Logic (using 1-hour windows since cron runs hourly)
      let reminderMessage = '';
      
      if (diffHours >= 23 && diffHours < 24) {
        reminderMessage = `Campaign "${campaign.title}" akan dimulai dalam 24 jam. Jangan lupa bersiap-siap!`;
      } else if (diffHours >= 11 && diffHours < 12) {
        reminderMessage = `Campaign "${campaign.title}" akan dimulai dalam 12 jam. Pastikan Anda membawa perlengkapan yang diperlukan!`;
      } else if (diffHours >= 2 && diffHours < 3) {
        reminderMessage = `Campaign "${campaign.title}" akan dimulai dalam 3 jam. Segera bersiap menuju lokasi!`;
      }

      if (reminderMessage) {
        const { data: participants } = await supabase
          .from('campaign_participants')
          .select('profile_id')
          .eq('campaign_id', campaign.id);
          
        if (participants) {
          for (const p of participants) {
            notificationsToInsert.push({
              user_id: p.profile_id,
              title: 'Pengingat Campaign',
              message: reminderMessage,
              type: 'campaign_reminder',
              related_id: campaign.id
            });
          }
        }
      }
    }

    // Execute bulk updates and inserts
    if (campaignsToCancel.length > 0) {
      await supabase
        .from('campaigns')
        .update({ status: 'cancelled' })
        .in('id', campaignsToCancel);
    }

    if (notificationsToInsert.length > 0) {
      await supabase
        .from('notifications')
        .insert(notificationsToInsert);
    }

    return NextResponse.json({ 
      success: true, 
      cancelled_count: campaignsToCancel.length,
      notifications_sent: notificationsToInsert.length
    });
    
  } catch (error: any) {
    console.error('Cron job error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
