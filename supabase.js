import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const apiBase = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
export const founderEmail = (import.meta.env.VITE_FOUNDER_EMAIL || '').toLowerCase();
export const supabase = url && anon ? createClient(url, anon, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
}) : null;
export function requireConfig() {
  if (!supabase) throw new Error('Supabase configuration missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  if (!apiBase) throw new Error('VITE_API_BASE_URL is not configured.');
}
