import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://vzqaabulgvdygjzcouaz.supabase.co"
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_R6gg1EaTkuAOYIl0lmENWg_R0Qt372w"

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: localStorage
  }
})