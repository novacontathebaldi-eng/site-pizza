import { createClient } from '@supabase/supabase-js'

// As credenciais públicas para conectar com o Supabase.
// É seguro usar estas no frontend (navegador).
const supabaseUrl = "https://lwkfyvprbhkphoxkorjq.supabase.co"
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3a2Z5dnByYmhrcGhveGtvcmpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3ODI2MzUsImV4cCI6MjA3NzM1ODYzNX0._AYpolMp1-9cXlUR5C-M7Fxcz86i-P139m5MoLA9g9o"

// Cria e exporta o cliente Supabase para ser usado em outras partes do app.
export const supabase = createClient(supabaseUrl, supabaseKey)
