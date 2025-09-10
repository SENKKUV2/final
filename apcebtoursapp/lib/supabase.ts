import { createClient } from "@supabase/supabase-js";

const supabaseKey = "https://zxzpvrpjavucfrzxkgfo.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4enB2cnBqYXZ1Y2ZyenhrZ2ZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4MjgxODAsImV4cCI6MjA3MTQwNDE4MH0.Wrj4FAFFTfIk_hIX4FTZd7DASQIO3FdzIfQMaaMDMq0";

export const supabase = createClient(supabaseKey, supabaseAnonKey);
