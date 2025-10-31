import { createClient } from '@supabase/supabase-js'

// As credenciais públicas para conectar com o Supabase.
// É seguro usar estas no frontend (navegador).
const supabaseUrl = "https://lwkfyvprbhkphoxkorjq.supabase.co"
// ATUALIZADO: Usando a chave publicável (publishable key) em vez da chave anônima (anon key) legada.
const supabaseKey = "sb_publishable_FfE6ZD2msjpRA0o8f1HTmA_Hfvl9bUn"

// Cria e exporta o cliente Supabase para ser usado em outras partes do app.
export const supabase = createClient(supabaseUrl, supabaseKey)