'use server'

import { createClient } from '@/utils/supabase/server'
import { requireAdmin } from '@/lib/adminGuard'
import { revalidatePath } from 'next/cache'

interface CreateCampaignInput {
  title: string
  description: string
  start_time: string
  end_time: string
  max_participants: number
  min_participants: number
  report_id: number
  organizer_name: string
  organizer_type: 'personal' | 'organization'
}

export async function createCampaignAction(input: CreateCampaignInput) {
  await requireAdmin()

  const supabase = await createClient()

  const { data: existing, error: existingError } = await supabase
    .from('campaigns')
    .select('id')
    .eq('report_id', input.report_id)
    .limit(1)

  if (existingError) {
    return { success: false, error: existingError.message }
  }

  if (existing && existing.length > 0) {
    return { success: false, error: 'Campaign untuk laporan ini sudah ada.' }
  }

  const { error } = await supabase
    .from('campaigns')
    .insert(input)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/admin')
  revalidatePath('/admin/laporan')
  revalidatePath('/admin/campaign/buat')

  return { success: true }
}
