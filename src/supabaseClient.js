import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://crwctbvdnafaytmidiqg.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNyd2N0YnZkbmFmYXl0bWlkaXFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgxMDY0MzcsImV4cCI6MjEwMzY4MjQzN30.Mq8I_DCsgnhN638OZZ2irrYALVP0Fsi6-GQA9sPx96k'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)