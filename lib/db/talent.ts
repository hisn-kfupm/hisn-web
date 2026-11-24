// Write-only by design (HR-1). Reading talent data from the site is forbidden. Never add .select() or a read policy.
import 'server-only'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export type TalentRow = {
  user_id: string; kind: 'submission' | 'withdrawal';
  email?: string; full_name_ar?: string; major_code?: string; major_other?: string | null;
  academic_level_code?: string; gender?: 'male' | 'female';
  answers?: Record<string, unknown>; fields_version?: string; consent?: boolean; consent_version?: string
}

let supabaseTalent: SupabaseClient | undefined

function talentClient(): SupabaseClient {
  supabaseTalent ??= createClient(process.env.TALENT_SUPABASE_URL!, process.env.TALENT_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false },
  })
  return supabaseTalent
}

export async function insertTalentEntry(row: TalentRow): Promise<void> {
  const { error } = await talentClient().from('talent_entries').insert(row)
  if (error) throw error
}
