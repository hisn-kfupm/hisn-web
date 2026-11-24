// The whole module is server-only: it reads the service key and next/headers.
import 'server-only'
import { createBrowserClient, createServerClient } from '@supabase/ssr'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { serverEnv } from '@/lib/env'

// Cookie-bound session client for server components, server actions and route handlers.
export async function supabaseProdServer(): Promise<SupabaseClient> {
  const env = serverEnv()
  const cookieStore = await cookies()
  return createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) cookieStore.set(name, value, options)
        } catch {
          // Server components cannot set cookies; the session refresh happens in middleware/actions.
        }
      },
    },
  })
}

export function supabaseProdBrowser(): SupabaseClient {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
}

// Service key: bypasses RLS. Outbox, admin and cron only.
export function supabaseProdService(): SupabaseClient {
  const env = serverEnv()
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  })
}
