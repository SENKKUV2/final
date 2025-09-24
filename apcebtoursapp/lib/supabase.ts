// app/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

console.log("Supabase URL:", process.env.EXPO_PUBLIC_SUPABASE_URL)
console.log("Supabase Key exists:", !!process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY)
